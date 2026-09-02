import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 12);
  
  const admin = await prisma.firmUser.upsert({
    where: { email: "gabi@juridictas.ar" },
    update: { firmId: null },
    create: {
      name: "Gabi - Admin Sistema",
      email: "gabi@juridictas.ar",
      passwordHash,
      firmId: null,
    },
  });

  console.log("Admin del sistema creado");
  console.log(`Email: gabi@juridictas.ar`);
  console.log(`Contraseña: admin123`);
  console.log(`Firm ID: null (acceso total al panel)`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });