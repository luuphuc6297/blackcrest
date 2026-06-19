"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { Prisma, type Role, type UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { routing } from "@/i18n/routing";
import { mintInviteToken } from "@/lib/email-token";
import { sendMail, buildVerificationEmail, getAppUrl } from "@/lib/mailer";

const idSchema = z.object({ userId: z.string().cuid() });

/** Uniform result shape so the client table can show pending/toast/error (mirrors
 * report-actions). The data layer still re-checks the capability + audits. */
export type AccountResult = { ok: true } | { ok: false; error: string };

function isSerializationConflict(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034";
}

type GuardedResult = "ok" | "last-admin" | "conflict";

/**
 * Apply a user mutation, optionally guarded so it can NEVER remove the last
 * active Super Admin (demotion OR suspend). When guarded, the count + update run
 * in a SERIALIZABLE transaction, so two concurrent removals can't both pass the
 * check and strand the system at zero admins — Postgres aborts one (P2034). The
 * count excludes the target itself (we need at least one OTHER active admin).
 */
async function mutateUserGuarded(
  userId: string,
  guardLastAdmin: boolean,
  data: Prisma.UserUpdateInput,
): Promise<GuardedResult> {
  if (!guardLastAdmin) {
    await prisma.user.update({ where: { id: userId }, data });
    return "ok";
  }
  try {
    await prisma.$transaction(
      async (tx) => {
        const others = await tx.user.count({
          where: { role: "SUPER_ADMIN", status: "APPROVED", id: { not: userId } },
        });
        if (others < 1) throw new Error("LAST_ADMIN");
        await tx.user.update({ where: { id: userId }, data });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return "ok";
  } catch (e) {
    if (e instanceof Error && e.message === "LAST_ADMIN") return "last-admin";
    if (isSerializationConflict(e)) return "conflict";
    throw e;
  }
}

async function setStatus(
  rawUserId: string,
  status: UserStatus,
  action: Parameters<typeof logAudit>[0]["action"],
): Promise<AccountResult> {
  let actor;
  try {
    actor = await requireCapability("account.manage");
  } catch {
    return { ok: false, error: "Bạn không có quyền thực hiện thao tác này." };
  }
  const parsed = idSchema.safeParse({ userId: rawUserId });
  if (!parsed.success) return { ok: false, error: "Yêu cầu không hợp lệ." };
  const userId = parsed.data.userId;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true },
  });
  if (!target) return { ok: false, error: "Không tìm thấy tài khoản." };

  // Suspending (a revoke) has extra rails: can't suspend yourself (self-lockout),
  // and only a Super Admin may suspend another Super Admin (a lower role must not
  // be able to disable a higher one — closes a sibling lockout path).
  if (status === "SUSPENDED") {
    if (userId === actor.id) {
      return { ok: false, error: "Không thể tự tạm khoá tài khoản của mình." };
    }
    if (target.role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") {
      return {
        ok: false,
        error: "Chỉ Super Admin mới có thể tạm khoá một Super Admin khác.",
      };
    }
  }

  // Atomic last-admin guard when suspending an active Super Admin.
  const guardLastAdmin = status === "SUSPENDED" && target.role === "SUPER_ADMIN";
  const res = await mutateUserGuarded(userId, guardLastAdmin, {
    // Bump tokenVersion on suspend so any live JWT is invalidated promptly.
    status,
    ...(status === "SUSPENDED" ? { tokenVersion: { increment: 1 } } : {}),
  });
  if (res === "last-admin") {
    return { ok: false, error: "Không thể tạm khoá Super Admin cuối cùng." };
  }
  if (res === "conflict") {
    return { ok: false, error: "Có thao tác đồng thời. Vui lòng thử lại." };
  }

  await logAudit({
    actorId: actor.id,
    action,
    targetType: "User",
    targetId: userId,
    metadata: { email: target.email, status },
  });
  revalidatePath("/[locale]/admin/accounts", "page");
  return { ok: true };
}

export async function approveAccount(userId: string): Promise<AccountResult> {
  return setStatus(userId, "APPROVED", "ACCOUNT_APPROVE");
}

export async function rejectAccount(userId: string): Promise<AccountResult> {
  return setStatus(userId, "SUSPENDED", "ACCOUNT_REJECT");
}

export async function suspendAccount(userId: string): Promise<AccountResult> {
  return setStatus(userId, "SUSPENDED", "ACCOUNT_SUSPEND");
}

export async function reinstateAccount(userId: string): Promise<AccountResult> {
  return setStatus(userId, "APPROVED", "ACCOUNT_REINSTATE");
}

const roleSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(["CLIENT", "EDITOR", "APPROVER", "SUPER_ADMIN"]),
});

/**
 * Change an existing account's role — SUPER_ADMIN only (re-checked fresh). Safety
 * rails: cannot change your OWN role (avoids self-lockout), and cannot demote the
 * last active SUPER_ADMIN (avoids locking everyone out of admin). Bumps
 * tokenVersion so the target's outstanding JWT is invalidated immediately and
 * the new role takes effect on their next sign-in (a demotion must not linger).
 */
export async function setAccountRole(input: {
  userId: string;
  role: Role;
}): Promise<AccountResult> {
  let actor;
  try {
    actor = await requireCapability("account.setRole");
  } catch {
    return { ok: false, error: "Bạn không có quyền đổi vai trò." };
  }

  const parsed = roleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Yêu cầu không hợp lệ." };
  const { userId, role } = parsed.data;

  if (userId === actor.id) {
    return { ok: false, error: "Không thể tự đổi vai trò của chính mình." };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true },
  });
  if (!target) return { ok: false, error: "Không tìm thấy tài khoản." };
  if (target.role === role) return { ok: true }; // no-op

  // Atomic last-admin guard: never demote the last active Super Admin (and never
  // race two demotions to zero admins). Bump tokenVersion → the target's live JWT
  // is revoked; they re-auth with the new role (demotion takes effect at once).
  const guardLastAdmin = target.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN";
  const res = await mutateUserGuarded(userId, guardLastAdmin, {
    role,
    tokenVersion: { increment: 1 },
  });
  if (res === "last-admin") {
    return { ok: false, error: "Không thể hạ vai trò Super Admin cuối cùng." };
  }
  if (res === "conflict") {
    return { ok: false, error: "Có thao tác đồng thời. Vui lòng thử lại." };
  }

  await logAudit({
    actorId: actor.id,
    action: "ACCOUNT_ROLE",
    targetType: "User",
    targetId: userId,
    metadata: { email: target.email, from: target.role, to: role },
  });
  revalidatePath("/[locale]/admin/accounts", "page");
  return { ok: true };
}

export type InviteFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Admin-invite a member — SUPER_ADMIN only (re-checked against the DB). Creates
 * an INVITED account (no password) and emails a set-password link; accepting it
 * verifies the email + activates the account (APPROVED). Localized like register.
 */
export async function inviteMemberAction(
  _prev: InviteFormState,
  formData: FormData,
): Promise<InviteFormState> {
  const rawLocale = String(formData.get("locale") ?? "");
  const locale = (routing.locales as readonly string[]).includes(rawLocale)
    ? rawLocale
    : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "Admin" });

  let actor;
  try {
    actor = await requireCapability("account.invite");
  } catch {
    return { status: "error", message: t("inviteForbidden") };
  }
  const inviterName =
    (await prisma.user.findUnique({
      where: { id: actor.id },
      select: { name: true },
    }))?.name ?? "Blackcrest";

  const schema = z.object({
    email: z.string().email(t("inviteEmailInvalid")),
    name: z.string().min(2, t("inviteNameRequired")),
    role: z.enum(["CLIENT", "EDITOR", "APPROVER", "SUPER_ADMIN"]),
    organization: z.string().optional(),
  });
  const parsed = schema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role"),
    organization: formData.get("organization") || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { status: "error", fieldErrors };
  }

  const { email, name, role, organization } = parsed.data;
  const normalizedEmail = email.toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    return { status: "error", fieldErrors: { email: t("inviteDuplicate") } };
  }

  // No password yet — the invitee sets it when accepting the invite.
  const user = await prisma.user.create({
    data: { email: normalizedEmail, name, role, organization, status: "INVITED" },
    select: { id: true, email: true },
  });

  const token = await mintInviteToken(user.id);
  const url = `${getAppUrl()}/${locale}/set-password?token=${encodeURIComponent(token)}`;
  const mail = buildVerificationEmail({
    subject: t("inviteEmailSubject"),
    heading: t("inviteEmailHeading"),
    intro: t("inviteEmailIntro", { name, inviter: inviterName }),
    buttonLabel: t("inviteEmailButton"),
    url,
    fallbackNote: t("inviteEmailFallback"),
    expiryNote: t("inviteEmailExpiry"),
  });
  try {
    await sendMail({ to: normalizedEmail, ...mail });
  } catch (err) {
    console.error("[invite] email failed:", err instanceof Error ? err.message : err);
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[invite:dev] set-password link for ${normalizedEmail}: ${url}`);
    }
  }

  await logAudit({
    actorId: actor.id,
    action: "ACCOUNT_INVITE",
    targetType: "User",
    targetId: user.id,
    metadata: { email: user.email, role },
  });
  revalidatePath("/[locale]/admin/accounts", "page");
  return { status: "success", message: t("inviteSuccess", { email: normalizedEmail }) };
}
