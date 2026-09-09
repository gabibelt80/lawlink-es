import { prisma } from "@/lib/prisma";
import { getPlan } from "@/lib/plans";

/**
 * Integración con Mercado Pago para cobros recurrentes
 * 
 * Para producción, se necesita:
 * 1. Crear una aplicación en https://www.mercadopago.com.ar/developers/panel
 * 2. Obtener ACCESS_TOKEN
 * 3. Configurar la URL de notificación (webhook) en https://juridictas.ar/api/billing/mercadopago/webhook
 * 
 * Variables de entorno necesarias:
 * MERCADO_PAGO_ACCESS_TOKEN
 * MERCADO_PAGO_PUBLIC_KEY
 * MERCADO_PAGO_CLIENT_ID
 * MERCADO_PAGO_CLIENT_SECRET
 */

const MP_API = "https://api.mercadopago.com";

function getAccessToken(): string {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error("MERCADO_PAGO_ACCESS_TOKEN no configurado");
  }
  return token;
}

/**
 * Crea o actualiza un cliente en Mercado Pago para facturación recurrente
 */
export async function createOrUpdateCustomer(firmId: string) {
  const firm = await prisma.firm.findUnique({
    where: { id: firmId },
    include: { users: { take: 1 } },
  });

  if (!firm) throw new Error("Estudio no encontrado");

  const adminUser = firm.users[0];
  if (!adminUser) throw new Error("No hay usuario administrador");

  const accessToken = getAccessToken();

  if (firm.paymentProviderCustomerId) {
    // Actualizar cliente existente
    const response = await fetch(`${MP_API}/v1/customers/${firm.paymentProviderCustomerId}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: firm.email,
        description: `Estudio jurídico: ${firm.name}`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error actualizando cliente: ${response.statusText}`);
    }

    const data = await response.json();
    return data.id;
  }

  // Crear nuevo cliente
  const response = await fetch(`${MP_API}/v1/customers`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: firm.email,
      description: `Estudio jurídico: ${firm.name}`,
      identification: {
        type: "email",
        number: firm.email,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Error creando cliente: ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  
  await prisma.firm.update({
    where: { id: firmId },
    data: { paymentProviderCustomerId: data.id },
  });

  return data.id;
}

/**
 * Crea una suscripción en Mercado Pago
 */
export async function createSubscription(firmId: string) {
  const firm = await prisma.firm.findUnique({ where: { id: firmId } });
  if (!firm) throw new Error("Estudio no encontrado");

  const plan = getPlan(firm.plan);
  const customerId = firm.paymentProviderCustomerId || await createOrUpdateCustomer(firmId);
  const accessToken = getAccessToken();

  const response = await fetch(`${MP_API}/preapproval`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      payer_email: firm.email,
      reason: `Suscripción LawLink - Plan ${plan.label}`,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: plan.price,
        currency_id: "ARS",
      },
      back_url: `https://juridictas.ar/admin/subscriptions`,
      status: "authorized",
      external_reference: firm.id,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Error creando suscripción: ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  
  await prisma.firm.update({
    where: { id: firmId },
    data: { paymentProviderSubscriptionId: data.id },
  });

  return data;
}

/**
 * Cancela una suscripción en Mercado Pago
 */
export async function cancelSubscription(firmId: string) {
  const firm = await prisma.firm.findUnique({ where: { id: firmId } });
  if (!firm) throw new Error("Estudio no encontrado");

  if (!firm.paymentProviderSubscriptionId) {
    throw new Error("No hay suscripción activa en Mercado Pago");
  }

  const accessToken = getAccessToken();

  const response = await fetch(`${MP_API}/preapproval/${firm.paymentProviderSubscriptionId}`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "cancelled" }),
  });

  if (!response.ok) {
    throw new Error(`Error cancelando suscripción: ${response.statusText}`);
  }

  await prisma.firm.update({
    where: { id: firmId },
    data: {
      subscriptionStatus: "canceled",
      paymentProviderSubscriptionId: null,
    },
  });

  return { ok: true };
}

/**
 * Intenta cobro automático para suscripciones past_due
 */
export async function attemptAutoPayment(firm: any) {
  const plan = getPlan(firm.plan);
  
  // Crear un pago directo (no recurrente) para el monto pendiente
  const accessToken = getAccessToken();

  const response = await fetch(`${MP_API}/v1/payments`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transaction_amount: plan.price,
      token: null, // Requiere token de tarjeta guardada
      description: `Pago pendiente LawLink - ${firm.name}`,
      payment_method_id: "account_money",
      payer: {
        email: firm.email,
      },
      external_reference: firm.id,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.log(`[billing] Error auto-pago para ${firm.name}:`, errorData);
    return { ok: false, error: errorData };
  }

  const data = await response.json();

  if (data.status === "approved") {
    // Actualizar período de suscripción
    const now = new Date();
    const nextPeriod = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    await prisma.firm.update({
      where: { id: firm.id },
      data: {
        subscriptionStatus: "active",
        subscriptionPeriodStart: now,
        subscriptionPeriodEnd: nextPeriod,
        lastPaymentAt: now,
        lastPaymentAmount: plan.price,
      },
    });
  }

  return data;
}

/**
 * Procesa webhook de Mercado Pago
 */
export async function processWebhook(body: any) {
  console.log("[billing] Webhook Mercado Pago recibido:", JSON.stringify(body));

  if (body.type === "payment") {
    const paymentId = body.data?.id;
    if (!paymentId) return { ok: false, error: "No payment id" };

    // Obtener detalles del pago
    const accessToken = getAccessToken();
    const response = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
      headers: { "Authorization": `Bearer ${accessToken}` },
    });

    if (!response.ok) return { ok: false, error: "Error fetching payment" };

    const payment = await response.json();
    const firmId = payment.external_reference;

    if (payment.status === "approved" && firmId) {
      const firm = await prisma.firm.findUnique({ where: { id: firmId } });
      if (firm) {
        // Verificar si hay un plan pendiente de activación
        const pendingPlanRow = await prisma.systemSetting.findUnique({
          where: { key: `pendingPlan_${firmId}` },
        });

        let targetPlan = firm.plan;
        if (pendingPlanRow?.value && typeof pendingPlanRow.value === "object") {
          const pending = pendingPlanRow.value as { planKey?: string };
          if (pending.planKey) {
            targetPlan = pending.planKey;
          }
        }

        const plan = getPlan(targetPlan);
        const now = new Date();
        const { calculateNextRenewalDate } = await import("@/lib/renewal-date");
        const nextPeriod = calculateNextRenewalDate(now);

        await prisma.firm.update({
          where: { id: firmId },
          data: {
            plan: targetPlan,
            maxUsers: plan.maxUsers,
            maxBranch: plan.maxBranch,
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

        // Limpiar plan pendiente
        await prisma.systemSetting.delete({
          where: { key: `pendingPlan_${firmId}` },
        }).catch(() => {});

        return { ok: true, firmId, paymentId, planActivated: targetPlan };
      }
    }
  }

  return { ok: true };
}
