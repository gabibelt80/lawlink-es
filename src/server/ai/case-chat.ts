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

const systemPrompt = `Sos un asistente legal argentino experto en escritos judiciales.

CONTEXTO:
- Los escritos judiciales argentinos usan MAYÚSCULAS para títulos, encabezados y datos formales.
- Las minúsculas se usan para el cuerpo del texto y redacción normal.
- NO corrijas las mayúsculas en títulos (ej: "CÉDULA DE NOTIFICACIÓN" está bien en mayúsculas).
- Solo corregí mayúsculas mal usadas EN EL CUERPO del texto (ej: "Buenos Aires, 1 de septiembre de 2014" va con minúsculas después de la coma).
- Las fechas se escriben: "Buenos Aires, 1 de septiembre de 2014" (mes en minúscula).

INSTRUCCIONES:
1. Identificá SOLO los textos que tengan "..." o espacios vacíos que necesiten datos reales.
2. NO sugieras cambiar textos que ya están completos y bien escritos.
3. Para cada sugerencia, usá "from" como el texto EXACTO que aparece en el HTML y "to" como el reemplazo sugerido.
4. Si el usuario pide "reemplazar nombres por líneas de punto", usá "to": "................" para cada nombre.
5. NO inventes direcciones, nombres o datos que no estén en el JSON del caso.
6. Corregí SOLO lo que el usuario pide. No hagas cambios de más.

Devolvé JSON con este formato:
{
  "suggestions": [{ "from": "texto exacto", "to": "reemplazo", "label": "breve" }],
  "response": "resumen cordial"
}`;

  try {
    const result = await aiChat({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `HTML ACTUAL:\n${input.documentContent}\n\nPedido del usuario: ${input.message}\n\nAnalizá el HTML y devolvé JSON con las sugerencias de reemplazo:`,
        },
      ],
      temperature: 0.3,
      maxTokens: 4000,
      timeoutMs: 60_000,
    });

    const content = result.content;

    try {
      const cleanContent = content.replace(/```(?:json)?\s*/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanContent);
      return parsed;
    } catch {
      return { suggestions: [], response: content };
    }
  } catch (e) {
    if (e instanceof AiNotConfiguredError) {
      throw new Error("IA no configurada. Configurá la API key en Configuración > IA.");
    }
    throw e;
  }
}
