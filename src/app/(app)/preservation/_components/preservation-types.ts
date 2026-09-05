import type {
  Prisma,
  PreservationType,
  GuaranteeType,
  PreservationStatus,
} from "@prisma/client";

type PreservationCaseRaw = Prisma.PreservationCaseGetPayload<{
  include: {
    matter: { select: { id: true; internalCode: true; title: true } };
    owner: { select: { id: true; name: true } };
    targets: {
      include: {
        properties: {
          include: {
            renewals: { orderBy: { renewedAt: "desc" }; take: 3 };
          };
        };
      };
    };
  };
}>;

type PreservationTargetRaw = PreservationCaseRaw["targets"][number];
type PreservationPropertyRaw = PreservationTargetRaw["properties"][number];

export type PreservationCaseRow = Omit<PreservationCaseRaw, "targets"> & {
  targets: Array<
    Omit<PreservationTargetRaw, "properties"> & {
      properties: Array<
        Omit<PreservationPropertyRaw, "amount"> & { amount: number | null }
      >;
    }
  >;
};

export type MatterOption = {
  id: string;
  internalCode: string;
  title: string;
};

export type UserOption = { id: string; name: string };

export const PRES_TYPE_CN: Record<PreservationType, string> = {
  PRE_LITIGATION: "PreservaciÃ³n previa al litigio",
  LITIGATION: "PreservaciÃ³n durante el litigio",
  ENFORCEMENT: "PreservaciÃ³n de ejecuciÃ³n",
};

// v1.2: å®šä¹‰å·²æŒªåˆ° @/lib/preservation-defaultsï¼ˆcron Notificacionesä¹Ÿè¦ç”¨ï¼‰ï¼Œæ­¤å¤„ä»…è½¬å‡º
export { PROPERTY_TYPE_CN } from "@/lib/preservation-defaults";

export const GUARANTEE_TYPE_CN: Record<GuaranteeType, string> = {
  CASH_DEPOSIT: "ä¿è¯é‡‘",
  GUARANTEE_LETTER: "ä¿å‡½",
  PROPERTY: "è´¢äº§æ‹…ä¿",
  NONE: "æ— éœ€æ‹…ä¿",
};

export const PRES_STATUS_CN: Record<PreservationStatus, string> = {
  ACTIVE: "ç”Ÿæ•ˆä¸­",
  RENEWED: "å·²ç»­ä¿",
  EXPIRED: "å·²åˆ°æœŸ",
  LIFTED: "å·²è§£é™¤",
};

export const PRES_STATUS_COLOR: Record<
  PreservationStatus,
  { bg: string; text: string; border: string }
> = {
  ACTIVE: {
    bg: "rgb(74 222 128 / 0.12)",
    text: "rgb(22 163 74)",
    border: "rgb(74 222 128 / 0.5)",
  },
  RENEWED: {
    bg: "rgb(96 165 250 / 0.12)",
    text: "rgb(37 99 235)",
    border: "rgb(96 165 250 / 0.5)",
  },
  EXPIRED: {
    bg: "rgb(248 113 113 / 0.12)",
    text: "rgb(220 38 38)",
    border: "rgb(248 113 113 / 0.5)",
  },
  LIFTED: {
    bg: "rgb(156 163 175 / 0.12)",
    text: "rgb(107 114 128)",
    border: "rgb(156 163 175 / 0.5)",
  },
};

// åˆ°æœŸå€’è®¡æ—¶åˆ†çº§
export function classifyExpiry(daysLeft: number): {
  label: string;
  tone: "danger" | "warn" | "ok" | "muted";
} {
  if (daysLeft < 0) return { label: `å·²è¿‡æœŸ ${-daysLeft} dÃ­as`, tone: "danger" };
  if (daysLeft === 0) return { label: "Vence hoy", tone: "danger" };
  if (daysLeft <= 7) return { label: `${daysLeft} dÃ­asåŽåˆ°æœŸ`, tone: "danger" };
  if (daysLeft <= 30) return { label: `${daysLeft} dÃ­asåŽåˆ°æœŸ`, tone: "warn" };
  if (daysLeft <= 60) return { label: `${daysLeft} dÃ­asåŽåˆ°æœŸ`, tone: "muted" };
  return { label: `${daysLeft} dÃ­asåŽåˆ°æœŸ`, tone: "ok" };
}

