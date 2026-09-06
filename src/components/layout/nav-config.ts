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
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  tone?: "courtSms";
};

export const primaryNav: NavItem[] = [
  { label: "Panel", href: "/", icon: LayoutDashboard },
  { label: "Casos", href: "/matters", icon: FolderOpen },
  { label: "Clientes", href: "/clients", icon: Users },
  { label: "Finanzas", href: "/finance", icon: Wallet },
  { label: "Agenda", href: "/schedule", icon: Calendar },
  { label: "Aprobaciones", href: "/approvals/seals", icon: ClipboardCheck },
  { label: "Agentes IA", href: "/agents", icon: Activity },
];

export const secondaryNav: NavItem[] = [
  {
    label: "Mensajes de la corte",
    href: "/inbox",
    icon: Inbox,
    tone: "courtSms",
  },
  { label: "Biblioteca", href: "/settings/writings", icon: BookOpen },
  { label: "Archivo", href: "/archive", icon: Archive },
  { label: "Informes", href: "/reports", icon: BarChart3 },
  { label: "Configuración", href: "/settings", icon: Settings },
];