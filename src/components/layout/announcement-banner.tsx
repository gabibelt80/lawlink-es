"use client";

/**
 * v0.27: Banner superior de anuncios
 *
 * Muestra anuncios fijados + no archivados + no vencidos.
 * Se actualiza automaticamente cuando se publica un anuncio nuevo.
 */
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Megaphone, ChevronLeft, ChevronRight, X } from "lucide-react";

type Banner = {
  id: string;
  title: string;
  content: string;
  publishedAt: Date;
};

export function AnnouncementBanner({ banners }: { banners: Banner[] }) {
  const [idx, setIdx] = useState(0);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const router = useRouter();

  // Escuchar eventos SSE para refrescar al instante
  useEffect(() => {
    const eventSource = new EventSource("/api/announcements/sse");
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "announcement_changed") {
          router.refresh();
        }
      } catch {
        // ignorar mensajes no JSON
      }
    };
    return () => {
      eventSource.close();
    };
  }, [router]);

  const visible = banners.filter((b) => !dismissed.includes(b.id));
  if (visible.length === 0) return null;

  const current = visible[Math.min(idx, visible.length - 1)];

  return (
    <div className="border-b border-amber-200 bg-amber-50 text-amber-900">
      <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-2 sm:px-6">
        <Megaphone className="h-4 w-4 shrink-0" strokeWidth={1.8} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <Link
              href="/announcements"
              className="truncate text-sm font-medium hover:underline"
            >
              {current.title}
            </Link>
            <span className="hidden text-xs text-amber-800 sm:inline">·</span>
            <span className="hidden truncate text-xs text-amber-800 sm:inline">
              {current.content.length > 80
                ? `${current.content.slice(0, 80)}…`
                : current.content}
            </span>
          </div>
        </div>
        {visible.length > 1 && (
          <div className="flex items-center gap-0.5 text-xs">
            <button
              type="button"
              onClick={() =>
                setIdx((i) => (i - 1 + visible.length) % visible.length)
              }
              className="rounded p-1 hover:bg-amber-100"
              aria-label="Anterior"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <span className="font-mono">
              {Math.min(idx, visible.length - 1) + 1}/{visible.length}
            </span>
            <button
              type="button"
              onClick={() => setIdx((i) => (i + 1) % visible.length)}
              className="rounded p-1 hover:bg-amber-100"
              aria-label="Siguiente"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setDismissed((prev) => [...prev, current.id])}
          className="rounded p-1 hover:bg-amber-100"
          aria-label="Cerrar"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}