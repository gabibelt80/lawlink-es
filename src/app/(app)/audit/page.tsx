import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listAuditLogs, getAuditFilterOptions } from "@/server/audit-list";
import { AuditView } from "./_components/audit-view";

export default async function AuditPage({
  searchParams
}: {
  searchParams: Promise<{
    userId?: string;
    action?: string;
    targetType?: string;
    start?: string;
    end?: string;
    cursor?: string;
  }>;
}) {
  const params = (await searchParams) ?? {};
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    redirect("/dashboard");
  }

  const filter = {
    userId: params.userId,
    action: params.action,
    targetType: params.targetType,
    startStr: params.start,
    endStr: params.end,
    cursor: params.cursor,
    limit: 50
  };

  const [result, options] = await Promise.all([
    listAuditLogs(filter),
    getAuditFilterOptions()
  ]);

  return <AuditView result={result} options={options} currentFilter={filter} />;
}
