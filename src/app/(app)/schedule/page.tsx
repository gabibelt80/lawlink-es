import { listScheduleItems } from "@/server/schedule/actions";
import { getSession } from "@/lib/auth/session";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { matterAssociationFilter } from "@/lib/permissions";
import { ScheduleView } from "./_components/schedule-view";

export default async function SchedulePage() {
  const session = await getSession();
  if (!session?.user) return null;

  // Buscar 3 meses antes y después para cubrir navegación
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const from = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 4, 1);

  const tenantPrisma = await getTenantPrisma();

  const [items, matters, users] = await Promise.all([
    listScheduleItems({ from, to }),
    tenantPrisma.matter.findMany({
      where: {
        deletedAt: null,
        ...matterAssociationFilter(session.user.id, session.user.role as any),
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: { id: true, internalCode: true, title: true },
    }),
    tenantPrisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
  ]);

  return <ScheduleView items={items} matters={matters} users={users} />;
}
