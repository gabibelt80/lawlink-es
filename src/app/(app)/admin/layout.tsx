import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  Scale,
  Package,
  BarChart3,
} from "lucide-react";

const adminNav = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Estudios", href: "/admin/plans", icon: Building2 },
  { label: "Jurisprudencia", href: "/admin/jurisprudence", icon: Scale },
  { label: "Modulos", href: "/admin/modules", icon: Package },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (!session.user.isSystemAdmin) redirect("/dashboard");

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-border bg-card">
        <div className="border-b border-border px-4 py-4">
          <h2 className="text-sm font-semibold">Super Admin</h2>
          <p className="text-[10px] text-muted-foreground">JURIDICTAS</p>
        </div>
        <nav className="space-y-0.5 p-2">
          {adminNav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-x-auto">{children}</main>
    </div>
  );
}