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
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  tone?: "courtSms";
};

// v0.4: ä¸€çº§èœå•æ”¶ç´§ â€”â€” æ”¶æ¡ˆåˆå¹¶åˆ°Casoã€åˆ©ç›Šå†²çªè¿›é¡¶æ ã€ææ–™åªåœ¨Casoè¯¦æƒ…
// v0.8.1: ç”¨ç« ç»Ÿä¸€æ”¶å£åˆ°"AprobaciÃ³n"ï¼ˆæœªæ¥å¯æ‰©æ–‡ä¹¦å†…å®¡etc.å…¶ä»–AprobaciÃ³nç±»åž‹ï¼‰
// v0.9.3: åŠ "å¿«é€’"
// v0.37: å¿«é€’/å·¥å…·/æœåŠ¡ä¸­å¿ƒ ç§»å…¥é¡¶æ ã€Œåº”ç”¨ã€èœå•ï¼Œä¸å†å ä¾§è¾¹
// v0.45: æš‚æ—¶éšè—"PreservaciÃ³n"ä¸€çº§å…¥å£ï¼Œä»£ç yè·¯ç”±ä¿ç•™ä»¥ä¾¿æ¢å¤
// v0.47: æ¢å¤"æ³•é™¢SMS"åˆ°å·¦ä¸‹è§’è¾…åŠ©å¯¼èˆªï¼Œæ”¾åœ¨å½’æ¡£ä¸Šæ–¹å¹¶ç”¨ç‹¬ç«‹å¼ºè°ƒè‰²
export const primaryNav: NavItem[] = [
  { label: "Panel", href: "/", icon: LayoutDashboard },
  { label: "Casos", href: "/matters", icon: FolderOpen },
  { label: "Clientes", href: "/clients", icon: Users },
  { label: "Finanzas", href: "/finance", icon: Wallet },
  { label: "Agenda", href: "/schedule", icon: Calendar },
  { label: "Aprobaciones", href: "/approvals/seals", icon: ClipboardCheck },
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
  // v0.43: ã€Œå®¡è®¡ã€å…¥å£ç§»é™¤ï¼ˆå®¡è®¡æ—¥å¿—åœ¨ ConfiguraciÃ³n â†’ å®¡è®¡æ—¥å¿—ï¼‰
  { label: "Configuración", href: "/settings", icon: Settings },
];

