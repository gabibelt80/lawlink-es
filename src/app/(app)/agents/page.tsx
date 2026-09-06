import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AgentsDashboard } from "./_components/agents-dashboard";

export default async function AgentsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    redirect("/settings/profile");
  }

  return <AgentsDashboard />;
}