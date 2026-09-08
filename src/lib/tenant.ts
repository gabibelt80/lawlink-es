import { PrismaClient } from "@prisma/client";
import { Client } from "pg";

/**
 * Sistema multi-tenant con esquema por estudio.
 * Cada estudio tiene su propio schema en PostgreSQL: juridictas_estudio_slug
 */

// Cliente Prisma para el schema central (estudios, usuarios, suscripciones)
export const prisma = new PrismaClient();

// Cache de clientes Prisma por estudio
const tenantClients = new Map<string, PrismaClient>();

/**
 * Obtiene (o crea) un cliente Prisma para el schema de un estudio específico.
 */
export function getTenantPrisma(firmSlug: string): PrismaClient {
  if (!tenantClients.has(firmSlug)) {
    const schema = `juridictas_${firmSlug}`;
    const baseUrl = process.env.DATABASE_URL!;
    const url = new URL(baseUrl);
    const tenantUrl = `postgresql://${url.username}:${url.password}@${url.hostname}:${url.port}/${schema}?schema=public`;
    const client = new PrismaClient({
      datasources: {
        db: {
          url: tenantUrl,
        },
      },
    });
    tenantClients.set(firmSlug, client);
  }
  return tenantClients.get(firmSlug)!;
}

/**
 * Crea un nuevo schema para un estudio recién registrado.
 */
export async function createTenantSchema(firmSlug: string): Promise<void> {
  const schema = `juridictas_${firmSlug}`;
  const baseUrl = process.env.DATABASE_URL!;
  const url = new URL(baseUrl);
  const client = new Client({
    host: url.hostname,
    port: parseInt(url.port || "5432"),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
  });
  await client.connect();
  await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  await client.end();
}

/**
 * Elimina el schema de un estudio (para cancelación de suscripción).
 */
export async function dropTenantSchema(firmSlug: string): Promise<void> {
  const schema = `juridictas_${firmSlug}`;
  const baseUrl = process.env.DATABASE_URL!;
  const url = new URL(baseUrl);
  const client = new Client({
    host: url.hostname,
    port: parseInt(url.port || "5432"),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
  });
  await client.connect();
  await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await client.end();
}

/**
 * Aplica las migraciones al schema del estudio recién creado.
 */
export async function migrateTenantSchema(firmSlug: string): Promise<void> {
  const schema = `juridictas_${firmSlug}`;
  const baseUrl = process.env.DATABASE_URL!;
  const url = new URL(baseUrl);
  const tenantUrl = `postgresql://${url.username}:${url.password}@${url.hostname}:${url.port}/juridictas?schema=${schema}`;
  const { exec } = await import("child_process");
  await new Promise((resolve, reject) => {
    exec(
      `npx prisma db push --schema prisma/schema.prisma --skip-generate --accept-data-loss`,
      {
        env: { ...process.env, DATABASE_URL: tenantUrl },
      },
      (err, stdout) => {
        if (err) reject(err);
        else resolve(stdout);
      }
    );
  });
}
