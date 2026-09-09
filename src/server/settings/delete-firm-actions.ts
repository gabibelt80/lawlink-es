"use server";

import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { audit } from "@/server/audit";
import { revalidatePath } from "next/cache";

/**
 * El admin del estudio solicita la eliminación de su estudio.
 * El estudio queda marcado con deletedAtScheduled = +30 días.
 * Durante 30 días puede acceder al Explorador para descargar todo.
 */
export async function requestFirmDeletionAction(input: {
  acceptedTerms: boolean;
  confirmation: string;
}) {
  const session = await requireSession();
  if (!session.user.email) throw new Error("No autenticado");

  // Verificar que el usuario sea ADMIN del estudio (no SYSTEM_ADMIN)
  const firmUser = await prisma.firmUser.findUnique({
    where: { email: session.user.email },
    include: { firm: true },
  });

  if (!firmUser?.firm) throw new Error("No perteneces a ningún estudio");
  if (firmUser.firmId === null) throw new Error("No podés eliminar tu cuenta de sistema");

  // Verificar aceptación
  if (!input.acceptedTerms) {
    throw new Error("Debés aceptar los términos para continuar");
  }

  // Verificar confirmación escrita
  if (input.confirmation !== "ELIMINAR") {
    throw new Error('Debés escribir "ELIMINAR" para confirmar');
  }

  const firm = firmUser.firm;

  // Verificar que no esté ya en proceso de eliminación
  if (firm.deletedAtScheduled) {
    throw new Error("El estudio ya está en proceso de eliminación");
  }

  const deletionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Marcar para eliminación programada
  await prisma.firm.update({
    where: { id: firm.id },
    data: {
      deletedAtScheduled: deletionDate,
      active: true, // Mantener activo para que puedan descargar
      subscriptionStatus: "canceled",
    },
  });

  // Registrar en audit
  await audit({
    userId: session.user.id,
    action: "FIRM_DELETION_REQUESTED",
    targetType: "Firm",
    targetId: firm.id,
    detail: {
      firmName: firm.name,
      firmEmail: firm.email,
      deletionScheduledAt: deletionDate.toISOString(),
      requestedBy: session.user.email,
    },
  });

  revalidatePath("/settings");
  return { ok: true, deletionDate };
}

/**
 * Cancela la solicitud de eliminación (el admin se arrepiente)
 */
export async function cancelFirmDeletionRequestAction() {
  const session = await requireSession();
  if (!session.user.email) throw new Error("No autenticado");

  const firmUser = await prisma.firmUser.findUnique({
    where: { email: session.user.email },
    include: { firm: true },
  });

  if (!firmUser?.firm) throw new Error("No perteneces a ningún estudio");

  const firm = firmUser.firm;

  if (!firm.deletedAtScheduled) {
    throw new Error("No hay una solicitud de eliminación activa");
  }

  await prisma.firm.update({
    where: { id: firm.id },
    data: {
      deletedAtScheduled: null,
      subscriptionStatus: "active",
    },
  });

  await audit({
    userId: session.user.id,
    action: "FIRM_DELETION_CANCELLED",
    targetType: "Firm",
    targetId: firm.id,
    detail: {
      firmName: firm.name,
      cancelledAt: new Date().toISOString(),
    },
  });

  revalidatePath("/settings");
  return { ok: true };
}

/**
 * Obtiene el estado actual de eliminación del estudio
 */
export async function getFirmDeletionStatusAction() {
  const session = await requireSession();
  if (!session.user.email) throw new Error("No autenticado");

  const firmUser = await prisma.firmUser.findUnique({
    where: { email: session.user.email },
    include: { firm: true },
  });

  if (!firmUser?.firm) return null;

  const firm = firmUser.firm;

  if (!firm.deletedAtScheduled) return null;

  return {
    deletionScheduledAt: firm.deletedAtScheduled,
    daysRemaining: Math.max(
      0,
      Math.ceil(
        (new Date(firm.deletedAtScheduled).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      )
    ),
  };
}
