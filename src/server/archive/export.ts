/**
 * v0.9.4 å½’æ¡£ ZIP å¯¼å‡º
 *
 * ç»“æž„ï¼š
 *   {archiveNo}/
 *     README.md                 â€” å½’æ¡£è¯´æ˜Ž + ç»“æž„ç´¢å¼•
 *     manifest.json             â€” ç»“æž„åŒ–å…¨é‡æ•°æ®ï¼ˆmatter + parties + procedures + ...ï¼‰
 *     å°çš®å’Œç›®å½•/
 *       å·å®—å°çš®.docx
 *       å·å®—ç›®å½•.docx
 *     ææ–™/
 *       {category}/
 *         {N}_{åŽŸæ–‡ä»¶å}
 */
import PizZip from "pizzip";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { decryptBuffer, sha256 } from "@/lib/storage/crypto";

interface ZipResult {
  buffer: Buffer;
  fileName: string;
  checksum: string;
  size: number;
}

const CATEGORY_DIR: Record<string, string> = {
  EVIDENCE: "è¯æ®",
  PLEADING: "è¯‰è®¼æ–‡ä¹¦",
  PROCEDURE: "ç¨‹åºæ–‡ä¹¦",
  JUDGMENT: "è£åˆ¤æ–‡ä¹¦",
  CONTRACT: "åˆåŒ",
  OTHER: "å…¶ä»–",
};

function safeName(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, "_").trim();
}

async function readDocumentBuffer(doc: {
  path: string;
  encrypted: boolean;
  iv: string | null;
  authTag: string | null;
}): Promise<Buffer> {
  const raw = await storage.readFile(doc.path);
  if (!doc.encrypted) return raw;
  if (!doc.iv || !doc.authTag) throw new Error("åŠ å¯†pesosæ•°æ®æŸå");
  return decryptBuffer(raw, doc.iv, doc.authTag);
}

export async function buildArchiveZip(matterId: string): Promise<ZipResult> {
  const matter = await prisma.matter.findUnique({
    where: { id: matterId },
    include: {
      primaryClient: true,
      cause: { select: { name: true, code: true } },
      parties: { orderBy: [{ role: "asc" }, { ordinal: "asc" }] },
      procedures: { orderBy: { order: "asc" } },
      timelineEvents: { orderBy: { occurredAt: "asc" } },
      preservationCases: {
        orderBy: { createdAt: "asc" },
        include: {
          targets: {
            orderBy: { createdAt: "asc" },
            include: { properties: { orderBy: { startDate: "asc" } } },
          },
        },
      },
      notes: { where: { deletedAt: null }, orderBy: { occurredAt: "asc" } },
      billings: true,
      feeEntries: { orderBy: { occurredAt: "asc" } },
      archiveRecords: { orderBy: { archivedAt: "desc" }, take: 1 },
      owner: { select: { id: true, name: true } },
    },
  });
  if (!matter) throw new Error("No existe el caso");
  if (matter.archiveRecords.length === 0)
    throw new Error("El caso aÃºn no estÃ¡ archivado y no se puede exportar");

  const archive = matter.archiveRecords[0];
  const docs = await prisma.document.findMany({
    where: { matterId, deletedAt: null },
    select: {
      id: true,
      name: true,
      category: true,
      path: true,
      encrypted: true,
      iv: true,
      authTag: true,
      mimeType: true,
      size: true,
      createdAt: true,
      tags: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const zip = new PizZip();
  const root = safeName(archive.archiveNo);

  // ===== manifest.jsonï¼šç»“æž„åŒ–æ•°æ®å¿«ç…§ï¼ˆè„±æ•ï¼šContraseÃ±aã€apiKeyã€authTag etc.ä¸å¯¼å‡ºï¼‰
  const manifest = {
    archiveNo: archive.archiveNo,
    archivedAt: archive.archivedAt.toISOString(),
    archivedBy: archive.archivedBy,
    closedReason: archive.closedReason,
    completedAt: archive.completedAt?.toISOString() ?? null,
    summary: archive.summary,
    judgmentSummary: archive.judgmentSummary,
    checklist: archive.checklistJson,
    missingItems: archive.missingItems,
    matter: {
      id: matter.id,
      internalCode: matter.internalCode,
      title: matter.title,
      category: matter.category,
      status: matter.status,
      cause: matter.cause,
      causeFreeText: matter.causeFreeText,
      claimAmount: matter.claimAmount?.toString() ?? null,
      ourStanding: matter.ourStanding,
      intakeDate: matter.intakeDate?.toISOString() ?? null,
      firstAcceptedAt: matter.firstAcceptedAt?.toISOString() ?? null,
      closedAt: matter.closedAt?.toISOString() ?? null,
      archivedAt: matter.archivedAt?.toISOString() ?? null,
      owner: matter.owner,
      primaryClient: matter.primaryClient
        ? {
            id: matter.primaryClient.id,
            name: matter.primaryClient.name,
            type: matter.primaryClient.type,
            idNumber: matter.primaryClient.idNumber,
            phone: matter.primaryClient.phone,
            email: matter.primaryClient.email,
            address: matter.primaryClient.address,
          }
        : null,
    },
    parties: matter.parties.map((p) => ({
      role: p.role,
      standing: p.standing,
      ordinal: p.ordinal,
      name: p.name,
      idNumber: p.idNumber,
      phone: p.phone,
      address: p.address,
      legalRep: p.legalRep,
      notes: p.notes,
    })),
    procedures: matter.procedures.map((p) => ({
      order: p.order,
      type: p.type,
      customLabel: p.customLabel,
      engagement: p.engagement,
      caseNumber: p.caseNumber,
      handlingAgency: p.handlingAgency,
      panel: p.panel,
      handler: p.handler,
      acceptedAt: p.acceptedAt?.toISOString() ?? null,
      status: p.status,
      outcome: p.outcome,
      concludedAt: p.concludedAt?.toISOString() ?? null,
    })),
    timelineEvents: matter.timelineEvents.map((e) => ({
      occurredAt: e.occurredAt.toISOString(),
      eventType: e.eventType,
      title: e.title,
      content: e.content,
      refType: e.refType,
      refId: e.refId,
    })),
    // v0.48ï¼šPreservaciÃ³næ”¹è¯»ä¸‰å±‚æ¨¡åž‹ï¼Œmanifest ä»æŒ‰"æ¯Ã­temsè´¢äº§ä¸€æ¡"æ‰å¹³è¾“å‡ºï¼Œå­—æ®µyæ—§ç‰ˆå…¼å®¹
    preservations: matter.preservationCases.flatMap((c) =>
      c.targets.flatMap((t) =>
        t.properties.map((p) => ({
          type: c.type,
          propertyType: p.propertyType,
          amount: p.amount?.toString() ?? null,
          respondent: t.name,
          court: c.court,
          rulingNumber: c.rulingNumber,
          startDate: p.startDate.toISOString(),
          expiryDate: p.expiryDate.toISOString(),
          status: p.status,
          note: c.note,
        })),
      ),
    ),
    notes: matter.notes.map((n) => ({
      channel: n.channel,
      withWhom: n.withWhom,
      occurredAt: n.occurredAt.toISOString(),
      content: n.content,
      tags: n.tags,
    })),
    billings: matter.billings.map((b) => ({
      title: b.title,
      contractAmount: b.contractAmount.toString(),
      status: b.status,
      signedAt: b.signedAt?.toISOString() ?? null,
    })),
    feeEntries: matter.feeEntries.map((f) => ({
      type: f.type,
      amount: f.amount.toString(),
      occurredAt: f.occurredAt.toISOString(),
      invoiceNo: f.invoiceNo,
      payerOrPayee: f.payerOrPayee,
      method: f.method,
      note: f.note,
    })),
    documents: docs.map((d) => ({
      id: d.id,
      name: d.name,
      category: d.category,
      size: d.size,
      createdAt: d.createdAt.toISOString(),
      tags: d.tags,
    })),
  };
  zip.file(`${root}/manifest.json`, JSON.stringify(manifest, null, 2));

  // ===== README.md
  const md = [
    `# ${matter.title}`,
    "",
    `å½’æ¡£ç¼–å·ï¼š**${archive.archiveNo}**  `,
    `Casoç¼–å·ï¼š${matter.internalCode}  `,
    `å½’æ¡£Fechaï¼š${archive.archivedAt.toISOString().slice(0, 10)}  `,
    `å½’æ¡£äººï¼š${archive.archivedBy}  `,
    archive.completedAt
      ? `Cerrar casoFechaï¼š${archive.completedAt.toISOString().slice(0, 10)}`
      : "",
    "",
    "## Cerrar casoå°ç»“",
    "",
    archive.summary,
    "",
    archive.judgmentSummary
      ? "## è£åˆ¤ç»“æžœ\n\n" + archive.judgmentSummary + "\n"
      : "",
    "## ç›®å½•",
    "",
    "- `manifest.json` â€” Casoå…¨é‡ç»“æž„åŒ–æ•°æ®ï¼ˆJSON æ ¼å¼ï¼‰",
    "- `å°çš®å’Œç›®å½•/` â€” è‡ªåŠ¨ç”Ÿæˆçš„å·å®—å°çš®yå·å®—ç›®å½•",
    "- `ææ–™/` â€” Ver todosä¸Šä¼ ææ–™æŒ‰ç±»åˆ«åˆ†ç›®å½•å½’æ¡£",
    "",
    archive.missingItems.length > 0
      ? `âš ï¸ å½’æ¡£æ—¶å­˜åœ¨ç¼ºÃ­temsï¼š${archive.missingItems.length} Ã­temsï¼ˆè¯¦è§ manifest.jsonï¼‰`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
  zip.file(`${root}/README.md`, md);

  // ===== å°çš®å’Œç›®å½•
  if (archive.coverDocId) {
    const cover = docs.find((d) => d.id === archive.coverDocId);
    if (cover) {
      const buf = await readDocumentBuffer(cover);
      zip.file(`${root}/å°çš®å’Œç›®å½•/å·å®—å°çš®.docx`, buf);
    }
  }
  if (archive.catalogDocId) {
    const catalog = docs.find((d) => d.id === archive.catalogDocId);
    if (catalog) {
      const buf = await readDocumentBuffer(catalog);
      zip.file(`${root}/å°çš®å’Œç›®å½•/å·å®—ç›®å½•.docx`, buf);
    }
  }

  // ===== ææ–™ï¼šè·³è¿‡å·²ç»æ”¾è¿›"å°çš®å’Œç›®å½•"çš„ä¸¤ä»½
  const skipIds = new Set(
    [archive.coverDocId, archive.catalogDocId].filter((x): x is string => !!x),
  );
  const seqByCategory: Record<string, number> = {};
  for (const d of docs) {
    if (skipIds.has(d.id)) continue;
    const dir = CATEGORY_DIR[d.category] ?? "å…¶ä»–";
    const n = (seqByCategory[dir] ?? 0) + 1;
    seqByCategory[dir] = n;
    try {
      const buf = await readDocumentBuffer(d);
      const seq = String(n).padStart(3, "0");
      zip.file(`${root}/ææ–™/${dir}/${seq}_${safeName(d.name)}`, buf);
    } catch (err) {
      console.error(`[archive-export] ææ–™è¯»å–Errorï¼š${d.id}`, err);
      // å•æ–‡ä»¶Errorä¸é˜»æ–­ï¼›å†™ä¸€æ¡è¯´æ˜Ž
      zip.file(
        `${root}/ææ–™/${dir}/_è¯»å–Error_${safeName(d.name)}.txt`,
        `è¯¥æ–‡ä»¶è¯»å–Errorï¼š${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const buffer = zip.generate({ type: "nodebuffer" }) as Buffer;
  return {
    buffer,
    fileName: `${root}.zip`,
    checksum: sha256(buffer),
    size: buffer.length,
  };
}


