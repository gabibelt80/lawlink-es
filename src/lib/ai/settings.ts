/**
 * v0.9.1 Configuración de IA (protocolo compatible con OpenAI)
 *
 * SystemSetting con clave `aiSettings`, valor JSON cifrado:
 *   { apiKeyCipher, baseUrl, textModel, visionModel }
 * apiKey se cifra con storage/crypto usando la misma clave (STORAGE_ENCRYPTION_KEY).
 *
 * Proveedor por defecto: Qwen (Alibaba Cloud) por su amplio nivel gratuito.
 * El usuario puede cambiar a cualquier endpoint compatible con OpenAI:
 * DeepSeek / Kimi / Zhipu / OpenAI / OpenRouter / Ollama / etc.
 */
import { prisma } from "@/lib/prisma";
import { encryptBuffer, decryptBuffer } from "@/lib/storage/crypto";

const AI_SETTINGS_KEY = "aiSettings";

export const AI_DEFAULTS = {
  baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  textModel: "qwen-turbo",
  visionModel: "qwen-vl-max"
} as const;

export interface StoredAiSettings {
  apiKeyCipher: { ct: string; iv: string; tag: string } | null;
  baseUrl: string;
  textModel: string;
  visionModel: string;
}

export interface ResolvedAiSettings {
  apiKey: string; // descifrada, solo para uso interno del servidor
  baseUrl: string;
  textModel: string;
  visionModel: string;
  configured: boolean;
}

function encryptKey(plain: string): StoredAiSettings["apiKeyCipher"] {
  if (!plain) return null;
  const enc = encryptBuffer(Buffer.from(plain, "utf-8"));
  return {
    ct: enc.ciphertext.toString("base64"),
    iv: enc.iv.toString("base64"),
    tag: enc.authTag.toString("base64")
  };
}

function decryptKey(cipher: StoredAiSettings["apiKeyCipher"]): string {
  if (!cipher) return "";
  const ct = Buffer.from(cipher.ct, "base64");
  return decryptBuffer(ct, cipher.iv, cipher.tag).toString("utf-8");
}

export async function readStoredAiSettings(): Promise<StoredAiSettings> {
  const row = await prisma.systemSetting.findUnique({ where: { key: AI_SETTINGS_KEY } });
  const stored = (row?.value as Partial<StoredAiSettings> | null) ?? {};
  return {
    apiKeyCipher: stored.apiKeyCipher ?? null,
    baseUrl: stored.baseUrl || AI_DEFAULTS.baseUrl,
    textModel: stored.textModel || AI_DEFAULTS.textModel,
    visionModel: stored.visionModel || AI_DEFAULTS.visionModel
  };
}

/** Datos para la UI: estado de configuración + valores (clave ofuscada) */
export async function readPublicAiSettings(): Promise<{
  configured: boolean;
  baseUrl: string;
  textModel: string;
  visionModel: string;
  apiKeyMasked: string;
}> {
  const s = await readStoredAiSettings();
  const key = decryptKey(s.apiKeyCipher);
  return {
    configured: !!key,
    baseUrl: s.baseUrl,
    textModel: s.textModel,
    visionModel: s.visionModel,
    apiKeyMasked: key ? `${key.slice(0, 4)}••••${key.slice(-4)}` : ""
  };
}

/** Para uso interno del servidor: configuración descifrada y lista para usar */
export async function getAiSettings(): Promise<ResolvedAiSettings> {
  const s = await readStoredAiSettings();
  const apiKey = decryptKey(s.apiKeyCipher);
  return {
    apiKey,
    baseUrl: s.baseUrl,
    textModel: s.textModel,
    visionModel: s.visionModel,
    configured: !!apiKey
  };
}

export async function saveAiSettings(input: {
  apiKey?: string; // si se omite, conserva el valor anterior; null lo elimina
  baseUrl?: string;
  textModel?: string;
  visionModel?: string;
  clearKey?: boolean;
}) {
  const current = await readStoredAiSettings();
  const next: StoredAiSettings = {
    apiKeyCipher: input.clearKey
      ? null
      : input.apiKey
        ? encryptKey(input.apiKey)
        : current.apiKeyCipher,
    baseUrl: input.baseUrl ?? current.baseUrl,
    textModel: input.textModel ?? current.textModel,
    visionModel: input.visionModel ?? current.visionModel
  };

  await prisma.systemSetting.upsert({
    where: { key: AI_SETTINGS_KEY },
    update: { value: next as object },
    create: { key: AI_SETTINGS_KEY, value: next as object }
  });

  return { ok: true };
}