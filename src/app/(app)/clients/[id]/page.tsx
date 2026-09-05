import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  User,
  Briefcase,
  Wallet,
  Coins,
  Clock,
  FileText,
  Phone,
  Mail,
  MapPin
} from "lucide-react";
import { getClientById, getClientFinanceSummary } from "@/server/clients/actions";
import { Badge } from "@/components/ui/badge";
import {
  clientTypeLabel,
  cooperationStatusLabel,
  genderLabel,
  matterCategoryLabel,
  matterStatusLabel
} from "@/lib/enums";
import { cn } from "@/lib/utils";
import { matterHref } from "@/lib/matters/route";
import { ClientEditButton } from "./_components/client-edit-button";

const billingStatusLabel: Record<string, string> = {
  DRAFT: "Borrador",
  ACTIVE: "Vigente",
  CLOSED: "Cerrado"
};
const yuan = (n: number) => `$${n.toLocaleString()}`;
const dash = <span className="text-muted-foreground/50">—</span>;

const COOP_TONE: Record<string, string> = {
  POTENTIAL: "bg-amber-100 text-amber-800",
  NEGOTIATING: "bg-sky-100 text-sky-800",
  SIGNED: "bg-emerald-100 text-emerald-800",
  TERMINATED: "bg-muted text-muted-foreground"
};

const ACTIVE_MATTER_STATUSES = new Set(["PENDING_ACCEPTANCE", "IN_PROGRESS", "ON_HOLD"]);

function firstChar(value: string) {
  return value.trim().slice(0, 1) || "C";
}

function dateText(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-AR");
}

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const client = await getClientById(params.id);
  if (!client) notFound();
  const finance = await getClientFinanceSummary(params.id);

  const isIndividual = client.type === "INDIVIDUAL";
  const TypeIcon = isIndividual ? User : client.type === "COMPANY" ? Building2 : Briefcase;
  // Cliente empresa: Contacto principal (contacts ya ordenado por isPrimary desc)
  const primaryContact = client.contacts[0] ?? null;

  // Agrupar contratos por caso, mostrando caso asociado y contrato firmado combinados (izquierda Caso / derecha contrato)
  const billingsByMatter = new Map<string, typeof finance.billings>();
  for (const b of finance.billings) {
    const arr = billingsByMatter.get(b.matter.id) ?? [];
    arr.push(b);
    billingsByMatter.set(b.matter.id, arr);
  }

  const activeMatterCount = client.matters.filter((matter) =>
    ACTIVE_MATTER_STATUSES.has(matter.status)
  ).length;
  const paidRate =
    finance.receivable > 0
      ? Math.min(100, Math.round((finance.received / finance.receivable) * 100))
      : finance.contractTotal > 0
        ? Math.min(100, Math.round((finance.received / finance.contractTotal) * 100))
        : 0;

  return (
    <div className="space-y-4">
      <Link
        href="/clients"
        className="inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a la lista de clientes
      </Link>

      <section className="ll-hero-surface px-5 py-5">
        <div className="relative z-[1] flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-primary text-2xl font-semibold text-primary-foreground shadow-[0_12px_30px_rgba(0,123,127,0.18)]">
              {firstChar(client.name)}
            </div>
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="gap-1.5 rounded-full bg-card text-[11px]">
                  <TypeIcon className="h-3.5 w-3.5 text-primary" />
                  {clientTypeLabel[client.type]}
                </Badge>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium",
                    COOP_TONE[client.cooperationStatus] ?? "bg-muted text-muted-foreground"
                  )}
                >
                  {cooperationStatusLabel[client.cooperationStatus]}
                </span>
                {client.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="rounded-full text-[11px]">
                    {tag}
                  </Badge>
                ))}
              </div>
              <h1 className="truncate text-[24px] font-semibold leading-tight" title={client.name}>
                {client.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="font-mono">{client.internalCode || "Sin número de cliente"}</span>
                <span>Primera colaboración {dateText(client.createdAt)}</span>
                {primaryContact ? <span>Contacto principal: {primaryContact.name}</span> : null}
              </div>
            </div>
          </div>
          <ClientEditButton client={client} />
        </div>

        <div className="relative z-[1] mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <HeroStat label="Total de encargos" value={`${finance.matterCount} casos`} icon={<Briefcase className="h-3.5 w-3.5" />} />
          <HeroStat label="En trámite" value={`${activeMatterCount} casos`} icon={<Clock className="h-3.5 w-3.5" />} accent />
          <HeroStat label="Total cobrado" value={yuan(finance.received)} icon={<Coins className="h-3.5 w-3.5" />} />
          <HeroStat label="Por cobrar" value={yuan(finance.pending)} icon={<Wallet className="h-3.5 w-3.5" />} tone="warn" />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <section className="ll-surface overflow-hidden">
            <header className="ll-panel-head">
              <h2 className="ll-panel-title">
                <Briefcase className="h-4 w-4 text-primary" />
                Casos asociados
                <span className="font-mono text-xs text-muted-foreground tabular">
                  {client.matters.length}
                </span>
              </h2>
              <span className="text-xs text-muted-foreground">
                Total contratos <span className="font-mono text-foreground">{yuan(finance.contractTotal)}</span>
              </span>
            </header>

            {client.matters.length === 0 ? (
              <p className="py-10 text-center text-xs text-muted-foreground">Sin casos asociados</p>
            ) : (
              <ul className="divide-y divide-border px-4">
                {client.matters.map((m) => {
                  const bs = billingsByMatter.get(m.id) ?? [];
                  return (
                    <li
                      key={m.id}
                      className="grid gap-3 py-3 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start"
                    >
                      <Link href={matterHref(m)} className="group min-w-0">
                        <div className="truncate text-[13.5px] font-medium transition-colors group-hover:text-primary">
                          {m.title}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono">{m.internalCode}</span>
                          <span>·</span>
                          <span>{matterCategoryLabel[m.category]}</span>
                          <Badge variant="outline" className="rounded-full text-[10px]">
                            {matterStatusLabel[m.status]}
                          </Badge>
                          <span>Actualizado {dateText(m.updatedAt)}</span>
                        </div>
                      </Link>

                      <div className="min-w-0">
                        {bs.length === 0 ? (
                          <span className="text-xs text-muted-foreground/60">Sin contratos</span>
                        ) : (
                          <ul className="space-y-1.5">
                            {bs.map((b) => (
                              <li
                                key={b.id}
                                className="flex items-center justify-between gap-2 rounded-sm border border-border bg-background px-2.5 py-1.5"
                              >
                                <span className="min-w-0 flex-1 truncate text-xs" title={b.title}>
                                  <FileText className="mr-1 inline h-3 w-3 text-muted-foreground" />
                                  {b.title}
                                  {b.signedAt && (
                                    <span className="ml-1.5 text-muted-foreground/70">
                                      {dateText(b.signedAt)}
                                    </span>
                                  )}
                                </span>
                                <span className="flex shrink-0 items-center gap-2">
                                  <span className="font-mono text-xs">{yuan(b.contractAmount)}</span>
                                  <Badge variant="outline" className="rounded-full text-[10px]">
                                    {billingStatusLabel[b.status] ?? b.status}
                                  </Badge>
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="ll-surface p-4">
            <header className="mb-3 flex items-center justify-between">
              <h2 className="ll-panel-title">
                <TypeIcon className="h-4 w-4 text-primary" />
                {isIndividual ? "Información personal" : "Información comercial"}
              </h2>
            </header>
            <dl className="grid grid-cols-[80px_minmax(0,1fr)] gap-px overflow-hidden rounded-md border border-border bg-border text-[12.5px] sm:grid-cols-[84px_minmax(0,1fr)_84px_minmax(0,1fr)]">
              <L>N° de cliente</L>
              <V mono title={client.internalCode ?? undefined}>{client.internalCode || dash}</V>
              <L>Fuente del cliente</L>
              <V title={client.source ?? undefined}>{client.source || dash}</V>

              {isIndividual ? (
                <>
                  <L>N° de documento</L>
                  <V mono title={client.idNumber ?? undefined}>{client.idNumber || dash}</V>
                  <L>Género</L>
                  <V>{client.gender ? genderLabel[client.gender] : dash}</V>
                  <L>Industria</L>
                  <V title={client.industry ?? undefined}>{client.industry || dash}</V>
                  <L>Etnia</L>
                  <V>{client.ethnicity || dash}</V>
                </>
              ) : (
                <>
                  <L>Código de crédito</L>
                  <V mono title={client.idNumber ?? undefined}>{client.idNumber || dash}</V>
                  <L>Representante legal</L>
                  <V title={client.legalRep ?? undefined}>{client.legalRep || dash}</V>
                  <L>Industria</L>
                  <V title={client.industry ?? undefined}>{client.industry || dash}</V>
                  <L>Email</L>
                  <V title={client.email ?? undefined}>{client.email || dash}</V>
                </>
              )}

              <L>Teléfono</L>
              <V mono title={primaryContact?.phone ?? client.phone ?? undefined}>
                {primaryContact?.phone || client.phone || dash}
              </V>
              <L>Email</L>
              <V title={client.email ?? undefined}>{client.email || dash}</V>

              <L>Domicilio</L>
              <V wide title={client.address ?? undefined}>{client.address || dash}</V>

              {client.tags.length > 0 && (
                <>
                  <L>Etiquetas</L>
                  <V wide nowrap={false}>
                    <span className="flex flex-wrap gap-1">
                      {client.tags.map((t) => (
                        <Badge key={t} variant="outline" className="rounded-full text-[10px]">
                          {t}
                        </Badge>
                      ))}
                    </span>
                  </V>
                </>
              )}
              {client.notes && (
                <>
                  <L>Notas</L>
                  <V wide nowrap={false}>
                    <span className="whitespace-pre-wrap">{client.notes}</span>
                  </V>
                </>
              )}
            </dl>
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-16">
          <section className="ll-surface overflow-hidden">
            <header className="ll-panel-head">
              <h2 className="ll-panel-title">
                <Phone className="h-4 w-4 text-primary" />
                Contactos
              </h2>
              <span className="font-mono text-xs text-muted-foreground tabular">
                {client.contacts.length}
              </span>
            </header>
            {client.contacts.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-muted-foreground">Sin contactos</p>
            ) : (
              <ul className="divide-y divide-border px-4">
                {client.contacts.map((contact) => (
                  <li key={contact.id} className="flex gap-3 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-xs font-semibold text-primary">
                      {firstChar(contact.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-medium">{contact.name}</span>
                        {contact.isPrimary ? (
                          <Badge variant="outline" className="rounded-full text-[10px]">
                            Principal
                          </Badge>
                        ) : null}
                      </div>
                      {contact.title ? (
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {contact.title}
                        </div>
                      ) : null}
                      <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                        {contact.phone ? (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3" strokeWidth={1.8} />
                            <span className="font-mono">{contact.phone}</span>
                          </div>
                        ) : null}
                        {contact.email ? (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3" strokeWidth={1.8} />
                            <span className="truncate">{contact.email}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="ll-surface p-4">
            <header className="mb-3 flex items-center justify-between">
              <h2 className="ll-panel-title">
                <Wallet className="h-4 w-4 text-primary" />
                Resumen financiero
              </h2>
              <span className="font-mono text-xs text-muted-foreground">{paidRate}%</span>
            </header>
            <div className="space-y-2">
              <SummaryField label="Total contratos" value={yuan(finance.contractTotal)} />
              <SummaryField label="Total por cobrar" value={yuan(finance.receivable)} />
              <SummaryField label="Total cobrado" value={yuan(finance.received)} accent="green" />
              <SummaryField label="Por cobrar" value={yuan(finance.pending)} accent="warn" />
            </div>
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Tasa de cobro</span>
                <span className="font-mono">{paidRate}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${paidRate}%` }}
                />
              </div>
            </div>
          </section>

          <section className="ll-surface p-4">
            <h2 className="ll-panel-title mb-3">
              <MapPin className="h-4 w-4 text-primary" />
              Perfil del cliente
            </h2>
            <div className="space-y-2 text-[12px]">
              <SummaryField label="Estado de cooperación" value={cooperationStatusLabel[client.cooperationStatus]} />
              <SummaryField label="Tipo de cliente" value={clientTypeLabel[client.type]} />
              <SummaryField label="Primera colaboración" value={dateText(client.createdAt)} />
              <SummaryField label="Última actualización" value={dateText(client.updatedAt)} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function HeroStat({
  icon,
  label,
  value,
  accent,
  tone
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
  tone?: "warn";
}) {
  return (
    <div
      className={cn(
        "rounded-md border bg-card/80 px-3 py-2.5 shadow-[var(--shadow-inset)]",
        accent && "border-primary/30 bg-primary/[0.04]",
        tone === "warn" && "border-amber-500/25 bg-amber-500/[0.05]"
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className={cn(accent && "text-primary", tone === "warn" && "text-amber-600")}>
          {icon}
        </span>
        {label}
      </div>
      <div className="ll-stat mt-2 text-[20px] leading-none text-foreground">{value}</div>
    </div>
  );
}

function SummaryField({
  label,
  value,
  accent
}: {
  label: string;
  value: React.ReactNode;
  accent?: "green" | "warn";
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/70 py-1.5 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "min-w-0 truncate text-right font-mono text-foreground",
          accent === "green" && "text-emerald-700",
          accent === "warn" && "text-amber-700"
        )}
      >
        {value}
      </span>
    </div>
  );
}

// Tabla de información del cliente: celda de etiqueta (fondo gris)
function L({ children }: { children: React.ReactNode }) {
  return (
    <dt className="bg-muted/50 px-2.5 py-2 text-[11.5px] leading-snug text-muted-foreground">
      {children}
    </dt>
  );
}

// Tabla de información del cliente: celda de valor (fondo blanco). Por defecto truncado en una línea; wide ocupa toda la fila; nowrap=false permite saltos de línea (etiquetas/notas)
function V({
  children,
  mono,
  wide,
  nowrap = true,
  title
}: {
  children: React.ReactNode;
  mono?: boolean;
  wide?: boolean;
  nowrap?: boolean;
  title?: string;
}) {
  return (
    <dd
      title={title}
      className={cn(
        "min-w-0 bg-card px-2.5 py-2 leading-snug text-foreground/95",
        mono && "font-mono",
        nowrap && "truncate",
        wide && "col-span-1 sm:col-span-3"
      )}
    >
      {children}
    </dd>
  );
}