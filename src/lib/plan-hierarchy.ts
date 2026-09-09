import type { PlanKey } from "@/lib/plans";

/**
 * Jerarquía de planes - solo upgrades permitidos
 * 
 * trial → basic → professional → studio
 */
export const PLAN_HIERARCHY: Record<PlanKey, PlanKey[]> = {
  trial: ["basic", "professional", "studio"],
  basic: ["professional", "studio"],
  professional: ["studio"],
  studio: [], // Máximo, no puede cambiar
};

/**
 * Verifica si el estudio puede cambiar al plan indicado
 * Solo upgrades, nunca downgrades
 */
export function canChangePlan(currentPlan: string, targetPlan: string): boolean {
  const current = currentPlan as PlanKey;
  const target = targetPlan as PlanKey;
  
  // Si es el mismo plan, no hay cambio
  if (current === target) return false;
  
  // Solo upgrades permitidos
  return PLAN_HIERARCHY[current]?.includes(target) ?? false;
}
