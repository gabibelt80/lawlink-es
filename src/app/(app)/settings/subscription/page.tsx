import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PLANS, getPlan } from "@/lib/plans";
import { SubscriptionView } from "./_components/subscription-view";

export default async function SubscriptionPage() {
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");

  const firmUser = await prisma.firmUser.findUnique({
    where: { email: session.user.email },
    include: { firm: true },
  });

  if (!firmUser?.firm) redirect("/dashboard");

  const firm = firmUser.firm;
  const currentPlan = getPlan(firm.plan);

  // Leer módulos personalizados
  const planModulesRow = await prisma.systemSetting.findUnique({
    where: { key: "planModules" },
  });
  const customModules = (planModulesRow?.value as Record<string, string[]>) ?? {};

  return (
    <SubscriptionView
      firm={{
        id: firm.id,
        name: firm.name,
        plan: firm.plan,
        planLabel: currentPlan.label,
        planPrice: currentPlan.price,
        subscriptionStatus: firm.subscriptionStatus,
        subscriptionPeriodEnd: firm.subscriptionPeriodEnd,
        lastPaymentAt: firm.lastPaymentAt,
        lastPaymentAmount: firm.lastPaymentAmount ? Number(firm.lastPaymentAmount) : null,
        maxUsers: firm.maxUsers,
        maxBranch: firm.maxBranch,
      }}
      plans={PLANS}
      currentModules={customModules[firm.plan] ?? []}
    />
  );
}
