"use server";

import { AuthError } from "next-auth";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { signIn, signOut } from "@/auth";
import { routing } from "@/i18n/routing";

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
  await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      organization,
      passwordHash,
      role: "CLIENT",
      status: "PENDING",
    },
  });

  return {
    status: "success",
    message: t("registrationPending"),
  };
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
      if (code === "AccountNotApproved") {
        return { status: "error", message: t("accountNotApproved") };
      }
      if (code === "AccountSuspended") {
        return { status: "error", message: t("accountSuspended") };
      }
      if (code === "AccountLocked") {
        return { status: "error", message: t("accountLocked") };
      }
      return { status: "error", message: t("invalidCredentials") };
    }
    throw error;
  }
}
