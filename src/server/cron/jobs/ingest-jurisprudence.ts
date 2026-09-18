import { prisma } from "@/lib/prisma";
import { ingestFromSaij } from "@/lib/saij/ingest";

/**
 * Job de ingesta automatica de jurisprudencia desde SAIJ.
 *
 * Lee la config del SystemSetting `jurisprudenceAgentConfig`:
 *   {
 *     enabled: boolean,
 *     agents: [
 *       { id, keywords, maxPages, pageSize, enabled }
 *     ]
 *   }
 *
 * Por cada agente activo, corre la ingesta. Sin IA, solo SAIJ + DB.
 */

interface AgentConfig {
  id: string;
  keywords: string[];
  maxPages: number;
  pageSize: number;
  enabled: boolean;
}

interface JurisprudenceAgentConfig {
  enabled: boolean;
  agents: AgentConfig[];
}

const DEFAULT_CONFIG: JurisprudenceAgentConfig = {
  enabled: true,
  agents: [
    {
      id: "laboral",
      keywords: [
        "despido con causa",
        "injuria laboral",
        "perdida de confianza",
        "despido sin causa",
        "trabajo no registrado",
        "accidente de trabajo",
        "enfermedad profesional",
        "diferencias salariales",
      ],
      maxPages: 8,
      pageSize: 20,
      enabled: true,
    },
    {
      id: "civil_casacion",
      keywords: [
        "recurso de casacion",
        "admisibilidad del recurso",
        "recurso extraordinario",
        "arbitrariedad manifiesta",
      ],
      maxPages: 8,
      pageSize: 20,
      enabled: true,
    },
    {
      id: "penal",
      keywords: [
        "garantias constitucionales",
        "debido proceso",
        "prision preventiva",
        "nulidad absoluta",
        "legitima defensa",
        "abuso sexual",
        "homicidio culposo",
      ],
      maxPages: 8,
      pageSize: 20,
      enabled: true,
    },
    {
      id: "familia",
      keywords: [
        "divorcio",
        "alimentos",
        "cuidado personal",
        "regimen de comunicacion",
        "filiacion",
        "adopcion",
        "violencia familiar",
        "compensacion economica",
      ],
      maxPages: 8,
      pageSize: 20,
      enabled: true,
    },
    {
      id: "civil_general",
      keywords: [
        "danos y perjuicios",
        "responsabilidad civil",
        "incumplimiento contractual",
        "prescripcion",
        "usucapion",
        "propiedad horizontal",
        "consorcio",
        "contrato de locacion",
      ],
      maxPages: 8,
      pageSize: 20,
      enabled: true,
    },
    {
      id: "comercial",
      keywords: [
        "concurso preventivo",
        "quiebra",
        "verificacion de credito",
        "sociedad comercial",
        "cheque rechazado",
        "contrato de seguro",
        "responsabilidad del director",
      ],
      maxPages: 8,
      pageSize: 20,
      enabled: true,
    },
    {
      id: "amparo",
      keywords: [
        "amparo",
        "medida cautelar",
        "habeas corpus",
        "habeas data",
        "accion de clase",
      ],
      maxPages: 8,
      pageSize: 20,
      enabled: true,
    },
  ],
};

const SETTING_KEY = "jurisprudenceAgentConfig";

async function readConfig(): Promise<JurisprudenceAgentConfig> {
  const row = await prisma.systemSetting.findUnique({
    where: { key: SETTING_KEY },
  });
  if (!row || !row.value) return DEFAULT_CONFIG;
  const stored = row.value as Partial<JurisprudenceAgentConfig>;
  return {
    enabled: stored.enabled ?? DEFAULT_CONFIG.enabled,
    agents: stored.agents ?? DEFAULT_CONFIG.agents,
  };
}

export async function ingestJurisprudence() {
  // Verificar si algun firm tiene el modulo activo
  const firmsWithModule = await prisma.firmModuleSubscription.count({
    where: {
      moduleKey: "JURISPRUDENCE",
      active: true,
    },
  });

  if (firmsWithModule === 0) {
    console.log("[cron] Ningun estudio tiene JURISPRUDENCE activo. Saltando.");
    return {
      enabled: false,
      agentsRun: 0,
      totalNew: 0,
      totalSkip: 0,
      errors: [] as string[],
    };
  }
  const config = await readConfig();

  if (!config.enabled) {
    console.log("[cron] Ingesta de jurisprudencia desactivada");
    return {
      enabled: false,
      agentsRun: 0,
      totalNew: 0,
      totalSkip: 0,
      errors: [] as string[],
    };
  }

  const activeAgents = config.agents.filter((a) => a.enabled);

  const results = {
    enabled: true,
    agentsRun: 0,
    totalNew: 0,
    totalSkip: 0,
    errors: [] as string[],
  };

  for (const agent of activeAgents) {
    try {
      console.log(`[cron] Agente jurisprudencia: ${agent.id}`);

      for (const keyword of agent.keywords) {
        const query = `titulo:${keyword}`;

        const result = await ingestFromSaij({
          query,
          filter: "Total|Tipo de Documento/Jurisprudencia",
          agentId: agent.id,
          maxPages: agent.maxPages,
          pageSize: agent.pageSize,
        });

        if (result.status === "ok") {
          results.totalNew += result.totalNew;
          results.totalSkip += result.totalSkip;
        } else if (result.error) {
          results.errors.push(`${agent.id}/${keyword}: ${result.error}`);
        }
      }

      results.agentsRun++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`${agent.id}: ${msg}`);
      console.error(`[cron] Error en agente ${agent.id}:`, msg);
    }
  }

  console.log("[cron] Ingesta jurisprudencia completada:", results);
  return results;
}