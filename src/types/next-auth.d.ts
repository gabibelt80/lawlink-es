import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";
import { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      avatar: string | null;
      firmId: string | null;
      firmSlug: string;
      firmName: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: UserRole;
    avatar: string | null;
    firmId: string | null;
    firmSlug: string;
    firmName: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: UserRole;
    avatar: string | null;
    firmId: string | null;
    firmSlug: string;
    firmName: string;
  }
}