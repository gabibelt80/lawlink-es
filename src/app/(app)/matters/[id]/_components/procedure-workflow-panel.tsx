"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Download,
  Eye,
  FileText,
  Gavel,
  Landmark,
  ListChecks,
  Loader2,
  Minus,
  Plus,
  Scale,
  Shield,
  Sparkles,
  Upload
} from "lucide-react";
import type {
  DeadlineCategory,
  DocumentCategory,
  GuaranteeType,
  LitigationStanding,
  PreservationStatus,
  PreservationType,
  ProcedureType
} from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { uploadDocument } from "@/server/documents/actions";
import { createTask } from "@/server/tasks/actions";
import { createProcedureStage, ensureProcedureStage, removeProcedureStage } from "@/server/procedures/actions";
import { AddDeadlineDialog } from "./procedure-forms";
import { liftProperty } from "@/server/preservations/actions-v2";
import { cn, daysUntil, formatCurrency, formatDate } from "@/lib/utils";
import { litigationStandingLabel, procedureTypeLabel } from "@/lib/enums";
import {
  defaultStageNamesForProcedure,
  normalizeProcedureStageName,
  procedureStagePresetsForProcedure,
  stagePresetForName,
  type StagePresetKind
} from "@/lib/procedure-stage-defaults";
import { canPreview, officePreviewKind } from "@/lib/storage/mime-ext";
import {
  PreservationCaseDialog,
  AddTargetDialog,
  AddPropertyDialog,
  RenewPropertyDialog
} from "@/app/(app)/preservation/_components/preservation-dialog";
import {
  GUARANTEE_TYPE_CN,
  PRES_STATUS_CN,
  PRES_STATUS_COLOR,
  PRES_TYPE_CN,
  PROPERTY_TYPE_CN,
  classifyExpiry,
  type MatterOption,
  type UserOption
} from "@/app/(app)/preservation/_components/preservation-types";
import { TemplatePickerDialog } from "./template-picker-dialog";
import type { FolderPayload, TemplateSummary } from "./folder-types";

type WorkflowTask = {
  id: string;
  title: string;
  description: string | null;
  dueAt: Date | null;
  completed: boolean;
  completedAt: Date | null;
  priority: number;
  stageId: string | null;
};

type WorkflowStageSource = {
  id: string;
  name: string;
  description: string | null;
  order: number;
  status: "ACTIVE" | "HIDDEN";
  startedAt: Date | null;
  completedAt: Date | null;
  tasks: WorkflowTask[];
};

type WorkflowDeadline = {
  id: string;
  title: string;
  category: DeadlineCategory;
  dueAt: Date;
  basis: string | null;
  remindDays: number;
  completed: boolean;
};

type WorkflowHearing = {
  id: string;
  title: string;
  room: string | null;
  address: string | null;
  startsAt: Date;
};

type WorkflowProcedure = {
  id: string;
  type: ProcedureType;
  customLabel: string | null;
  caseNumber: string | null;
  acceptedAt: Date | null;
  concludedAt: Date | null;
  status: "PENDING" | "IN_PROGRESS" | "CONCLUDED";
  stages: WorkflowStageSource[];
  deadlines: WorkflowDeadline[];
  hearings: WorkflowHearing[];
  procedureParties: {
    id: string;
    standing: LitigationStanding;
    ordinal: number;
    party: { id: string; name: string };
  }[];
};

type WorkflowDocument = {
  id: string;
  name: string;
  category: DocumentCategory;
  mimeType: string | null;
  size: number | null;
  createdAt: Date;
  sourceParty: string | null;
  path: string;
  tags: string[];
  stageId: string | null;
};

type WorkflowMatter = {
  id: string;
  internalCode: string;
  title: string;
  category: string;
};

export type WorkflowPreservationCase = {
  id: string;
  matterId: string | null;
  type: PreservationType;
  status: PreservationStatus;
  court: string | null;
  rulingNumber: string | null;
  guaranteeType: GuaranteeType | null;
  appliedAt: Date | null;
  note: string | null;
  ownerId: string | null;
  remindDays: number[];
  createdAt: Date;
  updatedAt: Date;
  matter: { id: string; internalCode: string; title: string } | null;
  owner: { id: string; name: string } | null;
  targets: {
    id: string;
    caseId: string;
    name: string;
    note: string | null;
    createdAt: Date;
    updatedAt: Date;
    properties: {
      id: string;
      targetId: string;
      propertyType: keyof typeof PROPERTY_TYPE_CN;
      propertyDetail: string | null;
      amount: number | null;
      startDate: Date;
      duration: number;
      expiryDate: Date;
      status: PreservationStatus;
      createdAt: Date;
      updatedAt: Date;
      renewals: {
        id: string;
        propertyId: string;
        renewedAt: Date;
        oldExpiryDate: Date;
        newExpiryDate: Date;
        renewalDuration: number;
        note: string | null;
        performedById: string;
        createdAt: Date;
      }[];
    }[];
  }[];
};

type WorkflowStageStatus = "done" | "active" | "risk" | "todo" | "not_applicable";

type WorkflowStage = {
  key: string;
  id: string | null;
  name: string;
  kind: "normal" | "preservation";
  presetKind: StagePresetKind | "custom";
  removable: boolean;
  status: WorkflowStageStatus;
  tasks: WorkflowTask[];
  badge: { text: string; hot: boolean } | null;
};

type MatterInfoWorkflowItem = {
  key: "matter-info";
  id: null;
  name: "Vista general";
  kind: "matter_info";
  status: "active";
  tasks: [];
};

type WorkflowItem = MatterInfoWorkflowItem | WorkflowStage;

type StageGuide = {
  summary: string;
  checklistTitle: string;
  checklist: string[];
  actions: string[];
  deadlineCategories: DeadlineCategory[];
  includeHearings?: boolean;
  materialCategories: DocumentCategory[];
  materialPattern: RegExp;
  defaultCategory: DocumentCategory;
};

const MATTER_INFO_ITEM: MatterInfoWorkflowItem = {
  key: "matter-info",
  id: null,
  name: "Vista general",
  kind: "matter_info",
  status: "active",
  tasks: []
};

const PRESERVATION_ACTIONS = [
  "Solicitud de preservacion de bienes",
  "Lista de pistas de bienes",
  "Carta de garantia / poliza",
  "Solicitud de investigacion en red",
  "Comprobante de pago de preservacion",
  "Solicitud de renovacion de embargo",
  "Solicitud de levantamiento de preservacion",
  "Solicitud de reconsideracion de preservacion"
];

const DEFAULT_STAGE_GUIDE: StageGuide = {
  summary: "Registra las tareas, documentos y resultados de comunicacion de esta etapa como constancia de trabajo del procedimiento actual.",
  checklistTitle: "Items de esta etapa",
  checklist: ["Definir objetivos y entregables de la etapa", "Registrar puntos clave de comunicacion con partes o tribunal", "Recopilar materiales generados en esta etapa"],
  actions: ["Documento de trabajo de la etapa", "Nota complementaria"],
  deadlineCategories: [],
  materialCategories: [],
  materialPattern: /etapa|nota|registro|documento|trabajo/,
  defaultCategory: "PROCEDURE"
};

const STAGE_GUIDES: { keys: string[]; guide: StageGuide }[] = [
  {
    keys: ["Autorizacion", "Poder"],
    guide: {
      summary: "Gestionar contrato de mandato, documentos de autorizacion, tramites del estudio, aviso de riesgos, cobro de honorarios y entrega de materiales.",
      checklistTitle: "Tramites de mandato",
      checklist: [
        "Verificar identidad del cliente y firmante",
        "Firmar contrato de mandato, poder y carta del estudio",
        "Completar aviso de riesgos, carta de contacto y entrega de materiales",
        "Confirmar pago de honorarios, factura y entrega de originales"
      ],
      actions: ["Contrato de mandato", "Poder", "Carta del estudio", "Aviso de riesgos", "Carta de contacto", "Acta de entrega de originales"],
      deadlineCategories: [],
      materialCategories: ["CONTRACT"],
      materialPattern: /poder|mandato|carta|riesgos|contacto|factura|entrega|originales/,
      defaultCategory: "CONTRACT"
    }
  },
  {
    keys: ["Preservacion de bienes"],
    guide: {
      summary: "Organizar materiales de solicitud de preservacion, garantia, pago, resolucion, renovacion y levantamiento.",
      checklistTitle: "Items de preservacion",
      checklist: [
        "Confirmar alcance de preservacion, pistas de bienes y tipo de garantia",
        "Enviar solicitud de preservacion, carta de garantia y pistas de bienes",
        "Seguir pago, resolucion, resultado de embargo y congelamiento",
        "Registrar plazos de preservacion y programar renovacion o levantamiento"
      ],
      actions: PRESERVATION_ACTIONS,
      deadlineCategories: ["PRESERVATION"],
      materialCategories: [],
      materialPattern: /preservacion|bienes|garantia|poliza|embargo|congelamiento|renovacion|levantamiento|resolucion|ejecucion/,
      defaultCategory: "PROCEDURE"
    }
  },
  {
    keys: ["Analisis del caso", "Analisis de materiales", "Plan de litigio", "Revision de segunda instancia"],
    guide: {
      summary: "Analizar materiales base, formar resumen de hechos, brechas probatorias, busqueda juridica y plan de litigio.",
      checklistTitle: "Items de analisis",
      checklist: [
        "Ordenar hechos del caso, relacion juridica y puntos controvertidos",
        "Verificar originales o copias de evidencia, listar faltantes",
        "Completar busqueda de normas, jurisprudencia y criterios judiciales",
        "Confirmar con el cliente hechos clave y plan de litigio"
      ],
      actions: ["Resumen de hechos", "Mapa de relacion juridica", "Lista de brechas probatorias", "Informe de busqueda juridica", "Plan de litigio"],
      deadlineCategories: [],
      materialCategories: [],
      materialPattern: /resumen|relacion|busqueda|plan|brechas|lista|hechos/,
      defaultCategory: "OTHER"
    }
  },
  {
    keys: ["Ejecucion"],
    guide: {
      summary: "Preparar materiales de ejecucion forzosa, confirmar vigencia, plazo de cumplimiento y requisitos del tribunal de ejecucion.",
      checklistTitle: "Items de ejecucion",
      checklist: [
        "Confirmar que la sentencia esta firme y el plazo de cumplimiento vencio",
        "Preparar solicitud de ejecucion, sentencia firme y documentos de identidad",
        "Completar confirmacion de cuenta del solicitante, domicilio y poder",
        "Dentro de la semana siguiente al inicio, contactar al juez"
      ],
      actions: ["Solicitud de ejecucion", "Certificado de firmeza", "Confirmacion de cuenta", "Confirmacion de domicilio", "Lista de materiales de ejecucion"],
      deadlineCategories: ["PERFORMANCE", "ENFORCEMENT"],
      materialCategories: [],
      materialPattern: /ejecucion|forzosa|firmeza|cumplimiento|cuenta|domicilio/,
      defaultCategory: "PLEADING"
    }
  },
  {
    keys: ["Presentacion de demanda", "Arbitraje"],
    guide: {
      summary: "Completar materiales de demanda o arbitraje, identidad, jurisdiccion, indice de evidencia, pago y seguimiento.",
      checklistTitle: "Items de presentacion",
      checklist: [
        "Confirmar objeto de la demanda, tribunal o institucion arbitral competente",
        "Organizar demanda, identidad, poder e indice de evidencia",
        "Verificar identidad del demandado, domicilio, jurisdiccion y preservacion",
        "Seguir revision, mediacion previa y pago de tasas"
      ],
      actions: ["Demanda civil", "Solicitud de arbitraje", "Indice de evidencia", "Confirmacion de domicilio", "Comprobante de pago", "Lista de materiales"],
      deadlineCategories: ["LIMITATION"],
      materialCategories: [],
      materialPattern: /demanda|arbitraje|presentacion|evidencia|domicilio|tasas|jurisdiccion/,
      defaultCategory: "PLEADING"
    }
  },
  {
    keys: ["Excepciones", "Jurisdiccion"],
    guide: {
      summary: "Atender excepciones de jurisdiccion de la contraparte, contestacion, resolucion y apelacion.",
      checklistTitle: "Items de jurisdiccion",
      checklist: [
        "Recibir y analizar fundamentos de la excepcion",
        "Enviar contestacion a la excepcion con evidencia",
        "Seguir resolucion e informar al cliente",
        "Dentro del plazo, apelar o contestar en segunda instancia"
      ],
      actions: ["Contestacion a excepcion", "Solicitud de excepcion", "Apelacion de excepcion", "Registro de resolucion"],
      deadlineCategories: ["APPEAL", "RESPONSE"],
      materialCategories: [],
      materialPattern: /jurisdiccion|excepcion|traslado|resolucion|apelacion/,
      defaultCategory: "PLEADING"
    }
  },
  {
    keys: ["Pruebas y contrapruebas"],
    guide: {
      summary: "Organizar trabajo de plazos probatorios, evidencia complementaria, oficios, peritajes, testigos y contrapruebas.",
      checklistTitle: "Items de prueba",
      checklist: [
        "Registrar notificaciones y calcular plazos probatorios",
        "Revisar todos los materiales, confirmar evidencia complementaria",
        "Evaluar oficios, peritajes y testigos",
        "Al recibir evidencia contraria, verificar autenticidad y preparar objeciones"
      ],
      actions: ["Indice de evidencia", "Lista de evidencia complementaria", "Objeciones", "Solicitud de oficio", "Solicitud de testigos"],
      deadlineCategories: ["EVIDENCE"],
      materialCategories: ["EVIDENCE"],
      materialPattern: /evidencia|prueba|contraprueba|oficio|testigo|objecion/,
      defaultCategory: "EVIDENCE"
    }
  },
  {
    keys: ["Peritaje", "Tasacion"],
    guide: {
      summary: "Decidir si solicitar peritaje, plantear puntos, objeciones, materiales complementarios y expertos.",
      checklistTitle: "Items de peritaje",
      checklist: [
        "Confirmar necesidad del peritaje, puntos y objeto",
        "Preparar solicitud, muestras y comunicacion de costos",
        "Atender institucion pericial, materiales y objeciones al dictamen",
        "Si es necesario, designar experto para audiencia"
      ],
      actions: ["Solicitud de peritaje", "Lista de materiales periciales", "Objecion al dictamen", "Solicitud de experto"],
      deadlineCategories: ["EVIDENCE"],
      materialCategories: [],
      materialPattern: /peritaje|experto|muestra|dictamen/,
      defaultCategory: "PROCEDURE"
    }
  },
  {
    keys: ["Audiencia preliminar"],
    guide: {
      summary: "Atender notificaciones de audiencia preliminar, fijacion de puntos controvertidos, intercambio de evidencia y programacion.",
      checklistTitle: "Items de audiencia preliminar",
      checklist: [
        "Confirmar fecha, lugar, participantes y objeto",
        "Preparar puntos controvertidos, intercambio de evidencia y solicitudes",
        "Registrar alcance y programacion de prueba",
        "Ajustar esquema de audiencia y organizacion de evidencia"
      ],
      actions: ["Esquema de audiencia preliminar", "Lista de puntos controvertidos", "Opinion de intercambio", "Solicitudes procesales", "Acta"],
      deadlineCategories: ["EVIDENCE", "CUSTOM"],
      includeHearings: true,
      materialCategories: [],
      materialPattern: /preliminar|puntos|intercambio|solicitudes|acta/,
      defaultCategory: "PROCEDURE"
    }
  },
  {
    keys: ["Simulacro"],
    guide: {
      summary: "Preparar puntos controvertidos, interrogatorio, estrategia y desempeno del cliente antes de la audiencia.",
      checklistTitle: "Items de simulacro",
      checklist: [
        "Formar lista de puntos controvertidos y carga probatoria",
        "Preparar interrogatorio propio y cruzado",
        "Practicar debate y alegatos finales",
        "Registrar problemas detectados y ajustar esquema"
      ],
      actions: ["Guion de simulacro", "Lista de estrategia", "Interrogatorio", "Acta de reunion con cliente", "Aviso de riesgos"],
      deadlineCategories: [],
      materialCategories: [],
      materialPattern: /simulacro|estrategia|interrogatorio|alegato|riesgo/,
      defaultCategory: "PROCEDURE"
    }
  },
  {
    keys: ["Audiencia", "Vista de causa"],
    guide: {
      summary: "Preparar notificaciones de audiencia, evidencia original, esquema, objeciones, interrogatorio y reunion con cliente.",
      checklistTitle: "Items previos a audiencia",
      checklist: [
        "Confirmar fecha, lugar, tribunal y contacto del secretario",
        "Verificar evidencia original, evidencia contraria y cambios de pretension",
        "Preparar esquema de audiencia, interrogatorio, objeciones y alegatos",
        "Instruir al cliente sobre materiales, procedimiento y precauciones"
      ],
      actions: ["Esquema de audiencia", "Interrogatorio", "Objeciones", "Borrador de alegatos", "Acta de reunion"],
      deadlineCategories: [],
      includeHearings: true,
      materialCategories: [],
      materialPattern: /audiencia|vista|citacion|interrogatorio|esquema|objecion|original|alegato/,
      defaultCategory: "PROCEDURE"
    }
  },
  {
    keys: ["Post-audiencia", "Alegatos", "Complemento"],
    guide: {
      summary: "Revisar y enviar alegatos, materiales complementarios, informar al cliente y seguir el resultado.",
      checklistTitle: "Items post-audiencia",
      checklist: [
        "Informar al cliente sobre la audiencia",
        "Enviar alegatos, objeciones, busqueda juridica o complemento",
        "Verificar hechos, complementar materiales o entregar originales",
        "Contactar al juez o secretario para seguimiento"
      ],
      actions: ["Informe de audiencia", "Alegatos", "Complemento", "Objeciones escritas", "Informe juridico"],
      deadlineCategories: ["EVIDENCE", "CUSTOM"],
      materialCategories: [],
      materialPattern: /alegato|post|complemento|informe|objecion|acta/,
      defaultCategory: "PLEADING"
    }
  },
  {
    keys: ["Sentencia", "Recepcion de sentencia", "Segunda instancia", "Laudo", "Cierre"],
    guide: {
      summary: "Recibir sentencia o laudo, calcular plazos de apelacion, atender firmeza, reembolso, cumplimiento y proximos pasos.",
      checklistTitle: "Items de sentencia",
      checklist: [
        "Registrar recepcion y calcular plazo de apelacion o nulidad",
        "Informar al cliente y confirmar apelacion, nulidad o cumplimiento",
        "Atender correccion, firmeza, reembolso de tasas y levantamiento de preservacion",
        "Seguir cumplimiento e indicar necesidad de nueva ejecucion"
      ],
      actions: ["Informe de sentencia", "Aviso de plazo de apelacion", "Informe de cierre", "Solicitud de firmeza", "Lista de cumplimiento"],
      deadlineCategories: ["APPEAL", "PERFORMANCE", "ARBITRATION_SET_ASIDE", "ENFORCEMENT"],
      materialCategories: ["JUDGMENT"],
      materialPattern: /sentencia|resolucion|laudo|apelacion|firmeza|cumplimiento|reembolso|cierre|proximo/,
      defaultCategory: "JUDGMENT"
    }
  },
  {
    keys: ["Archivo del caso"],
    guide: {
      summary: "Completar informe de cierre, verificacion de integridad, devolucion de originales, liquidacion y solicitud de archivo.",
      checklistTitle: "Items de archivo",
      checklist: [
        "Confirmar resultado final de sentencia, laudo, acuerdo o ejecucion",
        "Verificar integridad de mandato, materiales procesales, evidencia y comunicaciones",
        "Completar informe de cierre, entrega al cliente, devolucion de originales y liquidacion",
        "Enviar solicitud de archivo y atender observaciones"
      ],
      actions: ["Informe de cierre", "Lista de archivo", "Acta de devolucion", "Carta de cierre al cliente", "Solicitud de archivo"],
      deadlineCategories: [],
      materialCategories: ["PROCEDURE", "JUDGMENT"],
      materialPattern: /archivo|cierre|devolucion|lista|liquidacion/,
      defaultCategory: "PROCEDURE"
    }
  },
  {
    keys: ["Apelacion", "Contestacion de apelacion"],
    guide: {
      summary: "Organizar materiales de apelacion, contestacion, evidencia complementaria, tasas y audiencia de segunda instancia.",
      checklistTitle: "Items de segunda instancia",
      checklist: [
        "Firmar mandato de segunda instancia y confirmar plazo de apelacion",
        "Presentar apelacion o contestacion con evidencia",
        "Programar y verificar pago de tasas de apelacion",
        "Ordenar puntos controvertidos de primera instancia y plan de segunda"
      ],
      actions: ["Apelacion", "Contestacion de segunda instancia", "Indice de evidencia", "Comprobante de pago", "Plan de segunda instancia"],
      deadlineCategories: ["APPEAL", "RESPONSE", "EVIDENCE"],
      materialCategories: [],
      materialPattern: /apelacion|segunda|contestacion|sentencia|tasas|plan/,
      defaultCategory: "PLEADING"
    }
  },
  {
    keys: ["Investigacion de bienes"],
    guide: {
      summary: "Ordenar y enviar pistas de bienes del ejecutado, seguir investigacion patrimonial, plan de disposicion y renovacion.",
      checklistTitle: "Items de investigacion",
      checklist: [
        "Ordenar pistas de inmuebles, vehiculos, cuentas, acciones, etc.",
        "Enviar pistas al juez de ejecucion",
        "Seguir embargo, congelamiento, incautacion y remate",
        "Verificar renovacion de preservaciones existentes"
      ],
      actions: ["Lista de pistas", "Solicitud de investigacion", "Solicitud de ampliacion", "Solicitud de renovacion"],
      deadlineCategories: ["ENFORCEMENT", "PRESERVATION"],
      materialCategories: [],
      materialPattern: /investigacion|pistas|embargo|congelamiento|remate|ampliacion|renovacion/,
      defaultCategory: "PROCEDURE"
    }
  },
  {
    keys: ["Objeciones", "Reconsideracion"],
    guide: {
      summary: "Atender objeciones de ejecucion, reconsideracion, no ejecucion u objeciones de terceros.",
      checklistTitle: "Items de objeciones",
      checklist: [
        "Confirmar sujeto, objeto y plazo legal",
        "Preparar solicitud de objecion o reconsideracion con evidencia",
        "Seguir audiencia, resolucion y accion de objecion",
        "Informar al cliente sobre riesgos y estrategia"
      ],
      actions: ["Solicitud de objecion", "Reconsideracion", "No ejecucion", "Esquema de audiencia"],
      deadlineCategories: ["ENFORCEMENT", "CUSTOM"],
      materialCategories: [],
      materialPattern: /objecion|reconsideracion|no ejecucion|tercero|audiencia/,
      defaultCategory: "PLEADING"
    }
  },
  {
    keys: ["Acuerdo de ejecucion"],
    guide: {
      summary: "Impulsar acuerdo de ejecucion, confirmacion del cliente, firma, supervision y plan de reanudacion.",
      checklistTitle: "Items de acuerdo",
      checklist: [
        "Verificar capacidad de cumplimiento y condiciones",
        "Formar propuesta de acuerdo y obtener confirmacion escrita",
        "Firmar acuerdo y registrarlo en el tribunal",
        "Seguir cumplimiento, incumplimiento y reanudacion"
      ],
      actions: ["Propuesta de acuerdo", "Carta de confirmacion", "Acuerdo de ejecucion", "Solicitud de reanudacion"],
      deadlineCategories: ["PERFORMANCE", "ENFORCEMENT"],
      materialCategories: [],
      materialPattern: /acuerdo|mediacion|plan|cumplimiento|reanudacion|confirmacion/,
      defaultCategory: "PROCEDURE"
    }
  },
  {
    keys: ["Entrevista", "Excarcelacion", "Revision de expediente", "Defensa"],
    guide: {
      summary: "Organizar trabajo de entrevista, excarcelacion, revision de expediente, verificacion y defensa en sede penal.",
      checklistTitle: "Items penales",
      checklist: [
        "Verificar mandato, autorizacion de entrevista y requisitos del tribunal",
        "Registrar entrevista, revision de expediente y pistas complementarias",
        "Evaluar excarcelacion, necesidad de prision preventiva y riesgos",
        "Formar defensa escrita o dictamen juridico"
      ],
      actions: ["Acta de entrevista", "Solicitud de excarcelacion", "Acta de revision", "Defensa", "Dictamen juridico"],
      deadlineCategories: ["CUSTOM"],
      materialCategories: [],
      materialPattern: /entrevista|excarcelacion|revision|defensa|prision|dictamen/,
      defaultCategory: "PROCEDURE"
    }
  }
];

const DOCUMENT_CATEGORY_OPTIONS: DocumentCategory[] = [
  "CONTRACT",
  "PLEADING",
  "EVIDENCE",
  "PROCEDURE",
  "JUDGMENT",
  "OTHER"
];
const SOURCE_MATERIAL_CATEGORIES: DocumentCategory[] = ["PLEADING", "EVIDENCE"];
const COURT_PROCEDURE_SOURCE = "Documentos del tribunal";

export function ProcedureWorkflowPanel({
  matter,
  procedure,
  documents,
  preservationCases,
  folders,
  templates,
  users,
  canManage,
  matterInfoNode
}: {
  matter: WorkflowMatter;
  procedure: WorkflowProcedure | null;
  documents: WorkflowDocument[];
  preservationCases: WorkflowPreservationCase[];
  folders: FolderPayload[];
  templates: TemplateSummary[];
  users: UserOption[];
  canManage: boolean;
  matterInfoNode?: React.ReactNode;
}) {
  const router = useRouter();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [taskStage, setTaskStage] = useState<WorkflowStage | null>(null);
  const [stageCreateOpen, setStageCreateOpen] = useState(false);
  const [, startStageRemovalTransition] = useTransition();

  const stages = useMemo(
    () => buildWorkflowStages(procedure, preservationCases),
    [procedure, preservationCases]
  );
  const workflowItems: WorkflowItem[] = matterInfoNode ? [MATTER_INFO_ITEM, ...stages] : stages;
  const defaultKey = workflowItems[0]?.key ?? null;
  const selectedItem =
    workflowItems.find((item) => item.key === selectedKey) ??
    workflowItems.find((item) => item.key === defaultKey) ??
    null;
  const doneCount = stages.filter((s) => s.status === "done").length;

  function handleRemoveStage(stage: WorkflowStage) {
    const stageId = stage.id;
    if (!stageId) {
      toast.info("Esta etapa aun no fue guardada");
      return;
    }
    if (!stage.removable) {
      toast.warning("Las etapas obligatorias no se pueden eliminar");
      return;
    }
    if (!confirm(`Eliminar del procedimiento actual "${stage.name}"? Las etapas con tareas o materiales seran ocultadas (los datos se conservan).`)) return;
    startStageRemovalTransition(async () => {
      try {
        const res = await removeProcedureStage({ id: stageId });
        toast.success(res.hidden ? "Etapa oculta, datos conservados" : "Etapa eliminada");
        setSelectedKey(null);
        router.refresh();
      } catch (err) {
        toast.error("Error al eliminar", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  if (!procedure) {
    return (
      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-low)]">
        <header className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" strokeWidth={1.8} />
            <h2 className="text-[14px] font-medium">Panel de trabajo del caso</h2>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Agregar un procedimiento para generar las etapas de trabajo.
          </p>
        </header>
        <div className="space-y-3 p-4">
          {matterInfoNode}
          <div className="rounded-md border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            Sin procedimientos en tramite. Agregar un procedimiento para generar el panel de trabajo.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-low)]">
      <div className="grid grid-cols-1 md:grid-cols-[168px_minmax(0,1fr)]">
        <nav className="border-b border-border bg-muted/35 p-1.5 md:border-b-0 md:border-r">
          <div className="mb-1.5 flex items-center justify-between gap-2 px-1 text-[10.5px] text-muted-foreground">
            <span>Progreso de etapas</span>
            <span className="font-mono tabular">
              {doneCount}/{stages.length}
            </span>
          </div>
          <div className="space-y-1">
            {workflowItems.map((stage) => (
              <button
                key={stage.key}
                type="button"
                onClick={() => setSelectedKey(stage.key)}
                className={cn(
                  "flex w-full items-center gap-1.5 rounded-md px-2 py-2 text-left text-[12.5px] transition-colors",
                  selectedItem?.key === stage.key
                    ? "bg-background text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
                    : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
                )}
              >
                {stage.kind === "matter_info" ? (
                  <FileText className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.8} />
                ) : (
                  <StageStatusIcon status={stage.status} />
                )}
                <span className="min-w-0 flex-1 truncate">{stage.name}</span>
                {stage.kind === "preservation" && (
                  <Shield className="h-3 w-3 shrink-0 text-primary" />
                )}
                {stage.kind !== "matter_info" && stage.badge && (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-1.5 font-mono text-[10px] leading-[16px] tabular",
                      stage.badge.hot
                        ? "bg-amber-500/15 font-semibold text-amber-700"
                        : "bg-primary/10 text-muted-foreground"
                    )}
                  >
                    {stage.badge.text}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="mt-1.5 border-t border-border/70 pt-1.5">
            <button
              type="button"
              onClick={() => setStageCreateOpen(true)}
              className="flex w-full items-center gap-1.5 rounded-md px-2 py-2 text-left text-[12.5px] text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground"
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                <Plus className="h-2.5 w-2.5" />
              </span>
              <span className="min-w-0 flex-1 truncate">Agregar etapa</span>
            </button>
          </div>
        </nav>

        <div className="min-w-0 p-4">
          {selectedItem?.kind === "matter_info" ? (
            matterInfoNode
          ) : selectedItem?.kind === "preservation" ? (
            <PreservationWorkflowContent
              matter={matter}
              procedure={procedure}
              stage={selectedItem}
              cases={preservationCases}
              documents={documents}
              users={users}
              canManage={canManage}
              onOpenTemplate={() => setTemplateOpen(true)}
              onAddTask={() => setTaskStage(selectedItem)}
              onRemoveStage={
                canManage && selectedItem.removable ? () => handleRemoveStage(selectedItem) : undefined
              }
            />
          ) : selectedItem ? (
            <NormalStageContent
              matterId={matter.id}
              stage={selectedItem}
              procedure={procedure}
              documents={documents}
              onOpenTemplate={() => setTemplateOpen(true)}
              onAddTask={() => setTaskStage(selectedItem)}
              onRemoveStage={
                canManage && selectedItem.removable ? () => handleRemoveStage(selectedItem) : undefined
              }
              canManage={canManage}
            />
          ) : (
            <p className="py-8 text-center text-xs text-muted-foreground">Sin etapas de trabajo</p>
          )}
        </div>
      </div>

      <TemplatePickerDialog
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        matterId={matter.id}
        matterCategory={matter.category}
        folders={folders}
        templates={templates}
      />
      {taskStage && (
        <TaskQuickDialog
          open={!!taskStage}
          onOpenChange={(open) => !open && setTaskStage(null)}
          matterId={matter.id}
          procedureId={procedure.id}
          stage={taskStage}
          onStageReady={(stageId) => setSelectedKey(`stage-${stageId}`)}
        />
      )}
      <StageCreateDialog
        open={stageCreateOpen}
        onOpenChange={setStageCreateOpen}
        procedureId={procedure.id}
        procedureType={procedure.type}
        stages={stages}
        selectedItem={selectedItem}
        onCreated={(stageId) => setSelectedKey(`stage-${stageId}`)}
      />
    </section>
  );
}

function NormalStageContent({
  matterId,
  stage,
  procedure,
  documents,
  onOpenTemplate,
  onAddTask,
  onRemoveStage,
  canManage
}: {
  matterId: string;
  stage: WorkflowStage;
  procedure: WorkflowProcedure;
  documents: WorkflowDocument[];
  onOpenTemplate: () => void;
  onAddTask: () => void;
  onRemoveStage?: () => void;
  canManage: boolean;
}) {
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  const guide = stageGuideFor(stage.name);
  const relevantDeadlines = guide.deadlineCategories.length > 0
    ? procedure.deadlines
        .filter((d) => guide.deadlineCategories.includes(d.category))
        .slice(0, 4)
    : [];
  const relevantDocs = documents.filter((d) => documentMatchesStage(d, stage));
  const stageHearings = guide.includeHearings ? procedure.hearings.slice(0, 3) : [];
  const recordCount = stage.tasks.length + relevantDeadlines.length + stageHearings.length;
  const nearestDue = relevantDeadlines
    .filter((d) => !d.completed)
    .map((d) => daysUntil(d.dueAt))
    .sort((a, b) => a - b)[0];

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <StageStatusIcon status={stage.status} large />
          <h3 className="text-[15px] font-medium">{stage.name}</h3>
          {nearestDue !== undefined && nearestDue <= 30 ? (
            <Badge
              variant="outline"
              className={cn(
                "font-mono tabular",
                nearestDue <= 7
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-700"
              )}
            >
              {nearestDue < 0 ? `Vencido ${-nearestDue} dias` : nearestDue === 0 ? "Vence hoy" : `Restan ${nearestDue} dias`}
            </Badge>
          ) : (
            <StageStatusBadge status={stage.status} />
          )}
        </div>
        {onRemoveStage && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemoveStage}
            className="h-7 px-2 text-[11px] text-muted-foreground"
          >
            Eliminar
          </Button>
        )}
      </div>

      <section className="rounded-md border border-border bg-background/60 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionTitle icon={<CalendarClock className="h-3.5 w-3.5" />}>
            Registros de esta etapa
            {recordCount > 0 && (
              <span className="ml-1 font-mono text-[10.5px] text-muted-foreground tabular">
                {recordCount}
              </span>
            )}
          </SectionTitle>
          {canManage && recordCount > 0 && (
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="outline" onClick={onAddTask} className="h-7 gap-1 px-2 text-[11px]">
                <Plus className="h-3 w-3" />
                Tarea
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDeadlineOpen(true)}
                className="h-7 gap-1 px-2 text-[11px]"
              >
                <Scale className="h-3 w-3" />
                Plazo legal
              </Button>
            </div>
          )}
        </div>
        {recordCount === 0 ? (
          <div className="flex flex-col items-center gap-2.5 py-5">
            <p className="text-xs text-muted-foreground">Sin tareas ni registros de tiempo en esta etapa</p>
            {canManage && (
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={onAddTask} className="h-7 gap-1 px-2.5 text-[11px]">
                  <Plus className="h-3 w-3" />
                  Agregar tarea
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeadlineOpen(true)}
                  className="h-7 gap-1 px-2.5 text-[11px]"
                >
                  <Scale className="h-3 w-3" />
                  Generar por plazo legal
                </Button>
              </div>
            )}
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {relevantDeadlines.map((deadline) => (
              <DeadlineMiniRow key={deadline.id} deadline={deadline} />
            ))}
            {stage.tasks.map((task) => (
              <li key={task.id} className="flex items-start gap-2 py-2 text-xs">
                <span
                  className={cn(
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    task.completed
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input"
                  )}
                >
                  {task.completed && <Check className="h-2.5 w-2.5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className={cn("truncate font-medium", task.completed && "text-muted-foreground line-through")}>
                    {task.title}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-2 text-[10.5px] text-muted-foreground">
                    {task.dueAt && <span>{formatDate(task.dueAt)}</span>}
                    {task.priority > 0 && <span>{task.priority === 2 ? "Urgente" : "Alta prioridad"}</span>}
                  </div>
                </div>
              </li>
            ))}
            {stageHearings.map((hearing) => (
              <li key={hearing.id} className="flex items-center gap-2 py-2 text-xs">
                <Gavel className="h-3.5 w-3.5 text-primary" />
                <span className="min-w-0 flex-1 truncate">{hearing.title}</span>
                <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground">
                  {formatDate(hearing.startsAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <StageMaterialsPanel
        matterId={matterId}
        procedure={procedure}
        stage={stage}
        documents={relevantDocs}
        canManage={canManage}
        onOpenTemplate={onOpenTemplate}
      />

      <StageGuideDisclosure guide={guide} />

      {deadlineOpen && (
        <AddDeadlineDialog
          open={deadlineOpen}
          onOpenChange={setDeadlineOpen}
          procedures={[
            {
              id: procedure.id,
              label: procedure.customLabel ?? procedureTypeLabel[procedure.type]
            }
          ]}
          defaultProcedureId={procedure.id}
        />
      )}
    </div>
  );
}

function StageGuideDisclosure({ guide }: { guide: StageGuide }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-md border border-dashed border-border/80 px-3 py-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 text-left text-[11.5px] text-muted-foreground transition-colors hover:text-foreground"
      >
        {open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
        <span className="font-medium text-foreground/75">Guia de trabajo</span>
        {!open && <span className="min-w-0 flex-1 truncate">{guide.summary}</span>}
      </button>
      {open && (
        <div className="mt-2 space-y-2 pl-4">
          <ul className="space-y-1.5">
            {guide.checklist.map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs leading-5">
                <Circle className="mt-[6px] h-2 w-2 shrink-0 fill-primary/70 text-primary/70" />
                <span className="text-foreground/85">{item}</span>
              </li>
            ))}
          </ul>
          {guide.actions.length > 0 && (
            <p className="text-[11px] leading-5 text-muted-foreground">
              Documentos frecuentes: {guide.actions.join("、")} (disponibles en el dialogo de plantillas)
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function PreservationWorkflowContent({
  matter,
  procedure,
  stage,
  cases,
  documents,
  users,
  canManage,
  onOpenTemplate,
  onAddTask,
  onRemoveStage
}: {
  matter: WorkflowMatter;
  procedure: WorkflowProcedure;
  stage: WorkflowStage;
  cases: WorkflowPreservationCase[];
  documents: WorkflowDocument[];
  users: UserOption[];
  canManage: boolean;
  onOpenTemplate: () => void;
  onAddTask: () => void;
  onRemoveStage?: () => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [addTargetCaseId, setAddTargetCaseId] = useState<string | null>(null);
  const [addPropertyTargetId, setAddPropertyTargetId] = useState<string | null>(null);
  const [renewPropertyId, setRenewPropertyId] = useState<string | null>(null);

  const matterOption: MatterOption = {
    id: matter.id,
    internalCode: matter.internalCode,
    title: matter.title
  };
  const properties = cases.flatMap((c) => c.targets.flatMap((t) => t.properties));
  const activeProperties = properties.filter((p) => p.status === "ACTIVE" || p.status === "RENEWED");
  const expiringCount = activeProperties.filter((p) => daysUntil(p.expiryDate) <= 30).length;
  const renewableProperty = properties.find((p) => p.id === renewPropertyId) ?? null;
  const relevantDocs = documents.filter((d) => documentMatchesStage(d, stage));

  function handleLift(propertyId: string) {
    startTransition(async () => {
      try {
        await liftProperty(propertyId);
        toast.success("Preservacion levantada");
        router.refresh();
      } catch (err) {
        toast.error("Operacion fallida", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h3 className="text-[15px] font-medium">Preservacion de bienes</h3>
            {expiringCount > 0 ? (
              <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700">
                Vence en 30 dias: {expiringCount} items
              </Badge>
            ) : (
              <Badge variant="outline">Paquete de trabajo especial</Badge>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Solicitudes, garantias, resoluciones, renovaciones y levantamientos unificados en el procedimiento actual.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onRemoveStage && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRemoveStage}
              className="h-7 px-2 text-[11px] text-muted-foreground"
            >
              Eliminar
            </Button>
          )}
          {canManage && (
            <>
              <Button variant="outline" size="sm" onClick={onAddTask} className="h-7 gap-1 px-2 text-[11px]">
                <Plus className="h-3 w-3" />
                Tarea
              </Button>
              <Button size="sm" onClick={() => setCreateOpen(true)} className="h-7 gap-1 px-2 text-[11px]">
                <Plus className="h-3 w-3" />
                Nueva preservacion
              </Button>
            </>
          )}
        </div>
      </div>

      {cases.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-background/60 px-4 py-8 text-center">
          <Shield className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Sin registros de preservacion en este procedimiento</p>
          {canManage && (
            <Button size="sm" onClick={() => setCreateOpen(true)} className="mt-3 h-8 gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Nueva preservacion
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((item) => (
            <div key={item.id} className="rounded-md border border-border bg-background/60">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-3 py-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-medium">{PRES_TYPE_CN[item.type]}</span>
                    {item.court && <span className="text-[11px] text-muted-foreground">{item.court}</span>}
                    {item.rulingNumber && (
                      <span className="font-mono text-[10.5px] text-muted-foreground">{item.rulingNumber}</span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[10.5px] text-muted-foreground">
                    {item.guaranteeType ? GUARANTEE_TYPE_CN[item.guaranteeType] : "Sin tipo de garantia"}
                    {item.owner?.name ? ` · ${item.owner.name}` : ""}
                  </div>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAddTargetCaseId(item.id)}
                    className="h-7 gap-1 px-2 text-[11px]"
                  >
                    <Plus className="h-3 w-3" />
                    Persona preservada
                  </Button>
                )}
              </div>

              <div className="space-y-3 p-3">
                {item.targets.length === 0 ? (
                  <p className="py-3 text-center text-xs text-muted-foreground">Sin personas preservadas</p>
                ) : (
                  item.targets.map((target) => (
                    <div key={target.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Landmark className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium">{target.name}</span>
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => setAddPropertyTargetId(target.id)}
                            className="ml-auto text-[11px] text-primary hover:underline"
                          >
                            + Agregar bien
                          </button>
                        )}
                      </div>
                      {target.properties.length === 0 ? (
                        <p className="pl-6 text-[11px] text-muted-foreground">Sin bienes</p>
                      ) : (
                        <div className="space-y-1.5 pl-6">
                          {target.properties.map((property) => (
                            <PreservationPropertyRow
                              key={property.id}
                              property={property}
                              onRenew={() => setRenewPropertyId(property.id)}
                              onLift={() => handleLift(property.id)}
                              canManage={canManage}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <StageMaterialsPanel
        matterId={matter.id}
        procedure={procedure}
        stage={stage}
        documents={relevantDocs}
        canManage={canManage}
        onOpenTemplate={onOpenTemplate}
      />

      <StageGuideDisclosure guide={stageGuideFor("Preservacion de bienes")} />

      <PreservationCaseDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        matters={[matterOption]}
        users={users}
        initialMatterId={matter.id}
      />
      {addTargetCaseId && (
        <AddTargetDialog
          open={!!addTargetCaseId}
          onOpenChange={(open) => !open && setAddTargetCaseId(null)}
          caseId={addTargetCaseId}
        />
      )}
      {addPropertyTargetId && (
        <AddPropertyDialog
          open={!!addPropertyTargetId}
          onOpenChange={(open) => !open && setAddPropertyTargetId(null)}
          targetId={addPropertyTargetId}
        />
      )}
      {renewableProperty && (
        <RenewPropertyDialog
          open={!!renewPropertyId}
          onOpenChange={(open) => !open && setRenewPropertyId(null)}
          property={renewableProperty}
        />
      )}
    </div>
  );
}

function PreservationPropertyRow({
  property,
  onRenew,
  onLift,
  canManage
}: {
  property: WorkflowPreservationCase["targets"][number]["properties"][number];
  onRenew: () => void;
  onLift: () => void;
  canManage: boolean;
}) {
  const days = daysUntil(property.expiryDate);
  const expiry = classifyExpiry(days);
  const statusColor = PRES_STATUS_COLOR[property.status] ?? PRES_STATUS_COLOR.ACTIVE;
  const isActive = property.status === "ACTIVE" || property.status === "RENEWED";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded border border-border bg-card px-2.5 py-2 text-[11px]">
      <span className="font-medium">{PROPERTY_TYPE_CN[property.propertyType]}</span>
      {property.amount && (
        <span className="font-mono text-muted-foreground tabular">
          {formatCurrency(Number(property.amount), { compact: true })}
        </span>
      )}
      {property.propertyDetail && (
        <span className="min-w-0 flex-1 truncate text-muted-foreground">{property.propertyDetail}</span>
      )}
      <span
        className={cn(
          "ml-auto shrink-0 font-medium",
          expiry.tone === "danger" && "text-destructive",
          expiry.tone === "warn" && "text-amber-600",
          expiry.tone === "ok" && "text-emerald-700"
        )}
      >
        {expiry.label}
      </span>
      <span
        className="shrink-0 rounded border px-1.5 py-0 text-[9px]"
        style={{
          borderColor: statusColor.border,
          color: statusColor.text,
          backgroundColor: statusColor.bg
        }}
      >
        {PRES_STATUS_CN[property.status]}
      </span>
      {canManage && isActive && (
        <>
          <button type="button" onClick={onRenew} className="shrink-0 text-primary hover:underline">
            Renovar
          </button>
          <button type="button" onClick={onLift} className="shrink-0 text-muted-foreground hover:text-foreground">
            Levantar
          </button>
        </>
      )}
    </div>
  );
}

function StageMaterialsPanel({
  matterId,
  procedure,
  stage,
  documents,
  canManage,
  onOpenTemplate
}: {
  matterId: string;
  procedure: WorkflowProcedure;
  stage: WorkflowStage;
  documents: WorkflowDocument[];
  canManage: boolean;
  onOpenTemplate?: () => void;
}) {
  const router = useRouter();
  const stageName = stage.name;
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<File | null>(null);
  const [customName, setCustomName] = useState("");
  const [sourceParty, setSourceParty] = useState("");
  const [category, setCategory] = useState<DocumentCategory>(defaultCategoryForStage(stageName));
  const [isPending, startTransition] = useTransition();
  const stageTag = stageMaterialTag(stageName);
  const sourceOptions = useMemo(() => buildSourceOptions(procedure), [procedure]);

  function openUploadDialog() {
    setCategory(defaultCategoryForStage(stageName));
    setSourceParty("");
    setPicked(null);
    setCustomName("");
    if (fileRef.current) fileRef.current.value = "";
    setOpen(true);
  }

  function submitUpload() {
    if (!picked) {
      toast.warning("Seleccione un archivo primero");
      return;
    }
    startTransition(async () => {
      try {
        let stageId = stage.id;
        if (!stageId) {
          const ensured = await ensureProcedureStage({
            procedureId: procedure.id,
            name: stageName,
            description: "",
            insertPosition: "END"
          });
          stageId = ensured.id;
        }
        const fd = new FormData();
        fd.set("matterId", matterId);
        fd.set("procedureId", procedure.id);
        fd.set("stageId", stageId);
        fd.set("file", picked);
        fd.set("category", category);
        fd.set("name", customName.trim() || picked.name);
        fd.set("tags", stageTag);
        if (SOURCE_MATERIAL_CATEGORIES.includes(category) && sourceParty) {
          fd.set("sourceParty", sourceParty);
        }
        await uploadDocument(fd);
        toast.success("Material de etapa subido");
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error("Error al subir", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <section className="rounded-md border border-border bg-background/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionTitle icon={<FileText className="h-3.5 w-3.5" />}>
          Materiales de la etapa
          <span className="ml-1 font-mono text-[10.5px] text-muted-foreground tabular">
            {documents.length}
          </span>
        </SectionTitle>
        {canManage && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={openUploadDialog}
              className="h-7 gap-1 px-2 text-[11px]"
            >
              <Upload className="h-3 w-3" />
              Subir
            </Button>
            {onOpenTemplate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenTemplate}
                className="h-7 gap-1 px-2 text-[11px] text-primary hover:text-primary"
              >
                <Sparkles className="h-3 w-3" />
                Generar desde plantilla
              </Button>
            )}
          </div>
        )}
      </div>
      <p className="mt-1 text-[10.5px] text-muted-foreground">
        Al subir, el material se agrega al procedimiento y se etiqueta como {stageTag}.
      </p>

      {documents.length === 0 ? (
        <div className="mt-3 rounded-md border border-dashed border-border bg-card/60 px-3 py-5 text-center">
          <p className="text-xs text-muted-foreground">Sin materiales en esta etapa</p>
          {canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={openUploadDialog}
              className="mt-3 h-7 gap-1 px-2 text-[11px]"
            >
              <Upload className="h-3 w-3" />
              Subir material
            </Button>
          )}
        </div>
      ) : (
        <ul className="mt-3 grid grid-cols-1 gap-1.5 xl:grid-cols-2">
          {documents.map((doc) => {
            const icon = iconForDocument(doc);
            const pUrl = documentPreviewUrl(doc);
            return (
              <li key={doc.id} className="group flex min-w-0 items-center gap-2 rounded border border-border bg-card px-2.5 py-2">
                <Image src={icon.src} alt={icon.alt} width={20} height={20} className="h-5 w-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  {pUrl ? (
                    <a
                      href={pUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-xs hover:text-primary hover:underline"
                    >
                      {doc.name}
                    </a>
                  ) : (
                    <span className="block truncate text-xs">{doc.name}</span>
                  )}
                  <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                    {documentCategoryLabel[doc.category]} · {formatDate(doc.createdAt)}
                    {doc.sourceParty ? ` · ${doc.sourceParty}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {pUrl && (
                    <a
                      href={pUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-muted-foreground hover:text-primary"
                      title="Vista previa"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <a
                    href={`/api/documents/${doc.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-muted-foreground hover:text-primary"
                    title="Descargar"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Subir material de etapa · {stageName}</DialogTitle>
            <DialogDescription className="text-xs">
              El archivo se asociara al procedimiento actual y se etiquetara como {stageTag}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Categoria de material *</Label>
              <Select value={category} onValueChange={(value) => setCategory(value as DocumentCategory)}>
                <SelectTrigger className="h-10 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORY_OPTIONS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {documentCategoryLabel[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {SOURCE_MATERIAL_CATEGORIES.includes(category) && sourceOptions.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Origen / fuente (opcional)</Label>
                <Select
                  value={sourceParty || "__none__"}
                  onValueChange={(value) => setSourceParty(value === "__none__" ? "" : value)}
                >
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue placeholder="Seleccionar origen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin etiqueta</SelectItem>
                    {sourceOptions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Archivo *</Label>
              <Input
                ref={fileRef}
                type="file"
                onChange={(event) => setPicked(event.target.files?.[0] ?? null)}
              />
              {picked && (
                <p className="text-[10px] text-muted-foreground">
                  Seleccionado: {picked.name} ({(picked.size / 1024).toFixed(0)} KB)
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Nombre visible (opcional)</Label>
              <Input
                value={customName}
                onChange={(event) => setCustomName(event.target.value)}
                placeholder={`${stageName} material`}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={submitUpload} disabled={isPending || !picked} className="gap-1.5">
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Subir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function TaskQuickDialog({
  open,
  onOpenChange,
  matterId,
  procedureId,
  stage,
  onStageReady
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matterId: string;
  procedureId: string;
  stage: WorkflowStage;
  onStageReady: (stageId: string) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [description, setDescription] = useState("");

  function submit() {
    if (!title.trim()) {
      toast.warning("Complete el titulo de la tarea");
      return;
    }
    startTransition(async () => {
      try {
        let stageId = stage.id;
        if (!stageId) {
          const ensured = await ensureProcedureStage({
            procedureId,
            name: stage.name,
            description: "",
            insertPosition: "END"
          });
          stageId = ensured.id;
          onStageReady(stageId);
        }
        await createTask({
          matterId,
          title: title.trim(),
          description,
          dueAt: dueAt ? new Date(dueAt) : undefined,
          priority: 0,
          assigneeId: "",
          stageId
        });
        toast.success("Tarea agregada");
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        toast.error("Error al agregar", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar tarea · {stage.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Titulo de la tarea *</Label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ej.: preparar pistas de bienes / enviar solicitud de renovacion"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Fecha limite</Label>
            <Input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Descripcion</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={isPending} className="gap-1.5">
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StageCreateDialog({
  open,
  onOpenChange,
  procedureId,
  procedureType,
  stages,
  selectedItem,
  onCreated
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  procedureId: string;
  procedureType: ProcedureType;
  stages: WorkflowStage[];
  selectedItem: WorkflowItem | null;
  onCreated: (stageId: string) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [presetName, setPresetName] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState("");
  const [description, setDescription] = useState("");
  const [insertTarget, setInsertTarget] = useState("END");
  const existingNameSet = useMemo(
    () => new Set(stages.map((item) => normalizeProcedureStageName(item.name))),
    [stages]
  );
  const availablePresets = useMemo(
    () =>
      procedureStagePresetsForProcedure(procedureType).filter(
        (preset) => !existingNameSet.has(normalizeProcedureStageName(preset.name))
      ),
    [existingNameSet, procedureType]
  );
  const selectedPreset = availablePresets.find((preset) => preset.name === presetName) ?? null;
  const stageName = customMode ? customName.trim() : selectedPreset?.name ?? "";
  const duplicate = stageName ? existingNameSet.has(normalizeProcedureStageName(stageName)) : false;

  useEffect(() => {
    if (open) {
      const firstPreset = availablePresets[0];
      setPresetName(firstPreset?.name ?? "");
      setCustomMode(!firstPreset);
      setCustomName("");
      setDescription("");
      setInsertTarget(defaultInsertTarget(selectedItem));
    }
  }, [availablePresets, open, selectedItem]);

  function submit() {
    if (!stageName) {
      toast.warning("Complete el nombre de la etapa");
      return;
    }
    if (duplicate) {
      toast.warning("Esta etapa ya existe");
      return;
    }
    startTransition(async () => {
      try {
        const insert = parseInsertTarget(insertTarget, stages);
        const created = await createProcedureStage({
          procedureId,
          name: stageName,
          description: customMode ? description : description || selectedPreset?.description || "",
          insertPosition: insert.position,
          insertAfterStageId: insert.afterStageId,
          insertAfterStageName: insert.afterStageName
        });
        toast.success("Etapa agregada");
        onCreated(created.id);
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        toast.error("Error al agregar", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar etapa</DialogTitle>
          <DialogDescription className="text-xs">
            Priorice las etapas predefinidas; use personalizada solo si no hay cobertura.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!customMode ? (
            <div className="space-y-1.5">
              <Label className="text-xs">Etapa predefinida *</Label>
              {availablePresets.length > 0 ? (
                <Select value={presetName} onValueChange={setPresetName}>
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue placeholder="Seleccionar etapa predefinida" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePresets.map((preset) => (
                      <SelectItem key={preset.name} value={preset.name}>
                        {preset.name} · {preset.kind === "required" ? "Obligatoria" : "Opcional"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
                  Todas las etapas predefinidas ya fueron agregadas.
                </p>
              )}
              {selectedPreset && (
                <p className="text-[10.5px] leading-5 text-muted-foreground">{selectedPreset.description}</p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre de etapa personalizada *</Label>
              <Input
                value={customName}
                onChange={(event) => setCustomName(event.target.value)}
                placeholder="Ej.: segunda audiencia / peritaje / negociacion"
              />
              {duplicate && <p className="text-[10px] text-amber-600">Esta etapa ya existe</p>}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Posicion de insercion</Label>
            <Select value={insertTarget} onValueChange={setInsertTarget}>
              <SelectTrigger className="h-10 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="START">Al inicio</SelectItem>
                <SelectItem value="END">Al final</SelectItem>
                {stages.map((stage) => (
                  <SelectItem key={stage.key} value={stage.id ? `AFTER_ID:${stage.id}` : `AFTER_NAME:${stage.name}`}>
                    Despues de "{stage.name}"
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Descripcion (opcional)</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={customMode ? "Registre el objetivo o precauciones de esta etapa" : selectedPreset?.description ?? ""}
            />
          </div>
          <button
            type="button"
            onClick={() => setCustomMode((value) => !value)}
            className="text-[11px] text-primary hover:underline"
          >
            {customMode ? "Volver a etapas predefinidas" : "Agregar etapa personalizada"}
          </button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={submit}
            disabled={isPending || duplicate || !stageName}
            className="gap-1.5"
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function defaultInsertTarget(selectedItem: WorkflowItem | null) {
  if (!selectedItem || selectedItem.kind === "matter_info") return "START";
  return selectedItem.id ? `AFTER_ID:${selectedItem.id}` : `AFTER_NAME:${selectedItem.name}`;
}

function parseInsertTarget(target: string, stages: WorkflowStage[]) {
  if (target === "START") {
    return { position: "START" as const, afterStageId: "", afterStageName: "" };
  }
  if (target.startsWith("AFTER_ID:")) {
    return {
      position: "AFTER" as const,
      afterStageId: target.slice("AFTER_ID:".length),
      afterStageName: ""
    };
  }
  if (target.startsWith("AFTER_NAME:")) {
    const name = target.slice("AFTER_NAME:".length);
    return {
      position: "AFTER" as const,
      afterStageId: "",
      afterStageName: stages.find((stage) => stage.name === name)?.name ?? name
    };
  }
  return { position: "END" as const, afterStageId: "", afterStageName: "" };
}

function buildWorkflowStages(
  procedure: WorkflowProcedure | null,
  preservationCases: WorkflowPreservationCase[]
): WorkflowStage[] {
  if (!procedure) return [];
  const visibleStages = procedure.stages.filter((stage) => stage.status !== "HIDDEN");
  const context = { procedure, preservationCases };
  const realStages: WorkflowStage[] = visibleStages.map((stage) => ({
    ...workflowStageFromName(
      procedure.type,
      stage.name,
      {
        key: `stage-${stage.id}`,
        id: stage.id,
        status: statusForStage(stage.name, stage, procedure, preservationCases),
        tasks: stage.tasks
      },
      context
    )
  }));

  const source = realStages.length > 0
    ? realStages
    : defaultStageNamesForProcedure(procedure.type).map((name, index) => ({
        ...workflowStageFromName(
          procedure.type,
          name,
          {
            key: `default-${index}-${name}`,
            id: null,
            status: statusForStage(name, null, procedure, preservationCases),
            tasks: []
          },
          context
        )
      }));

  if (
    preservationCases.length > 0 &&
    !source.some((stage) => stage.name.includes("Preservacion"))
  ) {
    const insertAt = Math.min(2, source.length);
    const preservationStage = workflowStageFromName(
      procedure.type,
      "Preservacion de bienes",
      {
        key: "default-preservation",
        id: null,
        status: statusForStage("Preservacion de bienes", null, procedure, preservationCases),
        tasks: []
      },
      context
    );
    return [...source.slice(0, insertAt), preservationStage, ...source.slice(insertAt)];
  }
  return source;
}

function workflowStageFromName(
  procedureType: ProcedureType,
  name: string,
  meta: Pick<WorkflowStage, "key" | "id" | "status" | "tasks">,
  context?: { procedure: WorkflowProcedure; preservationCases: WorkflowPreservationCase[] }
): WorkflowStage {
  const preset = stagePresetForName(procedureType, name);
  const presetKind = preset?.kind ?? "custom";
  const kind: WorkflowStage["kind"] = name.includes("Preservacion") ? "preservation" : "normal";
  return {
    ...meta,
    name,
    kind,
    presetKind,
    removable: presetKind !== "required",
    badge: context ? stageBadge(name, kind, meta.tasks, context) : null
  };
}

function shortDay(date: Date): string {
  const d = new Date(date);
  return `${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
}

function stageBadge(
  name: string,
  kind: WorkflowStage["kind"],
  tasks: WorkflowTask[],
  context: { procedure: WorkflowProcedure; preservationCases: WorkflowPreservationCase[] }
): WorkflowStage["badge"] {
  if (kind === "preservation") {
    const properties = context.preservationCases.flatMap((c) =>
      c.targets.flatMap((t) => t.properties)
    );
    const active = properties.filter((p) => p.status === "ACTIVE" || p.status === "RENEWED");
    if (active.length === 0) return null;
    const nearest = Math.min(...active.map((p) => daysUntil(p.expiryDate)));
    return nearest <= 30
      ? { text: `${active.length} · ${nearest}d`, hot: true }
      : { text: `${active.length} items`, hot: false };
  }

  const openTasks = tasks.filter((t) => !t.completed).length;
  const guide = stageGuideFor(name);
  const relevantDue = context.procedure.deadlines
    .filter((d) => !d.completed && guide.deadlineCategories.includes(d.category))
    .map((d) => daysUntil(d.dueAt));
  const nearestDue = relevantDue.length > 0 ? Math.min(...relevantDue) : null;

  if (nearestDue !== null && nearestDue <= 30) {
    return {
      text: openTasks > 0 ? `${openTasks} · ${nearestDue}d` : `${nearestDue}d`,
      hot: true
    };
  }
  if (openTasks > 0) return { text: `${openTasks}`, hot: false };
  if (guide.includeHearings) {
    const nextHearing = context.procedure.hearings
      .filter((h) => daysUntil(h.startsAt) >= 0)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];
    if (nextHearing) return { text: shortDay(nextHearing.startsAt), hot: false };
  }
  return null;
}

function statusForStage(
  name: string,
  stage: WorkflowStageSource | null,
  procedure: WorkflowProcedure,
  preservationCases: WorkflowPreservationCase[]
): WorkflowStageStatus {
  if (name.includes("Preservacion")) {
    const properties = preservationCases.flatMap((item) => item.targets.flatMap((target) => target.properties));
    const active = properties.filter((property) => property.status === "ACTIVE" || property.status === "RENEWED");
    if (active.some((property) => daysUntil(property.expiryDate) <= 30)) return "risk";
    if (active.length > 0) return "active";
    if (properties.length > 0) return "done";
    return "todo";
  }
  if (stage?.completedAt) return "done";
  const tasks = stage?.tasks ?? [];
  if (tasks.some((task) => !task.completed && task.dueAt && daysUntil(task.dueAt) <= 3)) return "risk";
  if (tasks.length > 0 && tasks.every((task) => task.completed)) return "done";
  if (tasks.some((task) => !task.completed)) return "active";
  if ((name.includes("Presentacion") || name.includes("demanda")) && procedure.acceptedAt) return "done";
  if (name.includes("Audiencia") && procedure.hearings.some((hearing) => daysUntil(hearing.startsAt) >= 0)) return "active";
  if (
    name.includes("Pruebas") &&
    procedure.deadlines.some((deadline) => deadline.category === "EVIDENCE" && !deadline.completed && daysUntil(deadline.dueAt) <= 7)
  ) {
    return "risk";
  }
  if (
    procedure.status === "CONCLUDED" &&
    (name.includes("Sentencia") || name.includes("Laudo") || name.includes("Archivo"))
  ) {
    return "done";
  }
  return "todo";
}

function StageStatusIcon({ status, large = false }: { status: WorkflowStageStatus; large?: boolean }) {
  const sizeClass = large ? "h-5 w-5" : "h-4 w-4";
  if (status === "done") {
    return (
      <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground", sizeClass)}>
        <Check className={large ? "h-3 w-3" : "h-2.5 w-2.5"} />
      </span>
    );
  }
  if (status === "risk") return <AlertTriangle className={cn("shrink-0 text-amber-600", sizeClass)} />;
  if (status === "active") return <Circle className={cn("shrink-0 fill-primary text-primary", sizeClass)} />;
  if (status === "not_applicable") return <Minus className={cn("shrink-0 text-muted-foreground", sizeClass)} />;
  return <Circle className={cn("shrink-0 text-muted-foreground/50", sizeClass)} />;
}

function StageStatusBadge({ status }: { status: WorkflowStageStatus }) {
  const map: Record<WorkflowStageStatus, { label: string; className: string }> = {
    done: { label: "Completado", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" },
    active: { label: "En progreso", className: "border-primary/30 bg-primary/10 text-primary" },
    risk: { label: "Riesgo", className: "border-amber-500/30 bg-amber-500/10 text-amber-700" },
    todo: { label: "Pendiente", className: "border-border bg-muted/40 text-muted-foreground" },
    not_applicable: { label: "No aplica", className: "border-border bg-muted/40 text-muted-foreground" }
  };
  const item = map[status];
  return <Badge variant="outline" className={item.className}>{item.label}</Badge>;
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h4 className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
      <span className="text-primary">{icon}</span>
      {children}
    </h4>
  );
}

function DeadlineMiniRow({ deadline }: { deadline: WorkflowDeadline }) {
  const days = daysUntil(deadline.dueAt);
  const tone = !deadline.completed && days <= deadline.remindDays
    ? days <= 3 ? "danger" : "warn"
    : undefined;
  return (
    <li className="flex items-center gap-2 py-2 text-xs">
      <CalendarClock
        className={cn(
          "h-3.5 w-3.5",
          tone === "danger" && "text-destructive",
          tone === "warn" && "text-amber-600",
          !tone && "text-primary"
        )}
      />
      <span className={cn("min-w-0 flex-1 truncate", deadline.completed && "text-muted-foreground line-through")}>
        {deadline.title}
      </span>
      <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground">
        {deadline.completed ? "Completado" : days < 0 ? `Vencido ${Math.abs(days)}d` : `${days}d`}
      </span>
    </li>
  );
}

function stageGuideFor(stageName: string) {
  return STAGE_GUIDES.find((item) => item.keys.some((key) => stageName.includes(key)))?.guide ??
    DEFAULT_STAGE_GUIDE;
}

function stageMaterialTag(stageName: string) {
  return `etapa:${stageName}`;
}

function documentMatchesStage(
  document: WorkflowDocument,
  stage: { id: string | null; name: string }
) {
  if (document.stageId) return stage.id !== null && document.stageId === stage.id;
  if (document.tags?.includes(stageMaterialTag(stage.name))) return true;
  const guide = stageGuideFor(stage.name);
  return guide.materialCategories.includes(document.category) || guide.materialPattern.test(document.name);
}

function defaultCategoryForStage(stageName: string): DocumentCategory {
  return stageGuideFor(stageName).defaultCategory;
}

function buildSourceOptions(procedure: WorkflowProcedure) {
  const seen = new Set<string>([COURT_PROCEDURE_SOURCE]);
  const partyOptions = [...procedure.procedureParties]
    .sort((a, b) => a.ordinal - b.ordinal || a.party.name.localeCompare(b.party.name, "zh-Hans-CN"))
    .map((row) => {
      const name = row.party.name.trim();
      if (!name) return null;
      return `${litigationStandingLabel[row.standing] ?? row.standing}·${name}`;
    })
    .filter((label): label is string => {
      if (!label || seen.has(label)) return false;
      seen.add(label);
      return true;
    });
  return [COURT_PROCEDURE_SOURCE, ...partyOptions];
}

function documentPreviewUrl(document: Pick<WorkflowDocument, "id" | "mimeType" | "name">) {
  if (officePreviewKind(document.mimeType, document.name)) {
    return `/api/documents/${document.id}/preview`;
  }
  if (canPreview(document.mimeType, document.name)) {
    return `/api/documents/${document.id}/download?inline=1`;
  }
  return null;
}

function iconForDocument(document: Pick<WorkflowDocument, "mimeType" | "name">) {
  const mime = document.mimeType?.toLowerCase() ?? "";
  const ext = document.name.split(".").pop()?.toLowerCase() ?? "";

  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "heic"].includes(ext)) {
    return { src: "/file-icons/image.svg", alt: "Imagen" };
  }
  if (mime.includes("pdf") || ext === "pdf") {
    return { src: "/file-icons/pdf.svg", alt: "PDF" };
  }
  if (mime.includes("word") || mime.includes("msword") || ["doc", "docx"].includes(ext)) {
    return { src: "/file-icons/word.svg", alt: "Word" };
  }
  if (mime.includes("spreadsheet") || mime.includes("excel") || ["xls", "xlsx", "csv"].includes(ext)) {
    return { src: "/file-icons/excel.svg", alt: "Excel" };
  }
  if (mime.includes("presentation") || mime.includes("powerpoint") || ["ppt", "pptx"].includes(ext)) {
    return { src: "/file-icons/presentation.svg", alt: "Presentacion" };
  }
  if (mime.includes("json") || ext === "json") {
    return { src: "/file-icons/json.svg", alt: "JSON" };
  }
  if (
    mime.includes("xml") ||
    ["xml", "html", "htm", "css", "js", "jsx", "ts", "tsx", "java", "py", "go", "rb", "php", "sh", "yml", "yaml"].includes(ext)
  ) {
    return { src: "/file-icons/code.svg", alt: "Codigo" };
  }
  if (mime.startsWith("text/") || ["txt", "md", "rtf", "log"].includes(ext)) {
    return { src: "/file-icons/text.svg", alt: "Texto" };
  }
  if (mime.includes("zip") || mime.includes("rar") || ["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
    return { src: "/file-icons/archive.svg", alt: "Comprimido" };
  }
  if (mime.startsWith("audio/") || ["mp3", "wav", "m4a", "aac"].includes(ext)) {
    return { src: "/file-icons/audio.svg", alt: "Audio" };
  }
  if (mime.startsWith("video/") || ["mp4", "mov", "avi", "mkv"].includes(ext)) {
    return { src: "/file-icons/video.svg", alt: "Video" };
  }
  return { src: "/file-icons/generic.svg", alt: "Archivo" };
}

const documentCategoryLabel: Record<DocumentCategory, string> = {
  EVIDENCE: "Evidencia",
  PLEADING: "Escritos",
  PROCEDURE: "Documentos procesales",
  JUDGMENT: "Sentencia",
  CONTRACT: "Contrato",
  OTHER: "Otro"
};
