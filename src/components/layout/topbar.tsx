"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  Search,
  ChevronDown,
  Plus,
  LogOut,
  User,
  Settings as SettingsIcon,
  Menu,
  LayoutGrid,
  Calculator,
  Package,
  FolderArchive,
  Contact,
  Compass,
  Megaphone,
  BookText,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationPopover } from "@/components/layout/notification-popover";
import { SearchDialog } from "@/components/layout/search-dialog";
import { ToolsDialog } from "@/components/layout/tools-dialog";
import { cn } from "@/lib/utils";

const roleLabels: Record<string, string> = {
  ADMIN: "Administrador del sistema",
  PRINCIPAL_LAWYER: "Abogado principal",
  LAWYER: "Abogado a cargo",
  ASSISTANT: "Asistente",
  FINANCE: "Finanzas",
};

// Entrada de menú de aplicaciones (v0.38: cada categoría volvió a páginas independientes; herramientas prácticas = ventana global; navegación legal = enlace externo)
// kind: "tools" dispara la ventana de herramientas (sin navegar); "external" abre enlace externo en pestaña nueva; el resto son Links a páginas independientes
const APP_ITEMS = [
  { label: "Herramientas prácticas", icon: Calculator, kind: "tools" },
  { label: "Seguimiento de envíos", href: "/express", icon: Package, kind: "link" },
  {
    label: "Documentos del estudio",
    href: "/firm-resources",
    icon: FolderArchive,
    kind: "link",
  },
  {
    label: "Navegación legal",
    href: "https://yesen.cn",
    icon: Compass,
    kind: "external",
  },
  { label: "Guía de anuncios", href: "/announcements", icon: Megaphone, kind: "link" },
  { label: "Normas institucionales", href: "/policy", icon: BookText, kind: "link" },
  { label: "Contactos", href: "/contacts", icon: Contact, kind: "link" },
] as const;

export function Topbar({
  onMobileMenuToggle,
  userAvatar,
}: {
  onMobileMenuToggle?: () => void;
  userAvatar?: string | null;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const user = session?.user;
  const displayName = user?.name ?? "";
  const roleLabel = user?.role ? (roleLabels[user.role] ?? user.role) : "";
  const initial = displayName ? displayName.charAt(0) : "?";

  return (
    <header className="ll-material sticky top-0 z-20 flex h-12 items-center gap-2.5 border-b border-white/70 bg-[var(--glass-bg)] px-4 shadow-[0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-xl sm:px-5">
      {/* Menú hamburguesa móvil */}
      {onMobileMenuToggle && (
        <button
          onClick={onMobileMenuToggle}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-4 w-4" />
        </button>
      )}
      {/* Buscar */}
      <button
        onClick={() => setSearchOpen(true)}
        className={cn(
          "flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border border-border/70 bg-card/80 px-2.5 text-left sm:w-[300px] sm:flex-initial",
          "text-[13px] text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/35",
        )}
        aria-label="Búsqueda global (Cmd+K)"
      >
        <Search className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
        <span className="flex-1 truncate">
          Buscar casos, clientes, materiales...
        </span>
        <kbd className="hidden h-4 items-center gap-0.5 rounded bg-muted/80 px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
          ⌘K
        </kbd>
      </button>

      <div className="flex-1 hidden sm:block" />

      {/* Grupo de botones de herramientas */}
      <div className="flex items-center gap-1.5">
        {/* Menú de aplicaciones (entrada agregada estilo Caso cloud) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full border border-input bg-card px-2.5 text-[13px] shadow-[var(--shadow-low)]",
                "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              )}
              title="Aplicaciones"
            >
              <LayoutGrid
                className="h-3.5 w-3.5 shrink-0 text-primary"
                strokeWidth={1.8}
              />
              <span className="hidden sm:inline">Aplicaciones</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {APP_ITEMS.map((it) => {
              // Herramientas prácticas: abre la ventana global de herramientas, sin navegar ni cambiar la ruta
              if (it.kind === "tools") {
                return (
                  <DropdownMenuItem
                    key={it.label}
                    onSelect={(e) => {
                      e.preventDefault();
                      setToolsOpen(true);
                    }}
                    className="cursor-pointer"
                  >
                    <it.icon
                      className="mr-2 h-4 w-4 text-muted-foreground"
                      strokeWidth={1.8}
                    />
                    {it.label}
                  </DropdownMenuItem>
                );
              }
              return (
                <DropdownMenuItem key={it.label} asChild>
                  {it.kind === "external" ? (
                    <a
                      href={it.href}
                      target="_blank"
                      rel="noreferrer"
                      className="cursor-pointer"
                    >
                      <it.icon
                        className="mr-2 h-4 w-4 text-muted-foreground"
                        strokeWidth={1.8}
                      />
                      {it.label}
                    </a>
                  ) : (
                    <Link href={it.href} className="cursor-pointer">
                      <it.icon
                        className="mr-2 h-4 w-4 text-muted-foreground"
                        strokeWidth={1.8}
                      />
                      {it.label}
                    </Link>
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          size="sm"
          onClick={() => router.push("/matters?tab=intake&new=1")}
          className="h-8 gap-1.5 px-2.5 text-[13px]"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          <span className="hidden sm:inline">Nuevo caso</span>
        </Button>

        <div className="mx-0.5 hidden h-6 w-px bg-border sm:block" />

        <NotificationPopover />
      </div>

      {/* Usuario */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex h-[34px] items-center gap-2 rounded-full border border-input bg-card pl-1 pr-2.5 shadow-[var(--shadow-low)]",
              "transition-colors hover:bg-muted",
            )}
          >
            <Avatar className="h-6 w-6">
              {userAvatar ? (
                <AvatarImage src={userAvatar} alt={displayName} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                {initial}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-[13px] font-medium sm:inline">
              {displayName || "..."}
            </span>
            <ChevronDown
              className="h-3 w-3 text-muted-foreground"
              strokeWidth={2}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            {displayName ? `${displayName} · ${roleLabel}` : "Cargando..."}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings/profile" className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Información personal
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer">
              <SettingsIcon className="mr-2 h-4 w-4" />
              Preferencias
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              signOut({ callbackUrl: "/login" });
            }}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <ToolsDialog open={toolsOpen} onOpenChange={setToolsOpen} />
    </header>
  );
}