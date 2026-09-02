/**
 * LawLink 初始 seed
 *
 * 包含：
 *   1. 默认 ADMIN 账号（从 SEED_ADMIN_* 环境变量读取）
 *   2. 案由库样本：民事 / 刑事 / 行政 各约 30 条最常用案由
 *      （V1 用样本即可工作；完整案由库 Stage 3 通过元典 MCP 抓取）
 *   3. 阶段模板、系统设置、文书模板和用章配置
 *
 * 运行方式：
 *   npx prisma db seed
 *
 * 幂等：所有 upsert 操作，可重复运行不会报错或重复插入。
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

  console.log(`✓ ADMIN 已就绪：${admin.email}`);
  if (password === "ChangeMe!2026") {
    console.warn("  ⚠ 当前使用默认密码 ChangeMe!2026，请尽快在 /settings 修改");
  }
}

async function seedCauses(category: MatterCategory, causes: CauseSeed[]) {
  // 第一遍：插入所有节点（parentId 暂空），记录 code → id 映射
  const codeToId = new Map<string, string>();
  const sourceNote =
    category === MatterCategory.CIVIL_COMMERCIAL
      ? "Reglamento de causas de asuntos civiles del Tribunal Supremo Popular, revisado en 2020 (muestra)"
      : category === MatterCategory.CRIMINAL
        ? "Tipos penales de la parte especial del Código Penal (muestra)"
        : "Reglamento provisional de causas de asuntos administrativos del Tribunal Supremo Popular de 2021 (muestra)";

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

  // 第二遍：连接 parent
  for (const c of causes) {
    if (!c.parentCode) continue;
    const parentId = codeToId.get(c.parentCode);
    if (!parentId) {
      console.warn(`  ! ${c.code} 的 parent ${c.parentCode} 未找到，跳过`);
      continue;
    }
    await prisma.causeOfAction.update({
      where: { category_code: { category, code: c.code } },
      data: { parentId },
    });
  }

  console.log(`✓ 案由 [${category}]：${causes.length} 条已就绪`);
}

async function seedStageTemplates() {
  // 第一版只放最常用的一审/二审/侦查/审查起诉默认模板
  // 编辑入口在 /settings/templates
  const templates = [
    {
      procedureType: "FIRST_INSTANCE" as const,
      name: "Etapas estándar de primera instancia",
      steps: [
        {
          name: "Presentación del caso",
          order: 1,
          defaultTasks: ["Enviar la demanda", "Pagar las tasas judiciales"],
        },
        {
          name: "Contestación",
          order: 2,
          defaultTasks: ["Confirmar la recepción de la notificación judicial"],
        },
        {
          name: "Intercambio de pruebas",
          order: 3,
          defaultTasks: [
            "Enviar el índice de pruebas",
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
          defaultTasks: ["Recibir la sentencia", "Confirmar si se apelará"],
        },
      ],
    },
    {
      procedureType: "SECOND_INSTANCE" as const,
      name: "Etapas estándar de segunda instancia",
      steps: [
        {
          name: "Presentación del caso",
          order: 1,
          defaultTasks: ["Enviar el escrito de apelación"],
        },
        {
          name: "Contestación",
          order: 2,
          defaultTasks: [
            "Recibir el escrito de apelación de la contraparte",
            "Enviar el escrito de contestación",
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
      name: "Procedimiento estándar de la etapa de investigación",
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
            "Revisión de la necesidad de la prisión preventiva",
          ],
        },
        {
          name: "Cierre de la investigación",
          order: 3,
          defaultTasks: ["Presentar las observaciones de la defensa"],
        },
      ],
    },
    {
      procedureType: "PROSECUTION_REVIEW" as const,
      name: "Procedimiento estándar de la etapa de revisión de la acusación",
      steps: [
        {
          name: "Revisión del expediente",
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
          name: "Reconocimiento de culpabilidad y aceptación de la pena",
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
  console.log(`✓ 阶段模板：${templates.length} 个已就绪`);
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
  console.log("✓ 系统设置：默认外观已就绪");
}

async function main() {
  console.log("开始 seed...\n");

  await seedAdmin();
  await seedCauses(MatterCategory.CIVIL_COMMERCIAL, civilCauses);
  await seedCauses(MatterCategory.CRIMINAL, criminalCauses);
  await seedCauses(MatterCategory.ADMINISTRATIVE, administrativeCauses);
  await seedStageTemplates();
  await seedSystemSettings();

  // v0.8: 文档模板 + 用章配置
  const { seedV08Templates, seedV08SealConfigs } =
    await import("./seeds/v08-templates-and-seals");
  await seedV08SealConfigs(prisma);
  await seedV08Templates(prisma);

  // v0.49: 法定期限规则库（全部经元典核验）
  const { seedV49DeadlineRules } = await import("./seeds/v49-deadline-rules");
  await seedV49DeadlineRules(prisma);

  console.log("\n✓ Seed 完成");
}

main()
  .catch((e) => {
    console.error("✗ Seed 失败：", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
