/**
 * v0.26: Prompts de revisión de documentos legales (adaptado a Argentina)
 *
 * Basado en el Código Procesal Civil y Comercial de la Nación (Ley 17.454)
 * y la legislación argentina vigente.
 *
 * 4 tipos de hallazgos (MISSING / RISK / ISSUE / SUGGESTION) y 3 niveles de severidad
 * son consistentes en todos los prompts. Cada prompt cambia solo la sección de "qué revisar".
 */
import type { DocumentCategory } from "@prisma/client";

const OUTPUT_FORMAT_BLOCK = `Devolvé únicamente el siguiente array JSON (sin explicaciones adicionales):
[
  {"type": "MISSING" | "RISK" | "ISSUE" | "SUGGESTION", "severity": "HIGH" | "MEDIUM" | "LOW", "title": "Título breve (máx. 10 palabras)", "detail": "Descripción específica (máx. 60 palabras), puede incluir fragmento del texto"},
  ...
]

Reglas:
- Total de ítems: entre 4 y 10, ordenados de mayor a menor severidad
- Deben ser específicos del documento analizado, no generalidades
- Si no hay hallazgos relevantes, devolvé un array vacío []
- El título debe ser descriptivo, no un número de ítem`;

/** Contrato: incumplimiento / resolución de disputas / plazos / garantías / cumplimiento / fuerza mayor */
export const CONTRACT_PROMPT = `Sos un abogado con amplia experiencia en derecho contractual argentino, revisando un contrato (compraventa, prestación de servicios, mutuo, locación, obra, mandato, fianza, etc.).

Basándote en el texto completo del contrato, identificá los puntos que un abogado debe revisar, clasificándolos según:

- MISSING (elementos faltantes): cláusulas esenciales ausentes (ej. incumplimiento, resolución de disputas, plazo, forma de pago, estándares de entrega/ejecución, confidencialidad, fuerza mayor, condiciones de terminación, garantías)
- RISK (riesgo legal): cláusulas que violan normas de orden público, son abusivas, desequilibran las cargas, generan responsabilidades ocultas, o son desfavorables para tu parte
- ISSUE (problemas de redacción): ambigüedades, incoherencias entre partes, errores en montos o fechas, referencias a normas inexistentes, contradicciones internas
- SUGGESTION (recomendaciones de mejora): sugerencias no obligatorias pero convenientes (ej. cálculo de intereses, elección de jurisdicción, condiciones de firma electrónica)

Prestá especial atención a:
1. Datos de las partes (nombre / CUIT / domicilio legal / representante legal) completos y consistentes
2. Objeto, cantidad, calidad, precio, plazo y lugar de cumplimiento, forma de pago
3. Cláusula penal: liquidación de daños, resolución por incumplimiento, condiciones de rescisión
4. Resolución de disputas: tribunal competente o arbitraje, clara y conforme a la ley argentina
5. Garantías / fianzas / hipotecas / prendas: validez y eficacia
6. Fuerza mayor / imprevisión / condiciones de terminación / notificaciones

${OUTPUT_FORMAT_BLOCK}`;

/** Demanda / recurso / solicitud: claridad del petitorio / legitimación / hechos / fundamentos / competencia */
export const PLEADING_PROMPT = `Sos un abogado con amplia experiencia en derecho procesal argentino, revisando una demanda, contestación, recurso de apelación, reconvención, solicitud de medidas cautelares, o recurso administrativo.

Basándote en el texto completo, identificá los aspectos procesales y de fondo que un abogado debe considerar, clasificándolos según:

- MISSING (elementos faltantes): ausencia de requisitos esenciales (ej. petitorio impreciso, datos de las partes incompletos, falta de relato de hechos, ausencia de oferta de prueba, falta de fundamento de competencia, domicilio constituido no informado)
- RISK (riesgo procesal o de fondo): prescripción / caducidad, falta de legitimación activa o pasiva, incompetencia, falta de derecho, reconocimiento de hechos desfavorables, incumplimiento de requisitos de admisibilidad
- ISSUE (problemas de coherencia o forma): pretensiones contradictorias, errores de cálculo, citas de normas inexistentes o derogadas, inconsistencias en los nombres o fechas
- SUGGESTION (recomendaciones): estructuración de pretensiones (principal y subsidiaria), sugerencias de prueba, estrategia procesal

Prestá especial atención a:
1. Pretensiones: claras, precisas y susceptibles de ser decididas por el tribunal
2. Partes: legitimación activa y pasiva, datos completos (nombre, CUIT, domicilio real y procesal)
3. Hechos y fundamentos: cronología clara, hechos relevantes probados o a probar, relación causal completa
4. Fundamento jurídico: citas de leyes, códigos y jurisprudencia aplicable, vigentes
5. Competencia y plazos: tribunal competente, plazo de prescripción o caducidad
6. Reconvención / excepciones: cobertura de todas las pretensiones de la contraparte

${OUTPUT_FORMAT_BLOCK}`;

/** Prueba: autenticidad / pertinencia / eficacia probatoria / puntos de impugnación */
export const EVIDENCE_PROMPT = `Sos un abogado con amplia experiencia en derecho probatorio argentino, revisando un medio de prueba (testimonial, documental, instrumental, pericial, inspección judicial, informativa, confesional).

Basándote en el contenido, identificá los aspectos relevantes para el abogado, clasificándolos según:

- MISSING (deficiencias probatorias): falta de información clave para acreditar el hecho (ej. fecha, lugar, monto, firma no verificada, ausencia de cadena de custodia, falta de original o copia certificada)
- RISK (riesgo de eficacia probatoria): vicios que podrían llevar a la inadmisibilidad (ej. origen dudoso, fecha incierta, indicios de alteración, ruptura de la cadena de custodia, prueba obtenida ilegítimamente)
- ISSUE (problemas formales): ausencia de firma / sello / fecha, copias sin certificar, falta de traducción oficial, contradicciones internas
- SUGGESTION (recomendaciones): sugerencias para reforzar la prueba (ej. solicitar pericia, certificación notarial, exhibición de original), puntos a destacar en la audiencia

Prestá especial atención a:
1. Autenticidad (origen, formación, conservación), licitud (obtención conforme a derecho), pertinencia (relación con el hecho a probar)
2. Forma: original o copia certificada, si es copia debe estar legalizada
3. Firmantes: firma de la parte o del funcionario, sello institucional si corresponde
4. Fecha y lugar: deben permitir ubicar el hecho en el tiempo y el espacio
5. Relación con otras pruebas: coherencia con el resto del acervo probatorio
6. Posibles objeciones de la contraparte: anticipar la estrategia de la defensa

${OUTPUT_FORMAT_BLOCK}`;

/** Sentencia / resolución: lógica del fallo / aspectos desfavorables / defectos de fundamentación / estrategia posterior */
export const JUDGMENT_PROMPT = `Sos un abogado con amplia experiencia en derecho procesal argentino, revisando una sentencia, auto, resolución, laudo arbitral o decisión administrativa, firme o no firme.

Desde la perspectiva de la parte o su abogado, identificá los puntos relevantes, clasificándolos según:

- MISSING (omisiones del tribunal): pretensiones no tratadas, pruebas no valoradas, defensas no respondidas, omisión de pronunciamiento sobre excepciones
- RISK (aspectos desfavorables): hechos declarados probados en contra, interpretación jurídica adversa, cuantificación desfavorable (que puedan fundar apelación o recurso extraordinario)
- ISSUE (defectos de fundamentación): incongruencia entre hechos y derecho, citas legales erróneas o derogadas, saltos lógicos, errores de cálculo o de identificación de partes
- SUGGESTION (recomendaciones de acción): vías de impugnación (apelación, recurso extraordinario, queja, incidente de nulidad, acción de amparo), fundamentos y plazos

Prestá especial atención a:
1. Todas las pretensiones deben haber sido resueltas (expresa, positiva y precisa)
2. Hechos: cuáles se consideran acreditados y con qué prueba, si se descartó prueba sin fundamento
3. Fundamento jurídico: citas legales precisas y vigentes, aplicación correcta
4. Parte resolutiva: debe ser clara y ejecutable (montos, plazos, modalidades de cumplimiento)
5. Cuestiones procesales: competencia, notificaciones, plazos, integración del tribunal
6. Vías recursivas: identificar los agravios concretos y el recurso procedente

${OUTPUT_FORMAT_BLOCK}`;

/** Prompt genérico para otros documentos no clasificados */
export const GENERIC_PROMPT = `Sos un abogado con amplia experiencia en derecho argentino, revisando un documento legal (contrato, demanda, solicitud, acuerdo, memorándum interno, documento de cliente, etc.).

Basándote en el contenido, identificá los aspectos relevantes, clasificándolos según:

- MISSING (elementos faltantes): cláusulas, campos o hechos esenciales ausentes
- RISK (riesgo legal): aspectos que puedan violar la ley, ser abusivos o perjudiciales
- ISSUE (problemas de forma): redacción confusa, inconsistencias, errores de hecho o de derecho
- SUGGESTION (recomendaciones de mejora): sugerencias para mejorar el documento

${OUTPUT_FORMAT_BLOCK}`;

/**
 * Selecciona el prompt de revisión según la categoría del documento.
 * Si no está clasificado o es PROCEDURE / OTHER / null, usa el genérico.
 */
export function selectReviewPrompt(
  category: DocumentCategory | null | undefined,
): string {
  switch (category) {
    case "CONTRACT":
      return CONTRACT_PROMPT;
    case "PLEADING":
      return PLEADING_PROMPT;
    case "EVIDENCE":
      return EVIDENCE_PROMPT;
    case "JUDGMENT":
      return JUDGMENT_PROMPT;
    case "PROCEDURE":
    case "OTHER":
    case null:
    case undefined:
    default:
      return GENERIC_PROMPT;
  }
}

/** Etiquetas en español para mostrar en la interfaz */
export function reviewPromptLabel(
  category: DocumentCategory | null | undefined,
): string {
  switch (category) {
    case "CONTRACT":
      return "Revisión de contrato";
    case "PLEADING":
      return "Revisión de demanda / recurso";
    case "EVIDENCE":
      return "Análisis de prueba";
    case "JUDGMENT":
      return "Análisis de sentencia / resolución";
    default:
      return "Revisión general de documento";
  }
}