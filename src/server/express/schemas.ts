import { z } from "zod";

export const expressCreateSchema = z.object({
  trackingNo: z.string().min(6, "El número de seguimiento debe tener al menos 6 caracteres").max(40),
  companyCode: z.string().max(20).optional().or(z.literal("")),
  direction: z.enum(["OUTBOUND", "INBOUND"]),
  matterId: z.string().cuid().optional().nullable(),
  purpose: z.string().min(1, "El propósito es obligatorio").max(200),
  recipient: z.string().max(80).optional().or(z.literal("")),
  recipientPhone: z.string().max(20).optional().or(z.literal(""))
});

export const expressListFilterSchema = z.object({
  scope: z.enum(["mine", "all"]).default("all"),
  direction: z.enum(["OUTBOUND", "INBOUND", "ALL"]).default("ALL"),
  matterId: z.string().cuid().optional(),
  search: z.string().max(80).optional().or(z.literal(""))
});

export const expressIdSchema = z.object({ id: z.string().cuid() });

export const expressSettingsSaveSchema = z.object({
  andreaniApiKey: z.string().max(80).optional().or(z.literal("")),
  andreaniClearKey: z.boolean().optional(),
  correoArgentinoApiKey: z.string().max(80).optional().or(z.literal("")),
  correoArgentinoClearKey: z.boolean().optional()
});