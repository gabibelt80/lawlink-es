import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";
import type { UserRole } from "@prisma/client";

export type SessionRole = UserRole | "SYSTEM_ADMIN";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: SessionRole;
      avatar: string | null;
      firmId: string | null;
      firmSlug: string;
      firmName: string;
      isSystemAdmin: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: SessionRole;
    avatar: string | null;
    firmId: string | null;
    firmSlug: string;
    firmName: string;
    isSystemAdmin: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: SessionRole;
    avatar: string | null;
    firmId: string | null;
    firmSlug: string;
    firmName: string;
    isSystemAdmin: boolean;
  }
}
