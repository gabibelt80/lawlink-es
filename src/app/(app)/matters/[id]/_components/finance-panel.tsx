"use client";

import { useState } from "react";
import { Wallet, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { InvoiceRequestSheet } from "./invoice-request-sheet";
import type { FinancePayload, UserOption } from "./matter-detail-tabs";

/**
 * v0.12: Panel de finanzas simplificado
 * - Solo muestra pagos recibidos + totales + boton de factura
 */
export function FinancePanel({
  matterId,
  finance,
  canRequestInvoice,
  compact = false,
}: {
  matterId: string;
  finance: FinancePayload;
  userOptions: UserOption[];
  canRequestInvoice: boolean;
  compact?: boolean;
}) {
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const received = finance.entries
    .filter((e) => e.type === "RECEIVED")
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );

  const { stats } = finance;
  const outstanding = Math.max(stats.receivable - stats.received, 0);

  const cards: {
    label: string;
    value: number;
    tone: StatTone;
    className?: string;
  }[] = [
    {
      label: "Honorarios pactados",
      value: stats.contractAmount,
      tone: "neutral",
      className: "col-span-3",
    },
    { label: "Cobrado", value: stats.received, tone: "emerald" },
    { label: "Por cobrar", value: outstanding, tone: "amber" },
    { label: "Egresos", value: stats.cost, tone: "red" },
    ...(stats.commission > 0
      ? [
          {
            label: "Comision",
            value: stats.commission,
            tone: "neutral" as StatTone,
          },
        ]
      : []),
  ];

  return (
    <section className="rounded-lg border border-border bg-card">
      <header
        className={
          compact
            ? "border-b border-border px-3 py-2"
            : "border-b border-border px-4 py-2"
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[13px] font-medium">
            <Wallet className="h-3.5 w-3.5 text-primary" />
            Finanzas
          </span>
          {canRequestInvoice && (
            <Button
              size="sm"
              onClick={() => setInvoiceOpen(true)}
              className="h-6 gap-0.5 px-2 text-[11px]"
            >
              <Receipt className="h-2.5 w-2.5" />
              Solicitar factura
            </Button>
          )}
        </div>
      </header>

      <div
        className={
          compact
            ? "grid grid-cols-3 gap-px border-b border-border bg-border"
            : "grid grid-cols-3 gap-px border-b border-border bg-border sm:grid-cols-6"
        }
      >
        {cards.map((c) => (
          <StatCard
            key={c.label}
            label={c.label}
            value={c.value}
            tone={c.tone}
            className={c.className}
            compact={compact}
          />
        ))}
      </div>

      {received.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          Sin registros de cobros (ingresados por el personal de Finanzas)
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {received.map((e) => (
            <li
              key={e.id}
              className={
                compact
                  ? "flex items-center gap-2 px-3 py-2 text-[12px]"
                  : "flex items-center gap-3 px-4 py-2 text-[12.5px]"
              }
            >
              <span className="shrink-0 font-mono tabular text-[14px] font-medium text-emerald-600">
                {formatCurrency(Number(e.amount))}
              </span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {e.payerOrPayee && <span>{e.payerOrPayee}</span>}
                {e.method && (
                  <span className="ml-2 text-[10.5px]">· {e.method}</span>
                )}
                {e.invoiceNo && (
                  <span className="ml-2 font-mono text-[10.5px]">
                    · Factura {e.invoiceNo}
                  </span>
                )}
                {e.note && (
                  <span className="ml-2 text-[10.5px]">· {e.note}</span>
                )}
              </span>
              <span className="shrink-0 font-mono text-[11px] tabular text-muted-foreground">
                {new Date(e.occurredAt).toLocaleDateString("es-AR")}
              </span>
            </li>
          ))}
        </ul>
      )}

      {canRequestInvoice && (
        <InvoiceRequestSheet
          open={invoiceOpen}
          onOpenChange={setInvoiceOpen}
          matterId={matterId}
        />
      )}
    </section>
  );
}

type StatTone = "emerald" | "neutral" | "amber" | "red";

function StatCard({
  label,
  value,
  tone,
  className,
  compact,
}: {
  label: string;
  value: number;
  tone: StatTone;
  className?: string;
  compact?: boolean;
}) {
  const cls =
    tone === "emerald"
      ? "text-emerald-600"
      : tone === "amber"
        ? "text-amber-600"
        : tone === "red"
          ? "text-red-600"
          : "text-foreground";
  return (
    <div
      className={`bg-card px-3 text-center ${compact ? "py-2" : "py-2.5"} ${className ?? ""}`}
    >
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1 font-mono leading-none tabular ${compact ? "text-[13px]" : "text-[15px]"} ${cls}`}
      >
        {formatCurrency(value, { compact: true })}
      </div>
    </div>
  );
}