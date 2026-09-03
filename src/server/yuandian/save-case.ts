"use server";

/**
 * v0.20: æŠŠæ£€ç´¢åˆ°çš„pesoså…¸ç±»æ¡ˆGuardarä¸ºCaso Documentï¼ˆcategory=JUDGMENTï¼‰
 *
 * è·³è¿‡ uploadDocument çš„ file validation â€”â€” è¿™æ˜¯ LawLink å†…éƒ¨ç”Ÿæˆçš„ md æ–‡æœ¬ï¼Œ
 * ä¸èµ°"ç”¨æˆ·ä¸Šä¼ "è·¯å¾„ã€‚
 */
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { assertCanAccessMatter } from "@/lib/permissions";
import { storage } from "@/lib/storage";
import { sha256 } from "@/lib/storage/crypto";
import { audit } from "@/server/audit";
import type { CaseSearchHit, VectorCaseHit } from "./cases";
import { revalidateMatter } from "@/server/matters/route";

export type SaveCaseInput = {
  matterId: string;
  caseHit: Pick<
    CaseSearchHit,
    | "id"
    | "ah"
    | "title"
    | "ay"
    | "jbdw"
    | "cprq"
    | "ajlb"
    | "xzqh_p"
    | "wszl"
    | "content"
    | "detailUrl"
  >;
};

function safeFileName(ah: string): string {
  // æ¡ˆå·å«ç‰¹æ®Šå­—ç¬¦ï¼ˆï¼‰etc.ï¼Œåšæœ€å°æ¸…ç†ç”¨äºŽæ–‡ä»¶å
  return ah.replace(/[\\/:*?"<>|]/g, "").slice(0, 80);
}

function buildMarkdown(c: SaveCaseInput["caseHit"]): string {
  const now = new Date().toLocaleString("zh-CN");
  return [
    `# ç±»æ¡ˆå­˜æ¡£ï¼š${c.title}`,
    "",
    `- **æ¡ˆå·**ï¼š${c.ah}`,
    `- **æ³•é™¢**ï¼š${c.jbdw}`,
    `- **è£åˆ¤Fecha**ï¼š${c.cprq}`,
    `- **Causa**ï¼š${c.ay.join("ã€")}`,
    `- **Casoç±»åˆ«**ï¼š${c.ajlb}`,
    `- **åœ°åŒº**ï¼š${c.xzqh_p}`,
    `- **æ–‡ä¹¦ç§ç±»**ï¼š${c.wszl}`,
    `- **pesoså…¸Enlace**ï¼š${c.detailUrl}`,
    `- **Guardaræ—¶é—´**ï¼š${now}`,
    "",
    "---",
    "",
    c.content || "ï¼ˆæ— å†…å®¹ç‰‡æ®µï¼‰"
  ].join("\n");
}

export async function saveCaseToMatter(input: SaveCaseInput): Promise<{
  ok: true;
  documentId: string;
  documentName: string;
}> {
  const session = await requireSession();
  await assertCanAccessMatter(session.user.id, session.user.role, input.matterId);

  const matter = await prisma.matter.findUnique({
    where: { id: input.matterId, deletedAt: null },
    select: { id: true, status: true }
  });
  if (!matter) throw new Error("Casoä¸å­˜åœ¨");
  if (matter.status === "ARCHIVED") {
    throw new Error("Casoå·²å½’æ¡£ï¼ˆåªè¯»ï¼‰ï¼Œä¸èƒ½å†Guardarç±»æ¡ˆ");
  }

  const md = buildMarkdown(input.caseHit);
  const buf = Buffer.from(md, "utf-8");
  const path = await storage.writeFile(`m_${input.matterId}`, buf);
  const hash = sha256(buf);
  const docName = `ç±»æ¡ˆ_${safeFileName(input.caseHit.ah)}.md`;

  const doc = await prisma.document.create({
    data: {
      matterId: input.matterId,
      uploadedById: session.user.id,
      name: docName,
      category: "JUDGMENT",
      path,
      mimeType: "text/markdown",
      size: buf.byteLength,
      sha256: hash,
      encrypted: false,
      tags: ["ç±»æ¡ˆ", "pesoså…¸"]
    },
    select: { id: true, name: true }
  });

  await audit({
    userId: session.user.id,
    action: "YUANDIAN_CASE_SAVE",
    targetType: "Matter",
    targetId: input.matterId,
    detail: {
      caseId: input.caseHit.id,
      ah: input.caseHit.ah,
      documentId: doc.id
    }
  });

  await revalidateMatter(input.matterId);

  return { ok: true, documentId: doc.id, documentName: doc.name };
}

// ============================================================
// v0.22: è¯­ä¹‰æ£€ç´¢ç»“æžœå­˜æ¡£ï¼ˆvector è·¯å¾„ï¼Œå­—æ®µæ˜ å°„ä¸åŒï¼‰
// ============================================================

export type SaveVectorCaseInput = {
  matterId: string;
  caseHit: Pick<
    VectorCaseHit,
    | "scid"
    | "ah"
    | "title"
    | "ay"
    | "anyou"
    | "jbdw"
    | "jaDate"
    | "ajlb"
    | "xzqh_p"
    | "wszl"
    | "content"
    | "detailUrl"
    | "score"
  >;
};

function formatJaDate(n: number | undefined | null): string {
  if (!n) return "Desconocido";
  const s = String(n);
  if (s.length !== 8) return s;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

function buildVectorMarkdown(c: SaveVectorCaseInput["caseHit"]): string {
  const now = new Date().toLocaleString("zh-CN");
  // Causaï¼šä¼˜å…ˆ anyouï¼ˆåå­—ï¼‰ï¼Œå¦åˆ™ ay code å…œåº•
  const ay =
    (c.anyou && c.anyou.length ? c.anyou : c.ay)?.join("ã€") || "ï¼ˆæ— Causaä¿¡æ¯ï¼‰";
  return [
    `# ç±»æ¡ˆå­˜æ¡£ï¼ˆè¯­ä¹‰æ£€ç´¢ï¼‰ï¼š${c.title}`,
    "",
    `- **æ¡ˆå·**ï¼š${c.ah || "â€”"}`,
    `- **æ³•é™¢**ï¼š${c.jbdw || "â€”"}`,
    `- **è£åˆ¤Fecha**ï¼š${formatJaDate(c.jaDate)}`,
    `- **Causa**ï¼š${ay}`,
    `- **Casoç±»åˆ«**ï¼š${c.ajlb}`,
    `- **åœ°åŒº**ï¼š${c.xzqh_p}`,
    `- **æ–‡ä¹¦ç§ç±»**ï¼š${c.wszl}`,
    `- **ç›¸ä¼¼åº¦è¯„åˆ†**ï¼š${c.score.toFixed(4)}`,
    `- **pesoså…¸Enlace**ï¼š${c.detailUrl}`,
    `- **Guardaræ—¶é—´**ï¼š${now}`,
    "",
    "---",
    "",
    c.content || "ï¼ˆæ— å†…å®¹ç‰‡æ®µï¼‰"
  ].join("\n");
}

export async function saveVectorCaseToMatter(input: SaveVectorCaseInput): Promise<{
  ok: true;
  documentId: string;
  documentName: string;
}> {
  const session = await requireSession();
  await assertCanAccessMatter(session.user.id, session.user.role, input.matterId);

  const matter = await prisma.matter.findUnique({
    where: { id: input.matterId, deletedAt: null },
    select: { id: true, status: true }
  });
  if (!matter) throw new Error("Casoä¸å­˜åœ¨");
  if (matter.status === "ARCHIVED") {
    throw new Error("Casoå·²å½’æ¡£ï¼ˆåªè¯»ï¼‰ï¼Œä¸èƒ½å†Guardarç±»æ¡ˆ");
  }

  const md = buildVectorMarkdown(input.caseHit);
  const buf = Buffer.from(md, "utf-8");
  const path = await storage.writeFile(`m_${input.matterId}`, buf);
  const hash = sha256(buf);
  // æ¡ˆå·ç¼ºå¤±æ—¶ç”¨ scid å…œåº•ï¼ˆvector æ¥çš„æŸäº›æ¡ˆä¾‹ ah å¯èƒ½ä¸ºç©ºï¼‰
  const tag = input.caseHit.ah?.trim() || input.caseHit.scid.slice(0, 12);
  const docName = `ç±»æ¡ˆ_${safeFileName(tag)}.md`;

  const doc = await prisma.document.create({
    data: {
      matterId: input.matterId,
      uploadedById: session.user.id,
      name: docName,
      category: "JUDGMENT",
      path,
      mimeType: "text/markdown",
      size: buf.byteLength,
      sha256: hash,
      encrypted: false,
      tags: ["ç±»æ¡ˆ", "pesoså…¸", "è¯­ä¹‰"]
    },
    select: { id: true, name: true }
  });

  await audit({
    userId: session.user.id,
    action: "YUANDIAN_CASE_SAVE_VECTOR",
    targetType: "Matter",
    targetId: input.matterId,
    detail: {
      scid: input.caseHit.scid,
      ah: input.caseHit.ah,
      score: input.caseHit.score,
      documentId: doc.id
    }
  });

  await revalidateMatter(input.matterId);

  return { ok: true, documentId: doc.id, documentName: doc.name };
}


