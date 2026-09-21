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
    {
      id: "art_profundo",
      keywords: [
        "accidente in itinere",
        "enfermedad profesional",
        "incapacidad parcial permanente",
        "incapacidad total permanente",
        "gran invalidez",
        "comisiones medicas",
        "revision de incapacidad",
        "prestaciones medicas ART",
        "prestacion dineraria",
        "ingreso base",
        "IBM",
        "Ley 24557",
        "Ley 27348",
        "autoseguro",
        "empleador no asegurado",
        "responsabilidad civil empleador",
        "accion civil ART",
        "reparacion integral",
        "danio moral ART",
        "danio punitivo",
        "stress laboral",
        "burnout",
        "covid ART",
        "teletrabajo accidente",
        "violencia laboral",
      ],
      maxPages: 10,
      pageSize: 20,
      enabled: true,
    },
    {
      id: "transito_profundo",
      keywords: [
        "accidente de transito",
        "lesiones graves",
        "incapacidad transito",
        "danio moral transito",
        "danio estetico",
        "danio psicologico",
        "lucro cesante",
        "perdida de chance",
        "valor vida",
        "seguro obligatorio",
        "seguro voluntario",
        "franquicia",
        "responsabilidad objetiva",
        "eximentes",
        "culpa de la victima",
        "caso fortuito",
        "peaton atropellado",
        "motociclista accidente",
        "ciclista accidente",
        "transporte publico accidente",
        "taxi accidente",
        "uber accidente",
        "delivery accidente",
        "fuga del responsable",
        "sin seguro",
        "consorcio de reparacion",
      ],
      maxPages: 10,
      pageSize: 20,
      enabled: true,
    },
    {
      id: "sucesiones",
      keywords: [
        "sucesion ab intestato",
        "sucesion testamentaria",
        "declaratoria de herederos",
        "testamento",
        "albacea",
        "legitima",
        "porcion disponible",
        "colacion",
        "particion",
        "particion extrajudicial",
        "cesion de derechos hereditarios",
        "renuncia a la herencia",
        "aceptacion de herencia",
        "beneficio de inventario",
        "desheredamiento",
        "indignidad",
        "nulidad de testamento",
        "reduccion de donaciones",
        "accion de reforma",
        "usufructo del conyuge",
        "porcion conyugal",
        "bien de familia",
        "sucesion internacional",
        "impuesto a la herencia",
      ],
      maxPages: 8,
      pageSize: 20,
      enabled: true,
    },
    {
      id: "contratos",
      keywords: [
        "incumplimiento contractual",
        "resolucion contractual",
        "rescision contractual",
        "mora",
        "intimacion",
        "danos y perjuicios contractual",
        "clausula penal",
        "seña",
        "arras",
        "compraventa inmueble",
        "boleto de compraventa",
        "locacion",
        "desalojo",
        "consignacion",
        "contrato de obra",
        "contrato de servicios",
        "contrato de mutuo",
        "contrato de comodato",
        "contrato de deposito",
        "contrato de mandato",
        "contrato de distribucion",
        "contrato de agencia",
        "contrato de franquicia",
        "contrato de leasing",
        "contrato de factoring",
        "contrato de fideicomiso",
        "contrato de renta vitalicia",
      ],
      maxPages: 8,
      pageSize: 20,
      enabled: true,
    },
    {
      id: "danios_perjuicios",
      keywords: [
        "responsabilidad civil",
        "responsabilidad extracontractual",
        "factor de atribucion",
        "nexo causal",
        "danio moral",
        "danio estetico",
        "danio psicologico",
        "danio biologico",
        "danio a la salud",
        "perdida de chance",
        "lucro cesante",
        "danio emergente",
        "valor vida",
        "danio punitivo",
        "danio colectivo",
        "danio ambiental",
        "danio por productos",
        "responsabilidad por cosas",
        "responsabilidad por animales",
        "responsabilidad de establecimientos",
        "responsabilidad medica",
        "mala praxis",
        "responsabilidad del estado",
        "responsabilidad de los padres",
        "responsabilidad de los docentes",
      ],
      maxPages: 8,
      pageSize: 20,
      enabled: true,
    },
    {
      id: "consumidor",
      keywords: [
        "Ley 24240",
        "defensa del consumidor",
        "relacion de consumo",
        "contrato de adhesion",
        "clausulas abusivas",
        "publicidad engañosa",
        "informacion al consumidor",
        "derecho de arrepentimiento",
        "garantia legal",
        "vicios redhibitorios",
        "responsabilidad del proveedor",
        "danio punitivo consumidor",
        "acciones colectivas consumidor",
        "consumo bancario",
        "tarjeta de credito",
        "prestamo abusivo",
        "usura",
        "telefonia",
        "internet",
        "servicios publicos",
        "seguros",
        "turismo",
        "transporte aereo",
        "comercio electronico",
        "whatsapp comercio",
      ],
      maxPages: 8,
      pageSize: 20,
      enabled: true,
    },
    {
      id: "administrativo",
      keywords: [
        "procedimiento administrativo",
        "acto administrativo",
        "nulidad de acto administrativo",
        "revocacion",
        "recurso jerarquico",
        "recurso de alzada",
        "silencio administrativo",
        "amparo por mora",
        "responsabilidad del estado",
        "falta de servicio",
        "expropiacion",
        "servidumbre administrativa",
        "poder de policia",
        "sanciones administrativas",
        "empleo publico",
        "concursos docentes",
        "contrataciones del estado",
        "obra publica",
        "licitacion publica",
        "habilitaciones",
        "multas administrativas",
        "clausura",
        "defensa del usuario",
        "tribunales administrativos",
      ],
      maxPages: 8,
      pageSize: 20,
      enabled: true,
    },
    {
      id: "tributario",
      keywords: [
        "procedimiento tributario",
        "determinacion de oficio",
        "impugnacion",
        "recurso de reconsideracion",
        "recurso de apelacion",
        "tribunal fiscal",
        "prescripcion tributaria",
        "caducidad",
        "responsabilidad solidaria",
        "responsabilidad subsidiaria",
        "exencion impositiva",
        "impuesto a las ganancias",
        "IVA",
        "impuesto a los bienes personales",
        "ingresos brutos",
        "impuesto inmobiliario",
        "tasa de justicia",
        "multas tributarias",
        "clausura fiscal",
        "ejecucion fiscal",
        "medidas cautelares tributarias",
        "plan de regularizacion",
        "moratoria",
        "blanqueo",
        "convenio multilateral",
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