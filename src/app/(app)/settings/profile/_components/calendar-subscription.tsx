"use client";

/**
 * v0.50: 日历订阅卡片（Configuración → Información personal）。
 * 展示当前用户的 ICS 订阅 URL，可复制 / Restablecer；URL 即凭证。
 */
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
        if (!cancelled) toast.error("获取订阅EnlaceError");
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
      .then(() => toast.success("订阅Enlace已复制"))
      .catch(() => toast.error("复制Error，请手动选中复制"));
  }

  function regenerate() {
    if (
      !confirm(
        "Restablecer后旧订阅Enlace立即失效，已订阅的日历需要重新Agregar。AceptarRestablecer？"
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        const res = await regenerateCalendarToken();
        setToken(res.token);
        toast.success("已Restablecer订阅Enlace");
      } catch (err) {
        toast.error("RestablecerError", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="mb-1 flex items-center gap-2">
        <CalendarPlus className="h-4 w-4 text-primary" strokeWidth={1.8} />
        <h2 className="text-base font-semibold">日历订阅</h2>
      </div>
      <p className="mb-4 text-[12px] leading-5 text-muted-foreground">
        把下方EnlaceAgregar到 Apple 日历 / Google Calendar / Outlook 的「订阅日历」，
        开庭、Plazo、Tarea和Preservación到期会自动同步到手机日历（含过去 7 días ~ 未来 90 días，
        事ítems只显示Cliente名不含完整Caso名）。Enlace即凭证，请勿外发；怀疑泄露时点「Restablecer」作废旧Enlace。
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在获取订阅Enlace…
        </div>
      ) : url ? (
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-[11.5px]">
            {url}
          </code>
          <Button variant="outline" size="sm" onClick={copyUrl} className="h-8 gap-1.5">
            <Copy className="h-3.5 w-3.5" />
            复制
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={regenerate}
            disabled={pending}
            className="h-8 gap-1.5 text-muted-foreground"
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Restablecer
          </Button>
        </div>
      ) : (
        <p className="text-sm text-destructive">订阅Enlace不可用，请刷新重试。</p>
      )}
    </section>
  );
}
