/**
 * /inbox å…±äº«ç±»åž‹
 */
import type { Prisma, SmsType, ProcedureType } from "@prisma/client";
import type {
  SmsAttachmentResult,
  SmsCredential,
  SmsDocumentLink,
  SmsImportantItem
} from "@/lib/sms-parser";

export type SmsRow = Prisma.SmsMessageGetPayload<{
  include: {
    receivedBy: { select: { id: true; name: true } };
    matchedMatter: {
      select: {
        id: true;
        internalCode: true;
        title: true;
        procedures: {
          select: { id: true; type: true; customLabel: true; caseNumber: true };
        };
      };
    };
  };
}>;

export type MatterOption = {
  id: string;
  internalCode: string;
  title: string;
  procedures: {
    id: string;
    type: ProcedureType;
    customLabel: string | null;
    caseNumber: string | null;
  }[];
};

export const SMS_TYPE_CN: Record<SmsType, string> = {
  HEARING_NOTICE: "å¼€åº­Notificaciones",
  SERVICE_NOTICE: "é€è¾¾Notificaciones",
  FEE_NOTICE: "ç¼´è´¹Notificaciones",
  MEDIATION: "è°ƒè§£Notificaciones",
  ENFORCEMENT: "æ‰§è¡ŒNotificaciones",
  FILING_NOTICE: "ç«‹æ¡ˆNotificaciones",
  JUDGMENT_NOTICE: "åˆ¤å†³Notificaciones",
  EVIDENCE_SUBMIT: "Enviarææ–™",
  OTHER: "å…¶ä»–Notificaciones"
};

export const SMS_TYPE_ACCENT: Record<SmsType, string> = {
  HEARING_NOTICE: "#dc2626",
  SERVICE_NOTICE: "#0ea5e9",
  FEE_NOTICE: "#d97706",
  MEDIATION: "#0891b2",
  ENFORCEMENT: "#7c2d12",
  FILING_NOTICE: "#16a34a",
  JUDGMENT_NOTICE: "#7c3aed",
  EVIDENCE_SUBMIT: "#0d9488",
  OTHER: "#737373"
};

// è§£æžç»“æžœç»“æž„ï¼ˆy lib/sms-parser.ts ParsedSms å¯¹é½ï¼‰
export type ParsedJson = {
  smsType: SmsType;
  caseNumbers: string[];
  court: string | null;
  dates: string[];
  hearingDate: string | null;
  filingDate: string | null;
  judgmentDate: string | null;
  appealDeadline: string | null;
  courtRoom: string | null;
  judge: string | null;
  clerk: string | null;
  phones: string[];
  amounts: string[];
  urls: string[];
  platforms: string[];
  importantItems: SmsImportantItem[];
  credentials: SmsCredential[];
  documentLinks: SmsDocumentLink[];
  attachmentResults: SmsAttachmentResult[];
  summary: string;
  // v0.9.1 AI å¢žå¼ºå­—æ®µ
  aiEnriched?: boolean;
  action?: string | null;
  urgency?: "HIGH" | "MEDIUM" | "LOW" | null;
};

