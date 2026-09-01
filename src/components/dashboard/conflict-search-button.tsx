"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { ConflictDialog } from "@/components/conflict-dialog";
import { cn } from "@/lib/utils";

/** v0.43：entrada de «precomprobación de conflicto de intereses» en la barra de saludo del panel de trabajo (antes en HeroBlock, conservada tras la refactorización) */
export function ConflictSearchButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium",
          "border border-border bg-background text-foreground/90 transition-colors hover:bg-muted/60"
        )}
      >
        <ShieldCheck className="h-3.5 w-3.5 text-primary" strokeWidth={1.8} />
        Precomprobación de conflicto de intereses
      </button>
      <ConflictDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
