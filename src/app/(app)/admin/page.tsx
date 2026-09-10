import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminView } from "./_components/admin-view";

export default async function AdminPage() {
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");

  const firmUser = await prisma.firmUser.findUnique({
    where: { email: session.user.email },
  });

  if (!firmUser || firmUser.firmId !== null) {
    redirect("/dashboard");
  }

  const firms = await prisma.firm.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { users: true },
      },
    },
  });

  // Leer módulos personalizados por plan
  const planModulesRow = await prisma.systemSetting.findUnique({
    where: { key: "planModules" },
  });
  const customModules = (planModulesRow?.value as Record<string, string[]>) ?? {};

  // Métricas de suscripción
  const subscriptionStats = {
    active: firms.filter(f => f.subscriptionStatus === "active" && f.active).length,
    pastDue: firms.filter(f => f.subscriptionStatus === "past_due").length,
    canceled: firms.filter(f => f.subscriptionStatus === "canceled").length,
    suspended: firms.filter(f => f.subscriptionStatus === "suspended" || f.suspendedAt).length,
  };

  return <AdminView firms={firms} customModules={customModules} subscriptionStats={subscriptionStats} />;
}
