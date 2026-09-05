/**
 * Next.js instrumentation hookï¼šè¿›ç¨‹å¯åŠ¨æ—¶ä¸€æ¬¡æ€§å‰¯ä½œç”¨Registrarseã€‚
 * å¯ç”¨æ–¹å¼ï¼šnext.config.mjs experimental.instrumentationHook = true
 *
 * å½“å‰å”¯ä¸€èŒè´£ï¼šRegistrarse cron å®šæ—¶ä½œä¸šï¼ˆä»…ç”Ÿäº§ / nodejs runtimeï¼‰ã€‚
 * dev æ¨¡å¼è·³è¿‡ï¼Œé¿å…å¼€å‘æ—¶è¯¯æŽ¨çœŸå®žNotificacionesã€‚
 *
 * âš  é‡è¦ï¼šNext 14.x å³ä½¿ register() å†…ç”¨äº† dynamic importï¼Œdev æ¨¡å¼ä»ä¼šæ‰«æ
 * ä¾èµ–é“¾ç»™ edge runtime ç¼–è¯‘ä¸€éï¼ˆnext-auth/bcryptjs ä¾èµ– node:crypto ä¼š 500ï¼‰ã€‚
 * è§£å†³æ–¹æ³•ï¼šdev æ¨¡å¼ä¸‹ä¸å…‰è·³è¿‡æ‰§è¡Œï¼Œè¿ž import è·¯å¾„éƒ½ä¸è¦å†™â€”â€”å½»åº• noopã€‚
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.DISABLE_CRON === "1") return;

  // ä»…ç”Ÿäº§ nodejs è¿è¡Œæ—¶æ‰è§£æžè¿™ä¸ªæ¨¡å—è·¯å¾„
  const mod = await import(/* webpackIgnore: true */ "./server/cron/scheduler");
  (mod as { registerCronJobs: () => void }).registerCronJobs();
}

