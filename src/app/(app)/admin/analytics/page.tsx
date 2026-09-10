import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { AnalyticsView } from "./_components/analytics-view";

export default async function AnalyticsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SYSTEM_ADMIN") redirect("/dashboard");

  const firms = await prisma.firm.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          users: true,
        },
      },
    },
  });

  // Obtener métricas por estudio
  const analytics = await Promise.all(
    firms.map(async (firm) => {
      const { getTenantPrismaSync } = await import("@/lib/tenant-prisma");
      const tenantPrisma = getTenantPrismaSync(firm.slug);
      
      const [mattersCount, clientsCount, documentsCount, documentsSize] = await Promise.all([
        tenantPrisma.matter.count().catch(() => 0),
        tenantPrisma.client.count().catch(() => 0),
        tenantPrisma.document.count({ where: { deletedAt: null } }).catch(() => 0),
        tenantPrisma.document.aggregate({
          where: { deletedAt: null },
          _sum: { size: true },
        }).catch(() => ({ _sum: { size: 0 } })),
      ]);

      const sizeMB = Math.round((documentsSize._sum.size ?? 0) / (1024 * 1024));

      return {
        id: firm.id,
        name: firm.name,
        slug: firm.slug,
        plan: firm.plan,
        active: firm.active,
        usersCount: firm._count.users,
        mattersCount,
        clientsCount,
        documentsCount,
        storageUsedMB: sizeMB,
      };
    })
  );

  return <AnalyticsView data={analytics} />;
}