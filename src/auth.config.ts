import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js base config (NO Prisma / argon2 here — this is imported by
 * middleware, which runs on the edge). The Credentials provider + adapter live
 * in auth.ts (Node runtime). Blueprint §F3.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    // "Remember me" window. Ticked (default) → the session cookie persists up to
    // this long across browser restarts; unticked → loginAction rewrites it to a
    // session cookie (cleared on browser close). `updateAge == maxAge` disables
    // mid-life JWT rotation, so cookie persistence is decided ONCE at login and is
    // never silently re-persisted on a later request.
    // Revocation does NOT rely on this window: suspend / role / password changes
    // bump tokenVersion, and every sensitive action re-checks status + tokenVersion
    // against the DB (see requireFreshUser), forcing re-login regardless of maxAge.
    maxAge: 60 * 60 * 24 * 3, // 3 days
    updateAge: 60 * 60 * 24 * 3,
  },
  trustHost: true,
  providers: [],
  callbacks: {
    // Snapshot identity into the JWT at sign-in (Credentials => jwt strategy).
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: string }).role;
        token.status = (user as { status?: string }).status;
        token.tokenVersion = (user as { tokenVersion?: number }).tokenVersion;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as never;
        session.user.status = token.status as never;
        // Carry the sign-in tokenVersion snapshot so sensitive actions can
        // compare it against the DB and force re-login when it is bumped.
        session.user.tokenVersion = (token.tokenVersion as number) ?? 0;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
