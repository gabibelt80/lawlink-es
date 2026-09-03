import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { cache } from "react";

// Prisma para el schema central (Firm, FirmUser)
export const centralPrisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

// Cache de clientes Prisma por schema
const tenantClients = new Map<string, PrismaClient>();

/**
 * Obtiene el cliente Prisma para el schema del estudio del usuario logueado.
 * Usa cache de React para evitar crear mÃºltiples clientes en una misma request.
 */
export const getTenantPrisma = cache(async () => {
  const session = await getServerSession(authOptions);
  const firmSlug = session?.user?.firmSlug;

  if (!firmSlug) {
    // Sin sesiÃ³n o admin del sistema â†’ devolvemos el central
    return centralPrisma;
  }

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
});

/**
 * Cierra todos los clientes de tenant (Ãºtil para tests o cierre del servidor).
 */
export async function closeAllTenantClients() {
  for (const client of tenantClients.values()) {
    await client.$disconnect();
  }
  tenantClients.clear();
}
