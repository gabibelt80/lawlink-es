import { redirect } from "next/navigation";
import type { MatterCategory } from "@prisma/client";

import { getSession } from "@/lib/auth/session";
import { matterCategoryLabel } from "@/lib/enums";
import {
  getFirmProfile,
  CATEGORY_ABBR,
  CATEGORY_WORD_DEFAULTS
} from "@/server/settings/firm-profile";
import { getWorkflowToggles } from "@/server/settings/workflow-toggles";
import { FirmProfileForm } from "./_components/firm-profile-form";
import { WorkflowTogglesCard } from "./_components/workflow-toggles-card";

export default async function FirmProfilePage() {
  const session = await getSession();
  if (session?.user.role !== "ADMIN") redirect("/settings/profile");

  const profile = await getFirmProfile();
  const toggles = await getWorkflowToggles();
  const keys = Object.keys(CATEGORY_WORD_DEFAULTS) as MatterCategory[];
  // Construcción en el servidor de la lista de categorías (etiqueta/abreviatura/palabra actual) para pasarla al formulario del cliente, evitando que el cliente importe directamente módulos que contienen prisma
  const categories = keys.map((key) => ({
    key,
    label: matterCategoryLabel[key],
    abbr: CATEGORY_ABBR[key],
    word: profile.categoryWords[key]
  }));

  return (
    <div className="space-y-5">
      <FirmProfileForm
        initial={{
          firmName: profile.firmName,
          firmSubtitle: profile.firmSubtitle,
          logoDataUrl: profile.logoDataUrl,
          matterCodePrefix: profile.matterCodePrefix,
          firmShortName: profile.firmShortName,
          caseNoTemplate: profile.caseNoTemplate,
          categories
        }}
      />
      <WorkflowTogglesCard initialExternalContactReview={toggles.externalContactReview} />
    </div>
  );
}