"use client";

import { useState, useTransition, useRef, useMemo, useEffect } from "react";
import {
  useForm,
  useFieldArray,
  FormProvider,
  useWatch,
  type FieldErrors
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  ChevronRight,
  Loader2,
  Plus,
  Paperclip,
  FileText,
  X,
  ScanLine,
  ChevronDown,
  AlertCircle
} from "lucide-react";
import type {
  MatterCategory,
  ProcedureType,
  LitigationStanding,
  FeeType,
  PartyRole,
  UserRole,
  BarFilingType
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  matterCategoryLabel,
  procedureTypeLabel,
  litigationStandingLabel,
  feeTypeLabel,
  procedureToStandingOptions,
  userRoleLabel,
  barFilingLabel,
  BAR_FILING_OPTIONS,
  matterCategoryKind,
  PROJECT_BUSINESS_TYPES,
  COUNSEL_TYPES,
  type CategoryKind
} from "@/lib/enums";
import {
  agencyOptionsForProcedure,
  isAgencyAllowedForProcedure,
  isNationalAgency
} from "@/lib/china-regions";
import {
  proceduresByCategory,
  suggestHandlingAgency
} from "@/lib/procedures-by-category";
import { intakeCreateSchema, type IntakeCreateInput } from "@/server/intakes/schemas";
import { createIntake } from "@/server/intakes/actions";
import { uploadDocument } from "@/server/documents/actions";
import { parsePleading } from "@/server/ai/parse-pleading";
import {
  PartyCard,
  PARTY_GRID,
  PARTY_GRID_NO_STANDING
} from "@/app/(app)/matters/_components/party-card";
import {
  recommendCause,
  type CauseRecommendation
} from "@/server/ai/recommend-cause";
import { getEnterpriseDetail, type EnterpriseSearchItem } from "@/server/yuandian/enterprise";
import { cn } from "@/lib/utils";
import { CauseCombobox } from "@/app/(app)/matters/_components/cause-combobox";
import { CauseAiManualDialog } from "@/app/(app)/matters/_components/cause-ai-manual-dialog";
import type { ClientOption } from "@/app/(app)/matters/_components/matters-view";
import { readFormPath } from "@/lib/form-path";
import { ClientCombobox } from "./client-combobox";
import { CauseRecommendationDialog } from "./cause-recommendation-dialog";
import { JurisdictionSelect } from "./jurisdiction-select";

const CATEGORIES: MatterCategory[] = [
  "CIVIL_COMMERCIAL",
  "LABOR_ARBITRATION",
  "COMMERCIAL_ARBITRATION",
  "CRIMINAL",
  "ADMINISTRATIVE",
  "NON_LITIGATION",
  "LEGAL_COUNSEL",
  "SPECIAL_PROJECT"
];

const FEE_TYPES: FeeType[] = ["FIXED", "CONTINGENCY", "TIMED"];

// 我方为被动方时，可上传起诉状/申请书 OCR 识别对方
const RECEIVING_STANDINGS = new Set<LitigationStanding>([
  "DEFENDANT",
  "JOINT_DEFENDANT",
  "THIRD_PARTY",
  "COUNTERCLAIM_DEFENDANT",
  "APPELLEE",
  "RETRIAL_RESPONDENT",
  "EXECUTED_PERSON",
  "ARBITRATION_RESPONDENT",
  "ADMIN_DEFENDANT",
  "ADMIN_RECONSIDERATION_RESPONDENT",
  "CRIMINAL_DEFENDANT"
]);

const defaults: IntakeCreateInput = {
  title: "",
  category: "CIVIL_COMMERCIAL",
  causeId: "",
  causeFreeText: "",
  description: "",
  receivedAt: new Date(),
  firstProcedureType: undefined,
  firstAgency: "",
  jurisdiction: "",
  ourStanding: undefined,
  claimAmount: undefined,
  claimDescription: "",
  barFiling: undefined,
  counterclaim: false,
  clientId: "",
  clientName: "",
  clientType: "INDIVIDUAL",
  contactName: "",
  contactPhone: "",
  feeType: undefined,
  feeAmount: undefined,
  contingencyTerms: "",
  feeSchedule: "",
  feeNote: "",
  ownerUserId: "",
  coUserIds: [],
  parties: [
    {
      role: "CLIENT_PARTY",
      standing: undefined,
      ordinal: 1,
      partyType: "NATURAL_PERSON",
      name: "",
      idNumber: "",
      enterpriseSocialCode: "",
      enterpriseName: "",
      phone: "",
      address: "",
      legalRep: "",
      contactName: "",
      notes: ""
    },
    {
      role: "OPPOSING_PARTY",
      standing: undefined,
      ordinal: 1,
      partyType: "NATURAL_PERSON",
      name: "",
      idNumber: "",
      enterpriseSocialCode: "",
      enterpriseName: "",
      phone: "",
      address: "",
      legalRep: "",
      contactName: "",
      notes: ""
    }
  ]
};

type Colleague = { id: string; name: string; role: UserRole };

function firstFormErrorMessage(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  if ("message" in value && typeof value.message === "string") return value.message;

  for (const child of Object.values(value)) {
    const message = firstFormErrorMessage(child);
    if (message) return message;
  }
  return undefined;
}

export function IntakeSheet({
  open,
  onOpenChange,
  clientOptions,
  colleagues
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clientOptions: ClientOption[];
  colleagues: Colleague[];
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [contracts, setContracts] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const pleadingRef = useRef<HTMLInputElement>(null);
  const [ocrPending, setOcrPending] = useState(false);
  const [aiRecOpen, setAiRecOpen] = useState(false);
  const [aiRecLoading, setAiRecLoading] = useState(false);
  const [aiRecCandidates, setAiRecCandidates] = useState<CauseRecommendation[]>([]);
  const [aiRecError, setAiRecError] = useState<string | null>(null);
  const [aiRecSituation, setAiRecSituation] = useState<{
    category: MatterCategory;
    text: string;
  } | null>(null);
  const [aiManualOpen, setAiManualOpen] = useState(false);

  const methods = useForm<IntakeCreateInput>({
    resolver: zodResolver(intakeCreateSchema),
    defaultValues: { ...defaults, ownerUserId: session?.user?.id ?? "" }
  });
  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    reset,
    formState: { errors }
  } = methods;

  const { fields: parties, append: appendParty, remove: removeParty } = useFieldArray({
    control,
    name: "parties"
  });

  const watchedValues = useWatch({ control });
  const watch = <T = any,>(path: string) => readFormPath<T>(watchedValues, path);

  const category = watch<MatterCategory>("category") ?? "CIVIL_COMMERCIAL";
  const firstProcedureType = watch<ProcedureType | undefined>("firstProcedureType");
  const clientId = watch("clientId") ?? "";
  const feeType = watch("feeType");
  const ownerUserId = watch("ownerUserId");
  const coUserIds = watch<string[]>("coUserIds") ?? [];
  const receivedAt = watch("receivedAt");
  const jurisdiction = watch("jurisdiction") ?? "";
  // 争议解决机构按管辖地匹配
  const agencyOpts = useMemo(
    () => agencyOptionsForProcedure(jurisdiction, firstProcedureType),
    [jurisdiction, firstProcedureType]
  );

  // v0.31: Categoría del caso决定表单结构（诉讼/仲裁 vs 非诉/专项 vs 顾问）
  const kind: CategoryKind = matterCategoryKind(category);
  const nameLabel =
    kind === "counsel" ? "Nombre del asunto de asesoría" : kind === "project" ? "Nombre del proyecto" : "Nombre del caso";

  // 标题自动生成：填完当事人 + 案由后按「委托方 与 对方 案由」生成，用户手改后不再覆盖
  const [titleTouched, setTitleTouched] = useState(false);
  const [causeName, setCauseName] = useState("");
  const watchedParties = watch("parties");
  const watchedTitle = watch("title");
  const watchedCauseFree = watch("causeFreeText");
  useEffect(() => {
    if (titleTouched) return;
    const list = (watchedParties ?? []) as { role?: string; name?: string }[];
    const clientNm = list.find((p) => p.role === "CLIENT_PARTY")?.name?.trim();
    const oppNm = list.find((p) => p.role === "OPPOSING_PARTY")?.name?.trim();
    const causeNm = (causeName || watchedCauseFree || "").trim();
    if (!clientNm && !oppNm) return;
    // Nombre del caso不含空格（产品要求）
    const suggested = `${clientNm ?? ""}${oppNm ? `y${oppNm}` : ""}${causeNm}`.replace(/\s+/g, "");
    if (suggested && suggested !== (watchedTitle ?? "")) {
      setValue("title", suggested, { shouldDirty: true });
    }
  }, [watchedParties, causeName, watchedCauseFree, titleTouched, watchedTitle, setValue]);

  // 当前类别下可选程序
  const procedureOptions: ProcedureType[] = useMemo(
    () => proceduresByCategory[category] ?? [],
    [category]
  );

  // 当前程序下可选诉讼地位
  const ourStandingOptions: LitigationStanding[] = useMemo(
    () => procedureToStandingOptions(firstProcedureType, "ours"),
    [firstProcedureType]
  );
  // 相对方 / 第三人 诉讼地位也随当前程序联动
  const oppositeStandingOptions: LitigationStanding[] = useMemo(
    () => procedureToStandingOptions(firstProcedureType, "opposite"),
    [firstProcedureType]
  );

  // 切类别时如果当前程序不在新类别列表里，清掉
  useEffect(() => {
    if (firstProcedureType && !procedureOptions.includes(firstProcedureType)) {
      setValue("firstProcedureType", undefined);
      setValue("ourStanding", undefined);
    }
  }, [category, firstProcedureType, procedureOptions, setValue]);

  // v0.31: 切类别时同步当事人行
  // 顾问 / 非诉 / 专项：默认只留委托方一行（相对方按需添加）
  // 诉讼/仲裁：确保至少有一个相对方行
  useEffect(() => {
    const cur = (watch("parties") ?? []) as { role?: string }[];
    if (kind === "counsel" || kind === "project") {
      for (let i = cur.length - 1; i >= 1; i--) removeParty(i);
    } else if (!cur.some((x) => x.role === "OPPOSING_PARTY")) {
      appendParty({
        role: "OPPOSING_PARTY",
        standing: undefined,
        ordinal: cur.length + 1,
        partyType: "NATURAL_PERSON",
        name: "",
        idNumber: "",
        enterpriseSocialCode: "",
        enterpriseName: "",
        phone: "",
        address: "",
        legalRep: "",
        contactName: "",
        notes: ""
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  // 设默认 owner
  useEffect(() => {
    if (!ownerUserId && session?.user?.id) {
      setValue("ownerUserId", session.user.id);
    }
  }, [ownerUserId, session, setValue]);

  // 切程序时自动填充建议机构（仅在为空时）
  function handleProcedureChange(p: ProcedureType) {
    setValue("firstProcedureType", p, { shouldDirty: true });
    setValue("ourStanding", undefined);
    // 机构可自由手输（专门法院、异地仲裁委不在生成列表里），
    // 只在新程序下不合法时清空（商事仲裁下选了法院），不按"是否在列表中"清
    let currentAgency = getValues("firstAgency");
    if (currentAgency && !isAgencyAllowedForProcedure(currentAgency, p)) {
      setValue("firstAgency", "", { shouldDirty: true });
      currentAgency = "";
    }
    if (!currentAgency || currentAgency.length === 0) {
      const suggested = suggestHandlingAgency(p);
      if (agencyOptionsForProcedure(getValues("jurisdiction"), p).includes(suggested)) {
        setValue("firstAgency", suggested);
      }
    }
  }

  function handleJurisdictionChange(v: string) {
    setValue("jurisdiction", v, { shouldDirty: true });
    const cur = getValues("firstAgency");
    if (isNationalAgency(cur)) {
      setValue("firstAgency", "", { shouldDirty: true });
    } else if (cur && !agencyOptionsForProcedure(v, firstProcedureType).includes(cur)) {
      setValue("firstAgency", "", { shouldDirty: true });
    }
  }

  function handleFirstAgencyChange(v: string) {
    setValue("firstAgency", v, { shouldDirty: true });
    if (isNationalAgency(v)) {
      setValue("jurisdiction", "", { shouldDirty: true });
    }
  }

  async function performSubmit(values: IntakeCreateInput) {
    try {
      const res = await createIntake(values);
      if (contracts.length > 0 && res.id) {
        for (const file of contracts) {
          const fd = new FormData();
          fd.set("intakeId", res.id);
          fd.set("name", file.name);
          fd.set("category", "CONTRACT");
          fd.set("encrypted", "true");
          fd.set("file", file);
          await uploadDocument(fd);
        }
      }
      toast.success(
        contracts.length > 0
          ? `Admisión enviada a aprobación, se subieron ${contracts.length} contratos`
          : "Admisión enviada a aprobación"
      );
      reset({ ...defaults, ownerUserId: session?.user?.id ?? "" });
      setTitleTouched(false);
      setCauseName("");
      setContracts([]);
      onOpenChange(false);
      if (res.id) router.push(`/intakes/${res.id}`);
    } catch (err) {
      toast.error("Error al crear", {
        description: err instanceof Error ? err.message : ""
      });
    }
  }

  function onSubmit(values: IntakeCreateInput) {
    // 委托方恒为 parties[0]（role=CLIENT_PARTY）：拆回顶层 client* 字段，其余进 parties。
    // 名称 + 证件号必填由 zodResolver(partyInputSchema) 对每行统一校验。
    const all = values.parties ?? [];
    const client = all.find((p) => p.role === "CLIENT_PARTY");
    if (!client || !client.name?.trim()) {
      toast.warning("Completá el cliente", { description: "El nombre del cliente es obligatorio" });
      return;
    }
    const isOrg = client.partyType === "ORGANIZATION";
    const payload: IntakeCreateInput = {
      ...values,
      clientName: client.name.trim(),
      clientType: isOrg ? "COMPANY" : "INDIVIDUAL",
      clientIdNumber: (isOrg ? client.enterpriseSocialCode : client.idNumber) ?? "",
      clientAddress: client.address ?? "",
      clientLegalRep: client.legalRep ?? "",
      contactName: client.contactName ?? "",
      contactPhone: client.phone ?? "",
      parties: all.filter((p) => p.role !== "CLIENT_PARTY")
    };
    startTransition(() => performSubmit(payload));
  }

  function onInvalid(formErrors: FieldErrors<IntakeCreateInput>) {
    toast.warning("Completá los campos obligatorios", {
      description: firstFormErrorMessage(formErrors) ?? "Revisá las indicaciones en rojo del formulario"
    });
  }

  function handleFiles(list: FileList | null) {
    if (!list) return;
    const arr = Array.from(list).filter((f) => f.size <= 20 * 1024 * 1024);
    if (arr.length < list.length) toast.warning("Se omitieron los archivos que superan los 20MB");
    setContracts((prev) => [...prev, ...arr]);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handlePleadingFile(file: File) {
    setOcrPending(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await parsePleading(fd);
      let added = 0;
      for (const p of res.plaintiffs) {
        // OCR 时按 idNumber 长度/legalRep 是否存在猜主体类型：18 位含字母通常是社会信用代码 → 公司
        const guessed: "NATURAL_PERSON" | "ORGANIZATION" =
          (p.legalRep && p.legalRep.trim()) || (p.idNumber && p.idNumber.length === 18 && /[A-Z]/.test(p.idNumber))
            ? "ORGANIZATION"
            : "NATURAL_PERSON";
        appendParty({
          role: "OPPOSING_PARTY",
          standing: undefined,
          ordinal: parties.filter((x) => x.role === "OPPOSING_PARTY").length + 1 + added,
          partyType: guessed,
          name: p.name ?? "",
          idNumber: guessed === "NATURAL_PERSON" ? p.idNumber ?? "" : "",
          enterpriseSocialCode: guessed === "ORGANIZATION" ? p.idNumber ?? "" : "",
          enterpriseName: guessed === "ORGANIZATION" ? p.name ?? "" : "",
          phone: p.phone ?? "",
          address: p.address ?? "",
          legalRep: p.legalRep ?? "",
          contactName: "",
          notes: ""
        });
        added++;
      }
      let thirdAdded = 0;
      for (const tp of res.thirdParties) {
        const guessed: "NATURAL_PERSON" | "ORGANIZATION" =
          (tp.legalRep && tp.legalRep.trim()) || (tp.idNumber && tp.idNumber.length === 18 && /[A-Z]/.test(tp.idNumber))
            ? "ORGANIZATION"
            : "NATURAL_PERSON";
        appendParty({
          role: "THIRD_PARTY",
          standing: undefined,
          ordinal: parties.filter((x) => x.role === "THIRD_PARTY").length + 1 + thirdAdded,
          partyType: guessed,
          name: tp.name ?? "",
          idNumber: guessed === "NATURAL_PERSON" ? tp.idNumber ?? "" : "",
          enterpriseSocialCode: guessed === "ORGANIZATION" ? tp.idNumber ?? "" : "",
          enterpriseName: guessed === "ORGANIZATION" ? tp.name ?? "" : "",
          phone: tp.phone ?? "",
          address: tp.address ?? "",
          legalRep: tp.legalRep ?? "",
          contactName: "",
          notes: ""
        });
        thirdAdded++;
      }
      if (res.cause && !watch("causeFreeText")) {
        setValue("causeFreeText", res.cause, { shouldDirty: true });
      }
      if (typeof res.claimAmount === "number" && !watch("claimAmount")) {
        setValue("claimAmount", res.claimAmount, { shouldDirty: true });
      }
      if (res.claimDescription && !watch("claimDescription")) {
        setValue("claimDescription", res.claimDescription, { shouldDirty: true });
      }
      if (res.court && !watch("firstAgency")) {
        setValue("firstAgency", res.court, { shouldDirty: true });
      }
      toast.success(
        `Se identificaron ${res.plaintiffs.length} demandantes / ${res.thirdParties.length} terceros`,
        { description: "Por favor, verificá manualmente que los campos sean correctos" }
      );

      // OCR 后联动 AI 案由推荐（仅当 OCR 抽到 cause / claimDescription 时触发）
      const situationParts: string[] = [];
      if (res.cause) situationParts.push(`Causa reconocida por OCR:${res.cause}`);
      if (res.claimDescription) situationParts.push(`Pretensión：${res.claimDescription}`);
      const oppPartyNames = res.plaintiffs.map((p) => p.name).filter(Boolean).join(", ");
      if (oppPartyNames) situationParts.push(`Parte contraria: ${oppPartyNames}`);
      if (res.court) situationParts.push(`Jurisdicción: ${res.court}`);
      const situationText = situationParts.join("\n");
      if (situationText && !watch("causeId")) {
        triggerCauseRecommendation(category, situationText, firstProcedureType);
      }
    } catch (err) {
      toast.error("Error al reconocer", {
        description: err instanceof Error ? err.message : ""
      });
    } finally {
      setOcrPending(false);
      if (pleadingRef.current) pleadingRef.current.value = "";
    }
  }

  async function triggerCauseRecommendation(
    cat: MatterCategory,
    situation: string,
    procType?: ProcedureType | null
  ) {
    setAiRecSituation({ category: cat, text: situation });
    setAiRecOpen(true);
    setAiRecLoading(true);
    setAiRecError(null);
    setAiRecCandidates([]);
    try {
      const list = await recommendCause({ category: cat, procedureType: procType, situation });
      setAiRecCandidates(list);
    } catch (err) {
      setAiRecError(err instanceof Error ? err.message : "Error en la recomendación de IA");
    } finally {
      setAiRecLoading(false);
    }
  }

  function handleAiRecSelect(causeId: string, causeNm: string) {
    setValue("causeId", causeId, { shouldDirty: true });
    setCauseName(causeNm);
    setAiRecOpen(false);
    toast.success("Se utilizó la causa recomendada por IA", { description: causeNm });
  }

  function handleAiRecRetry() {
    if (aiRecSituation) {
      triggerCauseRecommendation(aiRecSituation.category, aiRecSituation.text, firstProcedureType);
    }
  }

  function toggleCo(uid: string) {
    const next = coUserIds.includes(uid)
      ? coUserIds.filter((id) => id !== uid)
      : [...coUserIds, uid];
    setValue("coUserIds", next, { shouldDirty: true });
  }

  async function handlePickYuandian(candidate: EnterpriseSearchItem) {
    // 委托方行恒为 parties[0]
    setValue("clientId", "", { shouldDirty: true });
    setValue("parties.0.partyType", "ORGANIZATION", { shouldDirty: true });
    setValue("parties.0.name", candidate.name, { shouldDirty: true });
    setValue("parties.0.enterpriseName", candidate.name, { shouldDirty: true });
    setValue("parties.0.enterpriseSocialCode", candidate.creditCode, {
      shouldDirty: true,
      shouldValidate: true
    });

    const tid = toast.loading("Obteniendo información detallada de la empresa…", { duration: 10_000 });
    try {
      const res = await getEnterpriseDetail(candidate.id);
      if (res.info) {
        setValue("parties.0.address", res.info.address, { shouldDirty: true });
        setValue("parties.0.legalRep", res.info.legalRep, { shouldDirty: true });
        if (res.info.legalRep && !watch("parties.0.contactName")) {
          setValue("parties.0.contactName", res.info.legalRep, { shouldDirty: true });
        }
        toast.success(
          res.info.legalRep
            ? `Completado: representante legal ${res.info.legalRep}`
            : "Información de la empresa completada",
          { id: tid }
        );
      } else {
        toast.info("No se encontró información detallada, se completó la información básica", { id: tid });
      }
    } catch {
      toast.error("Error al obtener los detalles de la empresa, completá manualmente", { id: tid });
    }
  }

  // 主办 / 协办 / 律协备案 / 反诉 字段（多处复用）
  function leadField() {
    return (
      <Field label="Abogado a cargo" required>
        <Select
          value={ownerUserId ?? ""}
          onValueChange={(v) => setValue("ownerUserId", v, { shouldDirty: true })}
        >
          <SelectTrigger className="h-[34px] bg-white text-[12.5px]">
            <SelectValue placeholder="Seleccionar abogado a cargo" />
          </SelectTrigger>
          <SelectContent>
            {colleagues.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    );
  }

  function coLeadField() {
    return (
      <Field label="Colaboradores (selección múltiple)">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-[34px] w-full justify-between rounded-sm bg-white text-[12.5px] font-normal"
            >
              <span className="truncate">
                {coUserIds.length === 0 ? (
                  <span className="text-muted-foreground">Seleccionar colaboradores</span>
                ) : (
                  colleagues
                    .filter((u) => coUserIds.includes(u.id))
                    .map((u) => u.name)
                    .join(",")
                )}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            portalled={false}
            className="w-[--radix-popover-trigger-width] p-1.5"
          >
            <div className="max-h-56 space-y-0.5 overflow-y-auto">
              {colleagues.filter((u) => u.id !== ownerUserId).length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">No hay colaboradores disponibles</p>
              ) : (
                colleagues
                  .filter((u) => u.id !== ownerUserId)
                  .map((u) => (
                    <label
                      key={u.id}
                      className="flex min-h-8 cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-[13px] transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Checkbox
                        checked={coUserIds.includes(u.id)}
                        onCheckedChange={() => toggleCo(u.id)}
                      />
                      <span>{u.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {userRoleLabel[u.role]}
                      </span>
                    </label>
                  ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      </Field>
    );
  }

  function barFilingField() {
    return (
      <Field label="¿Requiere registro ante el colegio de abogados?">
        <Select
          value={watch("barFiling") ?? ""}
          onValueChange={(v) => setValue("barFiling", v as BarFilingType, { shouldDirty: true })}
        >
          <SelectTrigger className="h-[34px] bg-white text-[12.5px]">
            <SelectValue placeholder="Seleccionar" />
          </SelectTrigger>
          <SelectContent>
            {BAR_FILING_OPTIONS.map((b) => (
              <SelectItem key={b} value={b}>
                {barFilingLabel[b]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    );
  }

  function counterclaimField() {
    return (
      <Field label="¿Hay reconvención?">
        <Select
          value={watch("counterclaim") ? "yes" : "no"}
          onValueChange={(v) => setValue("counterclaim", v === "yes", { shouldDirty: true })}
        >
          <SelectTrigger className="h-[34px] bg-white text-[12.5px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no">No</SelectItem>
            <SelectItem value="yes">Sí</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    );
  }

  // 当事人/相关方录入表格（按类别复用，诉讼/仲裁含诉讼地位列）
  function renderParties(mode: CategoryKind) {
    const showStanding = mode === "litigation";
    const grid = showStanding ? PARTY_GRID : PARTY_GRID_NO_STANDING;
    const clientLabel =
      mode === "counsel" ? "Entidad asesorada" : mode === "project" ? "Comitente" : "Cliente";
    return (
      <div className="overflow-x-auto rounded-md border border-[#cbd5e2] bg-[#e9eef5] p-2 shadow-[var(--shadow-inset)]">
        <div className={cn("space-y-2", showStanding ? "min-w-[880px]" : "min-w-[760px]")}>
          {/* 表头 */}
          <div
            className={cn(
              grid,
              "rounded-sm bg-[#dbe3ee] px-2 py-1.5 text-center text-[11px] font-semibold text-muted-foreground [&>span]:text-center"
            )}
          >
            <span>Rol</span>
            <span>Tipo de sujeto</span>
            <span>Nombre / Razón social</span>
            <span>N.º de documento / Código de crédito</span>
            {showStanding && (
              <span>
                Posición procesal<span className="ml-0.5 text-destructive">*</span>
              </span>
            )}
            <span>Contacto</span>
            <span>Teléfono de contacto</span>
            <span className="text-right">Acciones</span>
          </div>

          {parties.map((p, idx) => {
            const all = (watch("parties") ?? []) as { role?: string }[];
            const role = (all[idx]?.role as PartyRole) ?? "OPPOSING_PARTY";
            const isClient = role === "CLIENT_PARTY";
            // 顾问类只显示委托方
            if (mode === "counsel" && !isClient) return null;
            const ourStanding = watch("ourStanding");
            return (
              <PartyCard
                key={p.id}
                index={idx}
                fieldPrefix="parties"
                showStanding={showStanding}
                removable={!isClient}
                onRemove={() => removeParty(idx)}
                errors={errors as never}
                roleSlot={
                  isClient ? (
                    <div className="flex h-[34px] w-full items-center justify-center rounded-sm border border-primary/30 bg-primary/10 text-[12px] font-semibold text-primary">
                      {clientLabel}
                    </div>
                  ) : (
                    <Select
                      value={role}
                      onValueChange={(v) =>
                        setValue(`parties.${idx}.role`, v as PartyRole, { shouldDirty: true })
                      }
                    >
                      <SelectTrigger className="h-[34px] w-full bg-white px-2 text-center text-[12px] [&>span]:w-full [&>span]:text-center">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPPOSING_PARTY" className="text-xs">
                          Contraparte
                        </SelectItem>
                        <SelectItem value="THIRD_PARTY" className="text-xs">
                          Tercero
                        </SelectItem>
                        <SelectItem value="OTHER" className="text-xs">
                          Parte relacionada
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )
                }
                standingSlot={
                  !showStanding ? undefined : isClient ? (
                    <div className="space-y-1">
                      <Select
                        value={ourStanding ?? ""}
                        onValueChange={(v) =>
                          setValue("ourStanding", v as LitigationStanding, {
                            shouldDirty: true,
                            shouldValidate: true
                          })
                        }
                      >
                        <SelectTrigger className="h-[34px] w-full bg-white px-2 text-center text-[12px] [&>span]:w-full [&>span]:text-center">
                          <SelectValue placeholder="Posición procesal" />
                        </SelectTrigger>
                        <SelectContent>
                          {(ourStandingOptions.length
                            ? ourStandingOptions
                            : (Object.keys(litigationStandingLabel) as LitigationStanding[])
                          ).map((s) => (
                            <SelectItem key={s} value={s} className="text-xs">
                              {litigationStandingLabel[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.ourStanding?.message && (
                        <p className="text-[11px] text-destructive">{errors.ourStanding.message}</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Select
                        value={watch(`parties.${idx}.standing`) ?? ""}
                        onValueChange={(v) =>
                          setValue(`parties.${idx}.standing`, v as LitigationStanding, {
                            shouldDirty: true,
                            shouldValidate: true
                          })
                        }
                      >
                        <SelectTrigger className="h-[34px] w-full bg-white px-2 text-center text-[12px] [&>span]:w-full [&>span]:text-center">
                          <SelectValue placeholder="Posición procesal" />
                        </SelectTrigger>
                        <SelectContent>
                          {oppositeStandingOptions.map((s) => (
                            <SelectItem key={s} value={s} className="text-xs">
                              {litigationStandingLabel[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.parties?.[idx]?.standing?.message && (
                        <p className="text-[11px] text-destructive">
                          {errors.parties[idx]?.standing?.message}
                        </p>
                      )}
                    </div>
                  )
                }
                nameSlot={
                  isClient ? (
                    <ClientCombobox
                      triggerClassName="h-[34px] rounded-sm bg-white px-2 text-center text-[12px] shadow-[var(--shadow-inset-deep)] hover:bg-muted [&>span]:w-full [&>span]:justify-center [&>span]:text-center"
                      clientId={clientId}
                      clientName={watch("parties.0.name") ?? ""}
                      clientType={
                        watch("parties.0.partyType") === "ORGANIZATION"
                          ? "COMPANY"
                          : "INDIVIDUAL"
                      }
                      options={clientOptions}
                      onPickExisting={(id, name) => {
                        setValue("clientId", id, { shouldDirty: true });
                        setValue("parties.0.name", name, {
                          shouldDirty: true,
                          shouldValidate: true
                        });
                      }}
                      onTypeNew={(name) => {
                        setValue("clientId", "", { shouldDirty: true });
                        setValue("parties.0.name", name, {
                          shouldDirty: true,
                          shouldValidate: true
                        });
                      }}
                      onPickYuandian={handlePickYuandian}
                      onClear={() => {
                        setValue("clientId", "", { shouldDirty: true });
                        setValue("parties.0.name", "", { shouldDirty: true });
                        setValue("parties.0.idNumber", "", { shouldDirty: true });
                        setValue("parties.0.enterpriseSocialCode", "", { shouldDirty: true });
                        setValue("parties.0.enterpriseName", "", { shouldDirty: true });
                        setValue("parties.0.address", "", { shouldDirty: true });
                        setValue("parties.0.legalRep", "", { shouldDirty: true });
                      }}
                    />
                  ) : undefined
                }
              />
            );
          })}
        </div>
      </div>
    );
  }

  const addPartyBtn = (label: string) => (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 gap-1.5"
      onClick={() =>
        appendParty({
          role: "OPPOSING_PARTY",
          standing: undefined,
          ordinal: parties.length + 1,
          partyType: "NATURAL_PERSON",
          name: "",
          idNumber: "",
          enterpriseSocialCode: "",
          enterpriseName: "",
          phone: "",
          address: "",
          legalRep: "",
          contactName: "",
          notes: ""
        })
      }
    >
      <Plus className="h-3 w-3" />
      {label}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[92vw] max-w-[960px] flex-col gap-0 overflow-hidden border-border bg-card p-0 shadow-[var(--shadow-high)] sm:rounded-xl [&>button]:right-5 [&>button]:top-5 [&>button]:rounded-md [&>button]:bg-transparent [&>button]:text-muted-foreground [&>button]:opacity-100 [@media(hover:hover)]:[&>button:hover]:bg-muted [@media(hover:hover)]:[&>button:hover]:text-foreground">
        <DialogHeader className="border-b border-border bg-card px-5 pb-4 pt-4">
          <div className="pr-9">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <DialogTitle className="text-[17px] font-semibold leading-6 tracking-tight text-foreground">
                  Nuevo registro de admisión
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-[12px] leading-5 text-muted-foreground">
                  El caso comienza aquí su ciclo de vida
                </DialogDescription>
              </div>
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                Pendiente de aprobación
              </span>
            </div>
          </div>
        </DialogHeader>
        <FormProvider {...methods}>
        <form
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto bg-[#e6ebf2] px-4 py-4">
            <div className="mx-auto max-w-[888px] space-y-3.5 [&_button[role=combobox]]:h-[34px] [&_button[role=combobox]]:min-h-0 [&_button[role=combobox]]:rounded-sm [&_button[role=combobox]]:border-[#c6d0dd] [&_button[role=combobox]]:bg-white [&_button[role=combobox]]:text-[12.5px] [&_button[role=combobox]]:shadow-[var(--shadow-inset-deep)] [&_input]:h-[34px] [&_input]:min-h-0 [&_input]:rounded-sm [&_input]:border-[#c6d0dd] [&_input]:bg-white [&_input]:text-[12.5px] [&_textarea]:rounded-sm [&_textarea]:border-[#c6d0dd] [&_textarea]:bg-white [&_textarea]:text-[12.5px]">
            {Object.keys(errors).length > 0 && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-destructive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-[12.5px] font-medium">Aún faltan datos obligatorios</p>
                  <p className="mt-0.5 text-[11.5px] leading-4">
                    {firstFormErrorMessage(errors) ?? "Revisá las indicaciones en rojo del formulario"}
                  </p>
                </div>
              </div>
            )}
            {/* ① Informacion basica（共用：类别 / 名称 / 收案 / 经办）*/}
            <Section title="① Información básica" required>
              {/* Categoría del caso | Fecha de admisión（与类别等宽）| Nombre del caso（剩余）*/}
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[160px_160px_minmax(0,1fr)]">
                <Field label="Categoría del caso" required>
                  <Select
                    value={category}
                    onValueChange={(v) => setValue("category", v as MatterCategory)}
                  >
                    <SelectTrigger className="h-[34px] bg-white text-[12.5px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {matterCategoryLabel[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Fecha de admisión">
                  <Input
                    type="date"
                    className="h-[34px]"
                    value={
                      receivedAt ? new Date(receivedAt).toISOString().split("T")[0] : ""
                    }
                    onChange={(e) =>
                      setValue("receivedAt", new Date(e.target.value), { shouldDirty: true })
                    }
                  />
                </Field>
                <Field label={nameLabel} error={errors.title?.message}>
                  {(() => {
                    const titleReg = register("title");
                    return (
                      <Input
                        placeholder="Se genera automáticamente si queda vacío"
                        className="h-[34px]"
                        {...titleReg}
                        onChange={(e) => {
                          titleReg.onChange(e);
                          setTitleTouched(true);
                        }}
                      />
                    );
                  })()}
                </Field>
              </div>

              {/* 诉讼/仲裁：案情信息（并入基本信息）*/}
              {kind === "litigation" && (
                <>
                {/* Trámite actual | Causa | 管辖地 | 争议解决机构 */}
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                  <Field label="Trámite actual" required error={errors.firstProcedureType?.message}>
                    <Select
                      value={firstProcedureType ?? ""}
                      onValueChange={(v) => handleProcedureChange(v as ProcedureType)}
                    >
                      <SelectTrigger className="h-[34px] bg-white text-[12.5px]">
                        <SelectValue placeholder="Seleccionar trámite actual" />
                      </SelectTrigger>
                      <SelectContent>
                        {procedureOptions.map((p) => (
                          <SelectItem key={p} value={p}>
                            {procedureTypeLabel[p]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field
                    label="Causa"
                    required
                    hint={!firstProcedureType ? "Primero seleccioná el trámite / instancia" : undefined}
                  >
                    <CauseCombobox
                      category={category}
                      procedureType={firstProcedureType}
                      value={watch("causeId") || ""}
                      disabled={!firstProcedureType}
                      placeholder={firstProcedureType ? "Hacé clic para seleccionar" : "Primero seleccioná el trámite actual"}
                      onChange={(id, name) => {
                        setValue("causeId", id, { shouldDirty: true });
                        setCauseName(name);
                      }}
                    />
                  </Field>
                  <Field label="Jurisdicción">
                    <JurisdictionSelect
                      value={jurisdiction}
                      onChange={handleJurisdictionChange}
                      triggerClassName="h-[34px]"
                    />
                  </Field>
                  <Field label="Órgano de resolución de conflictos">
                    <Select
                      value={watch("firstAgency") || ""}
                      onValueChange={handleFirstAgencyChange}
                      disabled={agencyOpts.length === 0}
                    >
                      <SelectTrigger className="h-[34px] bg-white text-[12.5px]">
                        <SelectValue placeholder="Seleccionar órgano" />
                      </SelectTrigger>
                      <SelectContent>
                        {agencyOpts.map((a) => (
                          <SelectItem key={a} value={a}>
                            {a}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                {/* 标的额（1/4）| 标的描述（3/4）*/}
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                  <Field label="Monto reclamado ($)" error={errors.claimAmount?.message}>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      placeholder="0.00"
                      className="font-mono"
                      {...register("claimAmount", {
                        setValueAs: (value) => (value === "" ? undefined : Number(value))
                      })}
                    />
                  </Field>
                  <Field label="Descripción del reclamo (no monetario u otras pretensiones)" className="sm:col-span-3">
                    <Input
                      placeholder="Ej.: solicitar la validez del contrato / solicitar el cese de la infracción"
                      {...register("claimDescription")}
                    />
                  </Field>
                </div>

                {/* 主办 | 协办 | 是否需向律协备案 | 是否反诉（各 1/4）*/}
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                  {leadField()}
                  {coLeadField()}
                  {barFilingField()}
                  {counterclaimField()}
                </div>
              </>
            )}

            {/* 非诉/专项：项目信息（并入基本信息）*/}
            {kind === "project" && (
              <>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                  <Field label="Tipo de negocio">
                    <Select
                      value={watch("businessType") || ""}
                      onValueChange={(v) => setValue("businessType", v, { shouldDirty: true })}
                    >
                      <SelectTrigger className="h-[34px] bg-white text-[12.5px]">
                        <SelectValue placeholder="Seleccionar tipo de negocio" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_BUSINESS_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Monto del proyecto ($)" error={errors.claimAmount?.message}>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      placeholder="0.00"
                      className="font-mono"
                      {...register("claimAmount", {
                        setValueAs: (value) => (value === "" ? undefined : Number(value))
                      })}
                    />
                  </Field>
                  <Field label="Fecha de inicio">
                    <Input
                      type="date"
                      value={
                        watch("serviceStart")
                          ? new Date(watch("serviceStart")!).toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        setValue(
                          "serviceStart",
                          e.target.value ? new Date(e.target.value) : undefined,
                          { shouldDirty: true }
                        )
                      }
                    />
                  </Field>
                  <Field label="Fecha de finalización">
                    <Input
                      type="date"
                      value={
                        watch("serviceEnd")
                          ? new Date(watch("serviceEnd")!).toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        setValue(
                          "serviceEnd",
                          e.target.value ? new Date(e.target.value) : undefined,
                          { shouldDirty: true }
                        )
                      }
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                  <Field label="Alcance del servicio / Contenido" className="sm:col-span-3">
                    <Input
                      placeholder="Ej.: alcance de la debida diligencia, checklist de revisión de contratos, diseño de la estructura de la transacción…"
                      {...register("serviceScope")}
                    />
                  </Field>
                  <Field label="Entregables">
                    <Input placeholder="Ej.: dictamen legal / informe de debida diligencia" {...register("deliverables")} />
                  </Field>
                </div>
                {/* 主办 | 协办（各 1/2）*/}
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {leadField()}
                  {coLeadField()}
                </div>
              </>
            )}

            {/* 顾问：顾问信息（并入基本信息）*/}
            {kind === "counsel" && (
              <>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                  <Field label="Tipo de asesoría">
                    <Select
                      value={watch("counselType") || ""}
                      onValueChange={(v) => setValue("counselType", v, { shouldDirty: true })}
                    >
                      <SelectTrigger className="h-[34px] bg-white text-[12.5px]">
                        <SelectValue placeholder="Seleccionar tipo de asesoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNSEL_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Vigencia de la asesoría · Inicio">
                    <Input
                      type="date"
                      value={
                        watch("serviceStart")
                          ? new Date(watch("serviceStart")!).toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        setValue(
                          "serviceStart",
                          e.target.value ? new Date(e.target.value) : undefined,
                          { shouldDirty: true }
                        )
                      }
                    />
                  </Field>
                  <Field label="Vigencia de la asesoría · Fin">
                    <Input
                      type="date"
                      value={
                        watch("serviceEnd")
                          ? new Date(watch("serviceEnd")!).toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        setValue(
                          "serviceEnd",
                          e.target.value ? new Date(e.target.value) : undefined,
                          { shouldDirty: true }
                        )
                      }
                    />
                  </Field>
                  <Field label="Teléfono de contacto">
                    <Input className="font-mono" placeholder="Teléfono del contacto" {...register("contactPhone")} />
                  </Field>
                </div>
                <Field label="Alcance del servicio / Contenido">
                  <Input
                    placeholder="Ej.: asesoría legal diaria, revisión de contratos, dictámenes legales especiales…"
                    {...register("serviceScope")}
                  />
                </Field>
                {/* 主办 | 协办（各 1/2）*/}
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {leadField()}
                  {coLeadField()}
                </div>
              </>
            )}
            </Section>

            {/* ③ 当事人 / 相关方（按类别）*/}
            {kind === "litigation" && (
            <Section
              title="② Partes del caso"
              required
              headerAction={addPartyBtn("Agregar parte")}
            >
              {watch("ourStanding") && RECEIVING_STANDINGS.has(watch("ourStanding")!) && (
                <div className="rounded-md border border-primary/20 bg-accent p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-xs text-muted-foreground">
                      <div className="font-medium text-foreground">
                        <ScanLine className="mr-1 inline h-3 w-3 text-primary" />
                        Reconocer demanda / solicitud
                      </div>
                      <p className="mt-0.5">
                        Cuando somos la parte pasiva, podés subir la demanda / solicitud de la contraparte (JPG / PNG / WebP / PDF, ≤ 20MB) para que la IA extraiga automáticamente los datos de la contraparte y sus pretensiones
                      </p>
                    </div>
                    <input
                      ref={pleadingRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handlePleadingFile(f);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => pleadingRef.current?.click()}
                      disabled={ocrPending}
                      className="h-7 shrink-0 gap-1"
                    >
                      {ocrPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <ScanLine className="h-3 w-3" />
                      )}
                      Subir y reconocer
                    </Button>
                  </div>
                </div>
              )}

              {renderParties("litigation")}
            </Section>
            )}

            {/* ③ 非诉/专项：委托方与相对方（无诉讼地位）*/}
            {kind === "project" && (
              <Section title="② Comitente y contraparte" headerAction={addPartyBtn("Agregar contraparte")}>
                {renderParties("project")}
              </Section>
            )}

            {/* ③ 顾问：顾问单位 */}
            {kind === "counsel" && (
              <Section title="② Entidad asesorada" required>
                {renderParties("counsel")}
              </Section>
            )}

            {/* 3. 律师费 */}
            <Section title={kind === "counsel" ? "③ Honorarios de asesoría" : "③ Honorarios de abogado"}>
              <div
                className={cn(
                  "grid grid-cols-1 gap-3",
                  feeType
                    ? "lg:grid-cols-[minmax(13rem,0.95fr)_minmax(10rem,0.65fr)_minmax(15rem,1fr)_minmax(12rem,0.85fr)]"
                    : "lg:grid-cols-[minmax(13rem,0.95fr)]"
                )}
              >
                <Field label="Modalidad de cobro">
                  <div
                    className={cn(
                      "grid gap-1.5",
                      kind === "counsel" ? "grid-cols-2" : "grid-cols-3"
                    )}
                  >
                    {/* 顾问费不含风险代理 */}
                    {FEE_TYPES.filter((t) => kind !== "counsel" || t !== "CONTINGENCY").map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setValue("feeType", t, { shouldDirty: true })}
                        className={cn(
                          "flex h-[34px] items-center justify-center whitespace-nowrap rounded-sm border px-2 text-[12px] font-medium transition-colors",
                          feeType === t
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-[#c6d0dd] bg-white text-muted-foreground shadow-[var(--shadow-inset-deep)] hover:border-input hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {feeTypeLabel[t]}
                      </button>
                    ))}
                  </div>
                </Field>

                {feeType && (
                  <Field
                    label={
                      feeType === "TIMED"
                        ? "Tarifa por hora ($/hora)"
                        : feeType === "CONTINGENCY"
                          ? "Honorario base ($)"
                          : "Monto total ($)"
                    }
                    required
                    error={errors.feeAmount?.message}
                  >
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      placeholder="0.00"
                      className="font-mono"
                      {...register("feeAmount", {
                        setValueAs: (value) => (value === "" ? undefined : Number(value))
                      })}
                    />
                  </Field>
                )}

                {feeType && (
                  <Field label={feeType === "TIMED" ? "Detalle de facturación / Ciclo de liquidación" : "Hitos de pago / Acuerdo de cuotas"}>
                    <Input
                      placeholder={
                        feeType === "TIMED"
                          ? "Ej.: liquidación mensual, socio $2000/hora"
                          : feeType === "CONTINGENCY"
                            ? "Ej.: honorario base se paga al firmar; el honorario de éxito se paga dentro de los 7 días de percibido"
                            : "Ej.: 50% al firmar, 30% antes de la audiencia, 20% al cierre"
                      }
                      {...register("feeSchedule")}
                    />
                  </Field>
                )}

                {feeType && feeType !== "CONTINGENCY" && (
                  <Field label="Observaciones sobre honorarios (opcional)">
                    <Input placeholder="Ej.: incluye viáticos / incluye anticipo de costas" {...register("feeNote")} />
                  </Field>
                )}
              </div>

              {feeType === "CONTINGENCY" && (
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,0.55fr)]">
                  <Field label="Modalidad de honorario de éxito" required hint="Ej.: 15% al percibir el cobro; o escalas según el monto obtenido">
                    <Textarea
                      rows={2}
                      placeholder="Describí en detalle la modalidad del honorario de éxito / condiciones que lo activan / porcentaje aplicado"
                      className="min-h-[68px]"
                      {...register("contingencyTerms")}
                    />
                  </Field>
                  <Field label="Observaciones sobre honorarios (opcional)">
                    <Textarea
                      rows={2}
                      placeholder="Ej.: incluye viáticos / incluye anticipo de costas"
                      className="min-h-[68px]"
                      {...register("feeNote")}
                    />
                  </Field>
                </div>
              )}
            </Section>

            {/* 4. 合同 */}
            <Section
              title="④ Contrato de mandato / Anexos relacionados"
              headerAction={
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                    className="h-7 gap-1"
                  >
                    <Paperclip className="h-3 w-3" />
                    Agregar
                  </Button>
                </>
              }
            >
              {contracts.length === 0 ? (
                <p className="rounded-md border border-dashed border-[#c6d0dd] bg-[#e9eef5] py-4 text-center text-xs text-muted-foreground">
                  Subí el contrato de mandato, poder de representación, etc. (almacenamiento cifrado, cada archivo ≤ 20MB)
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {contracts.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 rounded-md border border-[#c6d0dd] bg-white px-3 py-2 text-xs shadow-[var(--shadow-inset-deep)]"
                    >
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      <span className="flex-1 truncate">{f.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground tabular">
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setContracts((c) => c.filter((_, j) => j !== i))}
                        className="h-5 w-5 p-0 text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
            </div>
          </div>

          <DialogFooter className="border-t border-border bg-card px-8 py-4">
            <div className="mr-auto hidden text-[12px] text-muted-foreground sm:block">
              Registro completo · Se envía a aprobación al enviar
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="h-8 rounded-full px-4 text-[12.5px]"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="h-8 rounded-full gap-2 px-5 text-[12.5px]">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar a aprobación
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </Button>
          </DialogFooter>
        </form>
        </FormProvider>
      </DialogContent>
      <CauseRecommendationDialog
        open={aiRecOpen}
        loading={aiRecLoading}
        candidates={aiRecCandidates}
        errorMessage={aiRecError}
        onSelect={handleAiRecSelect}
        onOpenChange={setAiRecOpen}
        onRetry={handleAiRecRetry}
      />
      <CauseAiManualDialog
        open={aiManualOpen}
        onOpenChange={setAiManualOpen}
        category={category}
        procedureType={firstProcedureType}
        contextHints={(() => {
          const lines: string[] = [];
          const cf = watch("causeFreeText");
          if (cf) lines.push(`OCR 识别案由：${cf}`);
          const cd = watch("claimDescription");
          if (cd) lines.push(`诉讼请求：${cd}`);
          const opp = parties
            .filter((p) => p.role === "OPPOSING_PARTY")
            .map((p) => p.name)
            .filter(Boolean);
          if (opp.length) lines.push(`对方当事人：${opp.join(",")}`);
          return lines.join("\n");
        })()}
        onSelect={handleAiRecSelect}
      />
    </Dialog>
  );
}

function Section({
  title,
  required,
  headerAction,
  children
}: {
  title: string;
  required?: boolean;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  const text = title.replace(/^[①-⑨]\s+/, "");

  return (
    <section className="overflow-hidden rounded-md border border-[#cbd5e2] bg-[#f2f5f9] shadow-[var(--shadow-low),var(--shadow-inset)]">
      <div className="flex items-center justify-between gap-3 px-4 pt-4">
        <h3 className="flex items-center gap-2 text-[12px]">
          <span className="h-3 w-[3px] rounded-full bg-primary" />
          <span className="text-[12px] font-semibold leading-5 text-muted-foreground">
            {text}
            {required && <span className="ml-1 text-destructive">*</span>}
          </span>
        </h3>
        {headerAction}
      </div>
      <div className="space-y-3 p-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  error,
  hint,
  className,
  children
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="flex items-center gap-1 text-[12px] font-medium leading-4 text-muted-foreground">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-[11px] leading-4 text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
