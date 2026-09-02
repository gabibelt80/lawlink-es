import type { MatterCategory, ProcedureType } from "@prisma/client";
import {
  causeScopeForSelection,
  isCauseAllowedForSelection,
  isCommercialArbitrationSelection,
} from "@/lib/cause-scope";
import { prisma } from "@/lib/prisma";

/**
 * 以Caso当前Estado为基准做Causa校验（v1.2 收口入口）。
 *
 * 基准程序取「当前 ENGAGED 的首个程序」，而不是 order 最小的程序：
 * 后者可能是补录的 INFORMATIONAL 前序程序（如别人代理的一审），
 * 用它当基准会让校验对着一个我们并不代理的程序类型判断。
 *
 * 所有「改CasoCausa」的入口都应走这里，不要各自去查程序类型。
 */
export async function assertCauseAllowedForMatter(
  matterId: string,
  causeId?: string | null,
) {
  const matter = await prisma.matter.findUnique({
    where: { id: matterId },
    select: {
      category: true,
      procedures: {
        where: { engagement: "ENGAGED" },
        orderBy: { order: "asc" },
        take: 1,
        select: { type: true },
      },
    },
  });
  if (!matter) throw new Error("El caso no existe");

  await assertCauseAllowedForSelection({
    causeId,
    category: matter.category,
    procedureType: matter.procedures[0]?.type,
  });
}

export async function assertCauseAllowedForSelection(input: {
  causeId?: string | null;
  category: MatterCategory;
  procedureType?: ProcedureType | null;
}) {
  if (!input.causeId) return;

  const cause = await prisma.causeOfAction.findUnique({
    where: { id: input.causeId },
    select: { id: true, name: true, category: true, code: true, active: true },
  });

  if (!cause) throw new Error("La causa seleccionada no existe");
  if (!isCauseAllowedForSelection(cause, input.category, input.procedureType)) {
    const scope = causeScopeForSelection(input.category, input.procedureType);
    if (isCommercialArbitrationSelection(input.category, input.procedureType)) {
      throw new Error(
        "Cuando la selección actual es arbitraje comercial, solo se pueden seleccionar causas de disputas contractuales y otras causas de derechos patrimoniales",
      );
    }
    if (input.category === "LABOR_ARBITRATION") {
      throw new Error(
        "En un Caso de arbitraje laboral solo se pueden seleccionar causas de disputa laboral",
      );
    }
    if (cause.category !== scope.dbCategory) {
      throw new Error(
        "La causa seleccionada no coincide con la categoría del Caso; por favor, selecciona otra",
      );
    }
    throw new Error(
      "La causa seleccionada no está dentro del rango disponible para la categoría actual del Caso",
    );
  }
}
