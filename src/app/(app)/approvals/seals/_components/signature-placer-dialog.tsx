"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { Loader2, Plus, X, Check, Move } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

type Placement = {
  id: string;
  pngDataUrl: string;
  // Coordenadas en % del ancho/alto del PDF (0-100)
  xPct: number;
  yPct: number;
  widthPct: number; // ancho en % del PDF
};

export function SignaturePlacerDialog({
  sealId,
  draftDocId,
  onClose,
}: {
  sealId: string;
  draftDocId: string;
  onClose: () => void;
}) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [dragging, setDragging] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [resizing, setResizing] = useState<{
    id: string;
    startX: number;
    startWidth: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();

  // Descargar el PDF
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/documents/${draftDocId}/download`)
      .then((r) => r.blob())
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      })
      .catch(() => toast.error("No se pudo descargar el PDF"));
    return () => {
      cancelled = true;
    };
  }, [draftDocId]);

  // Handler para agregar un PNG
  const addSignature = (file: File) => {
    if (!/^image\/(png|webp)/.test(file.type)) {
      toast.error("Subi un PNG o WebP");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const newPlacement: Placement = {
        id: crypto.randomUUID(),
        pngDataUrl: dataUrl,
        xPct: 60,
        yPct: 70,
        widthPct: 20,
      };
      setPlacements((prev) => [...prev, newPlacement]);
    };
    reader.readAsDataURL(file);
  };

  // Mouse handlers para drag
  const handleMouseDown = (
    e: React.MouseEvent,
    placement: Placement
  ) => {
    if (!pageRef.current) return;
    const rect = pageRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    setDragging({
      id: placement.id,
      offsetX: xPct - placement.xPct,
      offsetY: yPct - placement.yPct,
    });
    e.preventDefault();
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!pageRef.current) return;
      const rect = pageRef.current.getBoundingClientRect();
      const xPct = ((e.clientX - rect.left) / rect.width) * 100;
      const yPct = ((e.clientY - rect.top) / rect.height) * 100;

      if (dragging) {
        setPlacements((prev) =>
          prev.map((p) =>
            p.id === dragging.id
              ? {
                  ...p,
                  xPct: Math.max(0, Math.min(100 - p.widthPct, xPct - dragging.offsetX)),
                  yPct: Math.max(0, Math.min(100, yPct - dragging.offsetY)),
                }
              : p
          )
        );
      } else if (resizing) {
        const deltaXPct = xPct - resizing.startX;
        setPlacements((prev) =>
          prev.map((p) =>
            p.id === resizing.id
              ? { ...p, widthPct: Math.max(5, Math.min(80, resizing.startWidth + deltaXPct)) }
              : p
          )
        );
      }
    },
    [dragging, resizing]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setResizing(null);
  }, []);

  useEffect(() => {
    if (dragging || resizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragging, resizing, handleMouseMove, handleMouseUp]);

  // Resize handler
  const handleResizeMouseDown = (
    e: React.MouseEvent,
    placement: Placement
  ) => {
    if (!pageRef.current) return;
    const rect = pageRef.current.getBoundingClientRect();
    const startX = ((e.clientX - rect.left) / rect.width) * 100;
    setResizing({
      id: placement.id,
      startX,
      startWidth: placement.widthPct,
    });
    e.preventDefault();
    e.stopPropagation();
  };

  // Aprobar y estampar
  const handleApprove = () => {
    if (placements.length === 0) {
      toast.error("Agrega al menos una firma antes de aprobar");
      return;
    }
    startTransition(async () => {
      try {
        const { approveSealWithSignatures } = await import(
          "@/server/seals/actions"
        );
        await approveSealWithSignatures({
          sealId,
          placements: placements.map((p) => ({
            pngDataUrl: p.pngDataUrl,
            xPct: p.xPct,
            yPct: p.yPct,
            widthPct: p.widthPct,
          })),
        });
        toast.success("Solicitud aprobada y estampada");
        onClose();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al aprobar");
      }
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[95vh] w-[95vw] max-w-5xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-5 py-3">
          <DialogTitle>Aprobar y estampar firma/sello</DialogTitle>
        </DialogHeader>

        <div className="flex max-h-[75vh] min-h-[60vh] overflow-hidden">
          {/* Preview del PDF */}
          <div
            ref={containerRef}
            className="flex-1 overflow-auto bg-muted/30 p-4"
          >
            {!pdfUrl ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div ref={pageRef} className="relative mx-auto max-w-3xl">
                <Document
                  file={pdfUrl}
                  onLoadSuccess={({ numPages: n }) => setNumPages(n)}
                  loading={
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  }
                >
                  <Page
                    pageNumber={1}
                    width={700}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                  />
                </Document>

                {/* Overlay de firmas */}
                {placements.map((p) => (
                  <div
                    key={p.id}
                    onMouseDown={(e) => handleMouseDown(e, p)}
                    style={{
                      position: "absolute",
                      left: `${p.xPct}%`,
                      top: `${p.yPct}%`,
                      width: `${p.widthPct}%`,
                      cursor: "move",
                      userSelect: "none",
                      border: dragging?.id === p.id ? "2px dashed #5B8DEF" : "1px solid transparent",
                      touchAction: "none",
                    }}
                  >
                    <img
                      src={p.pngDataUrl}
                      alt="firma"
                      style={{ width: "100%", pointerEvents: "none" }}
                      draggable={false}
                    />
                    {/* Handle de resize (esquina inferior derecha) */}
                    <div
                      onMouseDown={(e) => handleResizeMouseDown(e, p)}
                      style={{
                        position: "absolute",
                        right: -6,
                        bottom: -6,
                        width: 14,
                        height: 14,
                        background: "#5B8DEF",
                        borderRadius: 2,
                        cursor: "nwse-resize",
                        border: "2px solid white",
                      }}
                    />
                    {/* Botón eliminar */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlacements((prev) => prev.filter((x) => x.id !== p.id));
                      }}
                      style={{
                        position: "absolute",
                        top: -8,
                        right: -8,
                        width: 18,
                        height: 18,
                        background: "#DC2626",
                        color: "white",
                        borderRadius: "50%",
                        border: "2px solid white",
                        fontSize: 10,
                        lineHeight: 1,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Panel lateral */}
          <div className="w-64 shrink-0 border-l border-border bg-card p-4 space-y-4">
            <div>
              <p className="text-xs font-medium">Firmas / Sellos</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Arrastrá sobre el PDF para mover. Usá la esquina azul para escalar.
              </p>
            </div>

            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border px-3 py-3 text-[12px] hover:bg-muted/30">
              <Plus className="h-3.5 w-3.5" />
              Agregar firma/sello
              <input
                type="file"
                accept="image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) addSignature(f);
                  e.target.value = "";
                }}
              />
            </label>

            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Agregadas: {placements.length}
              </p>
              {placements.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 rounded border border-border p-1.5"
                >
                  <img
                    src={p.pngDataUrl}
                    alt=""
                    className="h-8 w-16 object-contain"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    #{i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPlacements((prev) => prev.filter((x) => x.id !== p.id))
                    }
                    className="ml-auto text-destructive hover:underline"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border px-5 py-3">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleApprove} disabled={pending}>
            {pending ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="mr-1 h-3.5 w-3.5" />
            )}
            Aprobar y estampar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}