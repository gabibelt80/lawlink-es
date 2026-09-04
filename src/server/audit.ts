import { getTenantPrisma } from "@/lib/tenant-prisma";

/**
 * Escribe un registro de auditoria. No lanza errores (el flujo del negocio no debe bloquearse por errores de auditoria).
 */
export async function audit(params: {
  userId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  detail?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}) {
  try {
    const prisma = await getTenantPrisma();

    let resolvedUserId: string | null = null;

    if (params.userId) {
      // Buscar el usuario en el tenant por ID
      const user = await prisma.user.findUnique({
        where: { id: params.userId },
        select: { id: true }
      });
      if (user) {
        resolvedUserId = user.id;
      } else {
        // Si no se encuentra por ID, buscar por email (para FirmUser del central)
        const firmUser = await prisma.user.findFirst({
          where: { email: params.userId },
          select: { id: true }
        });
        if (firmUser) {
          resolvedUserId = firmUser.id;
        }
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: resolvedUserId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        detail: params.detail as object | undefined,
        ip: params.ip,
        userAgent: params.userAgent
      }
    });
  } catch (err) {
    console.error("[audit] Error al escribir:", err);
  }
}