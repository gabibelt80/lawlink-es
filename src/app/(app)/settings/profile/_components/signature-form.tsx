"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, Loader2, Trash2, PenLine } from "lucide-react";
import { toast } from "sonner";
import { saveMySignature } from "@/server/users/actions";

const SIGNATURE_MAX_BYTES = 500 * 1024;

export function SignatureForm({
  initialSignature,
}: {
  initialSignature: string | null;
}) {
  const router = useRouter();
  const [signature, setSignature] = useState<string | null>(initialSignature);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const onPick = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(png|webp)/.test(file.type)) {
      toast.error("Subi un PNG o WebP con fondo transparente");
      return;
    }
    if (file.size > SIGNATURE_MAX_BYTES) {
      toast.error("La firma es demasiado grande. Maximo 500 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSignature(dataUrl);
      save(dataUrl);
    };
    reader.onerror = () => toast.error("Error al leer la imagen");
    reader.readAsDataURL(file);
  };

  const save = (value: string | null) => {
    startTransition(async () => {
      try {
        await saveMySignature({ signaturePng: value });
        toast.success(value ? "Firma actualizada" : "Firma eliminada");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-4">
        <div className="flex h-24 w-48 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/20 p-2">
          {signature ? (
            <img
              src={signature}
              alt="Mi firma"
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <PenLine className="h-5 w-5 opacity-40" />
              <span className="text-[10px]">Sin firma cargada</span>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/webp"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0])}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={pending}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[12px] hover:bg-muted/60 disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ImageUp className="h-3 w-3" />
              )}
              {signature ? "Cambiar firma" : "Subir firma"}
            </button>
            {signature && (
              <button
                type="button"
                onClick={() => {
                  setSignature(null);
                  if (fileRef.current) fileRef.current.value = "";
                  save(null);
                }}
                disabled={pending}
                className="inline-flex items-center gap-1 text-[12px] text-destructive hover:underline disabled:opacity-50"
              >
                <Trash2 className="h-3 w-3" />
                Eliminar
              </button>
            )}
          </div>
          <p className="max-w-md text-[11px] text-muted-foreground">
            Subi un PNG con fondo transparente (maximo 500 KB). Esta firma se
            aplicara automaticamente en los documentos que apruebes.
          </p>
        </div>
      </div>
    </div>
  );
}