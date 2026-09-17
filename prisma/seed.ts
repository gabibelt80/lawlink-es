/**
 * Seed inicial de LawLink
 *
 * Contenido:
 *   1. ADMIN por defecto (lee de variables SEED_ADMIN_*)
 *   2. Catalogo de causas de muestra: civil / penal / administrativo (~30 causas)
 *      (V1 usa muestras; el catalogo completo se importara via MCP en Stage 3)
 *   3. Plantillas de etapas, configuracion del sistema, plantillas de documentos
 *      y configuracion de sellos
 *
 * Ejecucion:
 *   npx prisma db seed
 *
 * Idempotente: todos los upsert se pueden repetir sin errores ni duplicados.
 */

import { MatterCategory, PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { civilCauses } from "./seeds/causes-civil";
import { criminalCauses } from "./seeds/causes-criminal";
import { administrativeCauses } from "./seeds/causes-administrative";

const prisma = new PrismaClient();

type CauseSeed = {
  code: string;
  name: string;
  shortName?: string;
  level: number;
  parentCode?: string;
  keywords?: string[];
};

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@lawlink.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!2026";
  const name = process.env.SEED_ADMIN_NAME ?? "Administrador";

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name,
      role: UserRole.ADMIN,
      passwordHash,
      active: true,
    },
  });

  console.log(`OK ADMIN listo: ${admin.email}`);
  if (password === "ChangeMe!2026") {
    console.warn(
      "  AVISO: usando password por defecto ChangeMe!2026. Cambiar en /settings."
    );
  }
}

async function seedCauses(category: MatterCategory, causes: CauseSeed[]) {
  // Primera pasada: insertar todos los nodos (parentId vacio), registrar code -> id
  const codeToId = new Map<string, string>();
  const sourceNote =
    category === MatterCategory.CIVIL_COMMERCIAL
      ? "Reglamento de causas civiles (muestra)"
      : category === MatterCategory.CRIMINAL
        ? "Tipos penales de la parte especial del Codigo Penal (muestra)"
        : "Reglamento de causas administrativas (muestra)";

  for (const c of causes) {
    const upserted = await prisma.causeOfAction.upsert({
      where: { category_code: { category, code: c.code } },
      update: {
        name: c.name,
        shortName: c.shortName,
        level: c.level,
        keywords: c.keywords ?? [],
        sourceNote,
      },
      create: {
        category,
        code: c.code,
        name: c.name,
        shortName: c.shortName,
        level: c.level,
        keywords: c.keywords ?? [],
        sourceNote,
      },
    });
    codeToId.set(c.code, upserted.id);
  }

  // Segunda pasada: conectar parentId
  for (const c of causes) {
    if (!c.parentCode) continue;
    const parentId = codeToId.get(c.parentCode);
    if (!parentId) {
      console.warn(
        `  Aviso: ${c.code} tiene parent ${c.parentCode} no encontrado, se omite`
      );
      continue;
    }
    await prisma.causeOfAction.update({
      where: { category_code: { category, code: c.code } },
      data: { parentId },
    });
  }

  console.log(`OK Causas [${category}]: ${causes.length} listas`);
}

async function seedStageTemplates() {
  // Primera version: solo las plantillas mas comunes de primera/segunda
  // instancia, investigacion y revision de acusacion.
  // Editable en /settings/templates
  const templates = [
    {
      procedureType: "FIRST_INSTANCE" as const,
      name: "Etapas estandar de primera instancia",
      steps: [
        {
          name: "Presentacion del caso",
          order: 1,
          defaultTasks: ["Enviar la demanda", "Pagar las tasas judiciales"],
        },
        {
          name: "Contestacion",
          order: 2,
          defaultTasks: ["Confirmar la recepcion de la notificacion judicial"],
        },
        {
          name: "Intercambio de pruebas",
          order: 3,
          defaultTasks: [
            "Enviar el indice de pruebas",
            "Completar las pruebas dentro del plazo",
          ],
        },
        {
          name: "Audiencia",
          order: 4,
          defaultTasks: [
            "Conferencia previa a la audiencia",
            "Celebrar la audiencia formal",
          ],
        },
        {
          name: "Sentencia",
          order: 5,
          defaultTasks: ["Recibir la sentencia", "Confirmar si se apelara"],
        },
      ],
    },
    {
      procedureType: "SECOND_INSTANCE" as const,
      name: "Etapas estandar de segunda instancia",
      steps: [
        {
          name: "Presentacion del caso",
          order: 1,
          defaultTasks: ["Enviar el escrito de apelacion"],
        },
        {
          name: "Contestacion",
          order: 2,
          defaultTasks: [
            "Recibir el escrito de apelacion de la contraparte",
            "Enviar el escrito de contestacion",
          ],
        },
        {
          name: "Audiencia/consulta",
          order: 3,
          defaultTasks: ["Celebrar la audiencia o el juicio escrito"],
        },
        {
          name: "Sentencia",
          order: 4,
          defaultTasks: ["Recibir la sentencia de segunda instancia"],
        },
      ],
    },
    {
      procedureType: "INVESTIGATION" as const,
      name: "Procedimiento estandar de la etapa de investigacion",
      steps: [
        {
          name: "Entrevistas",
          order: 1,
          defaultTasks: ["Primera entrevista", "Entrevistas de seguimiento"],
        },
        {
          name: "Medidas cautelares",
          order: 2,
          defaultTasks: [
            "Solicitar libertad bajo fianza",
            "Revision de la necesidad de la prision preventiva",
          ],
        },
        {
          name: "Cierre de la investigacion",
          order: 3,
          defaultTasks: ["Presentar las observaciones de la defensa"],
        },
      ],
    },
    {
      procedureType: "PROSECUTION_REVIEW" as const,
      name: "Procedimiento estandar de revision de la acusacion",
      steps: [
        {
          name: "Revision del expediente",
          order: 1,
          defaultTasks: ["Revisar el expediente", "Copiar las pruebas"],
        },
        {
          name: "Observaciones de la defensa",
          order: 2,
          defaultTasks: [
            "Presentar observaciones para el sobreseimiento o una pena menor",
          ],
        },
        {
          name: "Reconocimiento de culpabilidad y aceptacion de la pena",
          order: 3,
          defaultTasks: [
            "Firmar el acta de compromiso (si se reconoce la culpabilidad)",
          ],
        },
      ],
    },
  ];

  for (const t of templates) {
    await prisma.stageTemplate.upsert({
      where: { id: `default-${t.procedureType}` },
      update: { steps: t.steps as unknown as object, name: t.name },
      create: {
        id: `default-${t.procedureType}`,
        procedureType: t.procedureType,
        name: t.name,
        isDefault: true,
        steps: t.steps as unknown as object,
      },
    });
  }
  console.log(`OK Plantillas de etapas: ${templates.length} listas`);
}

async function seedSystemSettings() {
  await prisma.systemSetting.upsert({
    where: { key: "appearance" },
    update: {},
    create: {
      key: "appearance",
      value: { primaryColor: "#5B8DEF", theme: "dark" },
    },
  });
  console.log("OK Configuracion del sistema: apariencia por defecto lista");
}

async function main() {
  console.log("Iniciando seed...\n");

  await seedAdmin();
  await seedCauses(MatterCategory.CIVIL_COMMERCIAL, civilCauses);
  await seedCauses(MatterCategory.CRIMINAL, criminalCauses);
  await seedCauses(MatterCategory.ADMINISTRATIVE, administrativeCauses);
  await seedStageTemplates();
  await seedSystemSettings();

  // v0.8: plantillas de documentos y configuracion de sellos
  const { seedV08Templates, seedV08SealConfigs } =
    await import("./seeds/v08-templates-and-seals");
  await seedV08SealConfigs(prisma);
  await seedV08Templates(prisma);

  // v0.49: reglas de plazos legales (verificadas)
  const { seedV49DeadlineRules } = await import("./seeds/v49-deadline-rules");
  await seedV49DeadlineRules(prisma);

  console.log("\nSeed completado");
}

main()
  .catch((e) => {
    console.error("Seed fallido:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });