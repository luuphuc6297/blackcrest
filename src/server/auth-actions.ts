"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { signIn, signOut } from "@/auth";
import { routing } from "@/i18n/routing";
import { mintEmailVerifyToken, verifyInviteToken } from "@/lib/email-token";
import { sendMail, buildVerificationEmail, getAppUrl } from "@/lib/mailer";

/** Build + send the verification email for a user (best-effort; localized). */
async function sendVerificationEmail(
  locale: string,
  userId: string,
  email: string,
  name: string,
): Promise<void> {
  const t = await getTranslations({ locale, namespace: "Auth" });
  const token = await mintEmailVerifyToken(userId);
  const url = `${getAppUrl()}/${locale}/verify-email?token=${encodeURIComponent(token)}`;
  const mail = buildVerificationEmail({
    subject: t("verifyEmailSubject"),
    heading: t("verifyEmailHeading"),
    intro: t("verifyEmailIntro", { name }),
    buttonLabel: t("verifyEmailButton"),
    url,
    fallbackNote: t("verifyEmailFallback"),
    expiryNote: t("verifyEmailExpiry"),
  });
  try {
    await sendMail({ to: email, ...mail });
  } catch (err) {
    // Don't block registration on SMTP errors (e.g. unverified sender) — the
    // user can resend. In dev, surface the link so the flow stays testable.
    console.error(
      "[register] verification email failed:",
      err instanceof Error ? err.message : err,
    );
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[register:dev] verification link for ${email}: ${url}`);
    }
  }
}

/** Sign out and return to the public landing (middleware re-applies locale). */
export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

export type AuthFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Register → status PENDING, NO auto-login (blueprint §F3). An approver promotes
 * the account before the user can sign in. Validation messages are localized
 * (mirrors loginAction) — the register form submits a hidden `locale`.
 */
export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const rawLocale = String(formData.get("locale") ?? "");
  const locale = (routing.locales as readonly string[]).includes(rawLocale)
    ? rawLocale
    : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "Auth" });

  const registerSchema = z
    .object({
      name: z.string().min(2, t("nameMinLength")),
      email: z.string().email(t("emailInvalid")),
      organization: z.string().optional(),
      password: z.string().min(8, t("passwordMinLength")),
      confirmPassword: z.string(),
    })
    .refine((d) => d.password === d.confirmPassword, {
      path: ["confirmPassword"],
      message: t("confirmPasswordMismatch"),
    });

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    organization: formData.get("organization") || undefined,
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { status: "error", fieldErrors };
  }

  const { name, email, organization, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    // Avoid leaking which emails exist beyond a generic field hint.
    return {
      status: "error",
      fieldErrors: { email: t("emailDuplicate") },
    };
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      organization,
      passwordHash,
      role: "CLIENT",
      // Email NOT yet confirmed → cannot log in, not yet in the approval queue.
      status: "UNVERIFIED",
    },
  });

  await sendVerificationEmail(locale, user.id, normalizedEmail, name);

  return {
    status: "success",
    message: t("registrationCheckEmail", { email: normalizedEmail }),
  };
}

/**
 * Resend the verification email. Always reports success (no email enumeration);
 * only actually re-sends for an existing UNVERIFIED account.
 */
export async function resendVerificationAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const rawLocale = String(formData.get("locale") ?? "");
  const locale = (routing.locales as readonly string[]).includes(rawLocale)
    ? rawLocale
    : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "Auth" });

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (z.string().email().safeParse(email).success) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && user.status === "UNVERIFIED") {
      await sendVerificationEmail(locale, user.id, user.email, user.name);
    }
  }
  return { status: "success", message: t("verifyResent", { email }) };
}

/**
 * Accept an admin invite: verify the invite token, set the password, mark the
 * email verified, and activate the account (INVITED → APPROVED). Public action
 * (the invitee isn't logged in); the signed token is the authorization.
 */
export async function setPasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const rawLocale = String(formData.get("locale") ?? "");
  const locale = (routing.locales as readonly string[]).includes(rawLocale)
    ? rawLocale
    : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "Auth" });

  const token = String(formData.get("token") ?? "");
  const userId = token ? await verifyInviteToken(token) : null;
  if (!userId) return { status: "error", message: t("setPasswordInvalid") };

  const schema = z
    .object({
      password: z.string().min(8, t("passwordMinLength")),
      confirmPassword: z.string(),
    })
    .refine((d) => d.password === d.confirmPassword, {
      path: ["confirmPassword"],
      message: t("confirmPasswordMismatch"),
    });
  const parsed = schema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { status: "error", fieldErrors };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  // Activate exactly once: only an INVITED row flips (idempotent / single-use).
  const res = await prisma.user.updateMany({
    where: { id: userId, status: "INVITED" },
    data: { passwordHash, emailVerifiedAt: new Date(), status: "APPROVED" },
  });
  if (res.count !== 1) return { status: "error", message: t("setPasswordInvalid") };

  return { status: "success", message: t("setPasswordSuccess") };
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  locale: z.enum(routing.locales),
  callbackUrl: z.string().optional(),
});

/** Only allow same-site relative redirects (block open-redirect / protocol-relative). */
function safeInternalPath(url: string | undefined): string | null {
  if (!url) return null;
  if (!url.startsWith("/") || url.startsWith("//")) return null;
  return url;
}

/** Sign in with credentials; maps Auth.js errors to Vietnamese messages. */
export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const rawLocale = String(formData.get("locale") ?? "");
  const locale = (routing.locales as readonly string[]).includes(rawLocale)
    ? rawLocale
    : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "Auth" });

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    locale: formData.get("locale"),
    callbackUrl: formData.get("callbackUrl") || undefined,
  });
  if (!parsed.success) {
    return { status: "error", message: t("invalidCredentials") };
  }
  const { email, password, callbackUrl } = parsed.data;
  const redirectTo = safeInternalPath(callbackUrl) ?? `/${locale}/portal`;

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo,
    });
    return { status: "success" };
  } catch (error) {
    // A successful sign-in throws a redirect (NOT an AuthError) — it falls
    // through to the final `throw` below and propagates correctly.
    if (error instanceof AuthError) {
      const code = (error as AuthError & { code?: string }).code;
      // Persistent ACCOUNT-STATE conditions are not form errors — show them on a
      // dedicated status page instead of a red inline alert under the password
      // field (the credentials were correct; the account simply can't sign in
      // yet). Transient/credential problems (locked, wrong password) stay inline.
      if (code === "EmailNotVerified") {
        redirect(`/${locale}/account-status?reason=unverified`);
      }
      if (code === "AccountNotApproved") {
        redirect(`/${locale}/account-status?reason=pending`);
      }
      if (code === "AccountSuspended") {
        redirect(`/${locale}/account-status?reason=suspended`);
      }
      if (code === "AccountLocked") {
        return { status: "error", message: t("accountLocked") };
      }
      return { status: "error", message: t("invalidCredentials") };
    }
    throw error;
  }
}
