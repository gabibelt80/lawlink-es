import { describe, it, expect, beforeAll } from "vitest";
import { encryptBuffer, decryptBuffer, sha256 } from "@/lib/storage/crypto";

beforeAll(() => {
  // æµ‹è¯•ç”¨å›ºå®šå¯†é’¥ï¼ˆ32 å­—èŠ‚ base64ï¼‰
  process.env.STORAGE_ENCRYPTION_KEY = "dGVzdC1rZXktMzItYnl0ZXMtbG9uZy1lbm91Z2gteHg=";
});

describe("crypto", () => {
  it("encryptBuffer + decryptBuffer roundtrip", () => {
    const plain = Buffer.from("LawLink æ–‡æ¡£åŠ å¯†æµ‹è¯• ðŸ”’");
    const { ciphertext, iv, authTag } = encryptBuffer(plain);
    const restored = decryptBuffer(ciphertext, iv.toString("base64"), authTag.toString("base64"));
    expect(restored.toString()).toBe(plain.toString());
  });

  it("ä¸åŒæ˜Žæ–‡äº§ç”Ÿä¸åŒå¯†æ–‡", () => {
    const a = encryptBuffer(Buffer.from("AAA"));
    const b = encryptBuffer(Buffer.from("BBB"));
    expect(a.ciphertext.equals(b.ciphertext)).toBe(false);
  });

  it("ç›¸åŒæ˜Žæ–‡ä¸åŒ IVï¼ˆéšæœºæ€§ï¼‰", () => {
    const plain = Buffer.from("same");
    const a = encryptBuffer(plain);
    const b = encryptBuffer(plain);
    expect(a.iv.equals(b.iv)).toBe(false);
  });

  it("sha256 ä¸€è‡´æ€§", () => {
    const data = Buffer.from("hello");
    expect(sha256(data)).toBe(sha256(data));
    expect(sha256(data)).toHaveLength(64); // hex string
  });
});

