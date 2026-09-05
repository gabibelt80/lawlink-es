/**
 * v0.9.1 SMS AI å¢žå¼ºï¼ˆserver-onlyï¼‰
 *
 * æŠ½ enrichWithAi å‡ºæ¥å•ç‹¬æˆæ–‡ä»¶ï¼Œé¿å… client ç»„ä»¶ import sms-parser
 * æ—¶æŠŠ ai/client â†’ ai/settings â†’ storage/crypto â†’ node:crypto æ‹‰åˆ°
 * Clienteç«¯ bundle æŠ¥ UnhandledSchemeErrorã€‚
 *
 * è°ƒç”¨æ–¹ï¼šserver/sms/actions.ts â†’ parseAndSaveSmsï¼ˆä»… serverï¼‰
 */
import { aiChat, extractJson, AiNotConfiguredError } from "@/lib/ai/client";
import type { ParsedSms } from "./sms-parser";

/**
 * è°ƒç”¨ AI æŠ½æ­£åˆ™åšä¸å¥½çš„å­—æ®µï¼šsummary æ”¹å†™ / action AbogadoåŠ¨ä½œ / urgencyã€‚
 * ä¸è¦†ç›–æ­£åˆ™å·²æŠ½å‡ºçš„ç¡¬å­—æ®µï¼ˆæ¡ˆå· / æ³•é™¢ / Fecha / æ³•åº­ / æ³•å®˜ / ä¹¦è®°å‘˜ / ç”µè¯ / ä¸Šè¯‰æœŸï¼‰ã€‚
 * AI Error / æœªé…ç½® / è¶…æ—¶ â†’ é™é»˜VolveråŽŸ parsedï¼ˆä¸æŠ›é”™ï¼‰ã€‚
 */
export async function enrichWithAi(rawText: string, base: ParsedSms): Promise<ParsedSms> {
  const prompt = `ä¸‹é¢æ˜¯Abogadoæ”¶åˆ°çš„ä¸€æ¡æ³•é™¢/12368/ç”µå­é€è¾¾SMSã€‚è¯·è¾“å‡º JSONï¼Œ**åªå¡« 3 ä¸ªå­—æ®µ**ï¼š

{
  "summary": "ç”¨ä¸€å¥è¯å‡†ç¡®æ¦‚æ‹¬SMSè¦ç‚¹ï¼ˆâ‰¤ 40 å­—ï¼Œä¸è¦å¤è¯»æ³•é™¢å/æ¡ˆå·/Fechaï¼‰",
  "action": "Abogadoåº”é‡‡å–çš„å…·ä½“åŠ¨ä½œï¼ˆâ‰¤ 25 å­—ï¼Œå¦‚ï¼šå‡†æ—¶å‡ºåº­ã€ç¼´çº³è¯‰è®¼è´¹ã€ä¸‹è½½æ–‡ä¹¦ã€è¡¥å……è¯æ®ï¼›å¦‚æ— éœ€åŠ¨ä½œå¡« nullï¼‰",
  "urgency": "HIGH / MEDIUM / LOWï¼ˆHIGH=72h å†…å¿…é¡»å¤„ç†ï¼ŒMEDIUM=æœ¬å‘¨å¤„ç†ï¼ŒLOW=çŸ¥æ‚‰å³å¯ï¼‰"
}

SMSåŽŸæ–‡ï¼š
"""
${rawText.slice(0, 1500)}
"""

åªå›žå¤ JSONï¼Œä¸è¦å…¶ä»–æ–‡å­—ã€‚`;

  try {
    const res = await aiChat({
      messages: [{ role: "user", content: prompt }],
      maxTokens: 300,
      temperature: 0.2,
      timeoutMs: 12_000
    });
    const json = extractJson<{
      summary?: string;
      action?: string | null;
      urgency?: string;
    }>(res.content);
    if (!json) return base;

    const urgency =
      json.urgency === "HIGH" || json.urgency === "MEDIUM" || json.urgency === "LOW"
        ? (json.urgency as "HIGH" | "MEDIUM" | "LOW")
        : null;

    return {
      ...base,
      summary: json.summary?.trim() || base.summary,
      action: json.action?.trim() || null,
      urgency,
      aiEnriched: true
    };
  } catch (e) {
    if (e instanceof AiNotConfiguredError) {
      // æœªé…ç½® = ç”¨æˆ·æ²¡å¯ç”¨ AIï¼›ä¸æŠ›é”™ï¼Œç›´æŽ¥Volveræ­£åˆ™ç»“æžœ
      return base;
    }
    // ç½‘ç»œ/è¶…æ—¶/è§£æžé”™ä¹Ÿé™çº§
    return base;
  }
}

