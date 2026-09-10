import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");

  const firmUser = await prisma.firmUser.findUnique({
    where: { email: session.user.email },
  });

  // Solo SYSTEM_ADMIN (firmId = null) puede acceder a /admin
  if (!firmUser || firmUser.firmId !== null) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-6xl">{children}</div>
    </div>
  );
}
