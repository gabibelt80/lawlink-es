import { prisma } from "@/lib/prisma";

/**
 * Escribe un registro de auditorÃ­a. No lanza errores (el flujo del negocio no debe bloquearse por errores de auditorÃ­a).
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
  let resolvedUserId: string | null = null;

  if (params.userId) {
    // Verificar si el ID existe en la tabla User
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { id: true }
    });
    if (user) {
      resolvedUserId = user.id;
    }
  }

  try {
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

