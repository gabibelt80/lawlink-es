"use client";

import {
  Building2,
  Users,
  FolderOpen,
  FileText,
  HardDrive,
  TrendingUp,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

type FirmAnalytics = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  active: boolean;
  usersCount: number;
  mattersCount: number;
  clientsCount: number;
  documentsCount: number;
  storageUsedMB: number;
};

const PLAN_COLORS: Record<string, string> = {
  trial: "bg-gray-500/15 text-gray-700",
  basic: "bg-blue-500/15 text-blue-700",
  professional: "bg-violet-500/15 text-violet-700",
  studio: "bg-emerald-500/15 text-emerald-700",
};

export function AnalyticsView({ data }: { data: FirmAnalytics[] }) {
  const totalMatters = data.reduce((acc, f) => acc + f.mattersCount, 0);
  const totalClients = data.reduce((acc, f) => acc + f.clientsCount, 0);
  const totalDocuments = data.reduce((acc, f) => acc + f.documentsCount, 0);
  const totalStorageMB = data.reduce((acc, f) => acc + f.storageUsedMB, 0);
  const totalUsers = data.reduce((acc, f) => acc + f.usersCount, 0);

  return (
    <div className="space-y-6 px-6 py-6">
      <header>
        <h1 className="text-xl flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Analíticas de estudios
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Métricas de uso y tamaño de cada estudio jurídico
        </p>
      </header>

      {/* Totales globales */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon={Building2} label="Estudios" value={data.length} color="text-primary" />
        <StatCard icon={Users} label="Usuarios" value={totalUsers} color="text-blue-500" />
        <StatCard icon={FolderOpen} label="Casos" value={totalMatters} color="text-violet-500" />
        <StatCard icon={FileText} label="Documentos" value={totalDocuments} color="text-emerald-500" />
        <StatCard icon={HardDrive} label="Almacenamiento" value={`${(totalStorageMB / 1024).toFixed(1)} GB`} color="text-amber-500" />
      </div>

      {/* Tabla de estudios */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left font-normal">Estudio</th>
              <th className="px-4 py-2 text-left font-normal">Plan</th>
              <th className="px-4 py-2 text-left font-normal">Usuarios</th>
              <th className="px-4 py-2 text-left font-normal">Casos</th>
              <th className="px-4 py-2 text-left font-normal">Clientes</th>
              <th className="px-4 py-2 text-left font-normal">Documentos</th>
              <th className="px-4 py-2 text-left font-normal">Almacenamiento</th>
              <th className="px-4 py-2 text-left font-normal">Uso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((f) => (
              <tr key={f.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-2.5">
                  <div className="font-medium">{f.name}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {f.slug}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px]", PLAN_COLORS[f.plan] ?? PLAN_COLORS.trial)}>
                    {f.plan}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">{f.usersCount}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{f.mattersCount}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{f.clientsCount}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{f.documentsCount}</td>
                <td className="px-4 py-2.5 font-mono text-xs">
                  {f.storageUsedMB > 1024
                    ? `${(f.storageUsedMB / 1024).toFixed(1)} GB`
                    : `${f.storageUsedMB} MB`}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          f.mattersCount > 0
                            ? "bg-emerald-500"
                            : "bg-muted-foreground/30"
                        )}
                        style={{
                          width: `${Math.min((f.mattersCount / Math.max(totalMatters, 1)) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground">
                      {totalMatters > 0 ? Math.round((f.mattersCount / totalMatters) * 100) : 0}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Gráfico de barras de casos */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Casos por estudio
        </h3>
        <div className="mt-4 space-y-3">
          {data.map((f) => (
            <div key={f.id}>
              <div className="flex items-center justify-between text-xs">
                <span>{f.name}</span>
                <span className="font-mono">{f.mattersCount} casos</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500"
                  style={{
                    width: `${Math.min((f.mattersCount / Math.max(totalMatters, 1)) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", color)} />
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <div className="mt-1 font-mono text-2xl tabular">{value}</div>
    </div>
  );
}