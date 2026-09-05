/**
 * Configuración de servicios de mensajería argentinos
 * 
 * SystemSetting con clave `expressSettings`, valor JSON cifrado:
 *   {
 *     andreani: { apiKeyCipher: {ct,iv,tag} },
 *     correoArgentino: { apiKeyCipher: {ct,iv,tag} }
 *   }
 */
import { prisma } from "@/lib/prisma";
import { encryptBuffer, decryptBuffer } from "@/lib/storage/crypto";
export async function readPublicExpressSettings(): Promise<{
  andreani: { configured: boolean; apiKeyMasked: string };
  correoArgentino: { configured: boolean; apiKeyMasked: string };
}> {
  const s = await readStoredExpressSettings();
  const andreaApiKey = dec(s.andreani.apiKeyCipher);
  const correoApiKey = dec(s.correoArgentino.apiKeyCipher);
  return {
    andreani: {
      configured: !!andreaApiKey,
      apiKeyMasked: andreaApiKey ? `${andreaApiKey.slice(0, 4)}••••${andreaApiKey.slice(-4)}` : ""
    },
    correoArgentino: {
      configured: !!correoApiKey,
      apiKeyMasked: correoApiKey ? `${correoApiKey.slice(0, 4)}••••${correoApiKey.slice(-4)}` : ""
    }
  };
}

const EXPRESS_SETTINGS_KEY = "expressSettings";

type Cipher = { ct: string; iv: string; tag: string };

export interface StoredExpressSettings {
  andreani: { apiKeyCipher: Cipher | null };
  correoArgentino: { apiKeyCipher: Cipher | null };
}

export interface ResolvedExpressSettings {
  andreani: { apiKey: string; configured: boolean };
  correoArgentino: { apiKey: string; configured: boolean };
  andreaConfigured: boolean;
  correoConfigured: boolean;
  andreaApiKey: string;
  correoApiKey: string;
}

function enc(plain: string): Cipher | null {
  if (!plain) return null;
  const e = encryptBuffer(Buffer.from(plain, "utf-8"));
  return {
    ct: e.ciphertext.toString("base64"),
    iv: e.iv.toString("base64"),
    tag: e.authTag.toString("base64")
  };
}

function dec(c: Cipher | null): string {
  if (!c) return "";
  return decryptBuffer(Buffer.from(c.ct, "base64"), c.iv, c.tag).toString("utf-8");
}

export async function readStoredExpressSettings(): Promise<StoredExpressSettings> {
  const row = await prisma.systemSetting.findUnique({ where: { key: EXPRESS_SETTINGS_KEY } });
  const v = (row?.value as Partial<StoredExpressSettings> | null) ?? {};
  return {
    andreani: {
      apiKeyCipher: v.andreani?.apiKeyCipher ?? null
    },
    correoArgentino: {
      apiKeyCipher: v.correoArgentino?.apiKeyCipher ?? null
    }
  };
}

export async function getExpressSettings(): Promise<ResolvedExpressSettings> {
  const s = await readStoredExpressSettings();
  const andreaApiKey = dec(s.andreani.apiKeyCipher);
  const correoApiKey = dec(s.correoArgentino.apiKeyCipher);
  return {
    andreani: {
      apiKey: andreaApiKey,
      configured: !!andreaApiKey
    },
    correoArgentino: {
      apiKey: correoApiKey,
      configured: !!correoApiKey
    },
    andreaConfigured: !!andreaApiKey,
    correoConfigured: !!correoApiKey,
    andreaApiKey,
    correoApiKey
  };
}

export async function saveExpressSettings(input: {
  andreaniApiKey?: string;
  andreaniClearKey?: boolean;
  correoArgentinoApiKey?: string;
  correoArgentinoClearKey?: boolean;
}) {
  const cur = await readStoredExpressSettings();
  const next: StoredExpressSettings = {
    andreani: {
      apiKeyCipher: input.andreaniClearKey
        ? null
        : input.andreaniApiKey
          ? enc(input.andreaniApiKey)
          : cur.andreani.apiKeyCipher
    },
    correoArgentino: {
      apiKeyCipher: input.correoArgentinoClearKey
        ? null
        : input.correoArgentinoApiKey
          ? enc(input.correoArgentinoApiKey)
          : cur.correoArgentino.apiKeyCipher
    }
  };

  await prisma.systemSetting.upsert({
    where: { key: EXPRESS_SETTINGS_KEY },
    update: { value: next as object },
    create: { key: EXPRESS_SETTINGS_KEY, value: next as object }
  });

  return { ok: true };
}
