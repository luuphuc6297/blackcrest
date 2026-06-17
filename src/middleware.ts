import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { authConfig } from "@/auth.config";

/**
 * Locale negotiation (next-intl) + a CONVENIENCE RBAC redirect layer. This is
 * NOT a security boundary (CVE-2025-29927) — every RSC / Server Action / Route
 * Handler re-checks auth + entitlement at the data layer (blueprint §6.1, §F3).
 *
 * Uses the edge-safe authConfig instance (no Prisma / argon2) to read the JWT.
 */
const { auth } = NextAuth(authConfig);
const intlMiddleware = createMiddleware(routing);

const STAFF = ["SUPER_ADMIN", "EDITOR", "APPROVER"];

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;

  const segments = nextUrl.pathname.split("/").filter(Boolean);
  const hasLocale = (routing.locales as readonly string[]).includes(
    segments[0],
  );
  const locale = hasLocale ? segments[0] : routing.defaultLocale;
  const rest = "/" + segments.slice(hasLocale ? 1 : 0).join("/");

  const needsAuth = rest.startsWith("/portal") || rest.startsWith("/admin");
  const needsStaff = rest.startsWith("/admin");

  if (needsAuth && !session?.user) {
    const url = new URL(`/${locale}/login`, nextUrl);
    url.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  if (needsStaff && session?.user && !STAFF.includes(session.user.role)) {
    return NextResponse.redirect(new URL(`/${locale}/portal`, nextUrl));
  }

  return intlMiddleware(req);
});

export const config = {
  // Everything EXCEPT Next internals, /api (auth + PDF stream, locale-independent),
  // and files with an extension.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
