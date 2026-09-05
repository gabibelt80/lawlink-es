"use server";

import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import {
  saveYuandianSettings as saveSettings,
  readPublicYuandianSettings
} from "@/lib/yuandian/settings";
import {
  searchPtalCases,
  YuandianNotConfiguredError,
  YuandianApiError
} from "@/lib/yuandian/client";

const saveSchema = z.object({
  apiKey: z.string().optional().or(z.literal("")),
  baseUrl: z.string().url().optional().or(z.literal("")),
  caseDetailHost: z.string().url().optional().or(z.literal(""))
});

const clearSchema = z.object({ confirm: z.literal(true) });

async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    throw new Error("ä»…Administrarå‘˜å¯ä¿®æ”¹pesoså…¸é…ç½®");
  }
  return session;
}

export async function getYuandianSettingsPublic() {
  await requireAdmin();
  return readPublicYuandianSettings();
}

export async function saveYuandianSettingsAction(input: z.infer<typeof saveSchema>) {
  const session = await requireAdmin();
  const data = saveSchema.parse(input);

  await saveSettings({
    apiKey: data.apiKey?.trim() || undefined,
    baseUrl: data.baseUrl?.trim() || undefined,
    caseDetailHost: data.caseDetailHost?.trim() || undefined
  });

  await audit({
    userId: session.user.id,
    action: "YUANDIAN_SETTINGS_SAVE",
    targetType: "SystemSetting",
    targetId: "yuandianSettings",
    detail: { changedKey: !!data.apiKey, baseUrl: data.baseUrl || null }
  });
  return { ok: true };
}

export async function clearYuandianKeyAction(input: z.infer<typeof clearSchema>) {
  const session = await requireAdmin();
  clearSchema.parse(input);
  await saveSettings({ clearKey: true });
  await audit({
    userId: session.user.id,
    action: "YUANDIAN_KEY_CLEAR",
    targetType: "SystemSetting",
    targetId: "yuandianSettings",
    detail: {}
  });
  return { ok: true };
}

/**
 * ç”¨æœ€å°ä»£ä»·æŽ¢æ´»ï¼šç”¨"æ°‘é—´å€Ÿè´·çº çº· / top_k=1"è¯•æŽ¢ï¼Œæ‰£ 10 POINTã€‚
 */
export async function testYuandianConnection(): Promise<{
  ok: boolean;
  message?: string;
}> {
  await requireAdmin();
  try {
    const r = await searchPtalCases({ ay: ["æ°‘é—´å€Ÿè´·çº çº·"], top_k: 1 });
    return { ok: true, message: `è¿žæŽ¥æˆåŠŸï¼Œå‘½ä¸­ ${r.total} æ¡ï¼ˆå·²æ‰£ 10 POINT è¯•è°ƒç”¨ï¼‰` };
  } catch (err) {
    if (err instanceof YuandianNotConfiguredError) {
      return { ok: false, message: err.message };
    }
    if (err instanceof YuandianApiError) {
      return { ok: false, message: `pesoså…¸Volveré”™è¯¯ï¼š${err.message}` };
    }
    return { ok: false, message: err instanceof Error ? err.message : "Desconocidoé”™è¯¯" };
  }
}


