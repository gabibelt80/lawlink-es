import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { hasModule } from "@/lib/auth/modules";
import { searchJurisprudence } from "@/server/jurisprudence/actions";
import { JurisprudenceView } from "./_components/jurisprudence-view";

export default async function JurisprudencePage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  // Guard: solo si el modulo esta activo para el estudio
  const enabled = await hasModule("JURISPRUDENCE");
  if (!enabled) redirect("/dashboard");

  const hasIa = await hasModule("IA");
  const isSystemAdmin = session.user.isSystemAdmin === true;
  const initialData = await searchJurisprudence({ page: 1, pageSize: 20 });

  return (
    <JurisprudenceView
      initialData={initialData}
      isSystemAdmin={isSystemAdmin}
      hasIaModule={hasIa}
    />
  );
}