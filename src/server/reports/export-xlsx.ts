/**
 * v0.20: å¾‹æ‰€æŠ¥è¡¨ xlsx å¯¼å‡º
 *
 * 3 ä¸ª sheetï¼šCasoæ¸…å•ï¼ˆæœ¬æœŸæ–°æ”¶ï¼‰/ æ”¶æ¬¾æ˜Žç»†ï¼ˆæœ¬æœŸ RECEIVEDï¼‰/ Abogadoäº§å‡ºï¼ˆæœ¬æœŸèšåˆï¼‰
 */
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { matterCategoryLabel, matterStatusLabel } from "@/lib/enums";
import type { ReportPeriod } from "./queries";
import { getReportData } from "./queries";

export async function buildReportWorkbook(period: ReportPeriod): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "LawLink";
  wb.created = new Date();

  // Sheet 1: Casoæ¸…å•ï¼ˆæœ¬æœŸæ–°æ”¶ï¼‰
  const matters = await prisma.matter.findMany({
    where: {
      createdAt: { gte: period.start, lt: period.end },
      deletedAt: null
    },
    select: {
      internalCode: true,
      title: true,
      category: true,
      status: true,
      createdAt: true,
      closedAt: true,
      archivedAt: true,
      owner: { select: { name: true } },
      primaryClient: { select: { name: true } },
      cause: { select: { name: true } }
    },
    orderBy: { createdAt: "asc" }
  });

  const sheetMatters = wb.addWorksheet("Casoæ¸…å•");
  sheetMatters.columns = [
    { header: "Casoç¼–å·", key: "code", width: 14 },
    { header: "æ ‡é¢˜", key: "title", width: 36 },
    { header: "ç±»åˆ«", key: "category", width: 8 },
    { header: "Causa", key: "cause", width: 18 },
    { header: "Cliente", key: "client", width: 18 },
    { header: "ä¸»åŠžAbogado", key: "owner", width: 10 },
    { header: "Estado", key: "status", width: 10 },
    { header: "æ”¶æ¡ˆFecha", key: "createdAt", width: 12 },
    { header: "Cerrar casoFecha", key: "closedAt", width: 12 },
    { header: "å½’æ¡£Fecha", key: "archivedAt", width: 12 }
  ];
  for (const m of matters) {
    sheetMatters.addRow({
      code: m.internalCode,
      title: m.title,
      category: matterCategoryLabel[m.category],
      cause: m.cause?.name ?? "",
      client: m.primaryClient?.name ?? "",
      owner: m.owner?.name ?? "",
      status: matterStatusLabel[m.status],
      createdAt: m.createdAt.toISOString().slice(0, 10),
      closedAt: m.closedAt ? m.closedAt.toISOString().slice(0, 10) : "",
      archivedAt: m.archivedAt ? m.archivedAt.toISOString().slice(0, 10) : ""
    });
  }
  sheetMatters.getRow(1).font = { bold: true };

  // Sheet 2: æ”¶æ¬¾æ˜Žç»†
  const receivedFees = await prisma.feeEntry.findMany({
    where: {
      type: "RECEIVED",
      occurredAt: { gte: period.start, lt: period.end }
    },
    select: {
      occurredAt: true,
      amount: true,
      payerOrPayee: true,
      invoiceNo: true,
      method: true,
      matter: {
        select: {
          internalCode: true,
          title: true,
          primaryClient: { select: { name: true } },
          owner: { select: { name: true } }
        }
      }
    },
    orderBy: { occurredAt: "asc" }
  });
  const sheetFees = wb.addWorksheet("æ”¶æ¬¾æ˜Žç»†");
  sheetFees.columns = [
    { header: "æ”¶æ¬¾Fecha", key: "occurredAt", width: 12 },
    { header: "Monto", key: "amount", width: 14 },
    { header: "Cliente", key: "client", width: 18 },
    { header: "Casoç¼–å·", key: "matterCode", width: 14 },
    { header: "Casoæ ‡é¢˜", key: "matterTitle", width: 36 },
    { header: "ä¸»åŠžAbogado", key: "owner", width: 10 },
    { header: "ä»˜æ¬¾æ–¹", key: "payer", width: 18 },
    { header: "Facturaå·", key: "invoiceNo", width: 18 },
    { header: "æ”¶æ¬¾æ–¹å¼", key: "method", width: 12 }
  ];
  for (const f of receivedFees) {
    sheetFees.addRow({
      occurredAt: f.occurredAt.toISOString().slice(0, 10),
      amount: Number(f.amount),
      client: f.matter?.primaryClient?.name ?? "",
      matterCode: f.matter?.internalCode ?? "",
      matterTitle: f.matter?.title ?? "",
      owner: f.matter?.owner?.name ?? "",
      payer: f.payerOrPayee ?? "",
      invoiceNo: f.invoiceNo ?? "",
      method: f.method ?? ""
    });
  }
  sheetFees.getRow(1).font = { bold: true };
  sheetFees.getColumn("amount").numFmt = "#,##0.00";

  // Sheet 3: Abogadoäº§å‡ºï¼ˆæ¥è‡ª getReportData å·²èšåˆçš„æ•°æ®ï¼Œé¿å…é‡ç®—ï¼‰
  const data = await getReportData(period);
  const sheetLawyer = wb.addWorksheet("Abogadoäº§å‡º");
  sheetLawyer.columns = [
    { header: "Abogado", key: "name", width: 12 },
    { header: "æœ¬æœŸæ–°æ”¶", key: "owned", width: 12 },
    { header: "æœ¬æœŸå·²ç»“", key: "closed", width: 12 },
    { header: "æœ¬æœŸæ”¶æ¬¾Monto", key: "received", width: 18 }
  ];
  for (const row of data.byLawyer) {
    sheetLawyer.addRow({
      name: row.name,
      owned: row.ownedCount,
      closed: row.closedCount,
      received: row.receivedAmount
    });
  }
  sheetLawyer.getRow(1).font = { bold: true };
  sheetLawyer.getColumn("received").numFmt = "#,##0.00";

  // Sheet 4: Clienteåº”æ”¶ï¼ˆé¡ºæ‰‹è¡¥ä¸€ä»½ï¼ŒAbogadoå¸¸ç”¨ï¼‰
  const sheetClient = wb.addWorksheet("Clienteåº”æ”¶");
  sheetClient.columns = [
    { header: "Cliente", key: "name", width: 24 },
    { header: "åº”æ”¶Monto", key: "receivable", width: 14 },
    { header: "å·²æ”¶Monto", key: "received", width: 14 },
    { header: "åº”æ”¶ä½™é¢", key: "balance", width: 14 }
  ];
  for (const row of data.byClientReceivable) {
    sheetClient.addRow({
      name: row.name,
      receivable: row.receivable,
      received: row.received,
      balance: row.balance
    });
  }
  sheetClient.getRow(1).font = { bold: true };
  ["receivable", "received", "balance"].forEach((k) => {
    sheetClient.getColumn(k).numFmt = "#,##0.00";
  });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}


