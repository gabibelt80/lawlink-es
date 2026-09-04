import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { WritingsLibraryView } from "./_components/writings-library-view";

export default async function WritingsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    redirect("/settings/profile");
  }

  return <WritingsLibraryView />;
}