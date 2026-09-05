/**
 * v0.19: ConfiguraciÃ³n de la API de Yuandian (chineselaw.com)
 *
 * Utiliza el mismo mecanismo de encriptaciÃ³n de AI ConfiguraciÃ³n (STORAGE_ENCRYPTION_KEY)
 * con una clave independiente de SystemSetting.
 * Yuandian ofrece APIs de legislaciÃ³n / casos / empresas; en esta versiÃ³n se integra la "bÃºsqueda de casos".
 */
import { prisma } from "@/lib/prisma";
import { encryptBuffer, decryptBuffer } from "@/lib/storage/crypto";

const YUANDIAN_SETTINGS_KEY = "yuandianSettings";

export const YUANDIAN_DEFAULTS = {
  baseUrl: "https://open.chineselaw.com/open",
  caseDetailHost: "https://www.chineselaw.com"
} as const;

export interface StoredYuandianSettings {
  apiKeyCipher: { ct: string; iv: string; tag: string } | null;
  baseUrl: string;
  caseDetailHost: string;
}

export interface ResolvedYuandianSettings {
  apiKey: string;
  baseUrl: string;
  caseDetailHost: string;
  configured: boolean;
}

function encryptKey(plain: string): StoredYuandianSettings["apiKeyCipher"] {
  if (!plain) return null;
  const enc = encryptBuffer(Buffer.from(plain, "utf-8"));
  return {
    ct: enc.ciphertext.toString("base64"),
    iv: enc.iv.toString("base64"),
    tag: enc.authTag.toString("base64")
  };
}

function decryptKey(cipher: StoredYuandianSettings["apiKeyCipher"]): string {
  if (!cipher) return "";
  const ct = Buffer.from(cipher.ct, "base64");
  return decryptBuffer(ct, cipher.iv, cipher.tag).toString("utf-8");
}

export async function readStoredYuandianSettings(): Promise<StoredYuandianSettings> {
  const row = await prisma.systemSetting.findUnique({ where: { key: YUANDIAN_SETTINGS_KEY } });
  const stored = (row?.value as Partial<StoredYuandianSettings> | null) ?? {};
  return {
    apiKeyCipher: stored.apiKeyCipher ?? null,
    baseUrl: stored.baseUrl || YUANDIAN_DEFAULTS.baseUrl,
    caseDetailHost: stored.caseDetailHost || YUANDIAN_DEFAULTS.caseDetailHost
  };
}

export async function readPublicYuandianSettings(): Promise<{
  configured: boolean;
  baseUrl: string;
  caseDetailHost: string;
  apiKeyMasked: string;
}> {
  const s = await readStoredYuandianSettings();
  const key = decryptKey(s.apiKeyCipher);
  return {
    configured: !!key,
    baseUrl: s.baseUrl,
    caseDetailHost: s.caseDetailHost,
    apiKeyMasked: key ? `${key.slice(0, 4)}â€¢â€¢â€¢â€¢${key.slice(-4)}` : ""
  };
}

export async function getYuandianSettings(): Promise<ResolvedYuandianSettings> {
  const s = await readStoredYuandianSettings();
  const apiKey = decryptKey(s.apiKeyCipher);
  return {
    apiKey,
    baseUrl: s.baseUrl,
    caseDetailHost: s.caseDetailHost,
    configured: !!apiKey
  };
}

export async function saveYuandianSettings(input: {
  apiKey?: string;
  baseUrl?: string;
  caseDetailHost?: string;
  clearKey?: boolean;
}) {
  const current = await readStoredYuandianSettings();
  const next: StoredYuandianSettings = {
    apiKeyCipher: input.clearKey
      ? null
      : input.apiKey
        ? encryptKey(input.apiKey)
        : current.apiKeyCipher,
    baseUrl: input.baseUrl ?? current.baseUrl,
    caseDetailHost: input.caseDetailHost ?? current.caseDetailHost
  };

  await prisma.systemSetting.upsert({
    where: { key: YUANDIAN_SETTINGS_KEY },
    update: { value: next as object },
    create: { key: YUANDIAN_SETTINGS_KEY, value: next as object }
  });

  return { ok: true };
}
