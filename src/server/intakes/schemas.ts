import { z } from "zod";
import { matterCategorySchema, partyInputSchema, procedureTypeSchema } from "@/server/matters/schemas";

export const intakeStatusSchema = z.enum([
  "INTAKE",
  "PENDING_CONFIRMATION",
  "CONVERTED",
  "DECLINED",
  "NEEDS_REVISION"
]);

export const feeTypeSchema = z.enum(["FIXED", "CONTINGENCY", "TIMED"]);

export const clientTypeSchema = z.enum(["INDIVIDUAL", "COMPANY", "ORGANIZATION"]);

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

const litigationIntakeCategories = new Set([
  "CIVIL_COMMERCIAL",
  "LABOR_ARBITRATION",
  "COMMERCIAL_ARBITRATION",
  "CRIMINAL",
  "ADMINISTRATIVE"
]);

// Cuando el input HTML number queda vacío, valueAsNumber de react-hook-form produce NaN.
// Los montos opcionales deben tratarse como "sin completar", si no el resolver bloquearía el envío en campos que el usuario no ve.
const optionalNonnegativeNumberSchema = z.preprocess(
  (value) => (typeof value === "number" && Number.isNaN(value) ? undefined : value),
  z.coerce.number().nonnegative("El monto no puede ser negativo").optional()
);

const intakeCreateBaseSchema = z.object({
  // Básico
  // El nombre del caso elimina todos los espacios en blanco (requisito del producto, para evitar espacios en listas/detalles)
  title: z.preprocess(
    (v) => (typeof v === "string" ? v.replace(/\s+/g, "") : v),
    z.string().max(200).optional().or(z.literal(""))
  ),
  category: matterCategorySchema,
  causeId: z.string().cuid().optional().or(z.literal("")),
  causeFreeText: z.string().max(200).optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
  receivedAt: z.coerce.date().optional(),

  // Procedimiento + posición procesal + organismo + objeto
  firstProcedureType: procedureTypeSchema.optional(),
  firstAgency: z.string().max(120).optional().or(z.literal("")),
  jurisdiction: z.string().max(120).optional().or(z.literal("")),
  ourStanding: litigationStandingSchema.optional(),
  claimAmount: optionalNonnegativeNumberSchema,
  claimDescription: z.string().max(500).optional().or(z.literal("")),

  // v0.30: Inscripción en colegio + reconvención
  barFiling: z.enum(["NONE", "COLLECTIVE", "SENSITIVE", "MAJOR", "OTHER"]).optional(),
  counterclaim: z.boolean().default(false),

  // v0.31: No contencioso / consultoría / proyecto especial
  businessType: z.string().max(60).optional().or(z.literal("")),
  serviceScope: z.string().max(1000).optional().or(z.literal("")),
  deliverables: z.string().max(500).optional().or(z.literal("")),
  counselType: z.string().max(40).optional().or(z.literal("")),
  serviceStart: z.coerce.date().optional(),
  serviceEnd: z.coerce.date().optional(),

  // Cliente + contacto
  clientId: z.string().cuid().optional().or(z.literal("")),
  clientName: z.string().max(120).optional().or(z.literal("")),
  clientType: clientTypeSchema.optional(),
  contactName: z.string().max(40).optional().or(z.literal("")),
  contactPhone: z.string().max(30).optional().or(z.literal("")),

  // Autocompletado empresarial (resultado de consulta Yuandian, se pasa al crear Cliente)
  clientIdNumber: z.string().max(50).optional().or(z.literal("")),
  clientAddress: z.string().max(200).optional().or(z.literal("")),
  clientLegalRep: z.string().max(40).optional().or(z.literal("")),

  // Honorarios
  feeType: feeTypeSchema.optional(),
  feeAmount: optionalNonnegativeNumberSchema, // FIXED: Monto total; CONTINGENCY: honorario base
  contingencyTerms: z.string().max(1000).optional().or(z.literal("")), // Modalidad CONTINGENCY
  feeSchedule: z.string().max(500).optional().or(z.literal("")),
  feeNote: z.string().max(500).optional().or(z.literal("")),

  // Equipo
  ownerUserId: z.string().cuid().optional().or(z.literal("")),
  coUserIds: z.array(z.string().cuid()).default([]),

  // Contraparte / terceros (pueden tener standing)
  parties: z.array(partyInputSchema).default([])
});

function requireLitigationStandings(
  data: z.infer<typeof intakeCreateBaseSchema>,
  ctx: z.RefinementCtx
) {
  if (!litigationIntakeCategories.has(data.category)) return;

  if (!data.ourStanding) {
    ctx.addIssue({
      path: ["ourStanding"],
      code: z.ZodIssueCode.custom,
      message: "Seleccioná la posición procesal del cliente"
    });
  }

  data.parties.forEach((party, index) => {
    if (!party.standing) {
      ctx.addIssue({
        path: ["parties", index, "standing"],
        code: z.ZodIssueCode.custom,
        message: "Seleccioná la posición procesal"
      });
    }
  });
}

export const intakeCreateSchema = intakeCreateBaseSchema.superRefine(requireLitigationStandings);

export const intakeUpdateSchema = intakeCreateBaseSchema.extend({
  id: z.string().cuid()
}).superRefine(requireLitigationStandings);

export const intakeListQuerySchema = z.object({
  search: z.string().optional(),
  category: matterCategorySchema.optional(),
  status: intakeStatusSchema.optional(),
  statusIn: z.array(intakeStatusSchema).optional(),
  receivedAtFrom: z.coerce.date().optional(),
  receivedAtTo: z.coerce.date().optional(),
  sortBy: z.enum(["intakeDate", "claimAmount"]).default("intakeDate"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export const declineIntakeSchema = z.object({
  id: z.string().cuid(),
  reason: z.string().min(1, "Completá el motivo de rechazo").max(500)
});

export type IntakeCreateInput = z.infer<typeof intakeCreateSchema>;
export type IntakeListQuery = z.infer<typeof intakeListQuerySchema>;
export type DeclineIntakeInput = z.infer<typeof declineIntakeSchema>;