"use server";

import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { encryptBuffer } from "@/lib/storage/crypto";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getAiSettings } from "@/lib/ai/settings";

type AgentsConfig = {
  editorEnabled: boolean;
  editorModel: string;
  editorApiKeyCipher?: { ct: string; iv: string; tag: string } | null;
  auditorEnabled: boolean;
  auditorModel: string;
  auditorApiKeyCipher?: { ct: string; iv: string; tag: string } | null;
};

const agentsSchema = z.object({
  editorEnabled: z.boolean(),
  editorModel: z.string(),
  editorApiKey: z.string().optional().or(z.literal("")),
  auditorEnabled: z.boolean(),
  auditorModel: z.string(),
  auditorApiKey: z.string().optional().or(z.literal("")),
});

export async function saveAgentsConfigAction(input: z.infer<typeof agentsSchema>) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();

  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new Error("Solo el Administrador puede configurar agentes");
  }

  const data = agentsSchema.parse(input);

  // Cifrar las API keys
  const encryptedEditorKey = data.editorApiKey?.trim()
    ? encryptBuffer(Buffer.from(data.editorApiKey.trim(), "utf-8"))
    : null;
  const encryptedAuditorKey = data.auditorApiKey?.trim()
    ? encryptBuffer(Buffer.from(data.auditorApiKey.trim(), "utf-8"))
    : null;

  const value: AgentsConfig = {
    editorEnabled: data.editorEnabled,
    editorModel: data.editorModel,
    editorApiKeyCipher: encryptedEditorKey ? {
      ct: encryptedEditorKey.ciphertext.toString("base64"),
      iv: encryptedEditorKey.iv.toString("base64"),
      tag: encryptedEditorKey.authTag.toString("base64"),
    } : null,
    auditorEnabled: data.auditorEnabled,
    auditorModel: data.auditorModel,
    auditorApiKeyCipher: encryptedAuditorKey ? {
      ct: encryptedAuditorKey.ciphertext.toString("base64"),
      iv: encryptedAuditorKey.iv.toString("base64"),
      tag: encryptedAuditorKey.authTag.toString("base64"),
    } : null,
  };

  await prisma.systemSetting.upsert({
    where: { key: "aiAgents" },
    update: { value: value as unknown as object },
    create: { key: "aiAgents", value: value as unknown as object },
  });

  return { ok: true };
}

const DEFAULT_AGENTS_CONFIG: AgentsConfig = {
  editorEnabled: true,
  editorModel: "deepseek-chat",
  auditorEnabled: true,
  auditorModel: "claude-3-5-sonnet-20241022",
};

export async function getAgentsConfig(): Promise<AgentsConfig> {
  const prisma = await getTenantPrisma();
  const row = await prisma.systemSetting.findUnique({
    where: { key: "aiAgents" },
  });
  return (row?.value as unknown as AgentsConfig) ?? DEFAULT_AGENTS_CONFIG;
}

export async function getAgentsStatus() {
  const config = await getAgentsConfig();

  return [
    {
      name: "Editor Legal",
      icon: "editor" as const,
      enabled: config.editorEnabled ?? true,
      tokensUsed: 0,
      tokensLimit: 100000,
      status: "idle" as const,
      lastAction: "Esperando instrucciones",
      lastActionAt: null,
      successRate: 98,
      avgResponseTime: 2.5,
    },
    {
      name: "Auditor Legal",
      icon: "auditor" as const,
      enabled: config.auditorEnabled ?? true,
      tokensUsed: 0,
      tokensLimit: 100000,
      status: "idle" as const,
      lastAction: "Esperando instrucciones",
      lastActionAt: null,
      successRate: 95,
      avgResponseTime: 3.2,
    },
  ];
}

export async function askAgentAboutCase(input: {
  agentType: "editor" | "auditor";
  matterId: string;
  question: string;
}) {
  const prisma = await getTenantPrisma();
  const session = await requireSession();

  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new Error("Solo el Administrador puede consultar agentes");
  }

  // Obtener configuración del agente
  const config = await getAgentsConfig();
  const agentConfig = input.agentType === "editor"
    ? { model: config.editorModel, enabled: config.editorEnabled }
    : { model: config.auditorModel, enabled: config.auditorEnabled };

  if (!agentConfig.enabled) {
    throw new Error("Agente deshabilitado");
  }

  // Leer el caso (puede ser id o internalCode)
  const matter = await prisma.matter.findFirst({
    where: {
      OR: [
        { id: input.matterId },
        { internalCode: input.matterId },
        { firmCaseNo: input.matterId }
      ]
    },
    select: {
      id: true,
      internalCode: true,
      title: true,
      status: true,
      claimAmount: true,
      category: true,
      firmCaseNo: true,
      cause: { select: { name: true } },
      primaryClient: { select: { name: true, idNumber: true } },
    },
  });
  if (!matter) throw new Error("Caso no encontrado");

  // Leer el JSON del caso
  const jsonPath = join(process.cwd(), "storage", "matters", `${matter.internalCode}.json`);
  const caseJson = existsSync(jsonPath) ? readFileSync(jsonPath, "utf-8") : "No hay JSON disponible para este caso";

  // Construir prompt según el agente
  const systemPrompt = input.agentType === "editor"
    ? `Sos el Editor Legal, especialista en redactar y completar escritos judiciales argentinos.
Tu función es analizar el caso completo, identificar qué documentos faltan, y responder con un detalle profesional.
Siempre respondé en español argentino con lenguaje jurídico formal.
Incluí en tu respuesta:
1. Resumen del caso
2. Documentos existentes
3. Documentos faltantes
4. Acciones recomendadas
5. Riesgos detectados`
    : `Sos el Auditor Legal, especialista en revisar documentos y detectar errores, faltantes o inconsistencias.
Tu función es auditar el caso completo y responder con un detalle profesional.
Siempre respondé en español argentino con lenguaje jurídico formal.
Incluí en tu respuesta:
1. Estado general del caso
2. Errores detectados
3. Datos faltantes
4. Inconsistencias
5. Recomendaciones`;

  // Usar la configuración de IA general
  const aiSettings = await getAiSettings();

  if (!aiSettings.configured) {
    throw new Error("IA no configurada. Configure la API key en Configuración > IA.");
  }

  const response = await fetch(aiSettings.baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${aiSettings.apiKey}`,
    },
    body: JSON.stringify({
      model: agentConfig.model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Caso: ${matter.title}\nCódigo interno: ${matter.internalCode}\nN° de caso: ${matter.firmCaseNo ?? "No asignado"}\nCategoría: ${matter.category}\nEstado: ${matter.status}\nMonto: ${matter.claimAmount ? `$${matter.claimAmount}` : "No especificado"}\nCausa: ${matter.cause?.name ?? "No especificada"}\nCliente: ${matter.primaryClient?.name ?? "No especificado"}\n\nJSON del caso:\n${caseJson}\n\nPregunta del usuario: ${input.question}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    throw new Error("Error al comunicarse con la IA");
  }

  const data = await response.json();
  return { response: data.choices[0].message.content };
}