"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { MatterCategory } from "@prisma/client";

import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { saveFirmProfile, CATEGORY_WORD_DEFAULTS } from "./firm-profile";

const CATEGORY_KEYS = Object.keys(CATEGORY_WORD_DEFAULTS) as MatterCategory[];

/** çº¦ 256KBï¼ˆbase64 CÃ³digoåŽçš„å­—ç¬¦é•¿åº¦ä¸Šé™ï¼‰â€”â€”å¾‹æ‰€ logo åº”è¿œå°äºŽæ­¤ */
const MAX_LOGO_CHARS = 256 * 1024;

const saveSchema = z.object({
  firmName: z.string().trim().max(40).optional(),
  firmSubtitle: z.string().trim().max(40).optional(),
  matterCodePrefix: z.string().trim().max(12).optional(),
  firmShortName: z.string().trim().max(8).optional(),
  caseNoTemplate: z.string().trim().max(60).optional(),
  // undefined=ä¸æ”¹ logoï¼›null æˆ– "" =æ¸…é™¤ï¼›data URL å­—ç¬¦ä¸²=æ›¿æ¢
  logoDataUrl: z.string().nullable().optional(),
  categoryWords: z.record(z.string(), z.string().trim().max(12)).optional()
});

async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    throw new Error("ä»…Administrarå‘˜å¯ä¿®æ”¹å¾‹æ‰€ä¿¡æ¯é…ç½®");
  }
  return session;
}

export async function saveFirmProfileAction(input: z.infer<typeof saveSchema>) {
  const session = await requireAdmin();
  const data = saveSchema.parse(input);

  // Logo æ ¡éªŒï¼šå¿…é¡»æ˜¯ image/* çš„ base64 data URLï¼Œä¸”ä½“ç§¯å—é™
  if (typeof data.logoDataUrl === "string" && data.logoDataUrl.length > 0) {
    if (!/^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/.test(data.logoDataUrl)) {
      throw new Error("Logo å¿…é¡»æ˜¯ PNG / JPG / WebP / SVG å›¾ç‰‡");
    }
    if (data.logoDataUrl.length > MAX_LOGO_CHARS) {
      throw new Error("Logo ä½“ç§¯è¿‡å¤§ï¼Œè¯·æŽ§åˆ¶åœ¨çº¦ 180KB ä»¥å†…");
    }
  }

  // åªä¿ç•™æœ‰æ•ˆç±»åˆ«é”®çš„éžç©ºè¯
  let categoryWords: Partial<Record<MatterCategory, string>> | undefined;
  if (data.categoryWords) {
    categoryWords = {};
    for (const key of CATEGORY_KEYS) {
      const word = data.categoryWords[key];
      if (typeof word === "string" && word.length > 0) categoryWords[key] = word;
    }
  }

  await saveFirmProfile({
    firmName: data.firmName,
    firmSubtitle: data.firmSubtitle,
    matterCodePrefix: data.matterCodePrefix,
    firmShortName: data.firmShortName,
    caseNoTemplate: data.caseNoTemplate,
    logoDataUrl:
      data.logoDataUrl === undefined
        ? undefined
        : data.logoDataUrl
          ? data.logoDataUrl
          : null,
    categoryWords: categoryWords as Record<MatterCategory, string> | undefined
  });

  await audit({
    userId: session.user.id,
    action: "FIRM_PROFILE_SAVE",
    targetType: "SystemSetting",
    targetId: "firmProfile"
  });

  // ä¾§æ å“ç‰Œåœ¨æ‰€æœ‰ (app) é¡µé¢æ¸²æŸ“ â†’ åˆ·æ–°æ•´ä¸ªå¸ƒå±€
  revalidatePath("/", "layout");
  return { ok: true };
}


