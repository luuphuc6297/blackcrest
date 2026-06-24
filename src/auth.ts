import { cache } from "react";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { authConfig } from "@/auth.config";
import { isLocked, registerFailedLogin, clearFailedLogins } from "@/lib/rate-limit";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** Typed sign-in errors so the login UI can show the right message. */
class EmailNotVerified extends CredentialsSignin {
  code = "EmailNotVerified";
}
class AccountNotApproved extends CredentialsSignin {
  code = "AccountNotApproved";
}
class AccountSuspended extends CredentialsSignin {
  code = "AccountSuspended";
}
class AccountLocked extends CredentialsSignin {
  code = "AccountLocked";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mật khẩu", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });
        if (!user?.passwordHash) return null;

        // Lockout gate — refuse before checking the password so a locked
        // account cannot be probed (blueprint §F3).
        if (isLocked(user)) throw new AccountLocked();

        const ok = await verifyPassword(user.passwordHash, password);
        if (!ok) {
          await registerFailedLogin(user.id);
          return null;
        }

        // Status gates — enforced here AND re-checked at the data layer.
        if (user.status === "UNVERIFIED") throw new EmailNotVerified();
        if (user.status === "PENDING") throw new AccountNotApproved();
        if (user.status === "SUSPENDED") throw new AccountSuspended();

        // Successful auth — reset the throttle.
        await clearFailedLogins(user.id);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          tokenVersion: user.tokenVersion,
        };
      },
    }),
  ],
});

/**
 * Request-deduped session read for RSC. A single gated request resolves the
 * session in BOTH the (client)/(admin) layout guard AND the page body; auth()
 * verifies the JWT (and runs the session callback) on each call. React cache()
 * collapses those to one resolution per request render. Use this in
 * layouts/pages/RSC reads; route handlers (one call/request) can use auth() directly.
 */
export const getSession = cache(() => auth());
