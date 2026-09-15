import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import type { Session } from "next-auth";
import type { UserRole } from "@prisma/client";

type AppSession = Session & {
  user: {
    id: string;
    role: UserRole;
    avatar: string | null;
    firmId: string | null;
    firmSlug: string;
    firmName: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

export const centralPrisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

const tenantClients = new Map<string, PrismaClient>();

export async function getTenantPrisma(): Promise<PrismaClient> {
  return centralPrisma;
}

export function getTenantPrismaSync(_firmSlug: string): PrismaClient {
  return centralPrisma;
}
