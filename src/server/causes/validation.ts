import type { MatterCategory, ProcedureType } from "@prisma/client";
import {
  causeScopeForSelection,
  isCauseAllowedForSelection,
  isCommercialArbitrationSelection,
} from "@/lib/cause-scope";
import { prisma } from "@/lib/prisma";

/**
 * ä»¥Casoå½“å‰Estadoä¸ºåŸºå‡†åšCausaæ ¡éªŒï¼ˆv1.2 æ”¶å£å…¥å£ï¼‰ã€‚
 *
 * åŸºå‡†ç¨‹åºå–ã€Œå½“å‰ ENGAGED çš„é¦–ä¸ªç¨‹åºã€ï¼Œè€Œä¸æ˜¯ order æœ€å°çš„ç¨‹åºï¼š
 * åŽè€…å¯èƒ½æ˜¯è¡¥å½•çš„ INFORMATIONAL å‰åºç¨‹åºï¼ˆå¦‚åˆ«äººä»£ç†çš„ä¸€å®¡ï¼‰ï¼Œ
 * ç”¨å®ƒå½“åŸºå‡†ä¼šè®©æ ¡éªŒå¯¹ç€ä¸€ä¸ªæˆ‘ä»¬å¹¶ä¸ä»£ç†çš„ç¨‹åºç±»åž‹åˆ¤æ–­ã€‚
 *
 * æ‰€æœ‰ã€Œæ”¹CasoCausaã€çš„å…¥å£éƒ½åº”èµ°è¿™é‡Œï¼Œä¸è¦å„è‡ªåŽ»æŸ¥ç¨‹åºç±»åž‹ã€‚
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
        "Cuando la selecciÃ³n actual es arbitraje comercial, solo se pueden seleccionar causas de disputas contractuales y otras causas de derechos patrimoniales",
      );
    }
    if (input.category === "LABOR_ARBITRATION") {
      throw new Error(
        "En un Caso de arbitraje laboral solo se pueden seleccionar causas de disputa laboral",
      );
    }
    if (cause.category !== scope.dbCategory) {
      throw new Error(
        "La causa seleccionada no coincide con la categorÃ­a del Caso; por favor, selecciona otra",
      );
    }
    throw new Error(
      "La causa seleccionada no estÃ¡ dentro del rango disponible para la categorÃ­a actual del Caso",
    );
  }
}


