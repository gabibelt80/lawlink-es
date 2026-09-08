import { NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { getSession } from "@/lib/auth/session";
import { storage } from "@/lib/storage";
import { ensureExt } from "@/lib/storage/mime-ext";
import { audit } from "@/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No has iniciado sesión" }, { status: 401 });
  }

  const prisma = await getTenantPrisma();

  const f = await prisma.firmFile.findUnique({
    where: { id: params.id, archivedAt: null }
  });
  if (!f) return NextResponse.json({ error: "El material no existe" }, { status: 404 });

  let buf: Buffer;
  try {
    buf = await storage.readFile(f.path);
  } catch (err) {
    console.error("[firm-files/download] Error al leer:", err);
    return NextResponse.json({ error: "Error al leer" }, { status: 500 });
  }

  const inline = new URL(req.url).searchParams.get("inline") === "1";

  await audit({
    userId: session.user.id,
    action: inline ? "FIRM_FILE_PREVIEW" : "FIRM_FILE_DOWNLOAD",
    targetType: "FirmFile",
    targetId: f.id,
    detail: { name: f.name }
  });

  const filename = ensureExt(f.name, f.mimeType);
  const arr = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  return new NextResponse(arr, {
    status: 200,
    headers: {
      "Content-Type": f.mimeType ?? "application/octet-stream",
      "Content-Length": String(buf.byteLength),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=60"
    }
  });
}