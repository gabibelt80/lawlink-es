/**
 * Exportación ZIP de archivo de caso
 *
 * Estructura:
 *   {archiveNo}/
 *     README.md
 *     {nombre-archivo}.docx
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
  EVIDENCE: "é¯æ",
  PLEADING: "é¯‰é¼æ–‡ä¹¦",
  PROCEDURE: "é¨‹áºæ–‡ä¹¦",
  JUDGMENT: "é£áˆ¤æ–‡ä¹¦",
  CONTRACT: "áˆáŒ",
  OTHER: "á…¶ä»–",
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
  if (!doc.iv || !doc.authTag) throw new Error("áŠ á¯†pesosæ•°ææŸá");
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

  // ===== manifest.jsonï¼šé»“æž„áŒ–æ•°æá¿«é…§ï¼ˆé„±æ•ï¼šContraseÃ±aã€apiKeyã€authTag etc.ä¸á¯¼á‡ºï¼‰
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
    // v0.48ï¼šPreservaciÃ³næ”¹é¯»ä¸‰á±‚æ¨¡áž‹ï¼Œmanifest ä»æŒ‰"æ¯Ã­temsé´¢äº§ä¸€æ¡"æ‰á¹³é¾“á‡ºï¼Œá­—æµyæ—§é‰ˆá…¼á¹
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
    `á½’æ¡£é¼–á·ï¼š**${archive.archiveNo}**  `,
    `Casoé¼–á·ï¼š${matter.internalCode}  `,
    `á½’æ¡£Fechaï¼š${archive.archivedAt.toISOString().slice(0, 10)}  `,
    `á½’æ¡£äººï¼š${archive.archivedBy}  `,
    archive.completedAt
      ? `Cerrar casoFechaï¼š${archive.completedAt.toISOString().slice(0, 10)}`
      : "",
    "",
    "## Cerrar casoá°é»“",
    "",
    archive.summary,
    "",
    archive.judgmentSummary
      ? "## é£áˆ¤é»“æžœ\n\n" + archive.judgmentSummary + "\n"
      : "",
    "## é›á½•",
    "",
    "- `manifest.json` â€” Casoá…¨é‡é»“æž„áŒ–æ•°æï¼ˆJSON æ ¼á¼ï¼‰",
    "- `á°éšá’Œé›á½•/` â€” é‡ªáŠ¨é”Ÿæˆéš„á·á—á°éšyá·á—é›á½•",
    "- `ææ–™/` â€” Ver todosä¸Šä¼ ææ–™æŒ‰é±»áˆ«áˆ†é›á½•á½’æ¡£",
    "",
    archive.missingItems.length > 0
      ? `âš ï¸ á½’æ¡£æ—¶á­˜áœ¨é¼ºÃ­temsï¼š${archive.missingItems.length} Ã­temsï¼ˆé¯¦é§ manifest.jsonï¼‰`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
  zip.file(`${root}/README.md`, md);

  // ===== á°éšá’Œé›á½•
  if (archive.coverDocId) {
    const cover = docs.find((d) => d.id === archive.coverDocId);
    if (cover) {
      const buf = await readDocumentBuffer(cover);
      zip.file(`${root}/á°éšá’Œé›á½•/á·á—á°éš.docx`, buf);
    }
  }
  if (archive.catalogDocId) {
    const catalog = docs.find((d) => d.id === archive.catalogDocId);
    if (catalog) {
      const buf = await readDocumentBuffer(catalog);
      zip.file(`${root}/á°éšá’Œé›á½•/á·á—é›á½•.docx`, buf);
    }
  }

  // ===== ææ–™ï¼šé·³é¿‡á·²é»æ”¾é¿›"á°éšá’Œé›á½•"éš„ä¸¤ä»½
  const skipIds = new Set(
    [archive.coverDocId, archive.catalogDocId].filter((x): x is string => !!x),
  );
  const seqByCategory: Record<string, number> = {};
  for (const d of docs) {
    if (skipIds.has(d.id)) continue;
    const dir = CATEGORY_DIR[d.category] ?? "á…¶ä»–";
    const n = (seqByCategory[dir] ?? 0) + 1;
    seqByCategory[dir] = n;
    try {
      const buf = await readDocumentBuffer(d);
      const seq = String(n).padStart(3, "0");
      zip.file(`${root}/ææ–™/${dir}/${seq}_${safeName(d.name)}`, buf);
    } catch (err) {
      console.error(`[archive-export] ææ–™é¯»á–Errorï¼š${d.id}`, err);
      // á•æ–‡ä»¶Errorä¸é˜»æ–­ï¼›á†™ä¸€æ¡é¯´æ˜Ž
      zip.file(
        `${root}/ææ–™/${dir}/_é¯»á–Error_${safeName(d.name)}.txt`,
        `é¯¥æ–‡ä»¶é¯»á–Errorï¼š${err instanceof Error ? err.message : String(err)}`,
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


