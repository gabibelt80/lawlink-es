export type PlanKey = "trial" | "basic" | "professional" | "studio";

export type PlanInfo = {
  label: string;
  description: string;
  price: number;
  maxUsers: number;
  maxBranch: number;
  storageGB: number;
  trialDays: number;
  features: string[];
};

export const PLANS: Record<PlanKey, PlanInfo> = {
  trial: {
    label: "Trial",
    description: "Plan gratuito de prueba",
    price: 0,
    maxUsers: 1,
    maxBranch: 1,
    storageGB: 3,
    trialDays: 14,
    features: [
      "1 administrador",
      "Casos ilimitados",
      "1 sucursal",
      "14 días gratis",
    ],
  },
  basic: {
    label: "Básico",
    description: "Para estudios que recién empiezan",
    price: 29900,
    maxUsers: 4,
    maxBranch: 1,
    storageGB: 5,
    trialDays: 0,
    features: [
      "1 administrador + 3 usuarios",
      "Casos ilimitados",
      "1 sucursal",
      "Soporte por email",
    ],
  },
  professional: {
    label: "Profesional",
    description: "Para estudios en crecimiento",
    price: 59900,
    maxUsers: 11,
    maxBranch: 1,
    storageGB: 10,
    trialDays: 0,
    features: [
      "1 administrador + 10 usuarios",
      "Casos ilimitados",
      "1 sucursal",
      "Soporte prioritario",
      "Reportes avanzados",
    ],
  },
  studio: {
    label: "Estudio",
    description: "Para estudios grandes con múltiples sucursales",
    price: 99900,
    maxUsers: 999,
    maxBranch: 99,
    storageGB: 30,
    trialDays: 0,
    features: [
      "Usuarios ilimitados",
      "Casos ilimitados",
      "Multi-sucursal",
      "Soporte dedicado",
      "Onboarding personalizado",
      "API de integración",
    ],
  },
};

export const PLAN_KEYS = Object.keys(PLANS) as PlanKey[];

export function getPlan(plan: string): PlanInfo {
  return PLANS[plan as PlanKey] ?? PLANS.trial;
}