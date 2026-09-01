import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** ADMIN 或 PRINCIPAL_LAWYER — Administrar层，看所有数据 */
export function isManager(role: string): boolean {
  return role === "ADMIN" || role === "PRINCIPAL_LAWYER";
}

// ============ Caso可见性 ============

/** 列表查询用：Volver Prisma where 片段，AND 到现有 where */
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

/** Acciones/关联Caso用：不因 ADMIN / PRINCIPAL_LAWYER / FINANCE 角色放大全所范围 */
export function matterAssociationFilter(userId: string): Prisma.MatterWhereInput {
  return {
    OR: [
      { ownerId: userId },
      { members: { some: { userId } } }
    ]
  };
}

/** 单条访问断言：查不到或无权限一律 throw "Caso不存在"（避免泄露 ID） */
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
    if (!exists) throw new Error("Caso不存在");
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
  if (!row) throw new Error("Caso不存在");
}

/** Acciones/关联断言：只允许主办或Caso成员，不因Administrar角色放开 */
export async function assertCanAssociateMatter(
  userId: string,
  matterId: string
): Promise<void> {
  const row = await prisma.matter.findFirst({
    where: {
      id: matterId,
      deletedAt: null,
      ...matterAssociationFilter(userId)
    },
    select: { id: true }
  });
  if (!row) throw new Error("Caso不存在或无权关联");
}

/** Caso处理断言：只允许主办或Caso成员，不因Administrar角色放开 */
export async function assertCanHandleMatter(
  userId: string,
  matterId: string
): Promise<void> {
  const row = await prisma.matter.findFirst({
    where: {
      id: matterId,
      deletedAt: null,
      ...matterAssociationFilter(userId)
    },
    select: { id: true }
  });
  if (!row) throw new Error("Caso不存在或无权处理");
}

/** 主办/协办断言：用于归档、团队、核心信息、文书生成等较敏感处理 */
export async function assertCanLeadMatter(
  userId: string,
  matterId: string,
  message = "仅Caso主办/协办可Acciones"
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

/** 当前主办Abogado断言：用于变更承办团队、EliminarCaso等所有权级Acciones */
export async function assertCanOwnMatter(
  userId: string,
  matterId: string,
  message = "仅Caso主办Abogado可Acciones"
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

/** 修改断言：只允许主办或Caso成员，不因Administrar角色放开 */
export async function assertCanModifyMatter(
  userId: string,
  _role: string,
  matterId: string
): Promise<void> {
  const matter = await prisma.matter.findFirst({
    where: {
      id: matterId,
      deletedAt: null,
      ...matterAssociationFilter(userId)
    },
    select: { id: true }
  });
  if (!matter) throw new Error("Caso不存在");
}

// ============ 收案可见性 ============

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

// ============ Cliente可见性 ============

/** Cliente通过关联的Caso判断可见性；manager/finance 看Ver todos */
export function clientVisibilityFilter(
  userId: string,
  role: string
): Prisma.ClientWhereInput {
  if (isManager(role) || role === "FINANCE") return {};
  return {
    OR: [
      { matters: { some: { deletedAt: null, ...matterVisibilityFilter(userId, role) } } },
      { intakes: { some: intakeVisibilityFilter(userId, role) } }
    ]
  };
}

// ============ 通用断言 ============

export function assertManagerOrRole(role: string, ...allowed: string[]): void {
  if (isManager(role)) return;
  if (allowed.includes(role)) return;
  throw new Error("权限不足");
}
