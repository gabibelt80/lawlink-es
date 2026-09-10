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
    const tenantUrl = `postgresql://${url.username}:${url.password}@${url.hostname}:${url.port}/juridictas?schema=${schema}&connection_limit=5`;
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
 * Valores que deben existir en cada enum.
 * Prisma `db push` no agrega valores nuevos a enums existentes, hay que hacer ALTER TYPE manual.
 */
const ENUM_VALUES: Record<string, string[]> = {
  MatterCategory: [
    "CIVIL_COMMERCIAL",
    "LABOR_ARBITRATION",
    "COMMERCIAL_ARBITRATION",
    "CRIMINAL",
    "ADMINISTRATIVE",
    "ADMINISTRATIVE_CLAIM",
    "NON_LITIGATION",
    "LEGAL_COUNSEL",
    "SPECIAL_PROJECT",
  ],
  UserRole: [
    "SYSTEM_ADMIN",
    "ADMIN",
    "PRINCIPAL_LAWYER",
    "LAWYER",
    "ASSISTANT",
    "FINANCE",
  ],
  ProcedureType: [
    "FIRST_INSTANCE",
    "SECOND_INSTANCE",
    "RETRIAL_REVIEW",
    "RETRIAL",
    "REMAND_FIRST",
    "REMAND_SECOND",
    "PROSECUTORIAL_SUPERVISION",
    "COMMERCIAL_ARBITRATION",
    "LABOR_ARBITRATION",
    "ARBITRATION_SET_ASIDE",
    "ARBITRATION_ENFORCEMENT_REVIEW",
    "ENFORCEMENT",
    "ENFORCEMENT_OBJECTION",
    "INVESTIGATION",
    "PROSECUTION_REVIEW",
    "DEATH_PENALTY_REVIEW",
    "CRIMINAL_ENFORCEMENT",
    "COMMUTATION_PAROLE_REVIEW",
    "ADMIN_RECONSIDERATION",
    "ADMIN_PRE_LITIGATION",
    "ADMIN_NON_LITIGATION_ENFORCEMENT",
    "NON_LITIGATION_PHASE",
    "CUSTOM",
  ],
  LitigationStanding: [
    "PLAINTIFF",
    "JOINT_PLAINTIFF",
    "DEFENDANT",
    "JOINT_DEFENDANT",
    "THIRD_PARTY",
    "COUNTERCLAIM_PLAINTIFF",
    "COUNTERCLAIM_DEFENDANT",
    "APPELLANT",
    "APPELLEE",
    "RETRIAL_APPLICANT",
    "RETRIAL_RESPONDENT",
    "ENFORCEMENT_APPLICANT",
    "EXECUTED_PERSON",
    "CRIMINAL_DEFENDANT",
    "CRIMINAL_VICTIM",
    "PRIVATE_PROSECUTOR",
    "CRIMINAL_INCIDENTAL_PLAINTIFF",
    "ARBITRATION_CLAIMANT",
    "ARBITRATION_RESPONDENT",
    "ADMIN_PLAINTIFF",
    "ADMIN_DEFENDANT",
    "ADMIN_RECONSIDERATION_APPLICANT",
    "ADMIN_RECONSIDERATION_RESPONDENT",
    "NON_LITIGATION_PARTY",
  ],
};

/**
 * Sincroniza los valores faltantes en los enums del tenant.
 * Prisma no lo hace automáticamente con db push.
 */
async function syncTenantEnums(schema: string): Promise<void> {
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

  for (const [enumName, values] of Object.entries(ENUM_VALUES)) {
    for (const value of values) {
      try {
        await client.query(
          `ALTER TYPE "${schema}"."${enumName}" ADD VALUE IF NOT EXISTS '${value}'`
        );
      } catch (err) {
        // Si el enum no existe todavía, lo salteamos (lo creará db push)
        const message = err instanceof Error ? err.message : String(err);
        if (!message.includes("does not exist")) {
          console.error(`[tenant] Error agregando ${enumName}.${value}:`, message);
        }
      }
    }
  }

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

  // Después del db push, sincronizar valores de enums que Prisma no agrega
  await syncTenantEnums(schema);
}
