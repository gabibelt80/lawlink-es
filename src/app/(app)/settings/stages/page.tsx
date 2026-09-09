import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { StagesManager } from "./_components/stages-manager";
import { procedureStagePresetsForProcedure } from "@/lib/procedure-stage-defaults";
import type { ProcedureType } from "@prisma/client";

const PROCEDURE_TYPES: { value: ProcedureType; label: string }[] = [
  { value: "FIRST_INSTANCE", label: "Primera instancia" },
  { value: "SECOND_INSTANCE", label: "Segunda instancia" },
  { value: "ENFORCEMENT", label: "Ejecución" },
  { value: "COMMERCIAL_ARBITRATION", label: "Arbitraje comercial" },
  { value: "LABOR_ARBITRATION", label: "Arbitraje laboral" },
  { value: "INVESTIGATION", label: "Investigación penal" },
  { value: "ADMIN_PRE_LITIGATION", label: "Reclamo administrativo previo" },
  { value: "ADMIN_RECONSIDERATION", label: "Reconsideración administrativa" },
  { value: "CUSTOM", label: "Personalizado" },
];

export default async function StagesSettingsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const prisma = await getTenantPrisma();

  // Obtener etapas personalizadas del tenant
  const customStages = await prisma.stageTemplate.findMany({
    orderBy: { procedureType: "asc" },
  });

  return (
    <StagesManager
      procedureTypes={PROCEDURE_TYPES}
      defaultStages={Object.fromEntries(
        PROCEDURE_TYPES.map((pt) => [
          pt.value,
          procedureStagePresetsForProcedure(pt.value),
        ])
      )}
      customStages={customStages}
    />
  );
}
