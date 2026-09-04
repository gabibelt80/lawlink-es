/**
 * Mapeo de etiquetas de enums para mostrar en espaÃ±ol. El frontend usa estas labels, la DB/API usa los valores del enum.
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
  INDIVIDUAL: "Persona fisica",
  COMPANY: "Empresa",
  ORGANIZATION: "Otra organizacion"
};

// v0.39: Estado de cooperacion del cliente
export const cooperationStatusLabel: Record<ClientCooperationStatus, string> = {
  POTENTIAL: "Potencial",
  NEGOTIATING: "En negociacion",
  SIGNED: "Firmado",
  TERMINATED: "Terminado"
};

export const COOPERATION_STATUS_OPTIONS: ClientCooperationStatus[] = [
  "POTENTIAL",
  "NEGOTIATING",
  "SIGNED",
  "TERMINATED"
];

// v0.39: GÃ©nero del cliente (cliente persona fÃ­sica)
export const genderLabel: Record<ClientGender, string> = {
  MALE: "Masculino",
  FEMALE: "Femenino"
};

export const GENDER_OPTIONS: ClientGender[] = ["MALE", "FEMALE"];

// v0.30: Tipo de sujeto de la parte. Persona fÃ­sica completa DNI, los demÃ¡s completan cÃ³digo de crÃ©dito social unificado.
export const partyTypeLabel: Record<PartyType, string> = {
  NATURAL_PERSON: "Persona fisica",
  COMPANY: "Empresa",
  PARTNERSHIP: "Sociedad colectiva",
  INDIVIDUAL_BUSINESS: "Empresario individual",
  INSTITUTION: "Institucion publica",
  SOCIAL_ORG: "Organizacion social",
  GOVERNMENT: "Organo gubernamental",
  OTHER_ORG: "Otra organizacion",
  ORGANIZATION: "Otra organizacion" // Compatibilidad con datos antiguos
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

// v0.30: Requiere inscripcion en el colegio de abogados
export const barFilingLabel: Record<BarFilingType, string> = {
  NONE: "No",
  COLLECTIVE: "SÃ­, caso colectivo",
  SENSITIVE: "SÃ­, caso sensible",
  MAJOR: "SÃ­, caso de gran envergadura",
  OTHER: "SÃ­, otro caso especial"
};

export const BAR_FILING_OPTIONS: BarFilingType[] = [
  "NONE",
  "COLLECTIVE",
  "SENSITIVE",
  "MAJOR",
  "OTHER"
];

// v0.31: La categorÃ­a del caso se divide en tres tipos segÃºn la naturaleza del negocio â€” determina la estructura del formulario de admision
// litigation: litigio/arbitraje (Civil/Comercial/Penal/Administrativo); project: no contencioso/proyectos; counsel: consultoria
export type CategoryKind = "litigation" | "project" | "counsel";

export function matterCategoryKind(c: MatterCategory): CategoryKind {
  if (c === "LEGAL_COUNSEL") return "counsel";
  if (c === "NON_LITIGATION" || c === "SPECIAL_PROJECT") return "project";
  // Litigio civil y comercial / arbitraje laboral / arbitraje comercial / Penal / Administrativo â†’ tipo litigio/arbitraje
  return "litigation";
}

// Tipos de negocio no contencioso / proyectos (se pueden ajustar)
export const PROJECT_BUSINESS_TYPES: string[] = [
  "Debida diligencia",
  "Revision / redaccion de contratos",
  "Inversion y financiamiento",
  "Fusiones y adquisiciones",
  "Reestructuracion y salida a bolsa",
  "Quiebra y liquidacion",
  "Propiedad intelectual",
  "Sistema de cumplimiento",
  "Licitaciones",
  "Permiso / Aprobacion administrativa",
  "Otros"
];

// Tipos de consultoria
export const COUNSEL_TYPES: string[] = ["Asesoria legal permanente", "Asesoria legal para proyectos"];

export const matterCategoryLabel: Record<MatterCategory, string> = {
  CIVIL_COMMERCIAL: "Litigio civil y comercial",
  LABOR_ARBITRATION: "Arbitraje laboral",
  COMMERCIAL_ARBITRATION: "Arbitraje comercial",
  CRIMINAL: "Litigio penal",
  ADMINISTRATIVE: "Etapa administrativo",
  NON_LITIGATION: "Proyecto no contencioso",
  LEGAL_COUNSEL: "Asesoria permanente",
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

// v0.17: Letra de icono de categoria de caso (para mostrar antes del titulo en tarjetas de lista)
export const matterCategoryShort: Record<MatterCategory, string> = {
  CIVIL_COMMERCIAL: "C",
  LABOR_ARBITRATION: "L",
  COMMERCIAL_ARBITRATION: "A",
  CRIMINAL: "P",
  ADMINISTRATIVE: "D",
  NON_LITIGATION: "N",
  LEGAL_COUNSEL: "G",
  SPECIAL_PROJECT: "S"
};

export const matterStatusLabel: Record<MatterStatus, string> = {
  PENDING_ACCEPTANCE: "Pendiente de inicio",
  IN_PROGRESS: "En trÃ¡mite",
  ON_HOLD: "Suspendido",
  CLOSED: "Cerrado",
  ARCHIVED: "Archivado"
};

export const intakeStatusLabel: Record<IntakeStatus, string> = {
  INTAKE: "Consultado",
  PENDING_CONFIRMATION: "Pendiente de confirmacion",
  CONVERTED: "Convertido",
  DECLINED: "Rechazado",
  NEEDS_REVISION: "Pendiente de correccion"
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
  RETRIAL_APPLICANT: "Solicitante de revision",
  RETRIAL_RESPONDENT: "Demandado en revision",
  ENFORCEMENT_APPLICANT: "Solicitante de ejecucion",
  EXECUTED_PERSON: "Ejecutado",
  CRIMINAL_DEFENDANT: "Imputado penal",
  CRIMINAL_VICTIM: "VÃ­ctima",
  PRIVATE_PROSECUTOR: "Querellante",
  CRIMINAL_INCIDENTAL_PLAINTIFF: "Actor civil en proceso penal",
  ARBITRATION_CLAIMANT: "Demandante arbitral",
  ARBITRATION_RESPONDENT: "Demandado arbitral",
  ADMIN_PLAINTIFF: "Demandante administrativo",
  ADMIN_DEFENDANT: "Demandado administrativo",
  ADMIN_RECONSIDERATION_APPLICANT: "Solicitante de reconsideracion",
  ADMIN_RECONSIDERATION_RESPONDENT: "Demandado en reconsideracion",
  NON_LITIGATION_PARTY: "Parte del proyecto"
};

export const procedureTypeLabel: Record<ProcedureType, string> = {
  FIRST_INSTANCE: "Primera instancia",
  SECOND_INSTANCE: "Segunda instancia",
  RETRIAL_REVIEW: "Revision de nuevo juicio",
  RETRIAL: "Nuevo juicio",
  REMAND_FIRST: "Reenvio a primera instancia",
  REMAND_SECOND: "Reenvio a segunda instancia",
  PROSECUTORIAL_SUPERVISION: "Supervision fiscal",
  COMMERCIAL_ARBITRATION: "Arbitraje comercial",
  LABOR_ARBITRATION: "Arbitraje laboral",
  ARBITRATION_SET_ASIDE: "Anulacion de laudo arbitral",
  ARBITRATION_ENFORCEMENT_REVIEW: "Revision de ejecucion de laudo",
  ENFORCEMENT: "Ejecucion forzosa",
  ENFORCEMENT_OBJECTION: "Incidente de ejecucion",
  INVESTIGATION: "Investigacion",
  PROSECUTION_REVIEW: "Revision de acusacion",
  DEATH_PENALTY_REVIEW: "Revision de pena de muerte",
  CRIMINAL_ENFORCEMENT: "Ejecucion penal",
  COMMUTATION_PAROLE_REVIEW: "Revision de conmutacion / libertad condicional",
  ADMIN_RECONSIDERATION: "Reconsideracion administrativa",
  ADMIN_PRE_LITIGATION: "Reclamo administrativo previo",
  ADMIN_NON_LITIGATION_ENFORCEMENT: "Ejecucion administrativa no contenciosa",
  NON_LITIGATION_PHASE: "Etapa no contenciosa",
  CUSTOM: "Personalizado"
};

export const feeTypeLabel: Record<FeeType, string> = {
  FIXED: "Honorario fijo",
  CONTINGENCY: "Representacion de riesgo",
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
 * SegÃºn el tipo de procedimiento + posicion (nuestra o contraria) devuelve las posiciones procesales disponibles.
 * Se usa en el formulario de admision / ingreso de partes en el detalle del caso.
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
