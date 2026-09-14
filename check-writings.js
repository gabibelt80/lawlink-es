const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  for (const schema of ['public', 'juridictas_juridictas']) {
    try {
      const rows = await p.$queryRawUnsafe(`SELECT id, name, "docxPath" FROM "${schema}"."WritingTemplate" LIMIT 20`);
      console.log(`\n${schema}: ${rows.length} escritos`);
      rows.forEach(r => console.log(`  - ${r.name} | ${r.docxPath}`));
    } catch (e) {
      console.log(`${schema}: ERROR - ${e.message}`);
    }
  }
  await p.$disconnect();
})();