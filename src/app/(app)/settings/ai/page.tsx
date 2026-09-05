import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getAiSettingsPublic } from "@/server/settings/ai-actions";
import { AI_DEFAULTS } from "@/lib/ai/settings";
import { AiSettingsForm } from "./_components/ai-settings-form";

export default async function AiSettingsPage() {
  const session = await getSession();
  if (session?.user.role !== "ADMIN") redirect("/settings/profile");

  const ai = await getAiSettingsPublic();

  return (
    <div className="space-y-5">
      <AiSettingsForm initial={ai} defaults={AI_DEFAULTS} />
    </div>
  );
}