import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminView } from "./_components/admin-view";

export default async function AdminPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  // Verificar que sea admin del sistema (firmId = null)
  const firmUser = await prisma.firmUser.findUnique({
    where: { email: session.user.email },
    include: { firm: true },
  });

  if (!firmUser || firmUser.firmId !== null) {
    redirect("/");
  }

  const firms = await prisma.firm.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { users: true },
      },
    },
  });

  return <AdminView firms={firms} />;
}