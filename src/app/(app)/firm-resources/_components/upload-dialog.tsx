"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import type { FirmFileCategory } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { uploadFirmFile } from "@/server/firm-files/actions";

const CATEGORY_OPTIONS: { value: FirmFileCategory; label: string }[] = [
  { value: "CONTRACT", label: "Contrato" },
  { value: "LETTER", label: "Carta" },
  { value: "LICENSE", label: "Licencia" },
  { value: "OTHER_FIRM", label: "Otro" },
  { value: "POLICY", label: "Normativa" },
  { value: "GUIDE", label: "Guía" },
  { value: "TEMPLATE", label: "Plantilla de referencia" },
  { value: "REFERENCE", label: "Otro archivo" }
];

const NONE_VALUE = "__none__";

type ExistingFile = {
  id: string;
  name: string;
  hasNewerVersion: boolean;
};

export function UploadDialog({
  open,
  onOpenChange,
  existingFiles
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingFiles: ExistingFile[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<FirmFileCategory>("CONTRACT");
  const [tags, setTags] = useState("");
  const [supersedesId, setSupersedesId] = useState<string>(NONE_VALUE);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setFile(null);
    setName("");
    setDescription("");
    setCategory("CONTRACT");
    setTags("");
    setSupersedesId(NONE_VALUE);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleFilePick(f: File | null) {
    setFile(f);
    if (f && !name) setName(f.name.replace(/\.[^.]+$/, ""));
  }

  function submit() {
    if (!file) {
      toast.warning("Seleccione un archivo");
      return;
    }
    if (!name.trim()) {
      toast.warning("El nombre es obligatorio");
      return;
    }
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("file", file);
        fd.set("name", name.trim());
        fd.set("description", description.trim());
        fd.set("category", category);
        fd.set("tags", tags);
        if (supersedesId !== NONE_VALUE) fd.set("supersedesId", supersedesId);
        const res = await uploadFirmFile(fd);
        toast.success(
          supersedesId !== NONE_VALUE
            ? `Se subió y reemplazó la versión anterior: ${res.name}`
            : `Se subió: ${res.name}`
        );
        reset();
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        toast.error("Error al subir", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  // Versiones anteriores reemplazables: solo se muestran las de la misma categoría y sin versión actualizada
  const replaceableFiles = existingFiles.filter(
    (f) => !f.hasNewerVersion
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4 text-primary" />
            Subir material del estudio
          </DialogTitle>
          <DialogDescription className="text-xs">
            Archivo único ≤ 50 MB; visible para todo el estudio
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-[11px]">Archivo *</Label>
            <Input
              ref={fileRef}
              type="file"
              onChange={(e) => handleFilePick(e.target.files?.[0] ?? null)}
              className="mt-1"
            />
            {file && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                {file.name} · {(file.size / 1024 / 1024).toFixed(2)}MB
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px]">Nombre *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej.: manual del empleado v2.4"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px]">Categoría *</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as FirmFileCategory)}
              >
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-[11px]">Descripción (opcional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descripción del uso y contexto"
              rows={2}
              className="mt-1 resize-none text-sm"
            />
          </div>

          <div>
            <Label className="text-[11px]">Etiquetas (separadas por coma / espacio)</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Ej.: socio, salarios, 2024"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-[11px]">
              ¿Reemplazar una versión anterior? (opcional; la versión anterior se marcará como "versión anterior")
            </Label>
            <Select value={supersedesId} onValueChange={setSupersedesId}>
              <SelectTrigger className="mt-1 h-9 text-xs">
                <SelectValue placeholder="No reemplazar ningún archivo (nuevo)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>No reemplazar ningún archivo (nuevo)</SelectItem>
                {replaceableFiles.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={isPending || !file}>
            {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Subir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}