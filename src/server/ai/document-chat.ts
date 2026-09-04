"use server";

import { requireSession } from "@/lib/auth/session";
import { getAiSettings } from "@/lib/ai/settings";

export async function chatWithDocument(input: {
  documentContent: string;
  documentTitle: string;
  message: string;
}) {
  await requireSession();

  const aiSettings = await getAiSettings();

  if (!aiSettings.configured) {
    throw new Error("IA no configurada. Configure la API key en Configuración > IA.");
  }

  const systemPrompt = `Sos un asistente legal especialista en redacción de documentos jurídicos argentinos.
  
  El documento se llama "${input.documentTitle}".
  
  Tus capacidades:
  - Corregir errores ortográficos y gramaticales
  - Mejorar la redacción legal
  - Ajustar formato según normas procesales argentinas
  - Sugerir argumentos jurídicos
  - Completar secciones faltantes
  - Adaptar el lenguaje al ámbito judicial
  
  Devolvé SOLO JSON con este formato exacto:
  {
    "response": "Tu respuesta al usuario explicando qué hiciste",
    "editedContent": "El contenido HTML completo con los cambios aplicados, o null si no hay cambios"
  }
  
  IMPORTANTE: 
  - Mantené el formato HTML
  - No inventes hechos ni datos
  - Si no estás seguro de algo, preguntá
  - Los cambios deben ser conservadores y profesionales`;

  const response = await fetch(aiSettings.baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${aiSettings.apiKey}`,
    },
    body: JSON.stringify({
      model: aiSettings.textModel,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Documento actual (HTML):\n${input.documentContent}\n\nInstrucción: ${input.message}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error al comunicarse con la IA: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  try {
    return JSON.parse(content);
  } catch {
    return {
      response: content,
      editedContent: null,
    };
  }
}