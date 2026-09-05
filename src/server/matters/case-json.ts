"use server";

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { getTenantPrisma } from "@/lib/tenant-prisma";
import { readFileSync, existsSync } from "node:fs";

export async function generateCaseJson(matterId: string) {
  const prisma = await getTenantPrisma();
  console.log("Generando case.json para:", matterId);
  
  const matter = await prisma.matter.findUnique({
    where: { id: matterId },
    include: {
      // Cliente principal
      primaryClient: true,
      // Clientes vinculados
      clientLinks: { include: { client: true } },
      // Owner del caso
      owner: { select: { id: true, name: true } },
      // Miembros del equipo
      members: { include: { user: { select: { id: true, name: true, role: true } } } },
      // Causa juridica
      cause: true,
      // Partes
      parties: true,
      // Entidades relacionadas
      relatedEntities: true,
      // Admision original
      intake: { select: { counterclaim: true, claimDescription: true } },
      // Casos vinculados
      linksFrom: {
        include: { relatedMatter: { select: { id: true, internalCode: true, firmCaseNo: true, title: true } } }
      },
      linksTo: {
        include: { matter: { select: { id: true, internalCode: true, firmCaseNo: true, title: true } } }
      },
      // Procedimientos con todo
      procedures: {
        orderBy: { order: "asc" },
        include: {
          stages: {
            orderBy: { order: "asc" },
            include: {
              tasks: true,
              documents: true,
            },
          },
          hearings: true,
          deadlines: true,
          procedureParties: { include: { party: true } },
          memos: true,
        },
      },
      // Documentos del caso
      documents: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: {
          uploadedBy: { select: { id: true, name: true } },
        },
      },
      // Timeline de eventos
      timelineEvents: {
        orderBy: { occurredAt: "desc" },
      },
      // Notas de comunicacion
      notes: {
        orderBy: { occurredAt: "desc" },
        include: {
          author: { select: { id: true, name: true } },
        },
      },
      // Finanzas
      billings: true,
      feeEntries: true,
      commissionPlans: true,
      // Archivo
      archiveRecords: true,
      // Facturas
      invoiceRequests: true,
      // Carpetas del expediente
      folders: true,
      // Sellos
      sealRequests: true,
      // SMS judiciales
      smsMessages: true,
      // Medidas cautelares
      preservationCases: {
        include: {
          targets: {
            include: {
              properties: {
                include: {
                  renewals: true,
                },
              },
            },
          },
        },
      },
      // Envios express
      expressTrackings: true,
      // Revisiones IA
      reviewRecords: true,
    },
  });

  if (!matter) throw new Error("Caso no encontrado");

  const caseJson = {
    version: "1.0",
    updatedAt: new Date().toISOString(),
    case: {
      id: matter.id,
      internalCode: matter.internalCode,
      firmCaseNo: matter.firmCaseNo,
      title: matter.title,
      category: matter.category,
      status: matter.status,
      claimAmount: matter.claimAmount ? matter.claimAmount.toString() : null,
      ourStanding: matter.ourStanding,
      counterclaimAsPlaintiff: matter.counterclaimAsPlaintiff,
      counterclaimAsDefendant: matter.counterclaimAsDefendant,
      barFiling: matter.barFiling,
      businessType: matter.businessType,
      serviceScope: matter.serviceScope,
      deliverables: matter.deliverables,
      counselType: matter.counselType,
      serviceStart: matter.serviceStart,
      serviceEnd: matter.serviceEnd,
      intakeDate: matter.intakeDate,
      firstAcceptedAt: matter.firstAcceptedAt,
      closedAt: matter.closedAt,
      archivedAt: matter.archivedAt,
      causeFreeText: matter.causeFreeText,
      customValues: matter.customValues,
      createdAt: matter.createdAt,
      updatedAt: matter.updatedAt,
      jsonPath: matter.jsonPath,
      deletedAt: matter.deletedAt,
    },
    cause: matter.cause ? {
      id: matter.cause.id,
      name: matter.cause.name,
      code: matter.cause.code,
      shortName: matter.cause.shortName,
      level: matter.cause.level,
      category: matter.cause.category,
    } : null,
    primaryClient: matter.primaryClient ? {
      id: matter.primaryClient.id,
      name: matter.primaryClient.name,
      type: matter.primaryClient.type,
      idNumber: matter.primaryClient.idNumber,
      address: matter.primaryClient.address,
      phone: matter.primaryClient.phone,
      email: matter.primaryClient.email,
      internalCode: matter.primaryClient.internalCode,
      source: matter.primaryClient.source,
      legalRep: matter.primaryClient.legalRep,
      industry: matter.primaryClient.industry,
      gender: matter.primaryClient.gender,
      cooperationStatus: matter.primaryClient.cooperationStatus,
    } : null,
    clients: matter.clientLinks.map((link) => ({
      id: link.client.id,
      name: link.client.name,
      type: link.client.type,
      idNumber: link.client.idNumber,
      isPrimary: link.isPrimary,
      label: link.label,
    })),
    owner: matter.owner ? {
      id: matter.owner.id,
      name: matter.owner.name,
    } : null,
    members: matter.members.map((member) => ({
      userId: member.userId,
      name: member.user.name,
      role: member.role,
      joinedAt: member.joinedAt,
    })),
    parties: matter.parties.map((party) => ({
      id: party.id,
      name: party.name,
      role: party.role,
      partyType: party.partyType,
      idNumber: party.idNumber,
      standing: party.standing,
      ordinal: party.ordinal,
      phone: party.phone,
      address: party.address,
      legalRep: party.legalRep,
      contactName: party.contactName,
      notes: party.notes,
      enterpriseId: party.enterpriseId,
      enterpriseSocialCode: party.enterpriseSocialCode,
      enterpriseName: party.enterpriseName,
    })),
    relatedEntities: matter.relatedEntities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      relationship: entity.relationship,
      notes: entity.notes,
    })),
    intake: matter.intake,
    linkedMatters: {
      from: matter.linksFrom.map((link) => ({
        id: link.id,
        relatedMatter: link.relatedMatter,
      })),
      to: matter.linksTo.map((link) => ({
        id: link.id,
        matter: link.matter,
      })),
    },
    procedures: matter.procedures.map((proc) => ({
      id: proc.id,
      type: proc.type,
      customLabel: proc.customLabel,
      engagement: proc.engagement,
      order: proc.order,
      caseNumber: proc.caseNumber,
      handlingAgency: proc.handlingAgency,
      panel: proc.panel,
      handler: proc.handler,
      jurisdiction: proc.jurisdiction,
      presidingJudge: proc.presidingJudge,
      presidingJudgeContact: proc.presidingJudgeContact,
      judgeAssistant: proc.judgeAssistant,
      judgeAssistantContact: proc.judgeAssistantContact,
      ourStanding: proc.ourStanding,
      leadLawyerId: proc.leadLawyerId,
      isExternalLead: proc.isExternalLead,
      acceptedAt: proc.acceptedAt,
      concludedAt: proc.concludedAt,
      status: proc.status,
      outcome: proc.outcome,
      outcomeNote: proc.outcomeNote,
      stages: proc.stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        description: stage.description,
        order: stage.order,
        status: stage.status,
        startedAt: stage.startedAt,
        completedAt: stage.completedAt,
        tasks: stage.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          completed: task.completed,
          completedAt: task.completedAt,
          priority: task.priority,
          dueAt: task.dueAt,
          assigneeId: task.assigneeId,
        })),
        documents: stage.documents.map((doc) => ({
          id: doc.id,
          name: doc.name,
          category: doc.category,
          status: doc.status,
        })),
      })),
      hearings: proc.hearings.map((hearing) => ({
        id: hearing.id,
        title: hearing.title,
        room: hearing.room,
        address: hearing.address,
        judge: hearing.judge,
        contact: hearing.contact,
        startsAt: hearing.startsAt,
        endsAt: hearing.endsAt,
        notes: hearing.notes,
      })),
      deadlines: proc.deadlines.map((deadline) => ({
        id: deadline.id,
        title: deadline.title,
        category: deadline.category,
        dueAt: deadline.dueAt,
        basis: deadline.basis,
        remindDays: deadline.remindDays,
        completed: deadline.completed,
        completedAt: deadline.completedAt,
      })),
      procedureParties: proc.procedureParties.map((pp) => ({
        partyId: pp.partyId,
        partyName: pp.party.name,
        standing: pp.standing,
        ordinal: pp.ordinal,
        note: pp.note,
      })),
      memos: proc.memos.map((memo) => ({
        id: memo.id,
        content: memo.content,
        done: memo.done,
        doneAt: memo.doneAt,
        createdById: memo.createdById,
        createdAt: memo.createdAt,
      })),
    })),
    documents: matter.documents.map((doc) => ({
      id: doc.id,
      name: doc.name,
      category: doc.category,
      status: doc.status,
      sourceParty: doc.sourceParty,
      path: doc.path,
      mimeType: doc.mimeType,
      size: doc.size,
      version: doc.version,
      isLatest: doc.isLatest,
      familyId: doc.familyId,
      encrypted: doc.encrypted,
      createdAt: doc.createdAt,
      uploadedBy: doc.uploadedBy?.name ?? null,
    })),
    timelineEvents: matter.timelineEvents.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      title: event.title,
      content: event.content,
      occurredAt: event.occurredAt,
      refType: event.refType,
      refId: event.refId,
    })),
    notes: matter.notes.map((note) => ({
      id: note.id,
      channel: note.channel,
      withWhom: note.withWhom,
      occurredAt: note.occurredAt,
      content: note.content,
      tags: note.tags,
      author: note.author.name,
      authorId: note.authorId,
    })),
    finance: {
      billings: matter.billings.map((billing) => ({
        id: billing.id,
        title: billing.title,
        contractAmount: billing.contractAmount.toString(),
        schedule: billing.schedule,
        status: billing.status,
        signedAt: billing.signedAt,
        createdAt: billing.createdAt,
      })),
      feeEntries: matter.feeEntries.map((entry) => ({
        id: entry.id,
        type: entry.type,
        amount: entry.amount.toString(),
        occurredAt: entry.occurredAt,
        invoiceNo: entry.invoiceNo,
        payerOrPayee: entry.payerOrPayee,
        method: entry.method,
        note: entry.note,
        parentFeeEntryId: entry.parentFeeEntryId,
        beneficiaryUserId: entry.beneficiaryUserId,
      })),
      commissionPlans: matter.commissionPlans.map((plan) => ({
        id: plan.id,
        userId: plan.userId,
        percent: plan.percent.toString(),
        label: plan.label,
        active: plan.active,
      })),
    },
    archive: matter.archiveRecords.map((record) => ({
      id: record.id,
      archiveNo: record.archiveNo,
      summary: record.summary,
      judgmentSummary: record.judgmentSummary,
      closedReason: record.closedReason,
      completedAt: record.completedAt,
      checklistJson: record.checklistJson,
      missingItems: record.missingItems,
      archivedBy: record.archivedBy,
      archivedById: record.archivedById,
      archivedAt: record.archivedAt,
      status: record.status,
      reviewedById: record.reviewedById,
      reviewedAt: record.reviewedAt,
      reviewNote: record.reviewNote,
    })),
    invoiceRequests: matter.invoiceRequests.map((inv) => ({
      id: inv.id,
      amount: inv.amount.toString(),
      status: inv.status,
      invoiceType: inv.invoiceType,
      invoiceItem: inv.invoiceItem,
      buyerName: inv.buyerName,
      buyerTaxNo: inv.buyerTaxNo,
      invoiceNo: inv.invoiceNo,
      issuedAt: inv.issuedAt,
      requestedAt: inv.requestedAt,
      requestNote: inv.requestNote,
    })),
    folders: matter.folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      orderIndex: folder.orderIndex,
      isDefault: folder.isDefault,
    })),
    sealRequests: matter.sealRequests.map((seal) => ({
      id: seal.id,
      code: seal.code,
      sealType: seal.sealType,
      documentTitle: seal.documentTitle,
      status: seal.status,
      purpose: seal.purpose,
      pageCount: seal.pageCount,
      copies: seal.copies,
      urgency: seal.urgency,
      requestedAt: seal.requestedAt,
      approvedAt: seal.approvedAt,
      stampedAt: seal.stampedAt,
    })),
    smsMessages: matter.smsMessages.map((sms) => ({
      id: sms.id,
      rawText: sms.rawText,
      receivedAt: sms.receivedAt,
      smsType: sms.smsType,
      parsedJson: sms.parsedJson,
      matchedMatterId: sms.matchedMatterId,
      matchedBy: sms.matchedBy,
      processed: sms.processed,
      processedAt: sms.processedAt,
      needsManualAction: sms.needsManualAction,
    })),
    preservationCases: matter.preservationCases.map((pres) => ({
      id: pres.id,
      type: pres.type,
      status: pres.status,
      court: pres.court,
      rulingNumber: pres.rulingNumber,
      guaranteeType: pres.guaranteeType,
      appliedAt: pres.appliedAt,
      note: pres.note,
      remindDays: pres.remindDays,
      targets: pres.targets.map((target) => ({
        id: target.id,
        name: target.name,
        note: target.note,
        properties: target.properties.map((prop) => ({
          id: prop.id,
          propertyType: prop.propertyType,
          propertyDetail: prop.propertyDetail,
          amount: prop.amount?.toString() ?? null,
          startDate: prop.startDate,
          duration: prop.duration,
          expiryDate: prop.expiryDate,
          status: prop.status,
          renewals: prop.renewals.map((renewal) => ({
            id: renewal.id,
            renewedAt: renewal.renewedAt,
            oldExpiryDate: renewal.oldExpiryDate,
            newExpiryDate: renewal.newExpiryDate,
            renewalDuration: renewal.renewalDuration,
            note: renewal.note,
          })),
        })),
      })),
    })),
    expressTrackings: matter.expressTrackings.map((express) => ({
      id: express.id,
      trackingNo: express.trackingNo,
      companyCode: express.companyCode,
      direction: express.direction,
      purpose: express.purpose,
      recipient: express.recipient,
      recipientPhone: express.recipientPhone,
      lastState: express.lastState,
      lastUpdateAt: express.lastUpdateAt,
      tracesJson: express.tracesJson,
    })),
    reviewRecords: matter.reviewRecords.map((review) => ({
      id: review.id,
      documentId: review.documentId,
      reviewedById: review.reviewedById,
      reviewedAt: review.reviewedAt,
      itemCount: review.itemCount,
      itemsJson: review.itemsJson,
      truncated: review.truncated,
    })),
  };

  // Guardar el JSON directamente en storage/matters/ con el nombre del caso
  const matterDir = join(process.cwd(), "storage", "matters");
  mkdirSync(matterDir, { recursive: true });

  const jsonPath = join(matterDir, `${matter.internalCode}.json`);
   // Preservar audit, chat y writings del JSON anterior
  if (existsSync(jsonPath)) {
    const previousData = JSON.parse(readFileSync(jsonPath, "utf-8"));
    if (previousData.audit) caseJson.audit = previousData.audit;
    if (previousData.chat) caseJson.chat = previousData.chat;
    if (previousData.writings) caseJson.writings = previousData.writings;
  }

  writeFileSync(jsonPath, JSON.stringify(caseJson, null, 2), "utf-8");

  // No actualizar jsonPath en cada llamada para evitar conflictos de concurrencia
  // La ruta es siempre la misma: storage/matters/{internalCode}.json

  console.log("case.json generado correctamente");
  return { ok: true, jsonPath };
}