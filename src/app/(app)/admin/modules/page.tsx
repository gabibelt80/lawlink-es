import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ModulesManager } from "./_components/modules-manager";

export default async function ModulesPage() {
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");

  const firmUser = await prisma.firmUser.findUnique({
    where: { email: session.user.email },
  });

  // Solo SYSTEM_ADMIN (firmId = null)
  if (!firmUser || firmUser.firmId !== null) {
    redirect("/dashboard");
  }

  return <ModulesManager />;
}