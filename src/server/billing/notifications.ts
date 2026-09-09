import { prisma } from "@/lib/prisma";

type NotificationData = {
  firmId: string;
  firmName: string;
  plan: string;
  planLabel: string;
  planPrice: number;
  periodEnd: Date;
  type: "renewal_reminder" | "payment_failed" | "subscription_canceled" | "payment_success";
};

/**
 * Envía notificaciones de suscripción a los usuarios del estudio
 * Por ahora genera notificaciones internas. En el futuro se puede
 * integrar con email (Resend, SendGrid) o WhatsApp.
 */
export async function sendSubscriptionNotification(data: NotificationData) {
  const { firmId, firmName, planLabel, planPrice, periodEnd, type } = data;
  
  // Obtener admin del estudio
  const firmUsers = await prisma.firmUser.findMany({
    where: { firmId },
    select: { id: true, email: true, name: true },
  });

  const periodEndFormatted = periodEnd.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const priceFormatted = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(planPrice);

  let title = "";
  let content = "";

  switch (type) {
    case "renewal_reminder":
      title = `🔔 Renovación de suscripción - ${firmName}`;
      content = `Tu plan ${planLabel} (${priceFormatted}/mes) vence el ${periodEndFormatted}. ` +
        `Realizá el pago para mantener el servicio activo sin interrupciones.`;
      break;
    case "payment_failed":
      title = `⚠️ Pago pendiente - ${firmName}`;
      content = `No se pudo procesar el pago de tu plan ${planLabel} (${priceFormatted}/mes). ` +
        `Vencía el ${periodEndFormatted}. Regularizá tu situación para evitar la suspensión del servicio.`;
      break;
    case "subscription_canceled":
      title = `❌ Suscripción cancelada - ${firmName}`;
      content = `Tu suscripción al plan ${planLabel} ha sido cancelada. ` +
        `El servicio se suspenderá el ${periodEndFormatted}.`;
      break;
    case "payment_success":
      title = `✅ Pago confirmado - ${firmName}`;
      content = `Se procesó correctamente el pago de tu plan ${planLabel} (${priceFormatted}/mes). ` +
        `Tu suscripción está activa hasta el ${periodEndFormatted}.`;
      break;
  }

  // Crear notificación para cada usuario del estudio
  for (const user of firmUsers) {
    try {
      // Intentar crear en el tenant schema
      const tenantPrisma = await import("@/lib/tenant-prisma").then(m => m.getTenantPrismaSync(firmName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50)));
      
      await tenantPrisma.notification.create({
        data: {
          userId: user.id,
          type: "SYSTEM",
          priority: type === "payment_failed" || type === "subscription_canceled" ? "HIGH" : "NORMAL",
          title,
          content,
          href: "/settings/subscription",
        },
      });
    } catch (err) {
      // Si no se puede crear en tenant, loggear
      console.log(`[billing] No se pudo crear notificación para ${user.email}:`, err);
    }
  }

  // También registrar en audit log
  try {
    await import("@/server/audit").then(({ audit }) => 
      audit({
        userId: null,
        action: `BILLING_NOTIFICATION_${type.toUpperCase()}`,
        targetType: "Firm",
        targetId: firmId,
        detail: { planLabel, planPrice, periodEnd: periodEnd.toISOString() },
      })
    );
  } catch (err) {
    console.log("[billing] Error registrando audit:", err);
  }

  return { ok: true, notifiedUsers: firmUsers.length };
}
