import { z } from "zod";

export const matterCategorySchema = z.enum([
  "CIVIL_COMMERCIAL",
  "LABOR_ARBITRATION",
  "COMMERCIAL_ARBITRATION",
  "CRIMINAL",
  "ADMINISTRATIVE",
  "NON_LITIGATION",
  "LEGAL_COUNSEL",
  "SPECIAL_PROJECT"
]);

export const matterStatusSchema = z.enum([
  "PENDING_ACCEPTANCE",
  "IN_PROGRESS",
  "ON_HOLD",
  "CLOSED",
  "ARCHIVED"
]);

export const litigationStandingSchema = z.enum([
  "PLAINTIFF",
  "JOINT_PLAINTIFF",
  "DEFENDANT",
  "JOINT_DEFENDANT",
  "THIRD_PARTY",
  "COUNTERCLAIM_PLAINTIFF",
  "COUNTERCLAIM_DEFENDANT",
  "APPELLANT",
  "APPELLEE",
  "RETRIAL_APPLICANT",
  "RETRIAL_RESPONDENT",
  "ENFORCEMENT_APPLICANT",
  "EXECUTED_PERSON",
  "CRIMINAL_DEFENDANT",
  "CRIMINAL_VICTIM",
  "PRIVATE_PROSECUTOR",
  "CRIMINAL_INCIDENTAL_PLAINTIFF",
  "ARBITRATION_CLAIMANT",
  "ARBITRATION_RESPONDENT",
  "ADMIN_PLAINTIFF",
  "ADMIN_DEFENDANT",
  "ADMIN_RECONSIDERATION_APPLICANT",
  "ADMIN_RECONSIDERATION_RESPONDENT",
  "NON_LITIGATION_PARTY"
]);

export const procedureTypeSchema = z.enum([
  "FIRST_INSTANCE",
  "SECOND_INSTANCE",
  "RETRIAL_REVIEW",
  "RETRIAL",
  "REMAND_FIRST",
  "REMAND_SECOND",
  "PROSECUTORIAL_SUPERVISION",
  "COMMERCIAL_ARBITRATION",
  "LABOR_ARBITRATION",
  "ARBITRATION_SET_ASIDE",
  "ARBITRATION_ENFORCEMENT_REVIEW",
  "ENFORCEMENT",
  "ENFORCEMENT_OBJECTION",
  "INVESTIGATION",
  "PROSECUTION_REVIEW",
  "DEATH_PENALTY_REVIEW",
  "CRIMINAL_ENFORCEMENT",
  "COMMUTATION_PAROLE_REVIEW",
  "ADMIN_RECONSIDERATION",
  "ADMIN_NON_LITIGATION_ENFORCEMENT",
  "ADMIN_PRE_LITIGATION",
  "NON_LITIGATION_PHASE",
  "CUSTOM"
]);

export const partyRoleSchema = z.enum([
  "CLIENT_PARTY",
  "OPPOSING_PARTY",
  "THIRD_PARTY",
  "CO_LITIGANT",
  "AGENT",
  "WITNESS",
  "OTHER"
]);

// v0.27 / v0.30: Tipo de sujeto de la parte (persona fÃ­sica completa DNI, los demÃ¡s completan cÃ³digo de crÃ©dito social unificado)
export const partyTypeSchema = z.enum([
  "NATURAL_PERSON",
  "ORGANIZATION", // Compatibilidad con datos antiguos
  "COMPANY",
  "PARTNERSHIP",
  "INDIVIDUAL_BUSINESS",
  "INSTITUTION",
  "SOCIAL_ORG",
  "GOVERNMENT",
  "OTHER_ORG"
]);

export const partyInputSchema = z
  .object({
    role: partyRoleSchema,
    // v0.5: PosiciÃ³n procesal especÃ­fica (segÃºn el procedimiento)
    standing: litigationStandingSchema.optional(),
    ordinal: z.number().int().min(1).default(1),
    // v0.27: El tipo de sujeto determina los campos obligatorios
    partyType: partyTypeSchema.default("NATURAL_PERSON"),
    name: z.string().min(1, "El nombre y apellido / razÃ³n social es obligatorio").max(120),
    // Persona fÃ­sica obligatorio: DNI; Empresa obligatorio: enterpriseSocialCode (validado en superRefine)
    idNumber: z.string().max(50).optional().or(z.literal("")),
    enterpriseSocialCode: z.string().max(50).optional().or(z.literal("")),
    enterpriseName: z.string().max(120).optional().or(z.literal("")),
    phone: z.string().max(30).optional().or(z.literal("")),
    address: z.string().max(200).optional().or(z.literal("")),
    legalRep: z.string().max(40).optional().or(z.literal("")),
    contactName: z.string().max(40).optional().or(z.literal("")),
    notes: z.string().max(500).optional().or(z.literal(""))
  })
  .superRefine((p, ctx) => {
    if (p.partyType === "NATURAL_PERSON") {
      if (!p.idNumber || !p.idNumber.trim()) {
        ctx.addIssue({
          path: ["idNumber"],
          code: z.ZodIssueCode.custom,
          message: "La persona fÃ­sica debe completar el DNI (para bÃºsqueda de conflictos)"
        });
      }
    } else {
      if (!p.enterpriseSocialCode || !p.enterpriseSocialCode.trim()) {
        ctx.addIssue({
          path: ["enterpriseSocialCode"],
          code: z.ZodIssueCode.custom,
          message: "La empresa/organizaciÃ³n debe completar el cÃ³digo de crÃ©dito social unificado"
        });
      }
    }
  });

export const matterCreateSchema = z.object({
  // v0.27: El nombre del caso elimina todos los espacios en blanco (requisito del producto, para evitar espacios en listas/detalles)
  title: z.preprocess(
    (v) => (typeof v === "string" ? v.replace(/\s+/g, "") : v),
    z.string().min(1, "El nombre del caso es obligatorio").max(200)
  ),
  category: matterCategorySchema,

  // Causa
  causeId: z.string().cuid().optional().or(z.literal("")),
  causeFreeText: z.string().max(200).optional().or(z.literal("")),

  claimAmount: z.coerce.number().nonnegative().optional(),

  ourStanding: litigationStandingSchema.optional(),
  counterclaimAsPlaintiff: z.boolean().default(false),
  counterclaimAsDefendant: z.boolean().default(false),

  intakeDate: z.coerce.date().optional(),

  // Cliente: al menos uno, el primero es primary por defecto
  clientIds: z.array(z.string().cuid()).min(1, "SeleccionÃ¡ al menos un cliente"),

  // Lista de partes (cliente, contraparte, tercero)
  parties: z.array(partyInputSchema).default([]),

  // Primer procedimiento
  firstProcedure: z.object({
    type: procedureTypeSchema,
    customLabel: z.string().max(40).optional().or(z.literal("")),
    caseNumber: z.string().max(80).optional().or(z.literal("")),
    handlingAgency: z.string().max(120).optional().or(z.literal("")),
    acceptedAt: z.coerce.date().optional()
  })
});

export type MatterCreateInput = z.infer<typeof matterCreateSchema>;
export type PartyInput = z.infer<typeof partyInputSchema>;

// v0.27: EdiciÃ³n de informaciÃ³n bÃ¡sica del caso (NÂ° de sistema / fecha de admisiÃ³n son solo lectura, no estÃ¡n aquÃ­)
export const matterUpdateBasicSchema = z.object({
  id: z.string().cuid(),
  title: z.preprocess(
    (v) => (typeof v === "string" ? v.replace(/\s+/g, "") : v),
    z.string().min(1, "El nombre del caso es obligatorio").max(200)
  ),
  causeId: z.string().cuid().optional().or(z.literal("")),
  causeFreeText: z.string().max(200).optional().or(z.literal("")),
  claimAmount: z.coerce.number().nonnegative().optional().nullable(),
  ourStanding: litigationStandingSchema.optional().nullable()
});

export type MatterUpdateBasicInput = z.infer<typeof matterUpdateBasicSchema>;

export const matterListQuerySchema = z.object({
  search: z.string().optional(),
  category: matterCategorySchema.optional(),
  status: matterStatusSchema.optional(),
  statusIn: z.array(matterStatusSchema).optional(),
  statusNotIn: z.array(matterStatusSchema).optional(),
  ownerId: z.string().cuid().optional(),
  clientId: z.string().cuid().optional(),
  intakeDateFrom: z.coerce.date().optional(),
  intakeDateTo: z.coerce.date().optional(),
  sortBy: z.enum(["hearing", "intakeDate", "claimAmount", "archivedAt"]).default("intakeDate"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export type MatterListQuery = z.infer<typeof matterListQuerySchema>;

