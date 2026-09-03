import { getTenantPrisma } from "@/lib/tenant";

async function main() {
  const prisma = getTenantPrisma("juridictas");

  const settings = [
    {
      key: "firmProfile",
      value: {
        firmName: "Juridictas",
        firmSubtitle: "Panel de trabajo jurÃ­dico",
        logoDataUrl: null,
        matterCodePrefix: "LL",
        firmShortName: "",
        caseNoTemplate: "{aÃ±o}-{est}{palabraCat}-{sec3}",
        categoryWords: {
          CIVIL_COMMERCIAL: "Civil",
          LABOR_ARBITRATION: "Laboral",
          COMMERCIAL_ARBITRATION: "Comercial",
          CRIMINAL: "Penal",
          ADMINISTRATIVE: "Admin",
          NON_LITIGATION: "NoCont",
          LEGAL_COUNSEL: "AsesorÃ­a",
          SPECIAL_PROJECT: "Proyecto",
        },
      },
    },
    {
      key: "notifyWebhook",
      value: {
        enabled: false,
        url: "",
      },
    },
    {
      key: "workflowToggles",
      value: {
        externalContactReview: false,
      },
    },
    {
      key: "aiSettings",
      value: {
        apiKeyCipher: null,
        apiKeyMasked: "",
        baseUrl: "https://api.openai.com/v1",
        textModel: "gpt-4o-mini",
        visionModel: "gpt-4o",
      },
    },
    {
      key: "yuandianSettings",
      value: {
        apiKeyCipher: null,
        apiKeyMasked: "",
        baseUrl: "https://open.chineselaw.com",
        caseDetailHost: "https://www.chineselaw.com",
      },
    },
    {
      key: "expressSettings",
      value: {
        kdniao: {
          ebusinessId: "",
          appKeyCipher: null,
          appKeyMasked: "",
        },
        kuaidi100: {
          customer: "",
          keyCipher: null,
          keyMasked: "",
        },
      },
    },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }

  console.log("Configuraciones creadas en el schema del estudio");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
