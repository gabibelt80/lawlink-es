import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  if (!session.user.isSystemAdmin) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}