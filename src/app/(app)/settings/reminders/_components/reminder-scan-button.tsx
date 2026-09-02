"use client";

import { useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { triggerDueReminderScan } from "@/server/reminders/actions";

export function ReminderScanButton() {
  const [isPending, startTransition] = useTransition();

  function handleScan() {
    startTransition(async () => {
      try {
        const r = await triggerDueReminderScan();
        const total = r.deadlineNotified + r.hearingNotified;
        toast.success(`Escaneo completado: ${total} notificaciones nuevas`, {
          description: `Vencimientos ${r.deadlineNotified} · Audiencias ${r.hearingNotified} (omitidos por duplicados ${r.suppressed})`
        });
      } catch (err) {
        toast.error("Error al escanear", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <Button size="sm" onClick={handleScan} disabled={isPending} className="shrink-0 gap-1.5">
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <RefreshCw className="h-3.5 w-3.5" />
      )}
      Escanear ahora
    </Button>
  );
}