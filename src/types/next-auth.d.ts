import { UserRole } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface User {
    role: UserRole;
    avatar?: string | null;
    firmId?: string | null;
    firmSlug?: string;
    firmName?: string;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      avatar?: string | null;
      firmId?: string | null;
      firmSlug?: string;
      firmName?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    avatar?: string | null;
    firmId?: string | null;
    firmSlug?: string;
    firmName?: string;
  }
}