const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const firms = await p.firm.findMany({ select: { id: true, name: true, slug: true, plan: true } });
  console.log('ESTUDIOS:');
  firms.forEach(f => console.log(` - ${f.name} (slug: ${f.slug}, plan: ${f.plan})`));
  
  const users = await p.firmUser.findMany({
    select: { email: true, firm: { select: { slug: true } } }
  });
  console.log('\nUSUARIOS:');
  users.forEach(u => console.log(` - ${u.email} → ${u.firm?.slug ?? 'SIN FIRM'}`));
  
  await p.$disconnect();
})();