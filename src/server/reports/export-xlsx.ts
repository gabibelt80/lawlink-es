/**
 * v0.20: 律所报表 xlsx 导出
 *
 * 3 个 sheet：Caso清单（本期新收）/ 收款明细（本期 RECEIVED）/ Abogado产出（本期聚合）
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

  // Sheet 1: Caso清单（本期新收）
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

  const sheetMatters = wb.addWorksheet("Caso清单");
  sheetMatters.columns = [
    { header: "Caso编号", key: "code", width: 14 },
    { header: "标题", key: "title", width: 36 },
    { header: "类别", key: "category", width: 8 },
    { header: "Causa", key: "cause", width: 18 },
    { header: "Cliente", key: "client", width: 18 },
    { header: "主办Abogado", key: "owner", width: 10 },
    { header: "Estado", key: "status", width: 10 },
    { header: "收案Fecha", key: "createdAt", width: 12 },
    { header: "Cerrar casoFecha", key: "closedAt", width: 12 },
    { header: "归档Fecha", key: "archivedAt", width: 12 }
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

  // Sheet 2: 收款明细
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
  const sheetFees = wb.addWorksheet("收款明细");
  sheetFees.columns = [
    { header: "收款Fecha", key: "occurredAt", width: 12 },
    { header: "Monto", key: "amount", width: 14 },
    { header: "Cliente", key: "client", width: 18 },
    { header: "Caso编号", key: "matterCode", width: 14 },
    { header: "Caso标题", key: "matterTitle", width: 36 },
    { header: "主办Abogado", key: "owner", width: 10 },
    { header: "付款方", key: "payer", width: 18 },
    { header: "Factura号", key: "invoiceNo", width: 18 },
    { header: "收款方式", key: "method", width: 12 }
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

  // Sheet 3: Abogado产出（来自 getReportData 已聚合的数据，避免重算）
  const data = await getReportData(period);
  const sheetLawyer = wb.addWorksheet("Abogado产出");
  sheetLawyer.columns = [
    { header: "Abogado", key: "name", width: 12 },
    { header: "本期新收", key: "owned", width: 12 },
    { header: "本期已结", key: "closed", width: 12 },
    { header: "本期收款Monto", key: "received", width: 18 }
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

  // Sheet 4: Cliente应收（顺手补一份，Abogado常用）
  const sheetClient = wb.addWorksheet("Cliente应收");
  sheetClient.columns = [
    { header: "Cliente", key: "name", width: 24 },
    { header: "应收Monto", key: "receivable", width: 14 },
    { header: "已收Monto", key: "received", width: 14 },
    { header: "应收余额", key: "balance", width: 14 }
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
