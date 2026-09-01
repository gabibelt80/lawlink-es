"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Paperclip, Link2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioChips } from "@/components/ui/radio-chips";
import { createSealRequest } from "@/server/seals/actions";
import {
  type SealTypeConfigRow,
  type MatterOption,
  SEAL_TYPE_CN,
} from "./seal-types";
import { MatterCombobox } from "./matter-combobox";

const PURPOSE_PRESETS = [
  "委托合同",
  "法律意见书",
  "所函",
  "证明",
  "其他",
] as const;

const PURPOSE_PRESET_LABELS: Record<PurposePreset, string> = {
  委托合同: "Contrato de mandato",
  法律意见书: "Dictamen legal",
  所函: "Carta / oficio",
  证明: "Constancia / comprobante",
  其他: "Otro",
};

type PurposePreset = (typeof PURPOSE_PRESETS)[number];

function isPdfFile(file: File) {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}

export function SealRequestSheet({
  open,
  onOpenChange,
  configs,
  matters,
  preset,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  configs: SealTypeConfigRow[];
  matters: MatterOption[];
  preset: {
    draftDocId?: string;
    matterId?: string;
    documentTitle?: string;
  } | null;
}) {
  const [sealType, setSealType] = useState<string>("");
  const [matterId, setMatterId] = useState<string>("");
  const [purposePreset, setPurposePreset] = useState<PurposePreset | "">("");
  const [purposeOther, setPurposeOther] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [pageCount, setPageCount] = useState(1);
  const [crossPage, setCrossPage] = useState(false);
  const [copies, setCopies] = useState(1);
  const [urgency, setUrgency] = useState<"NORMAL" | "URGENT">("NORMAL");
  const [requestNote, setRequestNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [alsoLegalRep, setAlsoLegalRep] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // 卷宗联动预填
  useEffect(() => {
    if (preset?.matterId) setMatterId(preset.matterId);
    if (preset?.documentTitle) setDocumentTitle(preset.documentTitle);
  }, [preset]);

  const reset = () => {
    setSealType("");
    setMatterId("");
    setPurposePreset("");
    setPurposeOther("");
    setDocumentTitle("");
    setPageCount(1);
    setCrossPage(false);
    setCopies(1);
    setUrgency("NORMAL");
    setRequestNote("");
    setFile(null);
    setAlsoLegalRep(false);
  };

  // 拼出实际入库的 purpose 字符串
  const resolvedPurpose =
    purposePreset === "其他"
      ? purposeOther.trim()
        ? `其他：${purposeOther.trim()}`
        : ""
      : purposePreset;

  const enabledConfigs = configs.filter((c) => c.enabled);
  const hasExisting = !!preset?.draftDocId;

  const submit = () => {
    if (!sealType) {
      toast.error("Seleccione el tipo de sello");
      return;
    }
    if (!purposePreset) {
      toast.error("Seleccione el motivo del sello");
      return;
    }
    if (purposePreset === "其他" && !purposeOther.trim()) {
      toast.error("Complete la descripción específica del motivo 'Otro'");
      return;
    }
    if (!documentTitle.trim()) {
      toast.error("Complete el título del documento");
      return;
    }
    if (!hasExisting && !file) {
      toast.error("Suba el borrador para sellar");
      return;
    }
    if (!hasExisting && file && !isPdfFile(file)) {
      toast.error("Debe cargar un archivo en formato PDF");
      return;
    }

    const fd = new FormData();
    fd.set("sealType", sealType);
    if (matterId) fd.set("matterId", matterId);
    fd.set("purpose", resolvedPurpose);
    fd.set("documentTitle", documentTitle.trim());
    fd.set("pageCount", String(pageCount));
    fd.set("requireCrossPageSeal", String(crossPage));
    fd.set("copies", String(copies));
    fd.set("urgency", urgency);
    fd.set("requestNote", requestNote.trim());
    if (alsoLegalRep && sealType !== "LEGAL_REP_SEAL") {
      fd.set("alsoLegalRep", "true");
    }
    if (hasExisting && preset?.draftDocId) {
      fd.set("existingDraftDocId", preset.draftDocId);
    } else if (file) {
      fd.set("draftDoc", file);
    }

    startTransition(async () => {
      try {
        const res = await createSealRequest(fd);
        toast.success(
          `Solicitud enviada ${res.code}${alsoLegalRep && sealType !== "LEGAL_REP_SEAL" ? " (incluye solicitud complementaria del sello del representante legal)" : ""}`,
        );
        reset();
        onOpenChange(false);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al enviar");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] w-[92vw] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva solicitud de sellado</DialogTitle>
        </DialogHeader>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* 联动提示 */}
          {hasExisting && (
            <div
              className="ll-surface flex items-start gap-2 rounded p-2.5 text-[12px] md:col-span-2"
              style={{ background: "rgb(96 165 250 / 0.08)" }}
            >
              <Link2 className="mt-0.5 h-3.5 w-3.5 text-primary" />
              <div>
                <p className="text-foreground">
                  Se ha relacionado el documento del expediente como borrador
                  para sellar
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {preset?.documentTitle}
                </p>
              </div>
            </div>
          )}

          <div className="md:col-span-2">
            <Label className="text-[11px]">Tipo de sello *</Label>
            <RadioChips
              className="mt-2"
              items={enabledConfigs.map((c) => ({
                value: c.type as string,
                label: SEAL_TYPE_CN[c.type] ?? c.type,
                description: c.description ?? undefined,
              }))}
              value={sealType}
              onChange={setSealType}
            />
            {sealType && (
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                {enabledConfigs.find((c) => c.type === sealType)?.description}
              </p>
            )}
            {sealType && sealType !== "LEGAL_REP_SEAL" && (
              <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-background px-2.5 py-1.5 text-[12px]">
                <Checkbox
                  checked={alsoLegalRep}
                  onCheckedChange={(v) => setAlsoLegalRep(v === true)}
                />
                <span>
                  También sellar con{" "}
                  <strong className="text-foreground">
                    sello del representante legal
                  </strong>
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Se creará automáticamente una solicitud complementaria del
                  sello de la persona jurídica, en paralelo con este
                </span>
              </label>
            )}
          </div>

          <div>
            <Label className="text-[11px]">Caso relacionado (opcional)</Label>
            <div className="mt-1">
              {preset?.matterId ? (
                // 从案件详情页发起时，case 已锁定，不展示可切换的下拉
                <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 text-[12px]">
                  <span className="text-[10px] text-muted-foreground">
                    Relacionado
                  </span>
                  <span className="truncate">
                    {matters.find((m) => m.id === preset.matterId)?.title ??
                      "Caso actual"}
                  </span>
                </div>
              ) : (
                <MatterCombobox
                  matters={matters}
                  value={matterId}
                  onChange={setMatterId}
                  placeholder="Sin caso relacionado"
                />
              )}
            </div>
          </div>

          <div className="md:col-span-2">
            <Label className="text-[11px]">Motivo del sello *</Label>
            <RadioChips
              className="mt-2"
              items={PURPOSE_PRESETS.map((p) => ({ value: p, label: p }))}
              value={purposePreset || null}
              onChange={(v) => setPurposePreset(v as PurposePreset)}
            />
            {purposePreset === "其他" && (
              <Textarea
                value={purposeOther}
                onChange={(e) => setPurposeOther(e.target.value)}
                placeholder="Describa el motivo específico"
                rows={2}
                className="mt-2 text-[12px]"
              />
            )}
          </div>

          <div className="md:col-span-2">
            <Label className="text-[11px]">Título del documento *</Label>
            <Input
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px]">Páginas</Label>
              <Input
                type="number"
                min={1}
                value={pageCount}
                onChange={(e) =>
                  setPageCount(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px]">Copias</Label>
              <Input
                type="number"
                min={1}
                value={copies}
                onChange={(e) =>
                  setCopies(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex items-center justify-between md:col-span-2">
            <label className="flex items-center gap-2 text-[12px]">
              <Checkbox
                checked={crossPage}
                onCheckedChange={(v) => setCrossPage(v === true)}
              />
              Requiere sello transversal
            </label>
            <RadioChips
              size="sm"
              items={[
                { value: "NORMAL", label: "Normal" },
                { value: "URGENT", label: "Urgente", accent: "#DC2626" },
              ]}
              value={urgency}
              onChange={(v) => setUrgency(v as "NORMAL" | "URGENT")}
            />
          </div>

          <div className="md:col-span-2">
            <Label className="text-[11px]">Observaciones</Label>
            <Textarea
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              rows={2}
              className="mt-1 text-[12px]"
            />
          </div>

          {!hasExisting && (
            <div className="md:col-span-2">
              <Label className="text-[11px]">Borrador para sellar *</Label>
              <div className="mt-1">
                <label className="flex cursor-pointer items-center gap-2 rounded border border-dashed border-border px-3 py-3 text-[12px] text-muted-foreground hover:bg-muted/30">
                  <Paperclip className="h-3.5 w-3.5" />
                  {file ? (
                    <span className="flex items-center gap-1 text-foreground">
                      <FileText className="h-3 w-3" />
                      {file.name}
                    </span>
                  ) : (
                    "Seleccionar archivo PDF"
                  )}
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const picked = e.target.files?.[0] ?? null;
                      if (picked && !isPdfFile(picked)) {
                        toast.error("Debe cargar un archivo en formato PDF");
                        e.target.value = "";
                        setFile(null);
                        return;
                      }
                      setFile(picked);
                    }}
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            Enviar solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
