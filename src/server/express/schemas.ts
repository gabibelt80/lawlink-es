import { z } from "zod";

export const expressCreateSchema = z.object({
  trackingNo: z.string().min(6, "å•å·è‡³å°‘ 6 ä½").max(40),
  companyCode: z.string().max(20).optional().or(z.literal("")), // ä¸­æ–‡å…¬å¸å
  direction: z.enum(["OUTBOUND", "INBOUND"]),
  matterId: z.string().cuid().optional().nullable(),
  purpose: z.string().min(1, "ç”¨é€”å¿…å¡«").max(200),
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

// é…ç½®
export const expressSettingsSaveSchema = z.object({
  kdniaoEbusinessId: z.string().max(40).optional().or(z.literal("")),
  kdniaoAppKey: z.string().max(80).optional().or(z.literal("")),
  kdniaoClearKey: z.boolean().optional(),
  kuaidi100Customer: z.string().max(40).optional().or(z.literal("")),
  kuaidi100Key: z.string().max(80).optional().or(z.literal("")),
  kuaidi100ClearKey: z.boolean().optional()
});


