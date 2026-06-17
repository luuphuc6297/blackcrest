import type { Role, UserStatus } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      status: UserStatus;
      tokenVersion: number;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    status: UserStatus;
    tokenVersion: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    status: UserStatus;
    tokenVersion: number;
  }
}
