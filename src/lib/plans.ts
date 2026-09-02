export type PlanKey = "trial" | "basic" | "professional" | "studio";

export const PLANS: Record<PlanKey, {
  label: string;
  price: number;
  maxUsers: number;
  maxBranch: number;
  trialDays: number;
  features: string[];
}> = {
  trial: {
    label: "Trial",
    price: 0,
    maxUsers: 1,
    maxBranch: 1,
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
    price: 29900,
    maxUsers: 4,
    maxBranch: 1,
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
    price: 59900,
    maxUsers: 11,
    maxBranch: 1,
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
    price: 99900,
    maxUsers: 999,
    maxBranch: 99,
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

export function getPlan(plan: string): (typeof PLANS)[PlanKey] {
  return PLANS[plan as PlanKey] ?? PLANS.trial;
}