import { getTenantPrismaSync } from "./src/lib/tenant-prisma";

async function main() {
  const tenant = getTenantPrismaSync('juridictas');
  console.log('Matters:', await tenant.matter.count());
  console.log('Intakes:', await tenant.intake.count());
  console.log('Documents:', await tenant.document.count());
  console.log('Clients:', await tenant.client.count());
  console.log('Parties:', await tenant.party.count());
  console.log('Folders:', await tenant.documentFolder.count());
  console.log('FirmFiles:', await tenant.firmFile.count());
  console.log('DocumentTemplates:', await tenant.documentTemplate.count());
  await tenant.$disconnect();
}
main();
