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
  // checklist å‹¾é€‰Estadoï¼š{ itemId: true/false }
  checklist: z.record(z.boolean()).default({}),
  // AbogadoConfirmarå¼ºåˆ¶å½’æ¡£ï¼ˆç¼ºå¿…å¡«Ã­temsæ—¶éœ€ true æ‰èƒ½Enviarï¼‰
  forceWithMissing: z.boolean().default(false),
});

export type ArchiveSubmitInput = z.infer<typeof archiveSubmitSchema>;

export const CLOSED_REASON_CN: Record<
  z.infer<typeof archiveClosedReasonSchema>,
  string
> = {
  JUDGMENT: "åˆ¤å†³",
  MEDIATION: "è°ƒè§£",
  WITHDRAWAL: "æ’¤è¯‰",
  SETTLEMENT: "å’Œè§£",
  RULING: "è£å®š",
  OTHER: "å…¶ä»–",
};


