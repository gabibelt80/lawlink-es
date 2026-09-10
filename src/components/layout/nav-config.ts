import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  Wallet,
  Calendar,
  ClipboardCheck,
  Inbox,
  Archive,
  Settings,
  BarChart3,
  BookOpen,
  Activity,
  Scale,
} from "lucide-react";
import type { ModuleKey } from "@/lib/modules";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  tone?: "courtSms";
  module?: ModuleKey;
};

export const primaryNav: NavItem[] = [
  { label: "Panel", href: "/dashboard", icon: LayoutDashboard },
  { label: "Casos", href: "/matters", icon: FolderOpen },
  { label: "Clientes", href: "/clients", icon: Users },
  { label: "Finanzas", href: "/finance", icon: Wallet, module: "FINANCE" },
  { label: "Agenda", href: "/schedule", icon: Calendar },
  { label: "Aprobaciones", href: "/approvals/seals", icon: ClipboardCheck },
  { label: "Jurisprudencia", href: "/jurisprudence", icon: Scale, module: "JURISPRUDENCE" },
  { label: "Agentes IA", href: "/agents/jurisprudence", icon: Activity, module: "IA" },
];

export const secondaryNav: NavItem[] = [
  {
    label: "Mensajes de la corte",
    href: "/inbox",
    icon: Inbox,
    tone: "courtSms",
  },
  { label: "Biblioteca", href: "/settings/writings", icon: BookOpen, module: "WRITINGS" },
  { label: "Archivo", href: "/archive", icon: Archive },
  { label: "Informes", href: "/reports", icon: BarChart3 },
  { label: "Configuración", href: "/settings", icon: Settings },
];

export function filterNavByModules(
  items: NavItem[],
  enabledModules: ModuleKey[]
): NavItem[] {
  return items.filter((item) => {
    if (!item.module) return true;
    return enabledModules.includes(item.module);
  });
}