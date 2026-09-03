import type { Prisma } from "@prisma/client";

type DecimalLike = { toString(): string };

export function decimalToNumber(value: DecimalLike | number) {
  return typeof value === "number" ? value : Number(value.toString());
}

export function nullableDecimalToNumber(value: DecimalLike | number | null | undefined) {
  return value === null || value === undefined ? null : decimalToNumber(value);
}

/**
 * server action Volverå€¼é‡Œçš„ Prisma.Decimal æ·±åº¦è½¬ number åŽçš„ç±»åž‹ã€‚
 * Date / åŸºæœ¬ç±»åž‹ä¿æŒä¸å˜ï¼Œæ•°ç»„yåµŒå¥—å¯¹è±¡é€’å½’å¤„ç†ã€‚
 */
export type Serialized<T> = T extends Prisma.Decimal
  ? number
  : T extends Date
    ? T
    : T extends Array<infer U>
      ? Serialized<U>[]
      : T extends object
        ? { [K in keyof T]: Serialized<T[K]> }
        : T;

// æŒ‰ decimal.js å†…éƒ¨ç»“æž„ï¼ˆsign/exponent/digitsï¼‰è¯†åˆ«ï¼Œé¿å…åœ¨å¯èƒ½è¿›å…¥
// Clienteç«¯ bundle çš„ lib é‡Œå¼•å…¥ @prisma/client è¿è¡Œæ—¶
function isDecimalValue(value: unknown): value is DecimalLike {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { s?: unknown; e?: unknown; d?: unknown };
  return v.s !== undefined && v.e !== undefined && v.d !== undefined;
}

/**
 * æ·±åº¦éåŽ† server action Volverå€¼ï¼ŒæŠŠæ‰€æœ‰ Prisma.Decimal è½¬æˆ numberã€‚
 * ç”¨äºŽ RSC/Clienteç«¯åºåˆ—åŒ–è¾¹ç•Œï¼Œæ›¿ä»£å„ action æ‰‹å†™çš„é€å­—æ®µ mapï¼ˆæ¼ä¸€ä¸ª
 * å­—æ®µå°±æ˜¯è¿è¡Œæ—¶æŠ¥é”™ï¼Œtypecheck æ‹¦ä¸ä½ï¼‰ã€‚
 */
export function serializeDecimals<T>(value: T): Serialized<T> {
  if (isDecimalValue(value)) {
    return Number(value.toString()) as Serialized<T>;
  }
  if (value === null || typeof value !== "object") {
    return value as Serialized<T>;
  }
  if (value instanceof Date) {
    return value as Serialized<T>;
  }
  if (Array.isArray(value)) {
    return value.map((item) => serializeDecimals(item)) as Serialized<T>;
  }
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    out[key] = serializeDecimals(item);
  }
  return out as Serialized<T>;
}

