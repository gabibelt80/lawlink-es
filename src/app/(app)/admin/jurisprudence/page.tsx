import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { JurisprudenceAdminView } from "./_components/jurisprudence-admin-view";

export default async function JurisprudenceAdminPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  if (session.user.role !== "SYSTEM_ADMIN" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return <JurisprudenceAdminView />;
}
