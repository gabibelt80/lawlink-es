export type ModuleKey =
  | "WRITINGS"
  | "IA"
  | "JURISPRUDENCE"
  | "CHAT_CLIENTES"
  | "FINANCE"
  | "NOTIFICATIONS"
  | "GOOGLE_CALENDAR"
  | "GOOGLE_DRIVE"
  | "MEV_SYNC"
  | "PADRON_ABOGADOS";

export type ModuleInfo = {
  key: ModuleKey;
  label: string;
  description: string;
  icon: string;
  defaultEnabled: boolean;
};

export const MODULES: Record<ModuleKey, ModuleInfo> = {
  WRITINGS: {
    key: "WRITINGS",
    label: "Escritos y Plantillas",
    description: "Biblioteca de escritos, generador y editor",
    icon: "FileText",
    defaultEnabled: true,
  },
  IA: {
    key: "IA",
    label: "Inteligencia Artificial",
    description: "Editor Legal, Auditor Legal y Chat IA",
    icon: "Sparkles",
    defaultEnabled: true,
  },
  JURISPRUDENCE: {
    key: "JURISPRUDENCE",
    label: "Jurisprudencia",
    description: "Base de fallos y búsqueda jurídica",
    icon: "Scale",
    defaultEnabled: false,
  },
  CHAT_CLIENTES: {
    key: "CHAT_CLIENTES",
    label: "Chat con Clientes",
    description: "Comunicación directa con clientes",
    icon: "MessageSquare",
    defaultEnabled: false,
  },
  FINANCE: {
    key: "FINANCE",
    label: "Finanzas",
    description: "Facturación, cobros y honorarios",
    icon: "Wallet",
    defaultEnabled: true,
  },
  NOTIFICATIONS: {
    key: "NOTIFICATIONS",
    label: "Notificaciones",
    description: "Sistema de alertas y recordatorios",
    icon: "Bell",
    defaultEnabled: true,
  },
  GOOGLE_CALENDAR: {
    key: "GOOGLE_CALENDAR",
    label: "Google Calendar",
    description: "Sincronización con Google Calendar",
    icon: "Calendar",
    defaultEnabled: true,
  },
  GOOGLE_DRIVE: {
    key: "GOOGLE_DRIVE",
    label: "Google Drive",
    description: "Sincronización con Google Drive",
    icon: "Cloud",
    defaultEnabled: true,
  },
  MEV_SYNC: {
    key: "MEV_SYNC",
    label: "MEV / PJN Sync",
    description: "Mesas electrónicas y vinculaciones judiciales",
    icon: "Landmark",
    defaultEnabled: false,
  },
  PADRON_ABOGADOS: {
    key: "PADRON_ABOGADOS",
    label: "Padrón de Abogados",
    description: "Base de datos de abogados",
    icon: "Users",
    defaultEnabled: false,
  },
};

export type PlanModules = {
  [plan: string]: ModuleKey[];
};

export const PLAN_MODULES: PlanModules = {
  trial: ["WRITINGS", "FINANCE", "NOTIFICATIONS", "GOOGLE_CALENDAR", "GOOGLE_DRIVE"],
  basic: ["WRITINGS", "FINANCE", "NOTIFICATIONS", "GOOGLE_CALENDAR", "GOOGLE_DRIVE"],
  professional: ["WRITINGS", "FINANCE", "NOTIFICATIONS", "GOOGLE_CALENDAR", "GOOGLE_DRIVE", "IA"],
  studio: ["WRITINGS", "CHAT_CLIENTES", "GOOGLE_CALENDAR", "PADRON_ABOGADOS", "IA", "FINANCE", "GOOGLE_DRIVE", "JURISPRUDENCE", "NOTIFICATIONS", "MEV_SYNC"],
  plus: ["WRITINGS", "FINANCE", "NOTIFICATIONS", "GOOGLE_CALENDAR", "GOOGLE_DRIVE", "IA", "JURISPRUDENCE", "CHAT_CLIENTES"],
  sync: ["WRITINGS", "FINANCE", "NOTIFICATIONS", "GOOGLE_CALENDAR", "GOOGLE_DRIVE", "IA", "JURISPRUDENCE", "CHAT_CLIENTES", "MEV_SYNC", "PADRON_ABOGADOS"],
};

export function getPlanModules(plan: string): ModuleKey[] {
  return PLAN_MODULES[plan] ?? PLAN_MODULES.trial;
}

export async function getPlanModulesFromDB(plan: string): Promise<ModuleKey[]> {
  const { prisma } = await import("@/lib/prisma");
  const row = await prisma.systemSetting.findUnique({
    where: { key: "planModules" },
  });
  
  if (row?.value && typeof row.value === "object") {
    const plans = row.value as Record<string, ModuleKey[]>;
    if (plans[plan]) return plans[plan];
  }
  
  return PLAN_MODULES[plan] ?? PLAN_MODULES.trial;
}

export function isModuleEnabled(plan: string, module: ModuleKey): boolean {
  return getPlanModules(plan).includes(module);
}
