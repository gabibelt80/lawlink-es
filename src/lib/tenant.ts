import { PrismaClient } from "@prisma/client";
import mysql from "mysql2/promise";

/**
 * Sistema multi-tenant con esquema por estudio.
 * Cada estudio tiene su propio schema en MariaDB: juridictas_estudio_slug
 */

// Cliente Prisma para el schema central (estudios, usuarios, suscripciones)
export const prisma = new PrismaClient();

// Cache de clientes Prisma por estudio
const tenantClients = new Map<string, PrismaClient>();

/**
 * Obtiene (o crea) un cliente Prisma para el schema de un estudio especÃ­fico.
 */
export function getTenantPrisma(firmSlug: string): PrismaClient {
  if (!tenantClients.has(firmSlug)) {
    const schema = `juridictas_${firmSlug}`;
    const baseUrl = process.env.DATABASE_URL!;
    const tenantUrl = baseUrl.replace(/\/[^/]+$/, `/${schema}`);
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
 * Crea un nuevo schema para un estudio reciÃ©n registrado.
 */
export async function createTenantSchema(firmSlug: string): Promise<void> {
  const schema = `juridictas_${firmSlug}`;
  const baseUrl = process.env.DATABASE_URL!;
  const url = new URL(baseUrl);
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: parseInt(url.port || "3306"),
    user: url.username,
    password: url.password,
  });
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${schema}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await connection.end();
}

/**
 * Elimina el schema de un estudio (para cancelaciÃ³n de suscripciÃ³n).
 */
export async function dropTenantSchema(firmSlug: string): Promise<void> {
  const schema = `juridictas_${firmSlug}`;
  const baseUrl = process.env.DATABASE_URL!;
  const url = new URL(baseUrl);
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: parseInt(url.port || "3306"),
    user: url.username,
    password: url.password,
  });
  await connection.query(`DROP DATABASE IF EXISTS \`${schema}\``);
  await connection.end();
}

/**
 * Aplica las migraciones al schema del estudio reciÃ©n creado.
 */
export async function migrateTenantSchema(firmSlug: string): Promise<void> {
  const schema = `juridictas_${firmSlug}`;
  const baseUrl = process.env.DATABASE_URL!;
  const tenantUrl = baseUrl.replace(/\/[^/]+$/, `/${schema}`);
  const { exec } = await import("child_process");
  await new Promise((resolve, reject) => {
    exec(
      `npx prisma db push --schema prisma/schema.prisma --skip-generate --accept-data-loss`,
      {
        env: { ...process.env, DATABASE_URL: tenantUrl },
      },
      (err, stdout, stderr) => {
        if (err) reject(err);
        else resolve(stdout);
      }
    );
  });
}
