/**
 * Mapeo de etiquetas de enums para mostrar en español. El frontend usa estas labels, la DB/API usa los valores del enum.
 */
import type {
  ClientType,
  ClientCooperationStatus,
  ClientGender,
  MatterCategory,
  MatterStatus,
  IntakeStatus,
  UserRole,
  ProcedureType,
  LitigationStanding,
  FeeType,
  InvoiceRequestStatus,
  PartyType,
  BarFilingType
} from "@prisma/client";

export const clientTypeLabel: Record<ClientType, string> = {
  INDIVIDUAL: "Persona física",
  COMPANY: "Empresa",
  ORGANIZATION: "Otra organización"
};

// v0.39: Estado de cooperación del cliente
export const cooperationStatusLabel: Record<ClientCooperationStatus, string> = {
  POTENTIAL: "Potencial",
  NEGOTIATING: "En negociación",
  SIGNED: "Firmado",
  TERMINATED: "Terminado"
};

export const COOPERATION_STATUS_OPTIONS: ClientCooperationStatus[] = [
  "POTENTIAL",
  "NEGOTIATING",
  "SIGNED",
  "TERMINATED"
];

// v0.39: Género del cliente (cliente persona física)
export const genderLabel: Record<ClientGender, string> = {
  MALE: "Masculino",
  FEMALE: "Femenino"
};

export const GENDER_OPTIONS: ClientGender[] = ["MALE", "FEMALE"];

// v0.30: Tipo de sujeto de la parte. Persona física completa DNI, los demás completan código de crédito social unificado.
export const partyTypeLabel: Record<PartyType, string> = {
  NATURAL_PERSON: "Persona física",
  COMPANY: "Empresa",
  PARTNERSHIP: "Sociedad colectiva",
  INDIVIDUAL_BUSINESS: "Empresario individual",
  INSTITUTION: "Institución pública",
  SOCIAL_ORG: "Organización social",
  GOVERNMENT: "Órgano gubernamental",
  OTHER_ORG: "Otra organización",
  ORGANIZATION: "Otra organización" // Compatibilidad con datos antiguos
};

// Orden de tipos de sujeto en el desplegable de ingreso (sin el antiguo ORGANIZATION)
export const PARTY_TYPE_OPTIONS: PartyType[] = [
  "NATURAL_PERSON",
  "COMPANY",
  "PARTNERSHIP",
  "INDIVIDUAL_BUSINESS",
  "INSTITUTION",
  "SOCIAL_ORG",
  "GOVERNMENT",
  "OTHER_ORG"
];

// v0.30: Requiere inscripción en el colegio de abogados
export const barFilingLabel: Record<BarFilingType, string> = {
  NONE: "No",
  COLLECTIVE: "Sí, caso colectivo",
  SENSITIVE: "Sí, caso sensible",
  MAJOR: "Sí, caso de gran envergadura",
  OTHER: "Sí, otro caso especial"
};

export const BAR_FILING_OPTIONS: BarFilingType[] = [
  "NONE",
  "COLLECTIVE",
  "SENSITIVE",
  "MAJOR",
  "OTHER"
];

// v0.31: La categoría del caso se divide en tres tipos según la naturaleza del negocio — determina la estructura del formulario de admisión
// litigation: litigio/arbitraje (Civil/Comercial/Penal/Administrativo); project: no contencioso/proyectos; counsel: consultoría
export type CategoryKind = "litigation" | "project" | "counsel";

export function matterCategoryKind(c: MatterCategory): CategoryKind {
  if (c === "LEGAL_COUNSEL") return "counsel";
  if (c === "NON_LITIGATION" || c === "SPECIAL_PROJECT") return "project";
  // Litigio civil y comercial / arbitraje laboral / arbitraje comercial / Penal / Administrativo → tipo litigio/arbitraje
  return "litigation";
}

// Tipos de negocio no contencioso / proyectos (se pueden ajustar)
export const PROJECT_BUSINESS_TYPES: string[] = [
  "Debida diligencia",
  "Revisión / redacción de contratos",
  "Inversión y financiamiento",
  "Fusiones y adquisiciones",
  "Reestructuración y salida a bolsa",
  "Quiebra y liquidación",
  "Propiedad intelectual",
  "Sistema de cumplimiento",
  "Licitaciones",
  "Permiso / Aprobación administrativa",
  "Otros"
];

// Tipos de consultoría
export const COUNSEL_TYPES: string[] = ["Asesoría legal permanente", "Asesoría legal para proyectos"];

export const matterCategoryLabel: Record<MatterCategory, string> = {
  CIVIL_COMMERCIAL: "Litigio civil y comercial",
  LABOR_ARBITRATION: "Arbitraje laboral",
  COMMERCIAL_ARBITRATION: "Arbitraje comercial",
  CRIMINAL: "Litigio penal",
  ADMINISTRATIVE: "Litigio administrativo",
  NON_LITIGATION: "Proyecto no contencioso",
  LEGAL_COUNSEL: "Asesoría permanente",
  SPECIAL_PROJECT: "Proyecto legal especial"
};

export const matterCategoryColor: Record<MatterCategory, string> = {
  CIVIL_COMMERCIAL: "#5B8DEF",
  LABOR_ARBITRATION: "#34D399",
  COMMERCIAL_ARBITRATION: "#38BDF8",
  CRIMINAL: "#FB923C",
  ADMINISTRATIVE: "#FBBF24",
  NON_LITIGATION: "#4FD1C5",
  LEGAL_COUNSEL: "#9B7BF7",
  SPECIAL_PROJECT: "#60A5FA"
};

// v0.17: Letra de icono de categoría de caso (para mostrar antes del título en tarjetas de lista)
export const matterCategoryShort: Record<MatterCategory, string> = {
  CIVIL_COMMERCIAL: "C",
  LABOR_ARBITRATION: "L",
  COMMERCIAL_ARBITRATION: "A",
  CRIMINAL: "P",
  ADMINISTRATIVE: "D",
  NON_LITIGATION: "N",
  LEGAL_COUNSEL: "G",
  SPECIAL_PROJECT: "E"
};

export const matterStatusLabel: Record<MatterStatus, string> = {
  PENDING_ACCEPTANCE: "Pendiente de inicio",
  IN_PROGRESS: "En trámite",
  ON_HOLD: "Suspendido",
  CLOSED: "Cerrado",
  ARCHIVED: "Archivado"
};

export const intakeStatusLabel: Record<IntakeStatus, string> = {
  INTAKE: "Consultado",
  PENDING_CONFIRMATION: "Pendiente de confirmación",
  CONVERTED: "Convertido",
  DECLINED: "Rechazado",
  NEEDS_REVISION: "Pendiente de corrección"
};

export const userRoleLabel: Record<UserRole, string> = {
  ADMIN: "Administrador del sistema",
  PRINCIPAL_LAWYER: "Abogado principal",
  LAWYER: "Abogado a cargo",
  ASSISTANT: "Asistente",
  FINANCE: "Finanzas"
};

export const litigationStandingLabel: Record<LitigationStanding, string> = {
  PLAINTIFF: "Demandante",
  JOINT_PLAINTIFF: "Codemandante",
  DEFENDANT: "Demandado",
  JOINT_DEFENDANT: "Codemandado",
  THIRD_PARTY: "Tercero",
  COUNTERCLAIM_PLAINTIFF: "Demandante reconvencional",
  COUNTERCLAIM_DEFENDANT: "Demandado reconvencional",
  APPELLANT: "Apelante",
  APPELLEE: "Apelado",
  RETRIAL_APPLICANT: "Solicitante de revisión",
  RETRIAL_RESPONDENT: "Demandado en revisión",
  ENFORCEMENT_APPLICANT: "Solicitante de ejecución",
  EXECUTED_PERSON: "Ejecutado",
  CRIMINAL_DEFENDANT: "Imputado penal",
  CRIMINAL_VICTIM: "Víctima",
  PRIVATE_PROSECUTOR: "Querellante",
  CRIMINAL_INCIDENTAL_PLAINTIFF: "Actor civil en proceso penal",
  ARBITRATION_CLAIMANT: "Demandante arbitral",
  ARBITRATION_RESPONDENT: "Demandado arbitral",
  ADMIN_PLAINTIFF: "Demandante administrativo",
  ADMIN_DEFENDANT: "Demandado administrativo",
  ADMIN_RECONSIDERATION_APPLICANT: "Solicitante de reconsideración",
  ADMIN_RECONSIDERATION_RESPONDENT: "Demandado en reconsideración",
  NON_LITIGATION_PARTY: "Parte del proyecto"
};

export const procedureTypeLabel: Record<ProcedureType, string> = {
  FIRST_INSTANCE: "Primera instancia",
  SECOND_INSTANCE: "Segunda instancia",
  RETRIAL_REVIEW: "Revisión de nuevo juicio",
  RETRIAL: "Nuevo juicio",
  REMAND_FIRST: "Reenvío a primera instancia",
  REMAND_SECOND: "Reenvío a segunda instancia",
  PROSECUTORIAL_SUPERVISION: "Supervisión fiscal",
  COMMERCIAL_ARBITRATION: "Arbitraje comercial",
  LABOR_ARBITRATION: "Arbitraje laboral",
  ARBITRATION_SET_ASIDE: "Anulación de laudo arbitral",
  ARBITRATION_ENFORCEMENT_REVIEW: "Revisión de ejecución de laudo",
  ENFORCEMENT: "Ejecución forzosa",
  ENFORCEMENT_OBJECTION: "Incidente de ejecución",
  INVESTIGATION: "Investigación",
  PROSECUTION_REVIEW: "Revisión de acusación",
  DEATH_PENALTY_REVIEW: "Revisión de pena de muerte",
  CRIMINAL_ENFORCEMENT: "Ejecución penal",
  COMMUTATION_PAROLE_REVIEW: "Revisión de conmutación / libertad condicional",
  ADMIN_RECONSIDERATION: "Reconsideración administrativa",
  ADMIN_NON_LITIGATION_ENFORCEMENT: "Ejecución administrativa no contenciosa",
  NON_LITIGATION_PHASE: "Etapa no contenciosa",
  CUSTOM: "Personalizado"
};

export const feeTypeLabel: Record<FeeType, string> = {
  FIXED: "Honorario fijo",
  CONTINGENCY: "Representación de riesgo",
  TIMED: "Honorario por hora"
};

export const invoiceRequestStatusLabel: Record<InvoiceRequestStatus, string> = {
  PENDING: "Pendiente de Finanzas",
  APPROVED: "Aprobada",
  ISSUED: "Emitida",
  REJECTED: "Rechazada"
};

export const invoiceRequestStatusColor: Record<InvoiceRequestStatus, string> = {
  PENDING: "#FBBF24",
  APPROVED: "#5B8DEF",
  ISSUED: "#4ADE80",
  REJECTED: "#F87171"
};

/**
 * Según el tipo de procedimiento + posición (nuestra o contraria) devuelve las posiciones procesales disponibles.
 * Se usa en el formulario de admisión / ingreso de partes en el detalle del caso.
 */
export function procedureToStandingOptions(
  proc: ProcedureType | null | undefined,
  side: "ours" | "opposite"
): LitigationStanding[] {
  if (!proc) return Object.keys(litigationStandingLabel) as LitigationStanding[];

  switch (proc) {
    case "FIRST_INSTANCE":
    case "REMAND_FIRST":
      return side === "ours"
        ? ["PLAINTIFF", "DEFENDANT", "THIRD_PARTY", "COUNTERCLAIM_PLAINTIFF", "COUNTERCLAIM_DEFENDANT"]
        : ["PLAINTIFF", "DEFENDANT", "THIRD_PARTY", "COUNTERCLAIM_PLAINTIFF", "COUNTERCLAIM_DEFENDANT"];

    case "SECOND_INSTANCE":
    case "REMAND_SECOND":
      return ["APPELLANT", "APPELLEE", "THIRD_PARTY"];

    case "RETRIAL_REVIEW":
    case "RETRIAL":
      return ["RETRIAL_APPLICANT", "RETRIAL_RESPONDENT", "THIRD_PARTY"];

    case "PROSECUTORIAL_SUPERVISION":
      return ["RETRIAL_APPLICANT", "RETRIAL_RESPONDENT", "THIRD_PARTY"];

    case "COMMERCIAL_ARBITRATION":
    case "LABOR_ARBITRATION":
      return ["ARBITRATION_CLAIMANT", "ARBITRATION_RESPONDENT", "THIRD_PARTY"];

    case "ARBITRATION_SET_ASIDE":
    case "ARBITRATION_ENFORCEMENT_REVIEW":
      return ["ARBITRATION_CLAIMANT", "ARBITRATION_RESPONDENT"];

    case "ENFORCEMENT":
    case "ENFORCEMENT_OBJECTION":
      return ["ENFORCEMENT_APPLICANT", "EXECUTED_PERSON", "THIRD_PARTY"];

    case "INVESTIGATION":
    case "PROSECUTION_REVIEW":
    case "DEATH_PENALTY_REVIEW":
    case "CRIMINAL_ENFORCEMENT":
    case "COMMUTATION_PAROLE_REVIEW":
      return [
        "CRIMINAL_DEFENDANT",
        "CRIMINAL_VICTIM",
        "PRIVATE_PROSECUTOR",
        "CRIMINAL_INCIDENTAL_PLAINTIFF"
      ];

    case "ADMIN_RECONSIDERATION":
      return ["ADMIN_RECONSIDERATION_APPLICANT", "ADMIN_RECONSIDERATION_RESPONDENT", "THIRD_PARTY"];

    case "ADMIN_NON_LITIGATION_ENFORCEMENT":
      return ["ADMIN_PLAINTIFF", "ADMIN_DEFENDANT", "EXECUTED_PERSON"];

    case "NON_LITIGATION_PHASE":
    case "CUSTOM":
      return ["NON_LITIGATION_PARTY"];

    default:
      return Object.keys(litigationStandingLabel) as LitigationStanding[];
  }
}