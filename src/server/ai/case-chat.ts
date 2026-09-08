"use server";

import { requireSession } from "@/lib/auth/session";
import { getAiSettings } from "@/lib/ai/settings";
import { aiChat, AiNotConfiguredError } from "@/lib/ai/client";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getTenantPrisma } from "@/lib/tenant-prisma";

export async function chatWithCase(input: {
  matterId: string;
  documentTitle?: string;
  documentContent?: string;
  message: string;
}) {
  await requireSession();

  const prisma = await getTenantPrisma();
  const aiSettings = await getAiSettings();

  if (!aiSettings.configured) {
    throw new Error("IA no configurada");
  }

  const matter = await prisma.matter.findFirst({
    where: { id: input.matterId },
    select: {
      id: true,
      internalCode: true,
      title: true,
      category: true,
      status: true,
      claimAmount: true,
      cause: { select: { name: true } },
      primaryClient: { select: { name: true, idNumber: true, address: true } },
    },
  });

  if (!matter) throw new Error("Caso no encontrado");

  let caseContext = "";
  const jsonPath = join(process.cwd(), "storage", "matters", `${matter.internalCode}.json`);
  if (existsSync(jsonPath)) {
    caseContext = readFileSync(jsonPath, "utf-8");
  }

  const systemPrompt = `Sos un asistente legal argentino especializado en el caso "${matter.title}".
  
Datos del caso:
- Código interno: ${matter.internalCode}
- Categoría: ${matter.category}
- Estado: ${matter.status}
- Monto reclamado: ${matter.claimAmount ? `$${matter.claimAmount}` : "No especificado"}
- Causa: ${matter.cause?.name ?? "No especificada"}
- Cliente principal: ${matter.primaryClient?.name ?? "No especificado"}

${input.documentTitle ? `El usuario está editando el escrito: "${input.documentTitle}"` : ""}

Tu trabajo es asistir al usuario con TODO lo referido a este caso puntual.
Si el usuario pide completar un escrito, usá los datos del caso del JSON.
Si hace preguntas, respondé basándote en el JSON.
No inventes datos que no estén en el JSON.

Devolvé SOLO JSON:
{
  "response": "Tu respuesta al usuario",
  "editedContent": "Contenido HTML completo o null"
}`;

  try {
    const result = await aiChat({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `JSON del caso:\n${caseContext}\n\n${input.documentContent ? `Documento actual (HTML):\n${input.documentContent}\n\n` : ""}Instrucción: ${input.message}`,
        },
      ],
      temperature: 0.3,
      maxTokens: 4000,
      timeoutMs: 60_000,
    });

    const content = result.content;

    try {
      return JSON.parse(content);
    } catch {
      return { response: content, editedContent: null };
    }
  } catch (e) {
    if (e instanceof AiNotConfiguredError) {
      throw new Error("IA no configurada. Configurá la API key en Configuración > IA.");
    }
    throw e;
  }
}