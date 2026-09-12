import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { hasModule } from "@/lib/auth/modules";
import { getAiSettingsPublic } from "@/server/settings/ai-actions";
import { getAgentsConfig } from "@/server/settings/ai-agents-actions";
import { AI_DEFAULTS } from "@/lib/ai/settings";
import { AiSettingsForm } from "./_components/ai-settings-form";
import { AiAgentsSection } from "./_components/ai-agents";

export default async function AiSettingsPage() {
  const session = await getSession();
  if (session?.user.role !== "ADMIN") redirect("/settings/profile");

  const canUseIa = await hasModule("IA");
  if (!canUseIa) redirect("/dashboard");

  const ai = await getAiSettingsPublic();
  const agents = await getAgentsConfig();

  return (
    <div className="space-y-5">
      <AiAgentsSection initial={agents} />
      <AiSettingsForm initial={ai} defaults={AI_DEFAULTS} />
    </div>
  );
}