import type { ProcedureType } from "@prisma/client";

export type StagePresetKind = "required" | "optional";

export type ProcedureStagePreset = {
  name: string;
  kind: StagePresetKind;
  description: string;
};

const CIVIL_TRIAL_PRESETS: ProcedureStagePreset[] = [
  { name: "Autorizacion", kind: "required", description: "Tramites de mandato, documentos de autorizacion, carta del estudio, aviso de riesgos y entrega de materiales." },
  { name: "Analisis del caso", kind: "required", description: "Orden de hechos, brechas probatorias, busqueda juridica y plan de litigio." },
  { name: "Presentacion de demanda", kind: "required", description: "Materiales de demanda/contestacion, identidad, jurisdiccion, pago y seguimiento." },
  { name: "Preservacion de bienes", kind: "optional", description: "Solicitud de preservacion, garantia, resolucion, renovacion y levantamiento." },
  { name: "Excepciones", kind: "optional", description: "Solicitud o contestacion de excepciones, resolucion y apelacion." },
  { name: "Pruebas y contrapruebas", kind: "required", description: "Plazos probatorios, intercambio de evidencia, evidencia complementaria y objeciones." },
  { name: "Peritaje", kind: "optional", description: "Puntos de peritaje, muestras, institucion pericial y objeciones al dictamen." },
  { name: "Audiencia preliminar", kind: "optional", description: "Notificaciones de audiencia preliminar, fijacion de puntos, intercambio de evidencia y programacion." },
  { name: "Simulacro", kind: "optional", description: "Lista de puntos controvertidos, interrogatorio, practica de debate y reunion con cliente." },
  { name: "Audiencia", kind: "required", description: "Citacion, esquema de audiencia, interrogatorio, evidencia original y registro." },
  { name: "Post-audiencia", kind: "optional", description: "Alegatos, evidencia complementaria, informe de audiencia y contacto con el juez." },
  { name: "Recepcion de sentencia", kind: "required", description: "Recepcion de sentencia, plazo de apelacion, cumplimiento e informe de resultado." },
  { name: "Apelacion", kind: "optional", description: "Decision de apelar, mandato de segunda instancia, materiales y estrategia." },
  { name: "Archivo del caso", kind: "required", description: "Informe de cierre, integridad de materiales, devolucion de originales y solicitud de archivo." }
];

const SECOND_INSTANCE_PRESETS: ProcedureStagePreset[] = [
  { name: "Autorizacion", kind: "required", description: "Tramites de mandato de segunda instancia, documentos de autorizacion y recepcion de materiales." },
  { name: "Apelacion", kind: "required", description: "Apelacion, contestacion, evidencia de segunda instancia y tasas." },
  { name: "Analisis del caso", kind: "required", description: "Expediente de primera instancia, puntos controvertidos, plan de segunda instancia y refuerzo probatorio." },
  { name: "Preservacion de bienes", kind: "optional", description: "Preservacion, renovacion o levantamiento en segunda instancia." },
  { name: "Excepciones", kind: "optional", description: "Excepciones de jurisdiccion o traslado en segunda instancia." },
  { name: "Pruebas y contrapruebas", kind: "required", description: "Nueva evidencia, evidencia complementaria y objeciones en segunda instancia." },
  { name: "Peritaje", kind: "optional", description: "Solicitud de peritaje, peritaje complementario u objeciones al dictamen." },
  { name: "Simulacro", kind: "optional", description: "Estrategia de segunda instancia, interrogatorio y practica con cliente." },
  { name: "Audiencia", kind: "required", description: "Audiencia, vista o tramite escrito con preparacion y registro." },
  { name: "Post-audiencia", kind: "optional", description: "Alegatos complementarios, materiales y contacto con el juez." },
  { name: "Recepcion de sentencia", kind: "required", description: "Recepcion de sentencia de segunda instancia, firmeza, cumplimiento y proximos pasos." },
  { name: "Archivo del caso", kind: "required", description: "Informe de cierre de segunda instancia, archivo y devolucion de originales." }
];

const ENFORCEMENT_PRESETS: ProcedureStagePreset[] = [
  { name: "Autorizacion", kind: "required", description: "Tramites de mandato de ejecucion y entrega de materiales." },
  { name: "Ejecucion", kind: "required", description: "Solicitud de ejecucion forzosa, certificado de firmeza, cuenta y materiales de inicio." },
  { name: "Preservacion de bienes", kind: "optional", description: "Renovacion, levantamiento o disposicion de bienes preservados." },
  { name: "Investigacion de bienes", kind: "required", description: "Pistas de bienes, investigacion patrimonial, embargo y seguimiento de disposicion." },
  { name: "Objeciones", kind: "optional", description: "Objeciones de ejecucion, reconsideracion, no ejecucion y audiencia." },
  { name: "Acuerdo de ejecucion", kind: "optional", description: "Propuesta de acuerdo, firma, supervision de cumplimiento y plan de reanudacion." },
  { name: "Cierre de ejecucion", kind: "required", description: "Cobro, terminacion, documento de cierre y proximos pasos." },
  { name: "Archivo del caso", kind: "required", description: "Informe de cierre de ejecucion, archivo y devolucion de originales." }
];

const ARBITRATION_PRESETS: ProcedureStagePreset[] = [
  { name: "Autorizacion", kind: "required", description: "Tramites de mandato arbitral, documentos de autorizacion y entrega de materiales." },
  { name: "Analisis del caso", kind: "required", description: "Orden de hechos, brechas probatorias, busqueda juridica y plan arbitral." },
  { name: "Presentacion de demanda", kind: "required", description: "Solicitud de arbitraje, identidad, indice de evidencia y pago de tasas arbitrales." },
  { name: "Preservacion de bienes", kind: "optional", description: "Preservacion arbitral, garantia, ejecucion asistida por tribunal y renovacion." },
  { name: "Excepciones", kind: "optional", description: "Excepciones de jurisdiccion arbitral, validez del acuerdo y defensa procesal." },
  { name: "Pruebas y contrapruebas", kind: "required", description: "Intercambio de evidencia, evidencia complementaria y objeciones." },
  { name: "Peritaje", kind: "optional", description: "Solicitud de peritaje, muestras, institucion pericial y objeciones." },
  { name: "Simulacro", kind: "optional", description: "Estrategia de audiencia arbitral, interrogatorio y practica con cliente." },
  { name: "Audiencia", kind: "required", description: "Notificacion de audiencia, esquema, interrogatorio y verificacion de originales." },
  { name: "Post-audiencia", kind: "optional", description: "Alegatos complementarios, materiales y comunicacion con el tribunal arbitral." },
  { name: "Recepcion de sentencia", kind: "required", description: "Recepcion de laudo, cumplimiento, evaluacion de nulidad y proximos pasos." },
  { name: "Archivo del caso", kind: "required", description: "Informe de cierre arbitral, archivo y devolucion de originales." }
];

const CRIMINAL_INVESTIGATION_PRESETS: ProcedureStagePreset[] = [
  { name: "Autorizacion", kind: "required", description: "Tramites de mandato penal, materiales de autorizacion y gestion de entrevista." },
  { name: "Entrevista", kind: "required", description: "Reserva de entrevista, acta, comunicacion con familiares y aviso de riesgos." },
  { name: "Excarcelacion", kind: "optional", description: "Evaluacion de excarcelacion, materiales de solicitud, garantia y contacto con el tribunal." },
  { name: "Revision de expediente", kind: "required", description: "Pistas de hecho, riesgos probatorios, materiales complementarios y direccion de investigacion." },
  { name: "Defensa", kind: "required", description: "Dictamen juridico en etapa de investigacion, necesidad de prision preventiva y registro de comunicacion." },
  { name: "Archivo del caso", kind: "required", description: "Informe de etapa, archivo y proximos pasos procesales." }
];

export function procedureStagePresetsForProcedure(type: ProcedureType): ProcedureStagePreset[] {
  if (type === "SECOND_INSTANCE" || type === "REMAND_SECOND") return SECOND_INSTANCE_PRESETS;
  if (type === "ENFORCEMENT" || type === "ENFORCEMENT_OBJECTION") return ENFORCEMENT_PRESETS;
  if (type === "COMMERCIAL_ARBITRATION" || type === "LABOR_ARBITRATION") return ARBITRATION_PRESETS;
  if (type === "INVESTIGATION") return CRIMINAL_INVESTIGATION_PRESETS;
  return CIVIL_TRIAL_PRESETS;
}

export function defaultStageNamesForProcedure(type: ProcedureType) {
  return procedureStagePresetsForProcedure(type)
    .filter((preset) => preset.kind === "required")
    .map((preset) => preset.name);
}

export function optionalStagePresetsForProcedure(type: ProcedureType) {
  return procedureStagePresetsForProcedure(type).filter((preset) => preset.kind === "optional");
}

export function normalizeProcedureStageName(name: string) {
  return name.trim().replace(/\s+/g, "");
}

export function stagePresetForName(type: ProcedureType, name: string) {
  const normalizedName = normalizeProcedureStageName(name);
  return procedureStagePresetsForProcedure(type).find(
    (preset) => normalizeProcedureStageName(preset.name) === normalizedName
  );
}