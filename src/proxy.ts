import { withAuth } from "next-auth/middleware";

/**
 * å…¨ç«™é»˜è®¤è¦æ±‚Iniciar sesiÃ³nã€‚
 * `matcher` æ˜¾å¼æŽ’é™¤ /loginã€/api/auth/*ã€é™æ€èµ„æºetc.å…¬å¼€è·¯å¾„ã€‚
 */
export default withAuth({
  pages: {
    signIn: "/login"
  }
});

export const config = {
  matcher: [
    /*
     * Coincidenciaæ‰€æœ‰è·¯å¾„ï¼Œä½†æŽ’é™¤ï¼š
     *   /login            Iniciar sesiÃ³né¡µæœ¬èº«
     *   /api/auth         NextAuth è·¯ç”±
     *   /api/health       å¥åº·æ£€æŸ¥
     *   /api/calendar     v0.50 ICS æ—¥åŽ†è®¢é˜…ï¼ˆtoken å³å‡­è¯ï¼Œæ—¥åŽ†Clienteç«¯æ—  cookieï¼‰
     *   /_next/*          Next å†…éƒ¨èµ„æºï¼ˆå« HMR websocketï¼‰
     *   é™æ€æ–‡ä»¶ï¼ˆ.png .ico .svg etc.ï¼‰
     */
    "/((?!login|api/auth|api/health|api/calendar|_next|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)).*)"
  ]
};

