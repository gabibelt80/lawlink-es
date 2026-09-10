"use server";

import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getPlan, PlanKey } from "@/lib/plans";
import { revalidatePath } from "next/cache";
import { canChangePlan } from "@/lib/plan-hierarchy";

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

  if (!canChangePlan(firm.plan, targetPlan)) {
    throw new Error(
      `No podés cambiar del plan ${getPlan(firm.plan).label} al plan ${getPlan(targetPlan).label}. ` +
      `Solo se permiten upgrades.`
    );
  }

  const plan = getPlan(targetPlan);

  if (plan.price === 0) {
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

  // Plan pago: SIEMPRE crear checkout de MP, SIN simulación
  const { createSubscription } = await import("@/server/billing/mercado-pago");
  const subscription = await createSubscription(firm.id);

  if (!subscription?.init_point) {
    throw new Error(
      "Mercado Pago no devolvió la URL de pago. Verificá la configuración de tu cuenta."
    );
  }

  await prisma.systemSetting.upsert({
    where: { key: `pendingPlan_${firm.id}` },
    update: {
      value: { planKey: targetPlan, requestedAt: new Date().toISOString() },
    },
    create: {
      key: `pendingPlan_${firm.id}`,
      value: { planKey: targetPlan, requestedAt: new Date().toISOString() },
    },
  });

  return {
    ok: true,
    requiresPayment: true,
    checkoutUrl: subscription.init_point,
  };
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

/**
 * Crea un checkout de Mercado Pago para el plan actual.
 * Usado por el botón "Pagar ahora" cuando el estudio está en past_due.
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

  const { createSubscription } = await import("@/server/billing/mercado-pago");
  const subscription = await createSubscription(firm.id);

  if (!subscription?.init_point) {
    throw new Error("Mercado Pago no devolvió URL de checkout");
  }

  return { ok: true, checkoutUrl: subscription.init_point };
}
