/**
 * Asigna folderId a todos los Document huerfanos (folderId = null).
 *
 * Va a la carpeta principal del caso (la primera por orderIndex, "01. Recepcion").
 * Si el caso no tiene carpetas, no hace nada.
 *
 * Uso:
 *   npx tsx scripts/backfill-folder-ids.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("[backfill] Buscando documentos sin folderId...");

  const docs = await prisma.document.findMany({
    where: {
      matterId: { not: null },
      folderId: null,
    },
    select: { id: true, matterId: true, name: true },
  });

  console.log(`[backfill] Documentos huerfanos: ${docs.length}`);

  if (docs.length === 0) {
    console.log("[backfill] Nada que hacer.");
    await prisma.$disconnect();
    return;
  }

  // Agrupar por matterId
  const byMatter = new Map<string, typeof docs>();
  for (const d of docs) {
    if (!d.matterId) continue;
    const arr = byMatter.get(d.matterId) ?? [];
    arr.push(d);
    byMatter.set(d.matterId, arr);
  }

  let updated = 0;
  let skipped = 0;

  for (const [matterId, matterDocs] of byMatter.entries()) {
    const folder = await prisma.documentFolder.findFirst({
      where: { matterId },
      orderBy: { orderIndex: "asc" },
      select: { id: true, name: true },
    });

    if (!folder) {
      console.log(
        `[backfill] Sin carpetas para el caso ${matterId}. Se omiten ${matterDocs.length} docs.`
      );
      skipped += matterDocs.length;
      continue;
    }

    await prisma.document.updateMany({
      where: { id: { in: matterDocs.map((d) => d.id) } },
      data: { folderId: folder.id },
    });

    console.log(
      `[backfill] Caso ${matterId}: ${matterDocs.length} docs -> "${folder.name}"`
    );
    updated += matterDocs.length;
  }

  console.log("[backfill] Listo.");
  console.log(`  updated: ${updated}`);
  console.log(`  skipped: ${skipped}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});