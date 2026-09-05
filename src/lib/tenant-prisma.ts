import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";

// Prisma para el schema central (Firm, FirmUser)
export const centralPrisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

// Cache de clientes Prisma por schema
const tenantClients = new Map<string, PrismaClient>();

/**
 * Obtiene el cliente Prisma del tenant segun la sesion actual.
 * Si no hay sesion o no hay firmSlug, devuelve el cliente central.
 */
export async function getTenantPrisma(): Promise<PrismaClient> {
  const session = await getServerSession(authOptions);
  const firmSlug = session?.user?.firmSlug;

  if (!firmSlug || firmSlug === "") {
    return centralPrisma;
  }

  const schema = `juridictas_${firmSlug}`;

  if (tenantClients.has(schema)) {
    return tenantClients.get(schema)!;
  }

const baseUrl = process.env.DATABASE_URL!;
const tenantUrl = baseUrl.replace(/\/[^/]+$/, `/${schema}`);
console.log("TENANT URL:", tenantUrl);

  const client = new PrismaClient({
    datasources: { db: { url: tenantUrl } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  tenantClients.set(schema, client);
  return client;
}

/**
 * Obtiene el cliente Prisma del tenant por slug (para uso en auth y admin).
 */
export function getTenantPrismaSync(firmSlug: string): PrismaClient {
  const schema = `juridictas_${firmSlug}`;

  if (tenantClients.has(schema)) {
    return tenantClients.get(schema)!;
  }

  const baseUrl = process.env.DATABASE_URL!;
  const tenantUrl = baseUrl.replace(/\/[^/]+$/, `/${schema}`);

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