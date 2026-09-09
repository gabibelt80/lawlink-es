import { prisma } from "@/lib/prisma";
import { PLANS, getPlan } from "@/lib/plans";
import { sendSubscriptionNotification } from "@/server/billing/notifications";

/**
 * Job de facturación automática
 * 
 * 1. Detecta suscripciones que vencen en los próximos 7 días → envía notificación de renovación
 * 2. Detecta suscripciones vencidas → marca como past_due y envía notificación de suspensión
 * 3. Para suscripciones activas con período vencido → intenta cobro automático con Mercado Pago
 */
export async function scanSubscriptions() {
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const results = {
    renewalNotices: 0,
    pastDueMarked: 0,
    suspended: 0,
    paymentsAttempted: 0,
    errors: [] as string[],
  };

  // 1. Suscripciones que vencen pronto (próximos 7 días)
  const upcomingRenewals = await prisma.firm.findMany({
    where: {
      active: true,
      deletedAt: null,
      deletedAtScheduled: null,
      suspendedAt: null,
      subscriptionStatus: "active",
      subscriptionPeriodEnd: {
        gte: now,
        lte: sevenDaysFromNow,
      },
    },
  });

  for (const firm of upcomingRenewals) {
    try {
      await sendSubscriptionNotification({
        firmId: firm.id,
        firmName: firm.name,
        plan: firm.plan,
        planLabel: getPlan(firm.plan).label,
        planPrice: getPlan(firm.plan).price,
        periodEnd: firm.subscriptionPeriodEnd!,
        type: "renewal_reminder",
      });
      results.renewalNotices++;
    } catch (err) {
      results.errors.push(`Error notificando renovación a ${firm.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 2. Suscripciones vencidas (más de 7 días sin pago)
  const pastDueFirms = await prisma.firm.findMany({
    where: {
      active: true,
      deletedAt: null,
      deletedAtScheduled: null,
      suspendedAt: null,
      subscriptionStatus: "active",
      subscriptionPeriodEnd: {
        lt: now,
      },
    },
  });

  for (const firm of pastDueFirms) {
    // Si vence hace menos de 7 días, marcar como past_due
    const daysPastDue = Math.floor((now.getTime() - firm.subscriptionPeriodEnd!.getTime()) / (24 * 60 * 60 * 1000));
    
    if (daysPastDue <= 7) {
      await prisma.firm.update({
        where: { id: firm.id },
        data: { subscriptionStatus: "past_due" },
      });
      results.pastDueMarked++;
      
      await sendSubscriptionNotification({
        firmId: firm.id,
        firmName: firm.name,
        plan: firm.plan,
        planLabel: getPlan(firm.plan).label,
        planPrice: getPlan(firm.plan).price,
        periodEnd: firm.subscriptionPeriodEnd!,
        type: "payment_failed",
      });
    }
    
    // Si vence hace más de 30 días, suspender
    if (daysPastDue > 30) {
      await prisma.firm.update({
        where: { id: firm.id },
        data: {
          subscriptionStatus: "suspended",
          active: false,
          suspendedAt: now,
          suspensionReason: "Suscripción vencida +30 días sin pago",
        },
      });
      results.suspended++;
    }
  }

  // 3. Intentar cobro automático para past_due con Mercado Pago
  const pastDueForPayment = await prisma.firm.findMany({
    where: {
      subscriptionStatus: "past_due",
      paymentProvider: "mercado_pago",
      paymentProviderSubscriptionId: { not: null },
      deletedAt: null,
      suspendedAt: null,
    },
  });

  for (const firm of pastDueForPayment) {
    try {
      const { attemptAutoPayment } = await import("@/server/billing/mercado-pago");
      await attemptAutoPayment(firm);
      results.paymentsAttempted++;
    } catch (err) {
      results.errors.push(`Error cobrando a ${firm.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return results;
}
