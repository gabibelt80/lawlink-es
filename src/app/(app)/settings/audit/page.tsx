import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listAuditLogs } from "@/server/settings/actions";
import { listUsers } from "@/server/users/actions";
import { AuditView } from "./_components/audit-view";

type Props = {
  searchParams: Promise<{ action?: string; userId?: string; days?: string }>;
};

export default async function AuditPage({ searchParams }: Props) {
  const params = await searchParams;
  const session = await getSession();
  if (session?.user.role !== "ADMIN") redirect("/settings/profile");

  const [{ items, distinctActions }, users] = await Promise.all([
    listAuditLogs({
      action: params.action,
      userId: params.userId,
      days: params.days ? Number(params.days) : 30
    }),
    listUsers()
  ]);

  return (
    <AuditView
      items={items}
      distinctActions={distinctActions}
      userOptions={users.map((u) => ({ id: u.id, name: u.name }))}
      initialFilters={{
        action: params.action ?? "ALL",
        userId: params.userId ?? "ALL",
        days: params.days ?? "30"
      }}
    />
  );
}