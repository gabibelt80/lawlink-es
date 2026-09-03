"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type ClientType, type LitigationStanding, type PartyType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { intakeVisibilityFilter } from "@/lib/permissions";
import { assertAgencyAllowedForProcedure, normalizeJurisdictionForAgency } from "@/lib/china-regions";
import { serializeDecimals } from "@/lib/decimal";
import {
  intakeCreateSchema,
  intakeListQuerySchema,
  declineIntakeSchema,
  type IntakeCreateInput,
  type IntakeListQuery,
  type DeclineIntakeInput
} from "./schemas";
import { seedDefaultFolders } from "@/lib/default-folders";
import { notifyRoleApprovers } from "@/server/notifications/approval";
import { assertCauseAllowedForSelection } from "@/server/causes/validation";

function emptyToNull<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v === "" ? null : v;
  }
  return out as T;
}

function requireApprover(role: string) {
  if (role !== "ADMIN" && role !== "PRINCIPAL_LAWYER") {
    throw new Error("Solo el administrador o el abogado principal pueden aprobar admisiones");
  }
}

/** Genera tÃ­tulo automÃ¡tico segÃºn {cliente} y {contraparte} {causa} */
function generateTitle(
  clientName: string | null,
  opposingNames: string[],
  causeName: string | null
): string {
  const left = clientName || "Cliente pendiente";
  const right = opposingNames.length > 0 ? opposingNames.join(", ") : "Contraparte pendiente";
  const cause = causeName ?? "Caso";
  return `${left} y ${right} ${cause}`.replace(/\s+/g, "");
}

function clientTypeToPartyType(type: ClientType): PartyType {
  if (type === "INDIVIDUAL") return "NATURAL_PERSON";
  if (type === "COMPANY") return "COMPANY";
  return "OTHER_ORG";
}

type IntakeConflictRole = "CLIENT_PARTY" | "OPPOSING_PARTY" | "THIRD_PARTY";

type IntakeConflictQuery = {
  role: IntakeConflictRole;
  name: string;
  idNumber: string;
};

type IntakeConflictGateInput = {
  client: { name: string; idNumber: string | null } | null;
  parties: { role: string; name: string; idNumber: string | null }[];
  conflictChecks: {
    conclusion: string;
    note: string | null;
    queryPayload: Prisma.JsonValue;
    hits: { severity: string }[];
  }[];
};

function normalizeConflictQuery(q: {
  role?: string | null;
  name?: string | null;
  idNumber?: string | null;
}): IntakeConflictQuery | null {
  if (q.role !== "CLIENT_PARTY" && q.role !== "OPPOSING_PARTY" && q.role !== "THIRD_PARTY") {
    return null;
  }
  const name = q.name?.trim() ?? "";
  const idNumber = q.idNumber?.trim() ?? "";
  if (!name && !idNumber) return null;
  return { role: q.role, name, idNumber };
}

function conflictQueryKey(q: IntakeConflictQuery) {
  return `${q.role}|${q.name}|${q.idNumber}`;
}

function formatConflictQuery(q: IntakeConflictQuery) {
  const roleLabel: Record<IntakeConflictRole, string> = {
    CLIENT_PARTY: "Cliente",
    OPPOSING_PARTY: "Contraparte",
    THIRD_PARTY: "Tercero"
  };
  return `${roleLabel[q.role]} Â«${q.name || q.idNumber}Â»`;
}

function buildExpectedConflictQueries(intake: IntakeConflictGateInput) {
  const queries: IntakeConflictQuery[] = [];
  const clientQuery = normalizeConflictQuery({
    role: "CLIENT_PARTY",
    name: intake.client?.name,
    idNumber: intake.client?.idNumber
  });
  if (clientQuery) queries.push(clientQuery);

  for (const p of intake.parties) {
    const q = normalizeConflictQuery({
      role: p.role,
      name: p.name,
      idNumber: p.idNumber
    });
    if (q) queries.push(q);
  }

  return queries;
}

function getCheckedConflictQueries(payload: Prisma.JsonValue) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const queries = (payload as { queries?: unknown }).queries;
  if (!Array.isArray(queries)) return [];

  return queries
    .map((q) => {
      if (!q || typeof q !== "object" || Array.isArray(q)) return null;
      const row = q as { role?: unknown; name?: unknown; idNumber?: unknown };
      return normalizeConflictQuery({
        role: typeof row.role === "string" ? row.role : null,
        name: typeof row.name === "string" ? row.name : null,
        idNumber: typeof row.idNumber === "string" ? row.idNumber : null
      });
    })
    .filter((q): q is IntakeConflictQuery => !!q);
}

function assertConflictReviewAllowsConversion(intake: IntakeConflictGateInput) {
  const expectedQueries = buildExpectedConflictQueries(intake);
  if (expectedQueries.length === 0) {
    throw new Error("Complete primero el cliente o la contraparte y luego ejecute la bÃºsqueda de conflictos");
  }

  const latestCheck = intake.conflictChecks[0];
  if (!latestCheck) {
    throw new Error("Antes de convertir a caso formal debe ejecutar la bÃºsqueda de conflictos");
  }

  const checkedKeys = new Set(
    getCheckedConflictQueries(latestCheck.queryPayload).map(conflictQueryKey)
  );
  const missingQueries = expectedQueries.filter((q) => !checkedKeys.has(conflictQueryKey(q)));
  if (missingQueries.length > 0) {
    throw new Error(
      `Las partes de la admisiÃ³n cambiaron, ejecute nuevamente la bÃºsqueda de conflictos. Faltan: ${missingQueries
        .map(formatConflictQuery)
        .join(", ")}`
    );
  }

  if (latestCheck.conclusion === "PENDING") {
    throw new Error("La bÃºsqueda de conflictos no tiene conclusiÃ³n, marque si se puede aceptar");
  }
  if (latestCheck.conclusion === "NEED_INFO") {
    throw new Error("La conclusiÃ³n de la bÃºsqueda de conflictos es informaciÃ³n insuficiente, no se puede convertir a caso formal");
  }
  if (latestCheck.conclusion === "SAME_SUBJECT") {
    throw new Error("Se confirmÃ³ que existe conflicto de intereses, no se puede convertir directamente a caso formal");
  }
  if (latestCheck.conclusion !== "DIFFERENT") {
    throw new Error("ConclusiÃ³n de conflicto anÃ³mala, ejecute nuevamente la bÃºsqueda");
  }

  const hasHighRiskHit = latestCheck.hits.some(
    (h) => h.severity === "HIGH" || h.severity === "BLOCKING"
  );
  if (hasHighRiskHit && !latestCheck.note?.trim()) {
    throw new Error("Existen coincidencias de alto riesgo o bloqueantes, escriba el motivo de exclusiÃ³n o el consentimiento por escrito en las notas de la conclusiÃ³n");
  }
}

export async function listIntakes(input: Partial<IntakeListQuery> = {}) {
  const session = await requireSession();
  const query = intakeListQuerySchema.parse(input);

  const statusWhere: Prisma.IntakeWhereInput = query.statusIn?.length
    ? { status: { in: query.statusIn } }
    : query.status
      ? { status: query.status }
      : {};

  const orderBy: Prisma.IntakeOrderByWithRelationInput[] =
    query.sortBy === "claimAmount"
      ? [{ claimAmount: query.sortDir }, { receivedAt: "desc" }]
      : [{ receivedAt: query.sortDir }];

  const whereParts: Prisma.IntakeWhereInput[] = [
    intakeVisibilityFilter(session.user.id, session.user.role),
    statusWhere
  ];
  if (query.category) whereParts.push({ category: query.category });
  if (query.receivedAtFrom || query.receivedAtTo) {
    whereParts.push({
      receivedAt: {
        ...(query.receivedAtFrom ? { gte: query.receivedAtFrom } : {}),
        ...(query.receivedAtTo ? { lte: query.receivedAtTo } : {})
      }
    });
  }
  if (query.search) {
    whereParts.push({
      OR: [
        { title: { contains: query.search } },
        { description: { contains: query.search } },
        { client: { name: { contains: query.search } } }
      ]
    });
  }
  const where: Prisma.IntakeWhereInput = { AND: whereParts };

  const [items, total] = await Promise.all([
    prisma.intake.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        client: { select: { id: true, name: true, type: true } },
        cause: { select: { id: true, name: true } },
        conflictChecks: {
          orderBy: { checkedAt: "desc" },
          take: 1,
          select: { id: true, conclusion: true, hits: { select: { severity: true } } }
        },
        parties: { where: { role: "OPPOSING_PARTY" }, select: { name: true } },
        matter: { select: { id: true, internalCode: true } },
        ownerUser: { select: { id: true, name: true } }
      }
    }),
    prisma.intake.count({ where })
  ]);

  return { items: serializeDecimals(items), total, page: query.page, pageSize: query.pageSize };
}

export async function getIntakeById(id: string) {
  const session = await requireSession();
  // VerificaciÃ³n de permisos: los managers ven todo, otros solo lo propio
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    const owned = await prisma.intake.findFirst({
      where: {
        id,
        OR: [
          { createdById: session.user.id },
          { ownerUserId: session.user.id },
          { coUserIds: { array_contains: session.user.id } }
        ]
      },
      select: { id: true }
    });
    if (!owned) throw new Error("Registro de admisiÃ³n no encontrado");
  }
  const intake = await prisma.intake.findUnique({
    where: { id },
    include: {
      client: true,
      cause: true,
      ownerUser: { select: { id: true, name: true, role: true } },
      parties: { orderBy: [{ role: "asc" }, { ordinal: "asc" }] },
      conflictChecks: {
        orderBy: { checkedAt: "desc" },
        include: { hits: true, decidedBy: { select: { id: true, name: true } } }
      },
      matter: { select: { id: true, internalCode: true, title: true } },
      documents: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, category: true, size: true, createdAt: true }
      }
    }
  });
  if (intake) {
    await audit({
      userId: session.user.id,
      action: "INTAKE_VIEW",
      targetType: "Intake",
      targetId: id
    });
  }
  return intake;
}

export async function createIntake(input: IntakeCreateInput) {
  const session = await requireSession();
  const data = intakeCreateSchema.parse(input);
  assertAgencyAllowedForProcedure(data.firstAgency, data.firstProcedureType);
  await assertCauseAllowedForSelection({
    causeId: data.causeId,
    category: data.category,
    procedureType: data.firstProcedureType
  });

  let resolvedClientId: string | null = data.clientId || null;
  let resolvedClientName: string | null = null;

  if (!resolvedClientId && data.clientName && data.clientName.trim()) {
    const name = data.clientName.trim();
    const newClient = await prisma.client.create({
      data: {
        name,
        type: data.clientType ?? "INDIVIDUAL",
        idNumber: data.clientIdNumber || null,
        address: data.clientAddress || null,
        legalRep: data.clientLegalRep || null,
        phone: data.contactPhone || null,
        tags: [],
        contacts:
          data.contactName?.trim() || data.contactPhone?.trim()
            ? {
                create: {
                  name: (data.contactName || name).trim(),
                  phone: data.contactPhone?.trim() || null,
                  isPrimary: true
                }
              }
            : undefined
      }
    });
    resolvedClientId = newClient.id;
    resolvedClientName = name;
    await audit({
      userId: session.user.id,
      action: "CLIENT_AUTO_CREATE",
      targetType: "Client",
      targetId: newClient.id,
      detail: { name, type: newClient.type, source: "intake" }
    });
  } else if (resolvedClientId) {
    const c = await prisma.client.findUnique({
      where: { id: resolvedClientId },
      select: { name: true }
    });
    resolvedClientName = c?.name ?? null;

    if (data.contactName?.trim() || data.contactPhone?.trim()) {
      const existing = await prisma.contact.findFirst({
        where: {
          clientId: resolvedClientId,
          name: (data.contactName || resolvedClientName || "").trim() || undefined
        }
      });
      if (!existing) {
        await prisma.contact.create({
          data: {
            clientId: resolvedClientId,
            name: (data.contactName || resolvedClientName || "Contacto").trim(),
            phone: data.contactPhone?.trim() || null,
            isPrimary: false
          }
        });
      }
    }
  }

  let causeName: string | null = data.causeFreeText || null;
  if (data.causeId) {
    const cause = await prisma.causeOfAction.findUnique({
      where: { id: data.causeId },
      select: { name: true }
    });
    causeName = cause?.name ?? causeName;
  }

  const opposingNames = data.parties
    .filter((p) => p.role === "OPPOSING_PARTY")
    .map((p) => p.name)
    .filter(Boolean);

  const finalTitle =
    data.title && data.title.trim()
      ? data.title.trim()
      : generateTitle(resolvedClientName, opposingNames, causeName);

  const created = await prisma.intake.create({
    data: {
      title: finalTitle,
      category: data.category,
      causeId: data.causeId || null,
      causeFreeText: data.causeFreeText || null,
      description: data.description || null,
      status: "PENDING_CONFIRMATION",
      receivedAt: data.receivedAt ?? new Date(),

      clientId: resolvedClientId,
      clientType: data.clientType ?? null,
      contactName: data.contactName?.trim() || null,
      contactPhone: data.contactPhone?.trim() || null,

      firstProcedureType: data.firstProcedureType ?? null,
      firstAgency: data.firstAgency?.trim() || null,
      jurisdiction: normalizeJurisdictionForAgency(data.firstAgency, data.jurisdiction),
      ourStanding: data.ourStanding ?? null,
      claimAmount: data.claimAmount ?? null,
      claimDescription: data.claimDescription?.trim() || null,
      barFiling: data.barFiling ?? null,
      counterclaim: data.counterclaim ?? false,

      businessType: data.businessType?.trim() || null,
      serviceScope: data.serviceScope?.trim() || null,
      deliverables: data.deliverables?.trim() || null,
      counselType: data.counselType?.trim() || null,
      serviceStart: data.serviceStart ?? null,
      serviceEnd: data.serviceEnd ?? null,

      feeType: data.feeType ?? null,
      feeAmount: data.feeAmount ?? null,
      contingencyTerms: data.contingencyTerms?.trim() || null,
      feeSchedule: data.feeSchedule?.trim() || null,
      feeNote: data.feeNote?.trim() || null,

      ownerUserId: data.ownerUserId || session.user.id,
      coUserIds: data.coUserIds,

      createdById: session.user.id,
      parties: {
        create: data.parties.map((p) =>
          emptyToNull({
            role: p.role,
            standing: p.standing ?? null,
            ordinal: p.ordinal,
            name: p.name,
            partyType: p.partyType,
            idNumber: p.idNumber,
            phone: p.phone,
            address: p.address,
            legalRep: p.legalRep,
            contactName: p.contactName,
            enterpriseSocialCode: p.enterpriseSocialCode,
            enterpriseName: p.enterpriseName,
            notes: p.notes
          })
        )
      }
    }
  });

  await audit({
    userId: session.user.id,
    action: "INTAKE_CREATE",
    targetType: "Intake",
    targetId: created.id,
    detail: {
      title: created.title,
      category: created.category,
      autoTitle: !data.title,
      autoClient: !!resolvedClientName && !data.clientId
    }
  });

  await notifyRoleApprovers({
    roles: ["ADMIN", "PRINCIPAL_LAWYER"],
    excludeUserId: session.user.id,
    title: "Nueva aprobaciÃ³n de caso pendiente",
    content: `${session.user.name ?? "Un usuario"} enviÃ³ una aprobaciÃ³n de caso: ${created.title}`,
    href: `/intakes/${created.id}`,
    refType: "Intake",
    refId: created.id,
    priority: "HIGH"
  });

  revalidatePath("/intakes");
  revalidatePath("/matters");
  return { ok: true, id: created.id, clientId: resolvedClientId };
}

export async function declineIntake(input: DeclineIntakeInput) {
  const session = await requireSession();
  requireApprover(session.user.role);
  const data = declineIntakeSchema.parse(input);

  await prisma.intake.update({
    where: { id: data.id },
    data: {
      status: "DECLINED",
      declinedReason: data.reason
    }
  });

  await audit({
    userId: session.user.id,
    action: "INTAKE_DECLINE",
    targetType: "Intake",
    targetId: data.id,
    detail: { reason: data.reason }
  });

  revalidatePath("/intakes");
  revalidatePath(`/intakes/${data.id}`);
  revalidatePath("/matters");
  return { ok: true };
}

export async function markIntakeNeedsRevision(input: { id: string; reason: string }) {
  const session = await requireSession();
  requireApprover(session.user.role);
  if (!input.reason.trim()) throw new Error("Complete el motivo de correcciÃ³n");

  await prisma.intake.update({
    where: { id: input.id },
    data: {
      status: "NEEDS_REVISION",
      declinedReason: input.reason
    }
  });

  await audit({
    userId: session.user.id,
    action: "INTAKE_NEEDS_REVISION",
    targetType: "Intake",
    targetId: input.id,
    detail: { reason: input.reason }
  });

  revalidatePath("/intakes");
  revalidatePath(`/intakes/${input.id}`);
  revalidatePath("/matters");
  return { ok: true };
}

export async function resubmitIntake(id: string) {
  const session = await requireSession();

  const intake = await prisma.intake.findUnique({
    where: { id },
    select: { status: true, title: true, createdById: true, ownerUserId: true }
  });
  if (!intake) throw new Error("AdmisiÃ³n no encontrada");
  if (intake.status !== "NEEDS_REVISION") throw new Error("Solo el estado Pendiente de correcciÃ³n puede reenviarse");

  await prisma.intake.update({
    where: { id },
    data: {
      status: "PENDING_CONFIRMATION",
      declinedReason: null
    }
  });

  await audit({
    userId: session.user.id,
    action: "INTAKE_RESUBMIT",
    targetType: "Intake",
    targetId: id,
    detail: {}
  });

  await notifyRoleApprovers({
    roles: ["ADMIN", "PRINCIPAL_LAWYER"],
    excludeUserId: session.user.id,
    title: "AprobaciÃ³n de caso reenviada",
    content: `${session.user.name ?? "Un usuario"} reenviÃ³ la aprobaciÃ³n: ${intake.title}`,
    href: `/intakes/${id}`,
    refType: "Intake",
    refId: id,
    priority: "HIGH"
  });

  revalidatePath("/intakes");
  revalidatePath(`/intakes/${id}`);
  revalidatePath("/matters");
  return { ok: true };
}

export async function convertIntakeToMatter(intakeId: string) {
  const session = await requireSession();
  requireApprover(session.user.role);
  const intake = await prisma.intake.findUnique({
    where: { id: intakeId },
    include: {
      client: true,
      parties: true,
      conflictChecks: {
        orderBy: { checkedAt: "desc" },
        take: 1,
        select: {
          conclusion: true,
          note: true,
          queryPayload: true,
          hits: { select: { severity: true } }
        }
      },
      documents: { select: { id: true } }
    }
  });
  if (!intake) throw new Error("AdmisiÃ³n no encontrada");
  if (intake.status === "CONVERTED") throw new Error("Esta admisiÃ³n ya fue convertida");
  assertConflictReviewAllowsConversion(intake);

  const { generateInternalCode, generateFirmCaseNo } = await import("@/server/matters/code-generator");
  const internalCode = await generateInternalCode(intake.category);
  const firmCaseNo = await generateFirmCaseNo(intake.category);

  const firstProcedureType =
    intake.firstProcedureType ??
    (intake.category === "CIVIL_COMMERCIAL" ||
    intake.category === "CRIMINAL" ||
    intake.category === "ADMINISTRATIVE"
      ? "FIRST_INSTANCE"
      : "NON_LITIGATION_PHASE");
  assertAgencyAllowedForProcedure(intake.firstAgency, firstProcedureType);
  await assertCauseAllowedForSelection({
    causeId: intake.causeId,
    category: intake.category,
    procedureType: firstProcedureType
  });

  const matter = await prisma.$transaction(async (tx) => {
    const ownerId = intake.ownerUserId ?? session.user.id;

    const m = await tx.matter.create({
      data: {
        internalCode,
        firmCaseNo,
        title: intake.title,
        category: intake.category,
        ownerId,
        causeId: intake.causeId,
        causeFreeText: intake.causeFreeText,
        primaryClientId: intake.clientId,
        intakeId: intake.id,
        intakeDate: intake.receivedAt,
        ourStanding: intake.ourStanding,
        claimAmount: intake.claimAmount,
        counterclaimAsPlaintiff:
          !!intake.counterclaim &&
          (intake.ourStanding === "DEFENDANT" || intake.ourStanding === "JOINT_DEFENDANT"),
        counterclaimAsDefendant:
          !!intake.counterclaim &&
          (intake.ourStanding === "PLAINTIFF" || intake.ourStanding === "JOINT_PLAINTIFF"),
        barFiling: intake.barFiling,
        businessType: intake.businessType,
        serviceScope: intake.serviceScope,
        deliverables: intake.deliverables,
        counselType: intake.counselType,
        serviceStart: intake.serviceStart,
        serviceEnd: intake.serviceEnd,
        members: {
          create: [
            { userId: ownerId, role: "LEAD" },
            ...intake.coUserIds
              .filter((uid) => uid !== ownerId)
              .map((uid) => ({ userId: uid, role: "CO_LEAD" as const }))
          ]
        },
        clientLinks: intake.clientId
          ? { create: { clientId: intake.clientId, isPrimary: true, label: "Cliente principal" } }
          : undefined,
      }
    });

    const procedurePartyRows: { partyId: string; standing: LitigationStanding; ordinal: number }[] = [];
    let nextProcedurePartyOrdinal = 1;

    if (intake.client && intake.ourStanding) {
      const clientParty = await tx.party.create({
        data: {
          matterId: m.id,
          role: "CLIENT_PARTY",
          standing: intake.ourStanding,
          ordinal: 1,
          name: intake.client.name,
          partyType: clientTypeToPartyType(intake.client.type),
          idNumber: intake.client.type === "INDIVIDUAL" ? intake.client.idNumber : null,
          phone: intake.client.phone,
          address: intake.client.address,
          legalRep: intake.client.legalRep,
          contactName: intake.contactName,
          enterpriseSocialCode: intake.client.type === "INDIVIDUAL" ? null : intake.client.idNumber,
          enterpriseName: intake.client.type === "INDIVIDUAL" ? null : intake.client.name,
          notes: "Incorporado automÃ¡ticamente desde la admisiÃ³n"
        },
        select: { id: true }
      });
      procedurePartyRows.push({
        partyId: clientParty.id,
        standing: intake.ourStanding,
        ordinal: nextProcedurePartyOrdinal++
      });
    }

    for (const p of intake.parties) {
      const party = await tx.party.create({
        data: {
          matterId: m.id,
          role: p.role,
          standing: p.standing,
          ordinal: p.ordinal,
          name: p.name,
          partyType: p.partyType,
          idNumber: p.idNumber,
          phone: p.phone,
          address: p.address,
          legalRep: p.legalRep,
          contactName: p.contactName,
          enterpriseSocialCode: p.enterpriseSocialCode,
          enterpriseName: p.enterpriseName,
          notes: p.notes
        },
        select: { id: true }
      });
      if (p.standing) {
        procedurePartyRows.push({
          partyId: party.id,
          standing: p.standing,
          ordinal: nextProcedurePartyOrdinal++
        });
      }
    }

    const firstProcedure = await tx.matterProcedure.create({
      data: {
        matterId: m.id,
        type: firstProcedureType,
        engagement: "ENGAGED",
        order: 1,
        status: "IN_PROGRESS",
        handlingAgency: intake.firstAgency,
        jurisdiction: intake.jurisdiction,
        ourStanding: intake.ourStanding
      },
      select: { id: true }
    });

    if (procedurePartyRows.length > 0) {
      await tx.procedureParty.createMany({
        data: procedurePartyRows.map((row) => ({
          procedureId: firstProcedure.id,
          partyId: row.partyId,
          standing: row.standing,
          ordinal: row.ordinal
        })),
        skipDuplicates: true
      });
    }

    if (intake.feeAmount && intake.feeType) {
      const feeTypeLabel: Record<string, string> = {
        FIXED: "Honorario fijo",
        CONTINGENCY: "RepresentaciÃ³n de riesgo"
      };
      await tx.billing.create({
        data: {
          matterId: m.id,
          title: `Contrato de mandato - ${feeTypeLabel[intake.feeType] ?? intake.feeType}`,
          contractAmount: intake.feeAmount,
          schedule: intake.feeSchedule,
          status: "ACTIVE"
        }
      });
    }

    if (intake.documents.length > 0) {
      await tx.document.updateMany({
        where: { intakeId: intake.id },
        data: { matterId: m.id }
      });
    }

    await tx.intake.update({
      where: { id: intake.id },
      data: { status: "CONVERTED" }
    });

    await tx.timelineEvent.create({
      data: {
        matterId: m.id,
        eventType: "MATTER_CREATED",
        title: "Caso creado (desde admisiÃ³n)",
        occurredAt: new Date()
      }
    });

    await seedDefaultFolders(tx, m.id, intake.category);

    return m;
  });

  await audit({
    userId: session.user.id,
    action: "INTAKE_CONVERT",
    targetType: "Intake",
    targetId: intake.id,
    detail: { matterId: matter.id, internalCode }
  });

  revalidatePath("/intakes");
  revalidatePath(`/intakes/${intake.id}`);
  revalidatePath("/matters");
  return { ok: true, matterId: matter.id, internalCode };
}

