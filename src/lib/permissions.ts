import type { UserRole } from "@prisma/client";

export function matterVisibilityFilter(userId: string, role: UserRole) {
  if (role === "ADMIN" || role === "PRINCIPAL_LAWYER" || role === "FINANCE") return {};
  return { OR: [{ ownerId: userId }, { members: { some: { userId } } }] };
}

export function intakeVisibilityFilter(userId: string, role: UserRole) {
  if (role === "ADMIN" || role === "PRINCIPAL_LAWYER" || role === "FINANCE") return {};
  return { OR: [{ createdById: userId }, { ownerUserId: userId }] };
}

export function clientVisibilityFilter(userId: string, role: UserRole) {
  if (role === "ADMIN" || role === "PRINCIPAL_LAWYER" || role === "FINANCE") return {};
  return {
    OR: [
      {
        matters: {
          some: {
            OR: [{ ownerId: userId }, { members: { some: { userId } } }],
          },
        },
      },
      {
        intakes: {
          some: {
            OR: [{ createdById: userId }, { ownerUserId: userId }],
          },
        },
      },
    ],
  };
}

export function matterAssociationFilter(userId: string) {
  return { OR: [{ ownerId: userId }, { members: { some: { userId } } }] };
}

export function isManager(role: UserRole): boolean {
  return role === "ADMIN" || role === "PRINCIPAL_LAWYER" || role === "FINANCE";
}

export async function assertCanAccessMatter(
  userId: string,
  role: UserRole,
  matterId: string,
) {
  const { getTenantPrisma } = await import("@/lib/tenant-prisma");
  const prisma = await getTenantPrisma();
  const matter = await prisma.matter.findUnique({
    where: { id: matterId },
    select: { ownerId: true, members: { select: { userId: true } } },
  });
  if (!matter) throw new Error("Caso no encontrado");
  if (role === "ADMIN" || role === "PRINCIPAL_LAWYER" || role === "FINANCE") return;
  if (matter.ownerId === userId) return;
  if (matter.members.some((m) => m.userId === userId)) return;
  throw new Error("No tenes acceso a este caso");
}

export async function assertCanAssociateMatter(
  userId: string,
  role: UserRole,
  matterId: string,
) {
  const { getTenantPrisma } = await import("@/lib/tenant-prisma");
  const prisma = await getTenantPrisma();
  const matter = await prisma.matter.findUnique({
    where: { id: matterId },
    select: { ownerId: true, members: { select: { userId: true } } },
  });
  if (!matter) throw new Error("Caso no encontrado");
  if (role === "ADMIN" || role === "PRINCIPAL_LAWYER") return;
  if (matter.ownerId === userId) return;
  if (matter.members.some((m) => m.userId === userId)) return;
  throw new Error("No tenes acceso a este caso");
}

export async function assertCanLeadMatter(
  userId: string,
  role: UserRole,
  matterId: string,
  message?: string,
) {
  const { getTenantPrisma } = await import("@/lib/tenant-prisma");
  const prisma = await getTenantPrisma();
  const matter = await prisma.matter.findUnique({
    where: { id: matterId },
    select: {
      ownerId: true,
      members: { select: { userId: true, role: true } },
    },
  });
  if (!matter) throw new Error("Caso no encontrado");
  if (role === "ADMIN" || role === "PRINCIPAL_LAWYER") return;
  if (matter.ownerId === userId) return;
  const member = matter.members.find((m) => m.userId === userId);
  if (member && (member.role === "LEAD" || member.role === "CO_LEAD")) return;
  throw new Error(message ?? "No tenes permisos para liderar este caso");
}

export async function assertCanOwnMatter(
  userId: string,
  role: UserRole,
  matterId: string,
  message?: string,
) {
  const { getTenantPrisma } = await import("@/lib/tenant-prisma");
  const prisma = await getTenantPrisma();
  const matter = await prisma.matter.findUnique({
    where: { id: matterId },
    select: { ownerId: true },
  });
  if (!matter) throw new Error("Caso no encontrado");
  if (role === "ADMIN" || role === "PRINCIPAL_LAWYER") return;
  if (matter.ownerId !== userId) {
    throw new Error(message ?? "No sos el titular de este caso");
  }
}

export async function assertCanModifyMatter(
  userId: string,
  role: UserRole,
  matterId: string,
) {
  const { getTenantPrisma } = await import("@/lib/tenant-prisma");
  const prisma = await getTenantPrisma();
  const matter = await prisma.matter.findUnique({
    where: { id: matterId },
    select: { ownerId: true, members: { select: { userId: true } } },
  });
  if (!matter) throw new Error("Caso no encontrado");
  if (role === "ADMIN" || role === "PRINCIPAL_LAWYER") return;
  if (role === "FINANCE") return;
  if (matter.ownerId === userId) return;
  if (matter.members.some((m) => m.userId === userId)) return;
  throw new Error("No tenes permisos para modificar este caso");
}