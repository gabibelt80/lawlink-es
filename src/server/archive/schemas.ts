import { z } from "zod";

export const archiveClosedReasonSchema = z.enum([
  "JUDGMENT",
  "MEDIATION",
  "WITHDRAWAL",
  "SETTLEMENT",
  "RULING",
  "OTHER",
]);

export const archiveSubmitSchema = z.object({
  matterId: z.string().cuid(),
  summary: z.string().min(1, "El resumen del cierre es obligatorio").max(4000),
  closedReason: archiveClosedReasonSchema,
  completedAt: z.coerce.date(),
  judgmentSummary: z.string().max(2000).optional().or(z.literal("")),
  // checklist de estado: { itemId: true/false }
  checklist: z.record(z.boolean()).default({}),
  // El abogado confirma archivo forzado (cuando faltan items obligatorios debe ser true para enviar)
  forceWithMissing: z.boolean().default(false),
});

export type ArchiveSubmitInput = z.infer<typeof archiveSubmitSchema>;

export const CLOSED_REASON_CN: Record<
  z.infer<typeof archiveClosedReasonSchema>,
  string
> = {
  JUDGMENT: "Sentencia",
  MEDIATION: "Mediación",
  WITHDRAWAL: "Desistimiento",
  SETTLEMENT: "Conciliación",
  RULING: "Resolución",
  OTHER: "Otro",
};