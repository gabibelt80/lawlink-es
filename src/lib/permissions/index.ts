import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** ADMIN æˆ– PRINCIPAL_LAWYER â€” Administrarå±‚ï¼Œçœ‹æ‰€æœ‰æ•°æ® */
export function isManager(role: string): boolean {
  return role === "ADMIN" || role === "PRINCIPAL_LAWYER";
}

// ============ Casoå¯è§æ€§ ============

/** åˆ—è¡¨æŸ¥è¯¢ç”¨ï¼šVolver Prisma where ç‰‡æ®µï¼ŒAND åˆ°çŽ°æœ‰ where */
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

/** Acciones/å…³è”Casoç”¨ï¼šä¸å›  ADMIN / PRINCIPAL_LAWYER / FINANCE Rolæ”¾å¤§å…¨æ‰€èŒƒå›´ */
export function matterAssociationFilter(userId: string): Prisma.MatterWhereInput {
  return {
    OR: [
      { ownerId: userId },
      { members: { some: { userId } } }
    ]
  };
}

/** å•æ¡è®¿é—®æ–­è¨€ï¼šæŸ¥ä¸åˆ°æˆ–æ— æƒé™ä¸€å¾‹ throw "Casoä¸å­˜åœ¨"ï¼ˆé¿å…æ³„éœ² IDï¼‰ */
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
    if (!exists) throw new Error("Casoä¸å­˜åœ¨");
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
  if (!row) throw new Error("Casoä¸å­˜åœ¨");
}

/** Acciones/å…³è”æ–­è¨€ï¼šåªå…è®¸ä¸»åŠžæˆ–Casoæˆå‘˜ï¼Œä¸å› AdministrarRolæ”¾å¼€ */
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
  if (!row) throw new Error("Casoä¸å­˜åœ¨æˆ–æ— æƒå…³è”");
}

/** Casoå¤„ç†æ–­è¨€ï¼šåªå…è®¸ä¸»åŠžæˆ–Casoæˆå‘˜ï¼Œä¸å› AdministrarRolæ”¾å¼€ */
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
  if (!row) throw new Error("Casoä¸å­˜åœ¨æˆ–æ— æƒå¤„ç†");
}

/** ä¸»åŠž/ååŠžæ–­è¨€ï¼šç”¨äºŽå½’æ¡£ã€å›¢é˜Ÿã€æ ¸å¿ƒä¿¡æ¯ã€æ–‡ä¹¦ç”Ÿæˆetc.è¾ƒæ•æ„Ÿå¤„ç† */
export async function assertCanLeadMatter(
  userId: string,
  matterId: string,
  message = "ä»…Casoä¸»åŠž/ååŠžå¯Acciones"
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

/** å½“å‰ä¸»åŠžAbogadoæ–­è¨€ï¼šç”¨äºŽå˜æ›´æ‰¿åŠžå›¢é˜Ÿã€EliminarCasoetc.æ‰€æœ‰æƒçº§Acciones */
export async function assertCanOwnMatter(
  userId: string,
  matterId: string,
  message = "ä»…Casoä¸»åŠžAbogadoå¯Acciones"
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

/** ä¿®æ”¹æ–­è¨€ï¼šåªå…è®¸ä¸»åŠžæˆ–Casoæˆå‘˜ï¼Œä¸å› AdministrarRolæ”¾å¼€ */
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
  if (!matter) throw new Error("Casoä¸å­˜åœ¨");
}

// ============ æ”¶æ¡ˆå¯è§æ€§ ============

export function intakeVisibilityFilter(
  userId: string,
  role: string
): Prisma.IntakeWhereInput {
  if (isManager(role)) return {};
  return {
    OR: [
      { createdById: userId },
      { ownerUserId: userId },
      { coUserIds: { array_contains: userId } }
    ]
  };
}

// ============ Clienteå¯è§æ€§ ============

/** ClienteAprobarå…³è”çš„Casoåˆ¤æ–­å¯è§æ€§ï¼›manager/finance çœ‹Ver todos */
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

// ============ é€šç”¨æ–­è¨€ ============

export function assertManagerOrRole(role: string, ...allowed: string[]): void {
  if (isManager(role)) return;
  if (allowed.includes(role)) return;
  throw new Error("æƒé™ä¸è¶³");
}

