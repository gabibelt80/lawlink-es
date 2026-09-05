import Link from "next/link";
import {
  Settings,
  Users,
  Layers,
  ScrollText,
  KeyRound,
  Sparkles,
  Package,
  ListChecks,
  BellRing,
  Building2,
  FileUp,
} from "lucide-react";
import { getSession } from "@/lib/auth/session";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const isAdmin = session?.user.role === "ADMIN";
  const isManager = isAdmin || session?.user.role === "PRINCIPAL_LAWYER";

  return (
    <div className="space-y-5">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Settings className="h-5 w-5 text-primary" />
          Configuración
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <nav className="lg:col-span-1">
          <ul className="space-y-0.5 rounded-xl border border-border bg-card p-2">
            <SettingsNavLink
              href="/settings/profile"
              icon={<KeyRound className="h-3.5 w-3.5" />}
            >
              Información personal / Cambiar contraseña
            </SettingsNavLink>
            {isManager && (
              <>
                <SettingsNavLink
                  href="/settings/reminders"
                  icon={<BellRing className="h-3.5 w-3.5" />}
                >
                  Mantenimiento de recordatorios
                </SettingsNavLink>
                <SettingsNavLink
                  href="/settings/import"
                  icon={<FileUp className="h-3.5 w-3.5" />}
                >
                  Importación masiva
                </SettingsNavLink>
              </>
            )}
            {isAdmin && (
              <>
                <SettingsNavLink
                  href="/settings/firm-profile"
                  icon={<Building2 className="h-3.5 w-3.5" />}
                >
                  Información del estudio jurídico
                </SettingsNavLink>
                <SettingsNavLink
                  href="/settings/users"
                  icon={<Users className="h-3.5 w-3.5" />}
                >
                  Administrar usuarios
                </SettingsNavLink>
                <SettingsNavLink
                  href="/settings/templates"
                  icon={<Layers className="h-3.5 w-3.5" />}
                >
                  Plantillas de etapas
                </SettingsNavLink>
                <SettingsNavLink
                  href="/settings/custom-fields"
                  icon={<ListChecks className="h-3.5 w-3.5" />}
                >
                  Campos personalizados
                </SettingsNavLink>
                <SettingsNavLink
                  href="/settings/ai"
                  icon={<Sparkles className="h-3.5 w-3.5" />}
                >
                  Integración de IA
                </SettingsNavLink>
                <SettingsNavLink
                  href="/settings/express"
                  icon={<Package className="h-3.5 w-3.5" />}
                >
                  Integración de envíos
                </SettingsNavLink>
                <SettingsNavLink
                  href="/settings/audit"
                  icon={<ScrollText className="h-3.5 w-3.5" />}
                >
                  Registro de auditoría
                </SettingsNavLink>
              </>
            )}
          </ul>
        </nav>

        <div className="lg:col-span-4">{children}</div>
      </div>
    </div>
  );
}

function SettingsNavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-popover hover:text-foreground"
      >
        {icon}
        {children}
      </Link>
    </li>
  );
}