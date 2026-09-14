"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";

type PreviewDoc = {
  id: string;
  name: string;
  mimeType: string | null;
  path: string;
};

function previewKind(mimeType: string | null, name: string): "pdf" | "image" | "text" | "office" | "unsupported" {
  const mime = (mimeType ?? "").toLowerCase();
  const ext = name.toLowerCase().split(".").pop() ?? "";

  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext)) return "image";
  if (mime.startsWith("text/") || ["txt", "md"].includes(ext)) return "text";
  if (
    mime.includes("word") ||
    mime.includes("spreadsheet") ||
    mime.includes("presentation") ||
    ["docx", "xlsx", "pptx"].includes(ext)
  )
    return "office";
  return "unsupported";
}

export function DocumentPreviewDialog({
  doc,
  onClose,
}: {
  doc: PreviewDoc;
  onClose: () => void;
}) {
  const kind = previewKind(doc.mimeType, doc.name);
  // Cache-busting: cada apertura usa una URL única para evitar que el navegador reutilice la imagen anterior
  const previewUrl = `/api/documents/${doc.id}/preview?v=${doc.id}-${Date.now()}`;

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[95vh] w-[95vw] max-w-[95vw] flex-col gap-0 p-0 [&>button]:top-2 [&>button]:right-2 sm:h-[90vh] sm:w-[90vw]">
        <div className="flex items-center justify-between border-b border-border pl-4 pr-12 py-2">
          <h2 className="truncate text-sm font-medium">{doc.name}</h2>
        </div>   
        <div className="flex-1 overflow-hidden bg-muted/20">
          {kind === "unsupported" ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">
                Este tipo de archivo no tiene vista previa. Descargalo para verlo.
              </p>
            </div>
          ) : (
            <iframe
              src={previewUrl}
              className="h-full w-full border-0 bg-white"
              title={doc.name}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
