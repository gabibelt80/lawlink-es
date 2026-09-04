"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { matterAssociationFilter } from "@/lib/permissions";
import { runConflictCheck, type MatterInfoForHit, type QueryItem } from "./algorithm";

function hitKey(hit: { targetId: string; matchedField: string; matchedValue: string }) {
  return `${hit.targetId}|${hit.matchedField}|${hit.matchedValue}`;
}

function serializeMatterInfo(info: MatterInfoForHit | undefined, canViewMatter: boolean) {
  if (!info) return null;
  return {
    ...info,
    matterId: canViewMatter ? info.matterId : null,
    canViewMatter,
    intakeDate: info.intakeDate ? info.intakeDate.toISOString() : null
  };
}

async function getOpenableMatterIds(userId: string, matterIds: string[]) {
  const uniqueIds = Array.from(new Set(matterIds));
  if (uniqueIds.length === 0) return new Set<string>();

  const rows = await prisma.matter.findMany({
    where: {
      id: { in: uniqueIds },
      deletedAt: null,
      ...matterAssociationFilter(userId)
    },
    select: { id: true }
  });

  return new Set(rows.map((row) => row.id));
}

const queryItemSchema = z
  .object({
    // v0.4: Rolå¯é€‰ï¼ˆé¡¶æ å¿«æŸ¥ä¸éœ€è¦ï¼‰ï¼Œserver ç«¯é»˜è®¤ OPPOSING_PARTY
    role: z
      .enum([
        "CLIENT_PARTY",
        "OPPOSING_PARTY",
        "THIRD_PARTY",
        "CO_LITIGANT",
        "AGENT",
        "WITNESS",
        "OTHER"
      ])
      .optional(),
    name: z.string().max(120).optional().or(z.literal("")),
    idNumber: z.string().max(50).optional().or(z.literal(""))
  })
  .refine((q) => (q.name && q.name.trim()) || (q.idNumber && q.idNumber.trim()), {
    message: "Nombre y apellidoæˆ–è¯ä»¶å·è‡³å°‘å¡«å†™ä¸€Ã­tems"
  });

const runCheckSchema = z.object({
  intakeId: z.string().cuid().optional(),
  queries: z.array(queryItemSchema).min(1)
});

/**
 * è·‘ä¸€æ¬¡å†²çªæ£€ç´¢å¹¶è½åº“ã€‚
 * å¦‚æžœ intakeId åœ¨ï¼Œåˆ™æŠŠ ConflictCheck æŒ‚åœ¨è¯¥ Intake ä¸Šï¼›å¦åˆ™å•ç‹¬å­˜ï¼ˆtargetType=Intake ä¸ºç©ºï¼‰ã€‚
 */
export async function runCheckAndSave(input: z.infer<typeof runCheckSchema>) {
  const session = await requireSession();
  const tenantUserId = await resolveTenantUserId(session.user.email, prisma);
  const data = runCheckSchema.parse(input);

  // æ¸…ç† queryï¼ˆv0.4: å…è®¸ name ä¸ºç©ºï¼Œç”± idNumber å…œåº•ï¼›role ç¼ºçœè§†ä¸º OPPOSING_PARTYï¼‰
  const queries: QueryItem[] = data.queries.map((q) => ({
    role: q.role ?? "OPPOSING_PARTY",
    name: (q.name ?? "").trim(),
    idNumber: q.idNumber?.trim() || undefined
  }));

  const result = await runConflictCheck(queries);
  const noHits = result.hits.length === 0;
  const matterInfoByHit = new Map(result.hits.map((h) => [hitKey(h), h.matterInfo]));
  const openableMatterIds = await getOpenableMatterIds(
    session.user.id,
    result.hits.filter((h) => h.targetType === "Matter").map((h) => h.targetId)
  );

  const check = await prisma.conflictCheck.create({
    data: {
      intakeId: data.intakeId,
      queryPayload: {
        queries,
        sameNameClients: result.sameNameClients,
        idMatchedClients: result.idMatchedClients
      } as object,
      conclusion: noHits ? "DIFFERENT" : "PENDING",
      decidedById: noHits ? tenantUserId : null,
      decidedAt: noHits ? new Date() : null,
      note: noHits ? "Sistemaè‡ªåŠ¨æ ‡è®°ï¼šæœªå‘½ä¸­åŽ†å²Casoå†²çªã€‚" : null,
      hits: {
        create: result.hits.map((h) => ({
          hitType: h.hitType,
          targetType: h.targetType,
          targetId: h.targetId,
          matchedName: h.matchedName,
          matchedField: h.matchedField,
          matchedValue: h.matchedValue,
          matchedRatio: h.matchedRatio,
          severity: h.severity,
          reason: h.reason
        }))
      }
    },
    include: { hits: true }
  });

  await audit({
    userId: tenantUserId,
    action: "CONFLICT_CHECK_RUN",
    targetType: "ConflictCheck",
    targetId: check.id,
    detail: {
      intakeId: data.intakeId,
      hitCount: result.hits.length,
      sameNameClientCount: result.sameNameClients.length,
      autoConclusion: noHits ? "DIFFERENT" : "PENDING"
    }
  });

  if (data.intakeId) {
    revalidatePath(`/intakes/${data.intakeId}`);
  }
  return {
    ok: true,
    checkId: check.id,
    hits: check.hits.map((h) => {
      const canViewMatter = h.targetType === "Matter" && openableMatterIds.has(h.targetId);
      return {
        ...h,
        targetId: h.targetType === "Matter" && !canViewMatter ? "" : h.targetId,
        matterInfo: serializeMatterInfo(matterInfoByHit.get(hitKey(h)), canViewMatter)
      };
    }),
    sameNameClients: result.sameNameClients,
    idMatchedClients: result.idMatchedClients
  };
}

const conclusionSchema = z.object({
  checkId: z.string().cuid(),
  conclusion: z.enum(["PENDING", "SAME_SUBJECT", "DIFFERENT", "NEED_INFO"]),
  note: z.string().max(500).optional().or(z.literal(""))
});

export async function setConflictConclusion(input: z.infer<typeof conclusionSchema>) {
  const session = await requireSession();
  const tenantUserId = await resolveTenantUserId(session.user.email, prisma);
  const data = conclusionSchema.parse(input);

  const updated = await prisma.conflictCheck.update({
    where: { id: data.checkId },
    data: {
      conclusion: data.conclusion,
      decidedById: tenantUserId,
      decidedAt: new Date(),
      note: data.note || null
    },
    include: { intake: { select: { id: true } } }
  });

  await audit({
    userId: tenantUserId,
    action: "CONFLICT_CONCLUSION_SET",
    targetType: "ConflictCheck",
    targetId: updated.id,
    detail: { conclusion: data.conclusion }
  });

  if (updated.intake) {
    revalidatePath(`/intakes/${updated.intake.id}`);
  }
  return { ok: true };
}
async function resolveTenantUserId(email: string, prisma: any): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true }
  });
  return user?.id ?? null;
}

