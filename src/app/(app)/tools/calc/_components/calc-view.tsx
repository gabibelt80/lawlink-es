"use client";

import { useState } from "react";
import { Calculator, Scale, Coins, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { CourtFeeCalc } from "./court-fee-calc";
import { LateInterestCalc } from "./late-interest-calc";
import { DaysCalc } from "./days-calc";

type Tab = "courtFee" | "lateInterest" | "days";

const TABS: { key: Tab; label: string; icon: typeof Scale }[] = [
  { key: "courtFee", label: "Tarifa judicial", icon: Scale },
  { key: "lateInterest", label: "Interés por demora", icon: Coins },
  { key: "days", label: "Cálculo de días", icon: CalendarDays },
];

export function CalcView({ hideHeader }: { hideHeader?: boolean } = {}) {
  const [tab, setTab] = useState<Tab>("courtFee");

  return (
    <div className="space-y-5">
      {!hideHeader && (
        <div>
          <h1 className="flex items-center gap-2 text-2xl">
            <Calculator className="h-5 w-5 text-primary" strokeWidth={1.6} />
            Herramientas prácticas
          </h1>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Tarifa judicial / Interés por demora / Días —— cálculo instantáneo
            solo en front-end, sin conexión
          </p>
        </div>
      )}

      {/* Tab */}
      <div className="border-b border-border">
        <div className="flex gap-5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "relative inline-flex items-center gap-1.5 pb-2.5 pt-1 text-[13px] transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                {t.label}
                {active && (
                  <span className="absolute -bottom-px left-0 right-0 h-[2px] bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* tab 切换是高频Acciones，入场动画只会让它显得迟钝，故不加动效 */}
      <div key={tab} className="max-w-3xl">
        {tab === "courtFee" && <CourtFeeCalc />}
        {tab === "lateInterest" && <LateInterestCalc />}
        {tab === "days" && <DaysCalc />}
      </div>
    </div>
  );
}
