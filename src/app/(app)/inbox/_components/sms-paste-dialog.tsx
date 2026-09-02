"use client";

import { useState, useMemo, useTransition } from "react";
import {
  CalendarClock,
  FileDown,
  Inbox,
  KeyRound,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { parseSms, splitSmsBatch } from "@/lib/sms-parser";
import { parseAndSaveSms } from "@/server/sms/actions";
import { SMS_TYPE_CN, SMS_TYPE_ACCENT } from "./sms-types";

export function SmsPasteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [batch, setBatch] = useState(false);
  const [useAi, setUseAi] = useState(false);
  const [extractAttachments, setExtractAttachments] = useState(false);
  const [pending, startTransition] = useTransition();

  // vista previa en tiempo real
  const preview = useMemo(() => {
    const trimmed = text.trim();
    if (!trimmed) return [];
    const messages = batch ? splitSmsBatch(trimmed) : [trimmed];
    return messages.slice(0, 5).map((m) => ({ raw: m, parsed: parseSms(m) }));
  }, [text, batch]);

  const submit = () => {
    if (!text.trim()) {
      toast.error("Pegá el contenido del mensaje");
      return;
    }
    startTransition(async () => {
      try {
        const res = await parseAndSaveSms({
          rawText: text,
          batch,
          useAi,
          extractAttachments,
        });
        const aiHint =
          useAi && res.aiEnrichedCount > 0
            ? `, IA mejoró ${res.aiEnrichedCount} mensajes`
            : "";
        toast.success(`Se analizaron ${res.count} mensajes${aiHint}`);
        setText("");
        onOpenChange(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !pending) {
          setText("");
          setExtractAttachments(false);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="flex max-h-[88vh] w-[92vw] max-w-3xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-primary" />
            Pegar SMS judicial
          </DialogTitle>
          <DialogDescription className="text-xs">
            Pegá el SMS de 12368 / tribunal / notificación electrónica. Varios SMS se separan con línea en blanco; marcá «Lote» para analizarlos uno por uno.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Pegá el texto original aquí..."
            rows={8}
            className="text-[12px] leading-relaxed"
            autoFocus
          />

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <Checkbox
                checked={batch}
                onCheckedChange={(v) => setBatch(v === true)}
              />
              <span>Varios SMS (separados por línea en blanco) — Enviar una vez, analizar y coincidir uno por uno</span>
            </label>
            <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <Checkbox
                checked={useAi}
                onCheckedChange={(v) => setUseAi(v === true)}
              />
              <span>
                Usar IA para mejorar el análisis{" "}
                <Sparkles className="inline h-3 w-3 text-primary" /> — Completa{" "}
                <span className="text-foreground/80">
                  resumen / acción del abogado / nivel de urgencia
                </span>
                (Primero configurá en Configuración → Integración de IA)
              </span>
            </label>
            <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <Checkbox
                checked={extractAttachments}
                onCheckedChange={(v) => setExtractAttachments(v === true)}
              />
              <span>
                Intentar extraer adjuntos de notificación electrónica{" "}
                <FileDown className="inline h-3 w-3 text-primary" /> —
                Si ya coincide con un caso, se guarda como material del caso; las plataformas que requieren inicio de sesión o código de verificación se marcan como pendientes
              </span>
            </label>
          </div>

          {preview.length > 0 && (
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Sparkles className="h-3 w-3 text-primary" />
                Vista previa del análisis (primeros {preview.length})
              </div>
              <ul className="space-y-2">
                {preview.map((p, i) => {
                  const accent = SMS_TYPE_ACCENT[p.parsed.smsType];
                  return (
                    <li
                      key={i}
                      className="rounded border border-border bg-background p-2 text-[11px]"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[10px]"
                          style={{ background: `${accent}1A`, color: accent }}
                        >
                          {SMS_TYPE_CN[p.parsed.smsType]}
                        </span>
                        {p.parsed.court && (
                          <span className="text-foreground/80">
                            {p.parsed.court}
                          </span>
                        )}
                        {p.parsed.caseNumbers.length > 0 && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {p.parsed.caseNumbers.join("、")}
                          </span>
                        )}
                      </div>
                      {p.parsed.summary && (
                        <p className="mt-1 line-clamp-2 text-muted-foreground">
                          {p.parsed.summary}
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-muted-foreground/80">
                        {p.parsed.hearingDate && (
                          <span>Audiencia: {p.parsed.hearingDate}</span>
                        )}
                        {p.parsed.courtRoom && (
                          <span>{p.parsed.courtRoom}</span>
                        )}
                        {p.parsed.judge && <span>Juez: {p.parsed.judge}</span>}
                        {p.parsed.importantItems.length > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" />
                            {p.parsed.importantItems.length} ítems
                          </span>
                        )}
                        {p.parsed.credentials.length > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <KeyRound className="h-3 w-3" />
                            {p.parsed.credentials
                              .map((c) => c.label)
                              .join("、")}
                          </span>
                        )}
                        {p.parsed.urls.length > 0 && (
                          <span>{p.parsed.urls.length} enlaces</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border px-6 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending || !text.trim()}>
            {pending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Analizar y guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}