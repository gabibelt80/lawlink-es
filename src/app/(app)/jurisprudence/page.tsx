import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listJurisprudence } from "@/server/jurisprudence/actions";
import { JurisprudenceView } from "./_components/jurisprudence-view";

export default async function JurisprudencePage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const items = await listJurisprudence();

  return <JurisprudenceView items={items} />;
}