"use client";

/**
 * v1.0: Tarjeta de interruptores de flujo de trabajo (página de información del estudio, solo ADMIN).
 * Actualmente solo hay un interruptor: flujo de revisión de contactos externos (desactivado por defecto: en un entorno de confianza de un estudio pequeño se aprueba directamente).
 */
import { useState, useTransition } from "react";
import { Loader2, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { saveWorkflowTogglesAction } from "@/server/settings/workflow-toggles-actions";

export function WorkflowTogglesCard({
  initialExternalContactReview
}: {
  initialExternalContactReview: boolean;
}) {
  const [externalContactReview, setExternalContactReview] = useState(
    initialExternalContactReview
  );
  const [pending, startTransition] = useTransition();

  function toggle(next: boolean) {
    const prev = externalContactReview;
    setExternalContactReview(next);
    startTransition(async () => {
      try {
        await saveWorkflowTogglesAction({ externalContactReview: next });
        toast.success(next ? "Revisión de contactos activada" : "Revisión de contactos desactivada (los nuevos se aprueban directamente)");
      } catch (err) {
        setExternalContactReview(prev);
        toast.error("Error al guardar", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="mb-1 flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-primary" strokeWidth={1.8} />
        <h2 className="text-base font-semibold">Interruptores de flujo de trabajo</h2>
        {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>
      <p className="mb-4 text-[12px] text-muted-foreground">
        Elegí la rigurosidad del flujo según el tamaño del equipo; los cambios se aplican de inmediato.
      </p>
      <label className="flex items-start gap-2.5 text-sm">
        <Checkbox
          checked={externalContactReview}
          onCheckedChange={(v) => toggle(v === true)}
          className="mt-0.5"
        />
        <span>
          <span className="font-medium">Los contactos externos requieren aprobación de un administrador</span>
          <span className="mt-0.5 block text-[12px] leading-5 text-muted-foreground">
            Desactivado (por defecto): cualquier persona que agregue un contacto externo (tribunal, institución arbitral, etc.) lo hace visible para todo el estudio de inmediato.
            Activado: los contactos externos agregados por abogados comunes requieren la aprobación de un administrador o del abogado principal antes de mostrarse.
          </span>
        </span>
      </label>
    </section>
  );
}