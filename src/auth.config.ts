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
    // Short window so suspend / role changes take effect quickly; sensitive
    // actions additionally re-check status + tokenVersion against the DB.
    maxAge: 60 * 30,
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
