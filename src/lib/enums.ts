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
  INDIVIDUAL: "Persona fÃ­sica",
  COMPANY: "Empresa",
  ORGANIZATION: "Otra organizaciÃ³n"
};

// v0.39: Estado de cooperaciÃ³n del cliente
export const cooperationStatusLabel: Record<ClientCooperationStatus, string> = {
  POTENTIAL: "Potencial",
  NEGOTIATING: "En negociaciÃ³n",
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
  NATURAL_PERSON: "Persona fÃ­sica",
  COMPANY: "Empresa",
  PARTNERSHIP: "Sociedad colectiva",
  INDIVIDUAL_BUSINESS: "Empresario individual",
  INSTITUTION: "InstituciÃ³n pÃºblica",
  SOCIAL_ORG: "OrganizaciÃ³n social",
  GOVERNMENT: "Ã“rgano gubernamental",
  OTHER_ORG: "Otra organizaciÃ³n",
  ORGANIZATION: "Otra organizaciÃ³n" // Compatibilidad con datos antiguos
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

// v0.30: Requiere inscripciÃ³n en el colegio de abogados
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

// v0.31: La categorÃ­a del caso se divide en tres tipos segÃºn la naturaleza del negocio â€” determina la estructura del formulario de admisiÃ³n
// litigation: litigio/arbitraje (Civil/Comercial/Penal/Administrativo); project: no contencioso/proyectos; counsel: consultorÃ­a
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
  "RevisiÃ³n / redacciÃ³n de contratos",
  "InversiÃ³n y financiamiento",
  "Fusiones y adquisiciones",
  "ReestructuraciÃ³n y salida a bolsa",
  "Quiebra y liquidaciÃ³n",
  "Propiedad intelectual",
  "Sistema de cumplimiento",
  "Licitaciones",
  "Permiso / AprobaciÃ³n administrativa",
  "Otros"
];

// Tipos de consultorÃ­a
export const COUNSEL_TYPES: string[] = ["AsesorÃ­a legal permanente", "AsesorÃ­a legal para proyectos"];

export const matterCategoryLabel: Record<MatterCategory, string> = {
  CIVIL_COMMERCIAL: "Litigio civil y comercial",
  LABOR_ARBITRATION: "Arbitraje laboral",
  COMMERCIAL_ARBITRATION: "Arbitraje comercial",
  CRIMINAL: "Litigio penal",
  ADMINISTRATIVE: "Litigio administrativo",
  NON_LITIGATION: "Proyecto no contencioso",
  LEGAL_COUNSEL: "AsesorÃ­a permanente",
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

// v0.17: Letra de icono de categorÃ­a de caso (para mostrar antes del tÃ­tulo en tarjetas de lista)
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
  IN_PROGRESS: "En trÃ¡mite",
  ON_HOLD: "Suspendido",
  CLOSED: "Cerrado",
  ARCHIVED: "Archivado"
};

export const intakeStatusLabel: Record<IntakeStatus, string> = {
  INTAKE: "Consultado",
  PENDING_CONFIRMATION: "Pendiente de confirmaciÃ³n",
  CONVERTED: "Convertido",
  DECLINED: "Rechazado",
  NEEDS_REVISION: "Pendiente de correcciÃ³n"
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
  RETRIAL_APPLICANT: "Solicitante de revisiÃ³n",
  RETRIAL_RESPONDENT: "Demandado en revisiÃ³n",
  ENFORCEMENT_APPLICANT: "Solicitante de ejecuciÃ³n",
  EXECUTED_PERSON: "Ejecutado",
  CRIMINAL_DEFENDANT: "Imputado penal",
  CRIMINAL_VICTIM: "VÃ­ctima",
  PRIVATE_PROSECUTOR: "Querellante",
  CRIMINAL_INCIDENTAL_PLAINTIFF: "Actor civil en proceso penal",
  ARBITRATION_CLAIMANT: "Demandante arbitral",
  ARBITRATION_RESPONDENT: "Demandado arbitral",
  ADMIN_PLAINTIFF: "Demandante administrativo",
  ADMIN_DEFENDANT: "Demandado administrativo",
  ADMIN_RECONSIDERATION_APPLICANT: "Solicitante de reconsideraciÃ³n",
  ADMIN_RECONSIDERATION_RESPONDENT: "Demandado en reconsideraciÃ³n",
  NON_LITIGATION_PARTY: "Parte del proyecto"
};

export const procedureTypeLabel: Record<ProcedureType, string> = {
  FIRST_INSTANCE: "Primera instancia",
  SECOND_INSTANCE: "Segunda instancia",
  RETRIAL_REVIEW: "RevisiÃ³n de nuevo juicio",
  RETRIAL: "Nuevo juicio",
  REMAND_FIRST: "ReenvÃ­o a primera instancia",
  REMAND_SECOND: "ReenvÃ­o a segunda instancia",
  PROSECUTORIAL_SUPERVISION: "SupervisiÃ³n fiscal",
  COMMERCIAL_ARBITRATION: "Arbitraje comercial",
  LABOR_ARBITRATION: "Arbitraje laboral",
  ARBITRATION_SET_ASIDE: "AnulaciÃ³n de laudo arbitral",
  ARBITRATION_ENFORCEMENT_REVIEW: "RevisiÃ³n de ejecuciÃ³n de laudo",
  ENFORCEMENT: "EjecuciÃ³n forzosa",
  ENFORCEMENT_OBJECTION: "Incidente de ejecuciÃ³n",
  INVESTIGATION: "InvestigaciÃ³n",
  PROSECUTION_REVIEW: "RevisiÃ³n de acusaciÃ³n",
  DEATH_PENALTY_REVIEW: "RevisiÃ³n de pena de muerte",
  CRIMINAL_ENFORCEMENT: "EjecuciÃ³n penal",
  COMMUTATION_PAROLE_REVIEW: "RevisiÃ³n de conmutaciÃ³n / libertad condicional",
  ADMIN_RECONSIDERATION: "ReconsideraciÃ³n administrativa",
  ADMIN_NON_LITIGATION_ENFORCEMENT: "EjecuciÃ³n administrativa no contenciosa",
  NON_LITIGATION_PHASE: "Etapa no contenciosa",
  CUSTOM: "Personalizado"
};

export const feeTypeLabel: Record<FeeType, string> = {
  FIXED: "Honorario fijo",
  CONTINGENCY: "RepresentaciÃ³n de riesgo",
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
 * SegÃºn el tipo de procedimiento + posiciÃ³n (nuestra o contraria) devuelve las posiciones procesales disponibles.
 * Se usa en el formulario de admisiÃ³n / ingreso de partes en el detalle del caso.
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
