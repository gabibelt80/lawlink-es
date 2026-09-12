"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppSession } from "@/lib/auth/use-app-session";
import { Scale, LayoutDashboard, Package, Activity, Boxes } from "lucide-react";
import { cn } from "@/lib/utils";
import { primaryNav, secondaryNav, filterNavByModules, type NavItem } from "./nav-config";
import type { ModuleKey } from "@/lib/modules";
import { isSystemAdmin as checkSystemAdmin } from "@/lib/auth/roles";

/** v0.42 ítem 1: Marca de la barra lateral (configurable en Configuración → Información del estudio) */
export type FirmBrand = {
  name: string;
  subtitle: string;
  logoDataUrl: string | null;
};

/** Barra lateral de escritorio (visible desde md) */
export function Sidebar({ firm }: { firm: FirmBrand }) {
  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[var(--sidebar-width)] flex-col border-r border-border bg-sidebar md:flex">
      <NavContent firm={firm} />
    </aside>
  );
}

/** Contenido de navegación — compartido entre barra lateral de escritorio y Sheet móvil */
export function NavContent({ firm }: { firm: FirmBrand }) {
  const pathname = usePathname();
  const { session } = useAppSession();
  const isSystemAdmin = checkSystemAdmin(session);
  const [enabledModules, setEnabledModules] = useState<ModuleKey[]>([]);

  useEffect(() => {
    if (isSystemAdmin) return;
    import("@/server/settings/modules-actions")
      .then((m) => m.getModulesForCurrentFirm())
      .then(setEnabledModules)
      .catch(() => setEnabledModules([]));
  }, [isSystemAdmin]);

  const filteredPrimary = filterNavByModules(primaryNav, enabledModules);
  const filteredSecondary = filterNavByModules(secondaryNav, enabledModules);

  const navItems = isSystemAdmin
    ? [
        { label: "Panel de administración", href: "/admin", icon: LayoutDashboard },
        { label: "Planes y precios", href: "/admin/plans", icon: Package },
        { label: "Módulos", href: "/admin/modules", icon: Boxes },
        { label: "Analíticas", href: "/admin/analytics", icon: Activity },
      ]
    : filteredPrimary;

  return (
    <>
      <Link
        href="/dashboard"
        className="flex h-12 items-center gap-2.5 px-3.5 transition-colors hover:bg-muted/50"
        aria-label="Volver al panel de control"
      >
        {firm.logoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={firm.logoDataUrl}
            alt={firm.name}
            className="h-[26px] w-[26px] shrink-0 rounded-md object-contain"
          />
        ) : (
          <div className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
            <Scale className="h-[15px] w-[15px]" strokeWidth={1.8} />
          </div>
        )}
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-[12.5px] font-semibold">
            {firm.name}
          </span>
          {firm.subtitle ? (
            <span className="truncate text-[10px] text-muted-foreground">
              {firm.subtitle}
            </span>
          ) : null}
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto px-2 py-1">
        <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase text-muted-foreground/70">
          {isSystemAdmin ? "Sistema" : "Área de trabajo"}
        </div>
        <div className="space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(pathname, item.href)}
            />
          ))}
        </div>
      </nav>

      {!isSystemAdmin && (
        <div className="border-t border-border px-2 py-2">
          <div className="space-y-0.5">
            {filteredSecondary.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={isActive(pathname, item.href)}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const Icon = item.icon;
  const isCourtSms = item.tone === "courtSms";
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "group relative flex h-[30px] items-center gap-2.5 rounded-md px-2.5 text-[12.5px] transition-[background-color,color,transform] [transition-duration:var(--motion-press)] [transition-timing-function:var(--ease-out)] active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-colors",
        isCourtSms
          ? active
            ? "bg-sky-500/12 text-sky-700 font-medium ring-1 ring-sky-500/20"
            : "text-sky-700/90 hover:bg-sky-500/10 hover:text-sky-800"
          : active
            ? "bg-accent text-primary font-medium"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon
        className={cn(
          "h-[15px] w-[15px] shrink-0",
          isCourtSms
            ? active
              ? "text-sky-700"
              : "text-sky-700/80 group-hover:text-sky-800"
            : active
              ? "text-primary"
              : "text-muted-foreground/70 group-hover:text-foreground",
        )}
        strokeWidth={active ? 2 : 1.6}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge ? (
        <span
          className={cn(
            "rounded-sm px-1.5 py-px text-[10px] font-medium tabular",
            active
              ? "bg-accent text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}