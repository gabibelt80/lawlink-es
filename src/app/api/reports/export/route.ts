import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { buildReportWorkbook } from "@/server/reports/export-xlsx";
import { resolveReportPeriod } from "@/server/reports/resolve-period";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No has iniciado sesión" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    return NextResponse.json({ error: "Sin permiso de acceso" }, { status: 403 });
  }

  const url = new URL(req.url);
  const resolved = resolveReportPeriod({
    period: url.searchParams.get("period") ?? undefined,
    start: url.searchParams.get("start") ?? undefined,
    end: url.searchParams.get("end") ?? undefined
  });
  if (resolved.error) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }
  const { period, periodKey } = resolved;

  let buf: Buffer;
  try {
    buf = await buildReportWorkbook(period);
  } catch (err) {
    console.error("[reports/export] Error al generar:", err);
    return NextResponse.json({ error: "Error al exportar" }, { status: 500 });
  }

  await audit({
    userId: session.user.id,
    action: "REPORT_EXPORT",
    targetType: "Report",
    targetId: periodKey,
    detail: { periodLabel: period.label, periodKey, bytes: buf.byteLength }
  });

  const startTag = `${period.start.getFullYear()}-${String(period.start.getMonth() + 1).padStart(2, "0")}-${String(period.start.getDate()).padStart(2, "0")}`;
  const filename = `lawlink-report-${periodKey}-${startTag}.xlsx`;
  const arr = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  return new NextResponse(arr, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Length": String(buf.byteLength),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
    }
  });
}