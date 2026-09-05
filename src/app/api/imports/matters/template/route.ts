import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/options";
import { buildMatterImportTemplate } from "@/server/imports/template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "PRINCIPAL_LAWYER") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  let buf: Buffer;
  try {
    buf = await buildMatterImportTemplate();
  } catch (err) {
    console.error("[imports/template] Error al generar:", err);
    return NextResponse.json({ error: "Error al generar la plantilla" }, { status: 500 });
  }

  const filename = "juridictas-plantilla-importacion-casos.xlsx";
  const arr = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  return new NextResponse(arr, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Length": String(buf.byteLength),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
    }
  });
}
