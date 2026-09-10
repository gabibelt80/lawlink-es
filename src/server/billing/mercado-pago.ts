import { prisma } from "@/lib/prisma";
import { getPlan } from "@/lib/plans";

/**
 * Integración con Mercado Pago para cobros recurrentes.
 *
 * Requiere las siguientes variables de entorno:
 *   MERCADO_PAGO_ACCESS_TOKEN
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
 * Crea o actualiza un cliente en Mercado Pago.
 */
export async function createOrUpdateCustomer(firmId: string) {
  const firm = await prisma.firm.findUnique({
    where: { id: firmId },
    include: { users: { take: 1 } },
  });

  if (!firm) throw new Error("Estudio no encontrado");

  const accessToken = getAccessToken();

  if (firm.paymentProviderCustomerId) {
    // Cliente ya existe, lo devolvemos
    return firm.paymentProviderCustomerId;
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
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Error creando cliente en Mercado Pago: ${JSON.stringify(errorData)}`
    );
  }

  const data = await response.json();

  await prisma.firm.update({
    where: { id: firmId },
    data: { paymentProviderCustomerId: data.id },
  });

  return data.id;
}

/**
 * Crea una suscripción (preapproval) en Mercado Pago.
 *
 * Devuelve el objeto de MP que incluye `init_point` (URL para que
 * el usuario autorice el cobro recurrente).
 */
export async function createSubscription(firmId: string) {
  const firm = await prisma.firm.findUnique({ where: { id: firmId } });
  if (!firm) throw new Error("Estudio no encontrado");

  const plan = getPlan(firm.plan);
  const accessToken = getAccessToken();

  const body = {
    reason: `JURIDICTAS - Plan ${plan.label} (${firm.name})`,
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: plan.price,
      currency_id: "ARS",
      free_trial: {
        frequency: 0,
        frequency_type: "days",
      },
    },
    back_url: `https://juridictas.ar/settings/subscription`,
    payer_email: firm.email,
    status: "pending", // "pending" para obtener init_point
    external_reference: firm.id,
  };

  console.log("[MP] Creando suscripción:", JSON.stringify(body, null, 2));

  const response = await fetch(`${MP_API}/preapproval`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("[MP] Error respuesta:", response.status, errorData);
    throw new Error(
      `Mercado Pago rechazó la suscripción: ${JSON.stringify(errorData)}`
    );
  }

  const data = await response.json();
  console.log("[MP] Suscripción creada:", JSON.stringify(data, null, 2));

  await prisma.firm.update({
    where: { id: firmId },
    data: { paymentProviderSubscriptionId: data.id },
  });

  return data;
}

/**
 * Cancela una suscripción en Mercado Pago.
 */
export async function cancelSubscription(firmId: string) {
  const firm = await prisma.firm.findUnique({ where: { id: firmId } });
  if (!firm) throw new Error("Estudio no encontrado");

  if (!firm.paymentProviderSubscriptionId) {
    throw new Error("No hay suscripción activa en Mercado Pago");
  }

  const accessToken = getAccessToken();

  const response = await fetch(
    `${MP_API}/preapproval/${firm.paymentProviderSubscriptionId}`,
    {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "cancelled" }),
    }
  );

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
 * Procesa el webhook de Mercado Pago.
 *
 * Eventos:
 * - type: "payment" → pago individual aprobado
 * - type: "preapproval" → cambio de estado de la suscripción recurrente
 * - type: "subscription_preapproval" → igual que el anterior
 */
export async function processWebhook(body: any) {
  console.log("[billing] Webhook MP:", JSON.stringify(body));

  const accessToken = getAccessToken();

  // Caso 1: pago individual
  if (body.type === "payment") {
    const paymentId = body.data?.id;
    if (!paymentId) return { ok: false, error: "No payment id" };

    const response = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) return { ok: false, error: "Error fetching payment" };

    const payment = await response.json();
    const firmId = payment.external_reference;

    if (payment.status === "approved" && firmId) {
      await activatePaidPlan(firmId, payment.id);
      return { ok: true, firmId, paymentId };
    }
  }

  // Caso 2: cambio de estado de suscripción (preapproval)
  if (
    body.type === "preapproval" ||
    body.type === "subscription_preapproval"
  ) {
    const preapprovalId = body.data?.id;
    if (!preapprovalId) return { ok: false, error: "No preapproval id" };

    const response = await fetch(`${MP_API}/preapproval/${preapprovalId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) return { ok: false, error: "Error fetching preapproval" };

    const preapproval = await response.json();
    const firmId = preapproval.external_reference;

    if (preapproval.status === "authorized" && firmId) {
      await activatePaidPlan(firmId, preapproval.id);
      return { ok: true, firmId, preapprovalId };
    }
  }

  return { ok: true, ignored: true };
}

/**
 * Activa el plan pago del estudio (llamado desde el webhook).
 */
async function activatePaidPlan(firmId: string, providerRef: string) {
  const { calculateNextRenewalDate } = await import("@/lib/renewal-date");

  const firm = await prisma.firm.findUnique({ where: { id: firmId } });
  if (!firm) return;

  // Verificar si hay un plan pendiente
  const pendingPlanRow = await prisma.systemSetting.findUnique({
    where: { key: `pendingPlan_${firmId}` },
  });

  let targetPlan = firm.plan;
  if (pendingPlanRow?.value && typeof pendingPlanRow.value === "object") {
    const pending = pendingPlanRow.value as { planKey?: string };
    if (pending.planKey) targetPlan = pending.planKey;
  }

  const plan = getPlan(targetPlan);
  const now = new Date();
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

  await prisma.systemSetting
    .delete({ where: { key: `pendingPlan_${firmId}` } })
    .catch(() => {});

  console.log(
    `[billing] Plan ${targetPlan} activado para firm ${firmId} (ref: ${providerRef})`
  );
}

/**
 * Intenta un cobro automático para una suscripción past_due.
 * Si el cobro se aprueba, se activa el plan.
 */
export async function attemptAutoPayment(firm: {
  id: string;
  email: string;
  name: string;
  plan: string;
}) {
  const plan = getPlan(firm.plan);
  const accessToken = getAccessToken();

  const response = await fetch(`${MP_API}/v1/payments`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transaction_amount: plan.price,
      description: `Pago pendiente JURIDICTAS - ${firm.name}`,
      payment_method_id: "account_money",
      payer: { email: firm.email },
      external_reference: firm.id,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.log(`[billing] Error auto-pago para ${firm.name}:`, errorData);
    return { ok: false, error: errorData };
  }

  const data = await response.json();

  if (data.status === "approved") {
    await activatePaidPlan(firm.id, data.id);
  }

  return { ok: true, data };
}
