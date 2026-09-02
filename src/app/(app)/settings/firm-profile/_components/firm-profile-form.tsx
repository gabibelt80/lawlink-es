"use client";

import { useRef, useState, useTransition } from "react";
import { Building2, Hash, ImageUp, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { renderCaseNoTemplate } from "@/lib/matters/firm-caseno";
import { saveFirmProfileAction } from "@/server/settings/firm-profile-actions";

type Category = { key: string; label: string; abbr: string; word: string };

type Initial = {
  firmName: string;
  firmSubtitle: string;
  logoDataUrl: string | null;
  matterCodePrefix: string;
  firmShortName: string;
  caseNoTemplate: string;
  categories: Category[];
};

const LOGO_MAX_BYTES = 180 * 1024;

export function FirmProfileForm({ initial }: { initial: Initial }) {
  const [firmName, setFirmName] = useState(initial.firmName);
  const [firmSubtitle, setFirmSubtitle] = useState(initial.firmSubtitle);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(initial.logoDataUrl);
  const [prefix, setPrefix] = useState(initial.matterCodePrefix);
  const [shortName, setShortName] = useState(initial.firmShortName);
  const [template, setTemplate] = useState(initial.caseNoTemplate);
  const [words, setWords] = useState<Record<string, string>>(
    Object.fromEntries(initial.categories.map((c) => [c.key, c.word]))
  );
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const year = new Date().getFullYear();
  const sample = initial.categories[0]; // Usamos la primera categoría (litigios civiles y comerciales) como ejemplo
  const caseNoPreview = sample
    ? renderCaseNoTemplate(template, {
        year,
        firmShortName: shortName,
        categoryAbbr: sample.abbr,
        categoryWord: words[sample.key] || sample.word,
        seq: 1
      })
    : "";

  const onPickLogo = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      toast.error("Seleccioná un archivo de imagen (PNG / JPG / WebP / SVG)");
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      toast.error("El logo es demasiado grande, controlá que sea de aproximadamente 180 KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(reader.result as string);
    reader.onerror = () => toast.error("Error al leer la imagen");
    reader.readAsDataURL(file);
  };

  const save = () => {
    startTransition(async () => {
      try {
        await saveFirmProfileAction({
          firmName: firmName.trim() || "LawLink",
          firmSubtitle,
          matterCodePrefix: prefix,
          firmShortName: shortName,
          caseNoTemplate: template,
          logoDataUrl,
          categoryWords: words
        });
        toast.success("Información del estudio guardada");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  };

  return (
    <div className="space-y-5">
      {/* —— Marca del estudio —— */}
      <section className="ll-surface rounded-lg border border-border p-5">
        <header className="mb-3 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <h2 className="text-lg">Marca del estudio</h2>
        </header>
        <p className="mb-4 text-[12px] text-muted-foreground">
          Nombre, subtítulo y logo que se muestran en la parte superior de la barra lateral. Si dejás el nombre vacío, se usará «LawLink» por defecto.
        </p>

        <div className="flex items-start gap-5">
          {/* Vista previa del logo + carga */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/30">
              {logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoDataUrl} alt="Vista previa del logo" className="h-full w-full object-contain" />
              ) : (
                <span className="text-[10px] text-muted-foreground">Sin logo</span>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => onPickLogo(e.target.files?.[0])}
            />
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                <ImageUp className="h-3 w-3" />
                Subir
              </button>
              {logoDataUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setLogoDataUrl(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-destructive hover:underline"
                >
                  <Trash2 className="h-3 w-3" />
                  Quitar
                </button>
              )}
            </div>
          </div>

          <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label className="text-[11px]">Nombre del estudio</Label>
              <Input
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                placeholder="Ej.: Estudio Jurídico Xinglan"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px]">Subtítulo</Label>
              <Input
                value={firmSubtitle}
                onChange={(e) => setFirmSubtitle(e.target.value)}
                placeholder="Ej.: Panel de trabajo del estudio"
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </section>

      {/* —— Prefijo de numeración interna —— */}
      <section className="ll-surface rounded-lg border border-border p-5">
        <header className="mb-3 flex items-center gap-2">
          <Hash className="h-4 w-4 text-primary" />
          <h2 className="text-lg">Numeración interna del sistema</h2>
        </header>
        <p className="mb-4 text-[12px] text-muted-foreground">
          Prefijo de la numeración automática del sistema para cada caso. El formato es fijo:
          <span className="mx-1 font-mono">prefijo-año-categoría-correlativo</span>, solo se puede modificar el prefijo.
        </p>
        <div className="flex items-end gap-4">
          <div className="w-40">
            <Label className="text-[11px]">Prefijo de numeración</Label>
            <Input
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="LL"
              className="mt-1 font-mono"
            />
          </div>
          <div className="pb-2 text-[12px] text-muted-foreground">
            Ejemplo:
            <span className="ml-1 font-mono text-foreground/85">
              {(prefix.trim() || "LL")}-{year}-CC-0001
            </span>
          </div>
        </div>
      </section>

      {/* —— Número interno del estudio —— */}
      <section className="ll-surface rounded-lg border border-border p-5">
        <header className="mb-3 flex items-center gap-2">
          <Hash className="h-4 w-4 text-primary" />
          <h2 className="text-lg">Número interno del estudio (plantilla personalizada)</h2>
        </header>
        <p className="mb-4 text-[12px] text-muted-foreground">
          Número de caso habitual del estudio, se genera automáticamente según la plantilla al convertir un caso. Marcadores disponibles:
          <code className="mx-0.5">{"{año}"}</code>
          <code className="mx-0.5">{"{año2}"}</code>
          <code className="mx-0.5">{"{est}"}</code>
          <code className="mx-0.5">{"{cat}"}</code>
          <code className="mx-0.5">{"{palabraCat}"}</code>
          <code className="mx-0.5">{"{sec3}"}</code>
          <code className="mx-0.5">{"{sec4}"}</code>
          (el correlativo se cuenta de forma independiente por «año + categoría»).
        </p>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Label className="text-[11px]">Abreviatura del estudio ({"{est}"})</Label>
            <Input
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder="Ej.: P"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-[11px]">Plantilla de número de caso</Label>
            <Input
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder="{año}-{est}{palabraCat}-{sec3}"
              className="mt-1 font-mono"
            />
          </div>
        </div>

        <div className="mt-3 rounded-md border border-border bg-muted/20 px-3 py-2 text-[12px]">
          Ejemplo ({sample?.label ?? "Litigio civil y comercial"}):
          <span className="ml-1 font-mono text-foreground/90">{caseNoPreview || "—"}</span>
        </div>

        <div className="mt-4">
          <Label className="text-[11px] text-muted-foreground">Mapeo de palabra de categoría ({"{palabraCat}"})</Label>
          <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
            {initial.categories.map((c) => (
              <div key={c.key} className="rounded-md border border-border bg-card p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{c.label}</span>
                  <span className="font-mono text-[10px] text-muted-foreground/70">{c.abbr}</span>
                </div>
                <Input
                  value={words[c.key] ?? ""}
                  onChange={(e) => setWords((w) => ({ ...w, [c.key]: e.target.value }))}
                  placeholder={c.word}
                  className="h-8 text-[12px]"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          Modificar el prefijo / plantilla no afecta los números históricos ya generados; solo se aplica a los casos nuevos que se creen a partir de ahora.
        </p>
        <Button onClick={save} disabled={pending} className="gap-1.5">
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Guardar
        </Button>
      </div>
    </div>
  );
}