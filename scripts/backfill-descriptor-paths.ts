/**
 * Backfill de descriptorRoots y descriptorPaths en Jurisprudence.
 *
 * Lee los "descriptors" crudos (JSON) y extrae:
 *   - descriptorRoots: ["Derecho civil", "Derecho laboral"]
 *   - descriptorPaths: ["Derecho civil/sucesiones", "Derecho civil/sucesiones/herencia", ...]
 *
 * Correlo SOLO en el server, contra la DB de produccion.
 *   npx tsx scripts/backfill-descriptor-paths.ts
 */

import { PrismaClient } from "@prisma/client";
import { extractDescriptorPaths } from "../src/lib/saij/descriptor-parser";

const prisma = new PrismaClient();
const BATCH_SIZE = 500;

async function main() {
  console.log("[backfill] Leyendo fallos con descriptors...");

  let updated = 0;
  let skipped = 0;
  let cursor: string | undefined = undefined;

  const total = await prisma.jurisprudence.count();
  console.log(`[backfill] Total fallos: ${total}`);

  while (true) {
    const batch = await prisma.jurisprudence.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: { id: true, descriptors: true },
    });

    if (batch.length === 0) break;
    cursor = batch[batch.length - 1].id;

    for (const item of batch) {
      if (!item.descriptors) {
        skipped++;
        continue;
      }

      const { roots, paths } = extractDescriptorPaths(item.descriptors);

      if (roots.length === 0 && paths.length === 0) {
        skipped++;
        continue;
      }

      await prisma.jurisprudence.update({
        where: { id: item.id },
        data: {
          descriptorRoots: roots,
          descriptorPaths: paths,
        },
      });
      updated++;
    }

    console.log(
      `[backfill] Procesados ${updated + skipped}/${total} | updated=${updated} skipped=${skipped}`
    );
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