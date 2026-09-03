import { PrismaClient } from "@prisma/client";
import { centralPrisma } from "@/lib/tenant-prisma";

// Para compatibilidad: prisma apunta al schema central
export const prisma = centralPrisma;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Mantener compatibilidad con cÃ³digo existente
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}
