import { NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { getSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { buildArchiveZip } from "@/server/archive/export";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { matterId: string } },
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json(
      { error: "No has iniciado sesión" },
      { status: 401 },
    );
  }

  const prisma = await getTenantPrisma();

  // Permisos: ADMIN / PRINCIPAL_LAWYER o miembro del Caso
  const matter = await prisma.matter.findUnique({
    where: { id: params.matterId },
    select: { id: true, status: true, internalCode: true },
  });
  if (!matter)
    return NextResponse.json({ error: "El caso no existe" }, { status: 404 });
  if (matter.status !== "ARCHIVED") {
    return NextResponse.json(
      { error: "El caso aún no está archivado" },
      { status: 400 },
    );
  }

  if (
    session.user.role !== "ADMIN" &&
    session.user.role !== "PRINCIPAL_LAWYER"
  ) {
    const member = await prisma.matterMember.findUnique({
      where: {
        matterId_userId: { matterId: matter.id, userId: session.user.id },
      },
    });
    if (!member) {
      return NextResponse.json(
        { error: "No tienes permisos para acceder" },
        { status: 403 },
      );
    }
  }

  let result;
  try {
    result = await buildArchiveZip(params.matterId);
  } catch (err) {
    console.error("[archive export] Error al construir:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al exportar" },
      { status: 500 },
    );
  }

  // Persistir path + checksum al último ArchiveRecord
  try {
    const storagePath = await storage.writeFile(
      `archive_${matter.id}`,
      result.buffer,
    );
    await prisma.archiveRecord.updateMany({
      where: { matterId: matter.id },
      data: { exportPath: storagePath, checksum: result.checksum },
    });
  } catch (err) {
    console.error("[archive export] Error al guardar (no bloquea la descarga):", err);
  }

  await audit({
    userId: session.user.id,
    action: "ARCHIVE_EXPORT",
    targetType: "Matter",
    targetId: matter.id,
    detail: { size: result.size, checksum: result.checksum },
  });

  const ab = result.buffer.buffer.slice(
    result.buffer.byteOffset,
    result.buffer.byteOffset + result.buffer.byteLength,
  ) as ArrayBuffer;

  return new NextResponse(ab, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(result.size),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(result.fileName)}`,
    },
  });
}