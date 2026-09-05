import { z } from "zod";

const sealTypes = [
  "OFFICIAL_SEAL",
  "CONTRACT_SEAL",
  "FINANCE_SEAL",
  "LEGAL_REP_SEAL",
  "CONTRACT_REVIEW_SEAL"
] as const;

export const sealCreateSchema = z.object({
  sealType: z.enum(sealTypes),
  matterId: z.string().cuid().optional().nullable(),
  purpose: z.string().min(1, "ç”¨ç« äº‹ç”±å¿…å¡«").max(500),
  documentTitle: z.string().min(1, "æ–‡ä»¶æ ‡é¢˜å¿…å¡«").max(200),
  pageCount: z.coerce.number().int().positive().default(1),
  requireCrossPageSeal: z.coerce.boolean().default(false),
  copies: z.coerce.number().int().positive().default(1),
  urgency: z.enum(["NORMAL", "URGENT"]).default("NORMAL"),
  requestNote: z.string().max(500).optional().or(z.literal("")),
  parentSealRequestId: z.string().cuid().optional().nullable()
});

export const sealApproveSchema = z.object({
  id: z.string().cuid(),
  note: z.string().max(500).optional().or(z.literal(""))
});

export const sealRejectSchema = z.object({
  id: z.string().cuid(),
  reason: z.string().min(1, "è¯·è¯´æ˜ŽRechazarMotivo").max(500)
});

export const sealCancelSchema = z.object({
  id: z.string().cuid()
});

export const sealListFilterSchema = z.object({
  scope: z.enum(["mine", "approval", "all"]).default("mine"),
  status: z
    .enum(["PENDING", "APPROVED", "STAMPED", "REJECTED", "CANCELLED"])
    .optional(),
  sealType: z.enum(sealTypes).optional()
});

export type SealCreateInput = z.input<typeof sealCreateSchema>;


