import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** ADMIN o PRINCIPAL_LAWYER — Nivel de administración, ve todos los datos */
export function isManager(role: string): boolean {
  return role === "ADMIN" || role === "PRINCIPAL_LAWYER";
}

// ============ Visibilidad de casos ============

/** Filtro para consultas de listado: devuelve fragmento Prisma where para agregar al where existente */
export function matterVisibilityFilter(
  userId: string,
  role: string
): Prisma.MatterWhereInput {
  if (isManager(role) || role === "FINANCE") return {};
  if (role === "LAWYER") {
    return {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } }
      ]
    };
  }
  // ASSISTANT
  return { members: { some: { userId } } };
}

/** Acciones de relación de caso: ADMIN / PRINCIPAL_LAWYER / FINANCE ven todo */
export function matterAssociationFilter(userId: string, role?: string): Prisma.MatterWhereInput {
  if (isManager(role ?? "") || role === "FINANCE") return {};
  return {
    OR: [
      { ownerId: userId },
      { members: { some: { userId } } }
    ]
  };
}

/** Verificación de acceso a un caso individual: si no se encuentra o no tiene permiso, throw "Caso no existe" (evita filtrar ID) */
export async function assertCanAccessMatter(
  userId: string,
  role: string,
  matterId: string
): Promise<void> {
  if (isManager(role) || role === "FINANCE") {
    const exists = await prisma.matter.findFirst({
      where: { id: matterId, deletedAt: null },
      select: { id: true }
    });
    if (!exists) throw new Error("Caso no existe");
    return;
  }
  const row = await prisma.matter.findFirst({
    where: {
      id: matterId,
      deletedAt: null,
      ...matterVisibilityFilter(userId, role)
    },
    select: { id: true }
  });
  if (!row) throw new Error("Caso no existe");
}

/** Acciones de asociación de caso: solo permite titular o miembro del caso, no se abre por rol de administración */
export async function assertCanAssociateMatter(
  userId: string,
  matterId: string,
  role?: string
): Promise<void> {
  const row = await prisma.matter.findFirst({
    where: {
      id: matterId,
      deletedAt: null,
      ...matterAssociationFilter(userId, role)
    },
    select: { id: true }
  });
  if (!row) throw new Error("Caso no existe o sin permiso de asociación");
}

/** Procesamiento de caso: solo permite titular o miembro del caso, no se abre por rol de administración */
export async function assertCanHandleMatter(
  userId: string,
  matterId: string,
  role?: string
): Promise<void> {
  const row = await prisma.matter.findFirst({
    where: {
      id: matterId,
      deletedAt: null,
      ...matterAssociationFilter(userId, role)
    },
    select: { id: true }
  });
  if (!row) throw new Error("Caso no existe o sin permiso de procesamiento");
}

/** Verificación de titular/co-titular: usado para archivo, equipo, información central, generación de escritos, etc. */
export async function assertCanLeadMatter(
  userId: string,
  matterId: string,
  message = "Solo el titular/co-titular del caso puede accionar"
): Promise<void> {
  const row = await prisma.matter.findFirst({
    where: {
      id: matterId,
      deletedAt: null,
      OR: [
        { ownerId: userId },
        { members: { some: { userId, role: { in: ["LEAD", "CO_LEAD"] } } } }
      ]
    },
    select: { id: true }
  });
  if (!row) throw new Error(message);
}

/** Verificación de titular actual: usado para cambiar equipo de trabajo, eliminar caso, etc. */
export async function assertCanOwnMatter(
  userId: string,
  matterId: string,
  message = "Solo el titular del caso puede accionar"
): Promise<void> {
  const row = await prisma.matter.findFirst({
    where: {
      id: matterId,
      deletedAt: null,
      ownerId: userId
    },
    select: { id: true }
  });
  if (!row) throw new Error(message);
}

/** Verificación de modificación: solo permite titular o miembro del caso, no se abre por rol de administración */
export async function assertCanModifyMatter(
  userId: string,
  role: string,
  matterId: string
): Promise<void> {
  const matter = await prisma.matter.findFirst({
    where: {
      id: matterId,
      deletedAt: null,
      ...matterAssociationFilter(userId, role)
    },
    select: { id: true }
  });
  if (!matter) throw new Error("Caso no existe");
}

// ============ Visibilidad de admisiones ============

export function intakeVisibilityFilter(
  userId: string,
  role: string
): Prisma.IntakeWhereInput {
  if (isManager(role)) return {};
  return {
    OR: [
      { createdById: userId },
      { ownerUserId: userId },
      { coUserIds: { has: userId } }
    ]
  };
}

// ============ Verificación genérica ============

export function assertManagerOrRole(role: string, ...allowed: string[]): void {
  if (isManager(role)) return;
  if (allowed.includes(role)) return;
  throw new Error("Permisos insuficientes");
}

/** Visibilidad de clientes */
export function clientVisibilityFilter(
  userId: string,
  role: string
): Prisma.ClientWhereInput {
  if (isManager(role) || role === "FINANCE") return {};
  return {
    OR: [
      { createdById: userId },
      { matters: { some: { matter: { ownerId: userId } } } },
      { matters: { some: { matter: { members: { some: { userId } } } } } }
    ]
  };
}