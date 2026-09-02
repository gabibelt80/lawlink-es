"use client";

import { useEffect, useState, useTransition } from "react";
import { CalendarPlus, Copy, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getCalendarToken, regenerateCalendarToken } from "@/server/calendar/actions";

export function CalendarSubscription() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    getCalendarToken()
      .then((res) => {
        if (!cancelled) setToken(res.token);
      })
      .catch(() => {
        if (!cancelled) toast.error("Error al obtener el enlace de suscripción");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const url = token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/calendar/${token}`
    : null;

  function copyUrl() {
    if (!url) return;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Enlace de suscripción copiado"))
      .catch(() => toast.error("Error al copiar, seleccioná y copiá manualmente"));
  }

  function regenerate() {
    if (
      !confirm(
        "Al regenerar el enlace, el anterior dejará de funcionar. Los calendarios suscritos deberán volver a agregarse. ¿Querés continuar?"
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        const res = await regenerateCalendarToken();
        setToken(res.token);
        toast.success("Enlace de suscripción regenerado");
      } catch (err) {
        toast.error("Error al regenerar", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <h2 className="mb-4 text-base font-semibold">Suscripción al calendario</h2>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando enlace de suscripción...
        </div>
      ) : (
        <>
          {token ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Suscribite al calendario de tus casos con el siguiente enlace:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-md border border-border bg-muted px-2 py-1.5 text-xs">
                  {url}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyUrl}
                  className="gap-1.5"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copiar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Agregá este enlace a tu aplicación de calendario (Google Calendar, Apple Calendar, Outlook, etc.) para ver tus audiencias y vencimientos.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Todavía no se generó un enlace de suscripción al calendario.
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={regenerate}
            disabled={pending}
            className="mt-4 gap-1.5"
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Regenerar enlace
          </Button>
        </>
      )}
    </section>
  );
}