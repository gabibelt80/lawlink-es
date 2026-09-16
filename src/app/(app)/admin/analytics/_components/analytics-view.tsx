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
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
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
  trial: "bg-slate-500/15 text-slate-700 border-slate-500/30",
  basic: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  professional: "bg-violet-500/15 text-violet-700 border-violet-500/30",
  studio: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
};

// Paleta diferenciada para gráficos (coherente con categorías de la app)
const CHART_COLORS = [
  "#5B8DEF", // azul
  "#9B7BF7", // violeta
  "#4ADE80", // esmeralda
  "#FBBF24", // ámbar
  "#4FD1C5", // teal
  "#F472B6", // rosa
  "#818CF8", // indigo
  "#F87171", // rojo
];

function planBadgeClass(plan: string) {
  return PLAN_COLORS[plan] ?? PLAN_COLORS.trial;
}

export function AnalyticsView({ data }: { data: FirmAnalytics[] }) {
  const totalMatters = data.reduce((acc, f) => acc + f.mattersCount, 0);
  const totalClients = data.reduce((acc, f) => acc + f.clientsCount, 0);
  const totalDocuments = data.reduce((acc, f) => acc + f.documentsCount, 0);
  const totalStorageMB = data.reduce((acc, f) => acc + f.storageUsedMB, 0);
  const totalUsers = data.reduce((acc, f) => acc + f.usersCount, 0);

  // Datos para gráficos
  const mattersData = data.map((f) => ({
    name: f.name.length > 18 ? f.name.slice(0, 16) + "…" : f.name,
    fullName: f.name,
    casos: f.mattersCount,
    usuarios: f.usersCount,
    documentos: f.documentsCount,
  }));

  const pieData = data
    .filter((f) => f.mattersCount > 0)
    .map((f, i) => ({
      name: f.name,
      value: f.mattersCount,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="flex items-center gap-2 text-lg font-semibold sm:text-xl">
          <Activity className="h-5 w-5 text-primary" />
          Analíticas de estudios
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Métricas de uso y tamaño de cada estudio jurídico
        </p>
      </header>

      {/* Totales globales */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          icon={Building2}
          label="Estudios"
          value={data.length}
          color="text-primary"
        />
        <StatCard
          icon={Users}
          label="Usuarios"
          value={totalUsers}
          color="text-blue-500"
        />
        <StatCard
          icon={FolderOpen}
          label="Casos"
          value={totalMatters}
          color="text-violet-500"
        />
        <StatCard
          icon={FileText}
          label="Documentos"
          value={totalDocuments}
          color="text-emerald-500"
        />
        <StatCard
          icon={HardDrive}
          label="Almacenamiento"
          value={`${(totalStorageMB / 1024).toFixed(1)} GB`}
          color="text-amber-500"
        />
      </div>

      {/* Gráficos modernos */}
      {data.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Bar chart: casos, usuarios y documentos por estudio */}
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 lg:col-span-2">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-primary" />
              Actividad por estudio
            </h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Casos, usuarios y documentos
            </p>
            <div className="mt-4 h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={mattersData}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.fullName ?? ""
                    }
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                    iconType="circle"
                  />
                  <Bar
                    dataKey="casos"
                    fill="#5B8DEF"
                    radius={[4, 4, 0, 0]}
                    name="Casos"
                  />
                  <Bar
                    dataKey="usuarios"
                    fill="#9B7BF7"
                    radius={[4, 4, 0, 0]}
                    name="Usuarios"
                  />
                  <Bar
                    dataKey="documentos"
                    fill="#4ADE80"
                    radius={[4, 4, 0, 0]}
                    name="Documentos"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut: distribución de casos */}
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <FolderOpen className="h-4 w-4 text-violet-500" />
              Distribución de casos
            </h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Por estudio jurídico
            </p>
            <div className="mt-4 h-[280px] w-full">
              {pieData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  Sin datos de casos
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={3}
                      stroke="hsl(var(--card))"
                      strokeWidth={2}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabla de estudios (responsive con scroll horizontal en móvil) */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium">Detalle por estudio</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-normal">Estudio</th>
                <th className="px-4 py-2.5 text-left font-normal">Plan</th>
                <th className="px-4 py-2.5 text-right font-normal">Usuarios</th>
                <th className="px-4 py-2.5 text-right font-normal">Casos</th>
                <th className="px-4 py-2.5 text-right font-normal">Clientes</th>
                <th className="px-4 py-2.5 text-right font-normal">Docs</th>
                <th className="px-4 py-2.5 text-right font-normal">Almac.</th>
                <th className="px-4 py-2.5 text-left font-normal">Uso relativo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    No hay estudios registrados todavía.
                  </td>
                </tr>
              )}
              {data.map((f, i) => (
                <tr
                  key={f.id}
                  className="transition-colors hover:bg-muted/20"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            CHART_COLORS[i % CHART_COLORS.length],
                        }}
                      />
                      <div>
                        <div className="font-medium">{f.name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {f.slug}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize",
                        planBadgeClass(f.plan),
                      )}
                    >
                      {f.plan}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs tabular">
                    {f.usersCount}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs tabular">
                    {f.mattersCount}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs tabular">
                    {f.clientsCount}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs tabular">
                    {f.documentsCount}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs tabular">
                    {f.storageUsedMB > 1024
                      ? `${(f.storageUsedMB / 1024).toFixed(1)} GB`
                      : `${f.storageUsedMB} MB`}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:w-24">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
                          style={{
                            width: `${Math.min(
                              (f.mattersCount / Math.max(totalMatters, 1)) * 100,
                              100,
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] tabular text-muted-foreground">
                        {totalMatters > 0
                          ? Math.round((f.mattersCount / totalMatters) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", color)} />
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <div className="mt-1 font-mono text-xl tabular sm:text-2xl">{value}</div>
    </div>
  );
}
