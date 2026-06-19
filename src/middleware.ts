import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { authConfig } from "@/auth.config";
import { STAFF } from "@/lib/permissions";

/**
 * Locale negotiation (next-intl) + a CONVENIENCE RBAC redirect layer. This is
 * NOT a security boundary (CVE-2025-29927) — every RSC / Server Action / Route
 * Handler re-checks auth + entitlement at the data layer (blueprint §6.1, §F3).
 *
 * Uses the edge-safe authConfig instance (no Prisma / argon2) to read the JWT.
 */
const { auth } = NextAuth(authConfig);
const intlMiddleware = createMiddleware(routing);

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;

  const segments = nextUrl.pathname.split("/").filter(Boolean);
  const hasLocale = (routing.locales as readonly string[]).includes(
    segments[0],
  );
  const locale = hasLocale ? segments[0] : routing.defaultLocale;
  const rest = "/" + segments.slice(hasLocale ? 1 : 0).join("/");

  // Gate every post-login area so unauthenticated crawlers/visitors get a 307 →
  // /login instead of a 200 HTML shell (defence-in-depth + keeps gated routes
  // out of search). startsWith("/reports") covers both the library index and the
  // /reports/[slug] viewer. needsStaff stays /admin-only — clients use the rest.
  const needsAuth =
    rest.startsWith("/portal") ||
    rest.startsWith("/admin") ||
    rest.startsWith("/reports") ||
    rest.startsWith("/profile");
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
  // files with an extension, and the GENERATED metadata routes. The latter have no
  // file extension, so without listing them here next-intl would 307 them to a
  // locale-prefixed path (/opengraph-image → /vi/opengraph-image → 404) and the
  // social share image / app icons would silently break for crawlers.
  matcher: [
    "/((?!api|_next|_vercel|.*\\..*)(?!(?:opengraph-image|apple-icon)(?![\\w-])).*)",
  ],
};
