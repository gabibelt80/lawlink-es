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
  const s = await getServerSession(authOptions);
  const session = s as AppSession | null;
  const firmSlug = session?.user?.firmSlug;

  if (!firmSlug || firmSlug === "") {
    return centralPrisma;
  }

  return getTenantPrismaSync(firmSlug);
}

export function getTenantPrismaSync(firmSlug: string): PrismaClient {
  const schema = `juridictas_${firmSlug.replace(/-/g, "_")}`;

  if (tenantClients.has(schema)) {
    return tenantClients.get(schema)!;
  }

  const baseUrl = process.env.DATABASE_URL!;
  const url = new URL(baseUrl);
  const tenantUrl = `postgresql://${url.username}:${url.password}@${url.hostname}:${url.port}/juridictas?schema=${schema}&connection_limit=5`;

  console.log("TENANT URL:", tenantUrl);

  const client = new PrismaClient({
    datasources: { db: { url: tenantUrl } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  tenantClients.set(schema, client);
  return client;
}

export async function closeAllTenantClients() {
  for (const client of tenantClients.values()) {
    await client.$disconnect();
  }
  tenantClients.clear();
}