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
  { params }: { params: Promise<{ matterId: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { matterId } = await params;
  const prisma = await getTenantPrisma();

  const matter = await prisma.matter.findUnique({
    where: { id: matterId, deletedAt: null },
    include: {
      folders: {
        orderBy: { orderIndex: "asc" },
        include: {
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
      },
      documents: {
        where: { deletedAt: null, folderId: null },
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

  if (!matter) {
    return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });
  }

  const zip = new PizZip();
  const matterName = `${matter.firmCaseNo ?? matter.internalCode} - ${matter.title}`;

  for (const doc of matter.documents) {
    try {
      const raw = await storage.readFile(doc.path);
      const buffer = doc.encrypted && doc.iv && doc.authTag
        ? decryptBuffer(raw, doc.iv, doc.authTag)
        : raw;
      zip.file(doc.name, buffer);
    } catch (err) {
      console.error(`[matter-zip] Error leyendo ${doc.name}:`, err);
      zip.file(`${doc.name}.ERROR.txt`, "No se pudo leer el archivo original.");
    }
  }

  for (const folder of matter.folders) {
    const folderPath = `${folder.name}/`;
    if (folder.documents.length === 0) {
      zip.file(`${folderPath}.gitkeep`, "");
    }
    for (const doc of folder.documents) {
      try {
        const raw = await storage.readFile(doc.path);
        const buffer = doc.encrypted && doc.iv && doc.authTag
          ? decryptBuffer(raw, doc.iv, doc.authTag)
          : raw;
        zip.file(`${folderPath}${doc.name}`, buffer);
      } catch (err) {
        console.error(`[matter-zip] Error leyendo ${doc.name}:`, err);
        zip.file(`${folderPath}${doc.name}.ERROR.txt`, "No se pudo leer el archivo original.");
      }
    }
  }

  zip.file("README.txt", [
    `Caso: ${matter.firmCaseNo ?? matter.internalCode}`,
    `Título: ${matter.title}`,
    `Descargado: ${new Date().toLocaleString("es-AR")}`,
    `Descargado por: ${session.user.email ?? ""}`,
    "",
    `Total carpetas: ${matter.folders.length}`,
    `Total documentos: ${matter.folders.reduce((acc, f) => acc + f.documents.length, 0) + matter.documents.length}`,
  ].join("\n"));

  const buffer = zip.generate({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(matterName + ".zip")}`,
      "Content-Length": String(buffer.length),
    },
  });
}
