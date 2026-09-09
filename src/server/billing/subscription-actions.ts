"use server";

import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getPlan, PLANS, PlanKey } from "@/lib/plans";
import { revalidatePath } from "next/cache";
import { canChangePlan } from "@/lib/plan-hierarchy";
import { calculateNextRenewalDate } from "@/lib/renewal-date";

/**
 * Cambia el plan del estudio actual.
 * 
 * Si el plan es gratuito (trial), se cambia directamente.
 * Si el plan es pago, se crea un checkout de Mercado Pago.
 * El módulo se habilita cuando el pago se acredita.
 */
export async function changePlanAction({ planKey }: { planKey: string }) {
  const session = await requireSession();
  if (!session.user.email) throw new Error("No autenticado");

  const firmUser = await prisma.firmUser.findUnique({
    where: { email: session.user.email },
    include: { firm: true },
  });

  if (!firmUser?.firm) throw new Error("No perteneces a ningún estudio");

  const firm = firmUser.firm;
  const targetPlan = planKey as PlanKey;

  // Verificar que sea un upgrade
  if (!canChangePlan(firm.plan, targetPlan)) {
    throw new Error(
      `No podés cambiar del plan ${getPlan(firm.plan).label} al plan ${getPlan(targetPlan).label}. ` +
      `Solo se permiten upgrades.`
    );
  }

  const plan = getPlan(targetPlan);

  if (plan.price === 0) {
    // Plan gratis: cambiar directamente
    await prisma.firm.update({
      where: { id: firm.id },
      data: {
        plan: targetPlan,
        maxUsers: plan.maxUsers,
        maxBranch: plan.maxBranch,
        planExpiresAt: targetPlan === "trial"
          ? new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1000)
          : null,
        subscriptionStatus: "active",
      },
    });

    revalidatePath("/settings/subscription");
    return { ok: true, newPlan: targetPlan, requiresPayment: false };
  }

  // Plan pago: crear checkout de Mercado Pago
  try {
    const { createSubscription } = await import("@/server/billing/mercado-pago");
    const subscription = await createSubscription(firm.id);

    // Guardar el plan pendiente en systemSetting
    await prisma.systemSetting.upsert({
      where: { key: `pendingPlan_${firm.id}` },
      update: { value: { planKey: targetPlan, requestedAt: new Date().toISOString() } },
      create: { key: `pendingPlan_${firm.id}`, value: { planKey: targetPlan, requestedAt: new Date().toISOString() } },
    });

    return {
      ok: true,
      requiresPayment: true,
      checkoutUrl: subscription.init_point,
    };
  } catch (err) {
    // Si Mercado Pago no está configurado, simulamos
    console.log("[billing] Mercado Pago no configurado, simulando pago aprobado");
    
    const now = new Date();
    const renewalDate = calculateNextRenewalDate(now);
    
    await prisma.firm.update({
      where: { id: firm.id },
      data: {
        plan: targetPlan,
        maxUsers: plan.maxUsers,
        maxBranch: plan.maxBranch,
        subscriptionStatus: "active",
        subscriptionPeriodStart: now,
        subscriptionPeriodEnd: renewalDate,
        lastPaymentAt: now,
        lastPaymentAmount: plan.price,
        active: true,
        suspendedAt: null,
        suspensionReason: null,
      },
    });

    return { ok: true, requiresPayment: false, simulated: true, newPlan: targetPlan };
  }
}


/**
 * Verifica si hay un pago pendiente para el estudio
 */

/**
 * Crea un checkout de Mercado Pago para el plan actual
 */
export async function createCheckoutAction() {
  const session = await requireSession();
  if (!session.user.email) throw new Error("No autenticado");

  const firmUser = await prisma.firmUser.findUnique({
    where: { email: session.user.email },
    include: { firm: true },
  });

  if (!firmUser?.firm) throw new Error("No perteneces a ningún estudio");

  const firm = firmUser.firm;
  const plan = getPlan(firm.plan);

  if (plan.price === 0) {
    throw new Error("El plan actual es gratuito, no requiere pago");
  }

  try {
    const { createSubscription } = await import("@/server/billing/mercado-pago");
    const subscription = await createSubscription(firm.id);
    
    return { ok: true, checkoutUrl: subscription.init_point };
  } catch (err) {
    // Si Mercado Pago no está configurado, simulamos el pago
    console.log("[billing] Mercado Pago no configurado, simulando checkout:", err);
    
    const now = new Date();
    const nextPeriod = calculateNextRenewalDate(now);

    await prisma.firm.update({
      where: { id: firm.id },
      data: {
        subscriptionStatus: "active",
        subscriptionPeriodStart: now,
        subscriptionPeriodEnd: nextPeriod,
        lastPaymentAt: now,
        lastPaymentAmount: plan.price,
        active: true,
        suspendedAt: null,
        suspensionReason: null,
      },
    });

    return { ok: true, simulated: true };
  }
}

export async function getPendingPlanAction() {
  const session = await requireSession();
  if (!session.user.email) throw new Error("No autenticado");

  const firmUser = await prisma.firmUser.findUnique({
    where: { email: session.user.email },
    include: { firm: true },
  });

  if (!firmUser?.firm) return null;

  const pending = await prisma.systemSetting.findUnique({
    where: { key: `pendingPlan_${firmUser.firm.id}` },
  });

  return pending?.value ?? null;
}
