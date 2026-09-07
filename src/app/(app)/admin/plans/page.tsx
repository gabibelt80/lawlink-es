import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { PlansManager } from "./_components/plans-manager";

export default async function PlansPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SYSTEM_ADMIN") redirect("/");

  return <PlansManager />;
}
