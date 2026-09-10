import { NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { getSession } from "@/lib/auth/session";
import { storage } from "@/lib/storage";
import { decryptBuffer } from "@/lib/storage/crypto";
import PizZip from "pizzip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { folderId } = await params;
  const prisma = await getTenantPrisma();

  const folder = await prisma.documentFolder.findUnique({
    where: { id: folderId },
    include: {
      matter: { select: { internalCode: true, firmCaseNo: true, title: true } },
      documents: {
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          path: true,
          encrypted: true,
          iv: true,
          authTag: true,
        },
      },
    },
  });

  if (!folder) {
    return NextResponse.json({ error: "Carpeta no encontrada" }, { status: 404 });
  }

  const zip = new PizZip();
  const folderName = `${folder.matter.firmCaseNo ?? folder.matter.internalCode} - ${folder.name}`;

  for (const doc of folder.documents) {
    try {
      const raw = await storage.readFile(doc.path);
      const buffer = doc.encrypted && doc.iv && doc.authTag
        ? decryptBuffer(raw, doc.iv, doc.authTag)
        : raw;
      zip.file(doc.name, buffer);
    } catch (err) {
      console.error(`[folder-zip] Error leyendo ${doc.name}:`, err);
      zip.file(`${doc.name}.ERROR.txt`, "No se pudo leer el archivo original.");
    }
  }

  if (folder.documents.length === 0) {
    zip.file(
      "README.txt",
      `La carpeta "${folder.name}" está vacía.\n\nCaso: ${folder.matter.firmCaseNo ?? folder.matter.internalCode} - ${folder.matter.title}`
    );
  }

  const buffer = zip.generate({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(folderName + ".zip")}`,
      "Content-Length": String(buffer.length),
    },
  });
}
