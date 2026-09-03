import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * v0.39: åŽŸå­ç”ŸæˆClienteç¼–å· KH-{YYYY}-{4ä½æµæ°´}
 *
 * è®¡æ•°å™¨å­˜åœ¨ SystemSettingï¼Œkey å½¢å¦‚ `client-code-counter-2026`ã€‚
 * y matters/code-generator.ts åŒæ¬¾ Serializable äº‹åŠ¡é¿å…å¹¶å‘å†²çªã€‚
 */
export async function generateClientCode(): Promise<string> {
  const year = new Date().getFullYear();
  const key = `client-code-counter-${year}`;

  const next = await prisma.$transaction(
    async (tx) => {
      const existing = await tx.systemSetting.findUnique({ where: { key } });
      const current = (existing?.value as { value?: number })?.value ?? 0;
      const incremented = current + 1;
      await tx.systemSetting.upsert({
        where: { key },
        update: { value: { value: incremented } },
        create: { key, value: { value: incremented } }
      });
      return incremented;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );

  const padded = String(next).padStart(4, "0");
  return `KH-${year}-${padded}`;
}


