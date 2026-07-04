import type { MatterCategory, ProcedureType } from "@prisma/client";
import {
  causeScopeForSelection,
  isCauseAllowedForSelection,
  isCommercialArbitrationSelection
} from "@/lib/cause-scope";
import { prisma } from "@/lib/prisma";

export async function assertCauseAllowedForSelection(input: {
  causeId?: string | null;
  category: MatterCategory;
  procedureType?: ProcedureType | null;
}) {
  if (!input.causeId) return;

  const cause = await prisma.causeOfAction.findUnique({
    where: { id: input.causeId },
    select: { id: true, name: true, category: true, code: true, active: true }
  });

  if (!cause) throw new Error("所选案由不存在");
  if (!isCauseAllowedForSelection(cause, input.category, input.procedureType)) {
    const scope = causeScopeForSelection(input.category, input.procedureType);
    if (isCommercialArbitrationSelection(input.category, input.procedureType)) {
      throw new Error("当前选择为商事仲裁时，只能选择合同纠纷和其他财产权益类案由");
    }
    if (input.category === "LABOR_ARBITRATION") {
      throw new Error("劳动仲裁案件只能选择劳动争议类案由");
    }
    if (cause.category !== scope.dbCategory) {
      throw new Error("所选案由与案件类别不匹配，请重新选择");
    }
    throw new Error("所选案由不在当前案件类别可选范围内");
  }
}
