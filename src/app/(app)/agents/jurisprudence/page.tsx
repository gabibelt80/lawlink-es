import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { JURISPRUDENCE_SOURCES, DEFAULT_AGENTS } from "@/lib/ai-jurisprudence-agents";
import { JurisprudenceAgentsView } from "./_components/jurisprudence-agents-view";

export default async function JurisprudenceAgentsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  return (
    <JurisprudenceAgentsView
      sources={JURISPRUDENCE_SOURCES}
      agents={DEFAULT_AGENTS}
    />
  );
}
