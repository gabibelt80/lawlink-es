/**
 * v0.42 Configuración de información del estudio / sistema de numeración (ítems 1 + ítems 11)
 *
 * Una sola clave SystemSetting `firmProfile`, value es JSON:
 *   - firmName / firmSubtitle / logoDataUrl: marca de la barra lateral (por defecto Juridictas / Panel de trabajo jurídico)
 *   - matterCodePrefix: prefijo de numeración interna (segmento LL del internalCode, por defecto LL)
 *   - firmShortName / caseNoTemplate / categoryWords: plantilla de número interno del estudio y mapeo de cada segmento
 *
 * Sigue el patrón de «clave única + lectura/escritura tipada» de src/lib/ai/settings.ts. El logo se guarda
 * directamente como data URL base64 (el logo del estudio es pequeño), evitando almacenamiento o rutas de servicio adicionales.
 */
import type { MatterCategory } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const FIRM_PROFILE_KEY = "firmProfile";

/** Mapeo por defecto de {palabraCat}: se puede editar por categoría en la página de Configuración */
export const CATEGORY_WORD_DEFAULTS: Record<MatterCategory, string> = {
  CIVIL_COMMERCIAL: "Civil",
  LABOR_ARBITRATION: "Laboral",
  COMMERCIAL_ARBITRATION: "Comercial",
  CRIMINAL: "Penal",
  ADMINISTRATIVE: "Admin",
  NON_LITIGATION: "NoCont",
  LEGAL_COUNSEL: "Asesoría",
  SPECIAL_PROJECT: "Proyecto"
};

/** Abreviatura de una letra de {cat} (fija, no editable) */
export const CATEGORY_ABBR: Record<MatterCategory, string> = {
  CIVIL_COMMERCIAL: "C",
  LABOR_ARBITRATION: "L",
  COMMERCIAL_ARBITRATION: "A",
  CRIMINAL: "P",
  ADMINISTRATIVE: "D",
  NON_LITIGATION: "N",
  LEGAL_COUNSEL: "G",
  SPECIAL_PROJECT: "E"
};

export interface FirmProfile {
  firmName: string;
  firmSubtitle: string;
  logoDataUrl: string | null;
  matterCodePrefix: string;
  firmShortName: string;
  caseNoTemplate: string;
  categoryWords: Record<MatterCategory, string>;
}

export const FIRM_PROFILE_DEFAULTS: FirmProfile = {
  firmName: "Juridictas",
  firmSubtitle: "Panel de trabajo jurídico",
  logoDataUrl: null,
  matterCodePrefix: "LL",
  firmShortName: "",
  caseNoTemplate: "{año}-{est}{palabraCat}-{sec3}",
  categoryWords: CATEGORY_WORD_DEFAULTS
};

export async function getFirmProfile(): Promise<FirmProfile> {
  const row = await prisma.systemSetting.findUnique({ where: { key: FIRM_PROFILE_KEY } });
  const s = (row?.value as Partial<FirmProfile> | null) ?? {};
  return {
    firmName: s.firmName || FIRM_PROFILE_DEFAULTS.firmName,
    firmSubtitle: s.firmSubtitle ?? FIRM_PROFILE_DEFAULTS.firmSubtitle,
    logoDataUrl: s.logoDataUrl ?? null,
    matterCodePrefix: s.matterCodePrefix?.trim() || FIRM_PROFILE_DEFAULTS.matterCodePrefix,
    firmShortName: s.firmShortName ?? FIRM_PROFILE_DEFAULTS.firmShortName,
    caseNoTemplate: s.caseNoTemplate?.trim() || FIRM_PROFILE_DEFAULTS.caseNoTemplate,
    categoryWords: { ...CATEGORY_WORD_DEFAULTS, ...(s.categoryWords ?? {}) }
  };
}

export async function saveFirmProfile(patch: Partial<FirmProfile>): Promise<FirmProfile> {
  const current = await getFirmProfile();
  // Fusión explícita campo por campo: undefined significa «no cambiar» (el spread de objetos sobrescribiría con undefined, por eso no se usa).
  // logoDataUrl es especial: undefined = conservar, null = eliminar.
  const next: FirmProfile = {
    firmName: patch.firmName ?? current.firmName,
    firmSubtitle: patch.firmSubtitle ?? current.firmSubtitle,
    logoDataUrl: patch.logoDataUrl === undefined ? current.logoDataUrl : patch.logoDataUrl,
    matterCodePrefix: patch.matterCodePrefix ?? current.matterCodePrefix,
    firmShortName: patch.firmShortName ?? current.firmShortName,
    caseNoTemplate: patch.caseNoTemplate ?? current.caseNoTemplate,
    categoryWords: { ...current.categoryWords, ...(patch.categoryWords ?? {}) }
  };
  await prisma.systemSetting.upsert({
    where: { key: FIRM_PROFILE_KEY },
    update: { value: next as object },
    create: { key: FIRM_PROFILE_KEY, value: next as object }
  });
  return next;
}