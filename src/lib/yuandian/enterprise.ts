/**
 * Integración YuanDian — Empresas (desactivada para Argentina)
 * Se mantiene la estructura para no romper imports, pero no llama a la API.
 */
import { getYuandianSettings, type ResolvedYuandianSettings } from "./settings";
import { YuandianNotConfiguredError, YuandianApiError } from "./client";

export type EnterpriseCandidate = {
  id: string;
  name: string;
  creditCode: string;
};

export type MappedEnterpriseInfo = {
  id: string;
  name: string;
  creditCode: string;
  legalRep: string;
  registeredCapital: string;
  address: string;
  status: string;
  businessScope: string;
  establishedDate: string;
};

export type EnterpriseStat = {
  category: string;
  total: number;
  asPlaintiff?: number;
  asDefendant?: number;
  top?: { key: string; count: number }[];
};

export type EnterpriseRiskLevel = "HIGH" | "MEDIUM" | "LOW" | "NONE";

export type EnterpriseSummary = {
  id: string;
  name: string;
  coreRisks: EnterpriseStat[];
  litigation: EnterpriseStat[];
  auxiliary: EnterpriseStat[];
  level: EnterpriseRiskLevel;
};

export async function searchEnterpriseCandidates(
  name: string,
  topK = 10,
  resolved?: ResolvedYuandianSettings,
): Promise<EnterpriseCandidate[]> {
  return [];
}

export async function getEnterpriseBaseInfo(
  id: string,
  resolved?: ResolvedYuandianSettings,
): Promise<MappedEnterpriseInfo | null> {
  return null;
}

export async function getEnterpriseSummary(
  identifier: { id?: string; socialCode?: string },
  resolved?: ResolvedYuandianSettings,
): Promise<EnterpriseSummary | null> {
  return null;
}