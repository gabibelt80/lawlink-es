import { NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { getSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { storage } from "@/lib/storage";
import { decryptBuffer } from "@/lib/storage/crypto";
import { normalizeUploadedFilename } from "@/lib/filename";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  // ?inline=1 muestra en el navegador (PDF/imagen/texto), sino descarga
  const inline = new URL(req.url).searchParams.get("inline") === "1";
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No has iniciado sesión" }, { status: 401 });
  }

  const prisma = await getTenantPrisma();

  const doc = await prisma.document.findFirst({
    where: { id: params.id, deletedAt: null }
  });
  if (!doc) return NextResponse.json({ error: "El material no existe" }, { status: 404 });

  // Permisos: ADMIN / PRINCIPAL_LAWYER pueden ver todos; otros roles solo si son miembros del Caso
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    if (doc.matterId) {
      const member = await prisma.matterMember.findUnique({
        where: { matterId_userId: { matterId: doc.matterId, userId: session.user.id } }
      });
      if (!member) {
        return NextResponse.json({ error: "Sin permiso de acceso" }, { status: 403 });
      }
    } else if (doc.intakeId) {
      const intake = await prisma.intake.findUnique({
        where: { id: doc.intakeId },
        select: { createdById: true, ownerUserId: true, coUserIds: true }
      });
      const uid = session.user.id;
      const allowed =
        !!intake &&
        (intake.createdById === uid ||
          intake.ownerUserId === uid ||
          (intake.coUserIds as string[]).includes(uid));
      if (!allowed) {
        return NextResponse.json({ error: "Sin permiso de acceso" }, { status: 403 });
      }
    }
  }

  let buf: Buffer;
  try {
    const stored = await storage.readFile(doc.path);
    if (doc.encrypted) {
      if (!doc.iv || !doc.authTag) {
        return NextResponse.json({ error: "Datos cifrados dañados" }, { status: 500 });
      }
      buf = decryptBuffer(stored, doc.iv, doc.authTag);
    } else {
      buf = stored;
    }
  } catch (err) {
    console.error("[download] Error al leer:", err);
    return NextResponse.json({ error: "Error al leer" }, { status: 500 });
  }

  await audit({
    userId: session.user.id,
    action: "DOCUMENT_DOWNLOAD",
    targetType: "Document",
    targetId: doc.id,
    detail: { matterId: doc.matterId, intakeId: doc.intakeId, name: doc.name }
  });

  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  const filename = normalizeUploadedFilename(doc.name);

  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": doc.mimeType ?? "application/octet-stream",
      "Content-Length": String(buf.byteLength),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(filename)}`
    }
  });
}