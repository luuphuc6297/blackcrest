"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireFreshUser } from "@/lib/rbac";
import { hashPassword, verifyPassword } from "@/lib/password";
import { signOut } from "@/auth";
import { routing } from "@/i18n/routing";

export type ProfileFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
};

function localeOf(formData: FormData): string {
  const raw = String(formData.get("locale") ?? "");
  return (routing.locales as readonly string[]).includes(raw)
    ? raw
    : routing.defaultLocale;
}

/** Update display name + organization for the signed-in user. */
export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const locale = localeOf(formData);
  const t = await getTranslations({ locale, namespace: "Profile" });

  let user;
  try {
    user = await requireFreshUser();
  } catch {
    return { status: "error", message: t("notAllowed") };
  }

  const schema = z.object({
    name: z.string().trim().min(2, t("nameRequired")),
    organization: z.string().trim().max(200).optional(),
  });
  const parsed = schema.safeParse({
    name: formData.get("name"),
    organization: formData.get("organization") || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues)
      fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    return { status: "error", fieldErrors };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      organization: parsed.data.organization ?? null,
    },
  });
  revalidatePath("/[locale]/profile", "page");
  return { status: "success", message: t("savedProfile") };
}

/**
 * Change password: verify the current one, store the new hash, and BUMP
 * tokenVersion (revokes every outstanding session — SEC-12). The current session
 * is then signed out and the user is sent to login to re-authenticate.
 */
export async function changePassword(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const locale = localeOf(formData);
  const t = await getTranslations({ locale, namespace: "Profile" });

  let user;
  try {
    user = await requireFreshUser();
  } catch {
    return { status: "error", message: t("notAllowed") };
  }

  const schema = z
    .object({
      currentPassword: z.string().min(1, t("currentRequired")),
      newPassword: z.string().min(8, t("passwordMinLength")),
      confirmPassword: z.string(),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
      path: ["confirmPassword"],
      message: t("passwordMismatch"),
    });
  const parsed = schema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues)
      fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    return { status: "error", fieldErrors };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  const ok =
    !!dbUser?.passwordHash &&
    (await verifyPassword(dbUser.passwordHash, parsed.data.currentPassword));
  if (!ok) {
    return {
      status: "error",
      fieldErrors: { currentPassword: t("wrongCurrentPassword") },
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(parsed.data.newPassword),
      tokenVersion: { increment: 1 }, // revoke all sessions
    },
  });

  // All sessions are now stale — sign out and re-authenticate.
  await signOut({ redirectTo: `/${locale}/login` });
  return { status: "success" }; // unreachable (signOut redirects)
}
