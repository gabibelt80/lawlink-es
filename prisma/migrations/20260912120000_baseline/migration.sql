-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SYSTEM_ADMIN', 'ADMIN', 'PRINCIPAL_LAWYER', 'LAWYER', 'ASSISTANT', 'FINANCE');

-- CreateEnum
CREATE TYPE "MatterCategory" AS ENUM ('CIVIL_COMMERCIAL', 'LABOR_ARBITRATION', 'COMMERCIAL_ARBITRATION', 'CRIMINAL', 'ADMINISTRATIVE', 'ADMINISTRATIVE_CLAIM', 'NON_LITIGATION', 'LEGAL_COUNSEL', 'SPECIAL_PROJECT');

-- CreateEnum
CREATE TYPE "MatterStatus" AS ENUM ('PENDING_ACCEPTANCE', 'IN_PROGRESS', 'ON_HOLD', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MatterMemberRole" AS ENUM ('LEAD', 'CO_LEAD', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "IntakeStatus" AS ENUM ('INTAKE', 'PENDING_CONFIRMATION', 'CONVERTED', 'DECLINED', 'NEEDS_REVISION');

-- CreateEnum
CREATE TYPE "LitigationStanding" AS ENUM ('PLAINTIFF', 'JOINT_PLAINTIFF', 'DEFENDANT', 'JOINT_DEFENDANT', 'THIRD_PARTY', 'COUNTERCLAIM_PLAINTIFF', 'COUNTERCLAIM_DEFENDANT', 'APPELLANT', 'APPELLEE', 'RETRIAL_APPLICANT', 'RETRIAL_RESPONDENT', 'ENFORCEMENT_APPLICANT', 'EXECUTED_PERSON', 'CRIMINAL_DEFENDANT', 'CRIMINAL_VICTIM', 'PRIVATE_PROSECUTOR', 'CRIMINAL_INCIDENTAL_PLAINTIFF', 'ARBITRATION_CLAIMANT', 'ARBITRATION_RESPONDENT', 'ADMIN_PLAINTIFF', 'ADMIN_DEFENDANT', 'ADMIN_RECONSIDERATION_APPLICANT', 'ADMIN_RECONSIDERATION_RESPONDENT', 'NON_LITIGATION_PARTY');

-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('FIXED', 'CONTINGENCY', 'TIMED');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('PLAIN', 'SPECIAL');

-- CreateEnum
CREATE TYPE "InvoiceItem" AS ENUM ('LAWYER_FEE', 'CONSULTING_FEE', 'AGENCY_FEE', 'OTHER');

-- CreateEnum
CREATE TYPE "InvoiceRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'ISSUED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'FILED');

-- CreateEnum
CREATE TYPE "ProcedureType" AS ENUM ('FIRST_INSTANCE', 'SECOND_INSTANCE', 'RETRIAL_REVIEW', 'RETRIAL', 'REMAND_FIRST', 'REMAND_SECOND', 'PROSECUTORIAL_SUPERVISION', 'COMMERCIAL_ARBITRATION', 'LABOR_ARBITRATION', 'ARBITRATION_SET_ASIDE', 'ARBITRATION_ENFORCEMENT_REVIEW', 'ENFORCEMENT', 'ENFORCEMENT_OBJECTION', 'INVESTIGATION', 'PROSECUTION_REVIEW', 'DEATH_PENALTY_REVIEW', 'CRIMINAL_ENFORCEMENT', 'COMMUTATION_PAROLE_REVIEW', 'ADMIN_RECONSIDERATION', 'ADMIN_NON_LITIGATION_ENFORCEMENT', 'ADMIN_PRE_LITIGATION', 'NON_LITIGATION_PHASE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ProcedureStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'CONCLUDED');

-- CreateEnum
CREATE TYPE "ProcedureEngagement" AS ENUM ('ENGAGED', 'INFORMATIONAL');

-- CreateEnum
CREATE TYPE "ProcedureOutcome" AS ENUM ('WON', 'PARTIAL_WON', 'LOST', 'MEDIATED', 'WITHDRAWN', 'DISMISSED', 'COMPLETED', 'TRANSFERRED', 'OTHER');

-- CreateEnum
CREATE TYPE "PartyRole" AS ENUM ('CLIENT_PARTY', 'OPPOSING_PARTY', 'THIRD_PARTY', 'CO_LITIGANT', 'AGENT', 'WITNESS', 'OTHER');

-- CreateEnum
CREATE TYPE "PartyType" AS ENUM ('NATURAL_PERSON', 'ORGANIZATION', 'COMPANY', 'PARTNERSHIP', 'INDIVIDUAL_BUSINESS', 'INSTITUTION', 'SOCIAL_ORG', 'GOVERNMENT', 'OTHER_ORG');

-- CreateEnum
CREATE TYPE "BarFilingType" AS ENUM ('NONE', 'COLLECTIVE', 'SENSITIVE', 'MAJOR', 'OTHER');

-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('INDIVIDUAL', 'COMPANY', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "ClientCooperationStatus" AS ENUM ('POTENTIAL', 'NEGOTIATING', 'SIGNED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "ClientGender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "ConflictSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'BLOCKING');

-- CreateEnum
CREATE TYPE "ConflictConclusion" AS ENUM ('PENDING', 'SAME_SUBJECT', 'DIFFERENT', 'NEED_INFO');

-- CreateEnum
CREATE TYPE "DeadlinePeriodUnit" AS ENUM ('DAYS', 'MONTHS', 'YEARS');

-- CreateEnum
CREATE TYPE "DeadlineCategory" AS ENUM ('LIMITATION', 'EVIDENCE', 'APPEAL', 'PERFORMANCE', 'RESPONSE', 'ENFORCEMENT', 'ARBITRATION_SET_ASIDE', 'PRESERVATION', 'CUSTOM');

-- CreateEnum
CREATE TYPE "NoteChannel" AS ENUM ('PHONE', 'WECHAT', 'EMAIL', 'MEETING', 'COURT', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('EVIDENCE', 'PLEADING', 'PROCEDURE', 'JUDGMENT', 'CONTRACT', 'OTHER');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "FeeEntryType" AS ENUM ('RECEIVABLE', 'RECEIVED', 'REFUND', 'COST', 'COMMISSION');

-- CreateEnum
CREATE TYPE "TemplateCategory" AS ENUM ('INTAKE', 'RETAINER', 'LITIGATION', 'HEARING', 'WORK_PRODUCT', 'ARCHIVE', 'CLOSING', 'BLANK');

-- CreateEnum
CREATE TYPE "SealType" AS ENUM ('OFFICIAL_SEAL', 'CONTRACT_SEAL', 'FINANCE_SEAL', 'LEGAL_REP_SEAL', 'CONTRACT_REVIEW_SEAL');

-- CreateEnum
CREATE TYPE "SealRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'STAMPED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Urgency" AS ENUM ('NORMAL', 'URGENT');

-- CreateEnum
CREATE TYPE "CustomFieldEntity" AS ENUM ('MATTER', 'CLIENT');

-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'SELECT');

-- CreateEnum
CREATE TYPE "MatterStageStatus" AS ENUM ('ACTIVE', 'HIDDEN');

-- CreateEnum
CREATE TYPE "ArchiveStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ArchiveClosedReason" AS ENUM ('JUDGMENT', 'MEDIATION', 'WITHDRAWAL', 'SETTLEMENT', 'RULING', 'OTHER');

-- CreateEnum
CREATE TYPE "SmsType" AS ENUM ('HEARING_NOTICE', 'SERVICE_NOTICE', 'FEE_NOTICE', 'MEDIATION', 'ENFORCEMENT', 'FILING_NOTICE', 'JUDGMENT_NOTICE', 'EVIDENCE_SUBMIT', 'OTHER');

-- CreateEnum
CREATE TYPE "SmsMatchSource" AS ENUM ('AUTO_CASE_NUMBER', 'MANUAL', 'UNMATCHED');

-- CreateEnum
CREATE TYPE "PreservationType" AS ENUM ('PRE_LITIGATION', 'LITIGATION', 'ENFORCEMENT');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('BANK_DEPOSIT', 'REAL_ESTATE', 'VEHICLE', 'EQUITY', 'IP', 'OTHER');

-- CreateEnum
CREATE TYPE "GuaranteeType" AS ENUM ('CASH_DEPOSIT', 'GUARANTEE_LETTER', 'PROPERTY', 'NONE');

-- CreateEnum
CREATE TYPE "PreservationStatus" AS ENUM ('ACTIVE', 'RENEWED', 'EXPIRED', 'LIFTED');

-- CreateEnum
CREATE TYPE "ExpressDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PRESERVATION_EXPIRY', 'HEARING_REMINDER', 'DEADLINE_REMINDER', 'SEAL_STATUS_CHANGE', 'SMS_ARRIVAL', 'TASK_ASSIGNED', 'SYSTEM', 'ARCHIVE_APPROVED', 'ARCHIVE_REJECTED');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "FirmFileCategory" AS ENUM ('POLICY', 'GUIDE', 'TEMPLATE', 'REFERENCE', 'CONTRACT', 'LETTER', 'LICENSE', 'OTHER_FIRM');

-- CreateEnum
CREATE TYPE "ExternalContactCategory" AS ENUM ('COURT', 'PROSECUTOR', 'POLICE', 'NOTARY', 'ARBITRATION', 'OTHER_FIRM', 'EXPERT', 'OTHER');

-- CreateEnum
CREATE TYPE "ExternalContactStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'LAWYER',
    "phone" TEXT,
    "avatar" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "calendarToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ClientType" NOT NULL,
    "idNumber" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "source" TEXT,
    "tags" TEXT[],
    "notes" TEXT,
    "legalRep" TEXT,
    "internalCode" TEXT,
    "cooperationStatus" "ClientCooperationStatus" NOT NULL DEFAULT 'SIGNED',
    "industry" TEXT,
    "gender" "ClientGender",
    "ethnicity" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "wechat" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CauseOfAction" (
    "id" TEXT NOT NULL,
    "category" "MatterCategory" NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "level" INTEGER NOT NULL,
    "parentId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "pinyin" TEXT,
    "keywords" TEXT[],
    "sourceNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CauseOfAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Intake" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "MatterCategory" NOT NULL DEFAULT 'CIVIL_COMMERCIAL',
    "causeId" TEXT,
    "causeFreeText" TEXT,
    "description" TEXT,
    "status" "IntakeStatus" NOT NULL DEFAULT 'INTAKE',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "declinedReason" TEXT,
    "clientId" TEXT,
    "clientType" "ClientType",
    "contactName" TEXT,
    "contactPhone" TEXT,
    "firstProcedureType" "ProcedureType",
    "firstAgency" TEXT,
    "jurisdiction" TEXT,
    "ourStanding" "LitigationStanding",
    "claimAmount" DECIMAL(14,2),
    "claimDescription" TEXT,
    "barFiling" "BarFilingType",
    "counterclaim" BOOLEAN NOT NULL DEFAULT false,
    "businessType" TEXT,
    "serviceScope" TEXT,
    "deliverables" TEXT,
    "counselType" TEXT,
    "serviceStart" TIMESTAMP(3),
    "serviceEnd" TIMESTAMP(3),
    "feeType" "FeeType",
    "feeAmount" DECIMAL(14,2),
    "contingencyTerms" TEXT,
    "feeSchedule" TEXT,
    "feeNote" TEXT,
    "ownerUserId" TEXT,
    "coUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Intake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Matter" (
    "id" TEXT NOT NULL,
    "internalCode" TEXT NOT NULL,
    "firmCaseNo" TEXT,
    "title" TEXT NOT NULL,
    "category" "MatterCategory" NOT NULL DEFAULT 'CIVIL_COMMERCIAL',
    "status" "MatterStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "causeId" TEXT,
    "causeFreeText" TEXT,
    "claimAmount" DECIMAL(14,2),
    "ourStanding" "LitigationStanding",
    "counterclaimAsPlaintiff" BOOLEAN NOT NULL DEFAULT false,
    "counterclaimAsDefendant" BOOLEAN NOT NULL DEFAULT false,
    "barFiling" "BarFilingType",
    "businessType" TEXT,
    "serviceScope" TEXT,
    "deliverables" TEXT,
    "counselType" TEXT,
    "serviceStart" TIMESTAMP(3),
    "serviceEnd" TIMESTAMP(3),
    "intakeDate" TIMESTAMP(3),
    "primaryClientId" TEXT,
    "ownerId" TEXT NOT NULL,
    "intakeId" TEXT,
    "firstAcceptedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "customValues" JSONB NOT NULL DEFAULT '{}',
    "jsonPath" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Matter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomFieldDef" (
    "id" TEXT NOT NULL,
    "entityType" "CustomFieldEntity" NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" "CustomFieldType" NOT NULL DEFAULT 'TEXT',
    "options" TEXT[],
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomFieldDef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatterMember" (
    "matterId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MatterMemberRole" NOT NULL DEFAULT 'ASSISTANT',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatterMember_pkey" PRIMARY KEY ("matterId","userId")
);

-- CreateTable
CREATE TABLE "MatterClient" (
    "matterId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "label" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatterClient_pkey" PRIMARY KEY ("matterId","clientId")
);

-- CreateTable
CREATE TABLE "MatterProcedure" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "type" "ProcedureType" NOT NULL,
    "customLabel" TEXT,
    "engagement" "ProcedureEngagement" NOT NULL DEFAULT 'ENGAGED',
    "order" INTEGER NOT NULL,
    "caseNumber" TEXT,
    "handlingAgency" TEXT,
    "panel" TEXT,
    "handler" TEXT,
    "jurisdiction" TEXT,
    "presidingJudge" TEXT,
    "presidingJudgeContact" TEXT,
    "judgeAssistant" TEXT,
    "judgeAssistantContact" TEXT,
    "ourStanding" "LitigationStanding",
    "leadLawyerId" TEXT,
    "isExternalLead" BOOLEAN NOT NULL DEFAULT false,
    "acceptedAt" TIMESTAMP(3),
    "concludedAt" TIMESTAMP(3),
    "status" "ProcedureStatus" NOT NULL DEFAULT 'PENDING',
    "outcome" "ProcedureOutcome",
    "outcomeNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatterProcedure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatterStage" (
    "id" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "status" "MatterStageStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatterStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "stageId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assigneeId" TEXT,
    "dueAt" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hearing" (
    "id" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "room" TEXT,
    "address" TEXT,
    "judge" TEXT,
    "contact" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hearing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deadline" (
    "id" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "DeadlineCategory" NOT NULL DEFAULT 'CUSTOM',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "basis" TEXT,
    "remindDays" INTEGER NOT NULL DEFAULT 3,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deadline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeadlineRule" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerLabel" TEXT NOT NULL,
    "periodValue" INTEGER NOT NULL,
    "periodUnit" "DeadlinePeriodUnit" NOT NULL DEFAULT 'DAYS',
    "category" "DeadlineCategory" NOT NULL DEFAULT 'CUSTOM',
    "legalBasis" TEXT NOT NULL,
    "legalBasisUrl" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "applicableProcedures" JSONB NOT NULL,
    "applicableCategories" JSONB NOT NULL,
    "remindDays" INTEGER NOT NULL DEFAULT 7,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeadlineRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcedureMemo" (
    "id" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcedureMemo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL,
    "intakeId" TEXT,
    "matterId" TEXT,
    "role" "PartyRole" NOT NULL,
    "standing" "LitigationStanding",
    "ordinal" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "partyType" "PartyType" NOT NULL DEFAULT 'NATURAL_PERSON',
    "idNumber" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "legalRep" TEXT,
    "contactName" TEXT,
    "notes" TEXT,
    "enterpriseId" TEXT,
    "enterpriseSocialCode" TEXT,
    "enterpriseName" TEXT,
    "enterpriseBoundAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedure_parties" (
    "id" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "standing" "LitigationStanding" NOT NULL,
    "ordinal" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procedure_parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelatedEntity" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RelatedEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatterLink" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "relatedMatterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatterLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConflictCheck" (
    "id" TEXT NOT NULL,
    "intakeId" TEXT,
    "queryPayload" JSONB NOT NULL,
    "conclusion" "ConflictConclusion" NOT NULL DEFAULT 'PENDING',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "note" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConflictCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConflictHit" (
    "id" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "hitType" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "matchedName" TEXT NOT NULL,
    "matchedField" TEXT NOT NULL,
    "matchedValue" TEXT NOT NULL,
    "matchedRatio" DOUBLE PRECISION,
    "severity" "ConflictSeverity" NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "ConflictHit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "channel" "NoteChannel" NOT NULL DEFAULT 'OTHER',
    "withWhom" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT NOT NULL,
    "tags" TEXT[],
    "attachments" TEXT[],
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "matterId" TEXT,
    "intakeId" TEXT,
    "procedureId" TEXT,
    "stageId" TEXT,
    "name" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL DEFAULT 'OTHER',
    "sourceParty" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "familyId" TEXT,
    "path" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "sha256" TEXT,
    "sourcePath" TEXT,
    "sourceMimeType" TEXT,
    "encrypted" BOOLEAN NOT NULL DEFAULT false,
    "algorithm" TEXT,
    "iv" TEXT,
    "authTag" TEXT,
    "tags" TEXT[],
    "uploadedById" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "folderId" TEXT,
    "templateId" TEXT,
    "templateContextSnapshot" JSONB,
    "archiveChecklistItemId" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceRequest" (
    "id" TEXT NOT NULL,
    "matterId" TEXT,
    "noMatterReason" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "title" TEXT,
    "status" "InvoiceRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestNote" TEXT,
    "invoiceType" "InvoiceType",
    "invoiceItem" "InvoiceItem",
    "buyerName" TEXT,
    "buyerTaxNo" TEXT,
    "buyerAddress" TEXT,
    "buyerPhone" TEXT,
    "buyerBank" TEXT,
    "buyerBankAccount" TEXT,
    "evidenceDocIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "invoiceNo" TEXT,
    "issuedAt" TIMESTAMP(3),
    "requestedById" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedById" TEXT,
    "processedAt" TIMESTAMP(3),
    "processNote" TEXT,
    "contractScanId" TEXT,
    "invoiceFileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Billing" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contractAmount" DECIMAL(14,2) NOT NULL,
    "schedule" TEXT,
    "status" "BillingStatus" NOT NULL DEFAULT 'DRAFT',
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Billing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeEntry" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "billingId" TEXT,
    "type" "FeeEntryType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoiceNo" TEXT,
    "invoiceFile" TEXT,
    "payerOrPayee" TEXT,
    "method" TEXT,
    "note" TEXT,
    "parentFeeEntryId" TEXT,
    "beneficiaryUserId" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionPlan" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "percent" DECIMAL(5,2) NOT NULL,
    "label" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchiveRecord" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "archiveNo" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "judgmentSummary" TEXT,
    "closedReason" "ArchiveClosedReason",
    "completedAt" TIMESTAMP(3),
    "checklistJson" JSONB NOT NULL,
    "missingItems" TEXT[],
    "coverDocId" TEXT,
    "catalogDocId" TEXT,
    "archivedBy" TEXT NOT NULL,
    "archivedById" TEXT,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exportPath" TEXT,
    "checksum" TEXT,
    "status" "ArchiveStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,

    CONSTRAINT "ArchiveRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "detail" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageTemplate" (
    "id" TEXT NOT NULL,
    "procedureType" "ProcedureType" NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "name" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "TemplateCategory" NOT NULL,
    "description" TEXT,
    "applicableCategories" JSONB NOT NULL,
    "docxBlobId" TEXT NOT NULL,
    "variables" JSONB NOT NULL,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OTRO',
    "stage" TEXT NOT NULL DEFAULT 'TODAS',
    "content" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WritingTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentFolder" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SealTypeConfig" (
    "type" "SealType" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "approverRoles" JSONB NOT NULL,
    "requiresLegalRep" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SealTypeConfig_pkey" PRIMARY KEY ("type")
);

-- CreateTable
CREATE TABLE "SealRequest" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sealType" "SealType" NOT NULL,
    "matterId" TEXT,
    "purpose" TEXT NOT NULL,
    "documentTitle" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL DEFAULT 1,
    "requireCrossPageSeal" BOOLEAN NOT NULL DEFAULT false,
    "copies" INTEGER NOT NULL DEFAULT 1,
    "urgency" "Urgency" NOT NULL DEFAULT 'NORMAL',
    "draftDocId" TEXT NOT NULL,
    "stampedDocId" TEXT,
    "status" "SealRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestNote" TEXT,
    "approveNote" TEXT,
    "requestedById" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "stampedById" TEXT,
    "stampedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "parentSealRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SealRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsMessage" (
    "id" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedById" TEXT NOT NULL,
    "parsedJson" JSONB NOT NULL,
    "smsType" "SmsType" NOT NULL DEFAULT 'OTHER',
    "matchedMatterId" TEXT,
    "matchedBy" "SmsMatchSource" NOT NULL DEFAULT 'UNMATCHED',
    "generatedHearingId" TEXT,
    "generatedDeadlineId" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "needsManualAction" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreservationCase" (
    "id" TEXT NOT NULL,
    "matterId" TEXT,
    "type" "PreservationType" NOT NULL,
    "status" "PreservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "court" TEXT,
    "rulingNumber" TEXT,
    "guaranteeType" "GuaranteeType",
    "appliedAt" TIMESTAMP(3),
    "note" TEXT,
    "ownerId" TEXT,
    "remindDays" INTEGER[] DEFAULT ARRAY[30, 15, 7, 3, 1]::INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreservationCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreservationTarget" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreservationTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreservationProperty" (
    "id" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "propertyType" "PropertyType" NOT NULL,
    "propertyDetail" TEXT,
    "amount" DECIMAL(18,2),
    "startDate" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "status" "PreservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreservationProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreservationPropertyRenewal" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "renewedAt" TIMESTAMP(3) NOT NULL,
    "oldExpiryDate" TIMESTAMP(3) NOT NULL,
    "newExpiryDate" TIMESTAMP(3) NOT NULL,
    "renewalDuration" INTEGER NOT NULL,
    "note" TEXT,
    "performedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreservationPropertyRenewal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpressTracking" (
    "id" TEXT NOT NULL,
    "matterId" TEXT,
    "trackingNo" TEXT NOT NULL,
    "companyCode" TEXT,
    "direction" "ExpressDirection" NOT NULL,
    "purpose" TEXT NOT NULL,
    "recipient" TEXT,
    "recipientPhone" TEXT,
    "lastState" TEXT,
    "lastUpdateAt" TIMESTAMP(3),
    "tracesJson" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpressTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "title" TEXT NOT NULL,
    "content" TEXT,
    "href" TEXT,
    "refType" TEXT,
    "refId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewRecord" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "reviewedById" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "itemCount" INTEGER NOT NULL,
    "itemsJson" JSONB NOT NULL,
    "textPreviewChars" INTEGER NOT NULL,
    "truncated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ReviewRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FirmFile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "FirmFileCategory" NOT NULL,
    "tags" TEXT[],
    "path" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER NOT NULL,
    "sha256" TEXT,
    "uploadedById" TEXT NOT NULL,
    "supersededById" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FirmFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "authorId" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalContact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ExternalContactCategory" NOT NULL,
    "organization" TEXT,
    "title" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "wechat" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "tags" TEXT[],
    "createdById" TEXT NOT NULL,
    "status" "ExternalContactStatus" NOT NULL DEFAULT 'APPROVED',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Firm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "logoDataUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "plan" TEXT NOT NULL DEFAULT 'trial',
    "planExpiresAt" TIMESTAMP(3),
    "enabledModules" JSONB NOT NULL DEFAULT '[]',
    "maxUsers" INTEGER NOT NULL DEFAULT 1,
    "maxBranch" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "suspendedAt" TIMESTAMP(3),
    "suspensionReason" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedAtScheduled" TIMESTAMP(3),
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'active',
    "subscriptionPeriodStart" TIMESTAMP(3),
    "subscriptionPeriodEnd" TIMESTAMP(3),
    "lastPaymentAt" TIMESTAMP(3),
    "lastPaymentAmount" DECIMAL(10,2),
    "paymentProvider" TEXT NOT NULL DEFAULT 'mercado_pago',
    "paymentProviderCustomerId" TEXT,
    "paymentProviderSubscriptionId" TEXT,

    CONSTRAINT "Firm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FirmUser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "avatar" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "calendarToken" TEXT,
    "firmId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FirmUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jurisprudence" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "fullText" TEXT NOT NULL,
    "court" TEXT,
    "jurisdiction" TEXT,
    "fuero" TEXT,
    "date" TIMESTAMP(3),
    "source" TEXT,
    "sourceUrl" TEXT,
    "category" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "matterId" TEXT,

    CONSTRAINT "Jurisprudence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_calendarToken_key" ON "User"("calendarToken");

-- CreateIndex
CREATE UNIQUE INDEX "Client_internalCode_key" ON "Client"("internalCode");

-- CreateIndex
CREATE INDEX "Client_name_idx" ON "Client"("name");

-- CreateIndex
CREATE INDEX "Client_idNumber_idx" ON "Client"("idNumber");

-- CreateIndex
CREATE INDEX "Contact_clientId_idx" ON "Contact"("clientId");

-- CreateIndex
CREATE INDEX "CauseOfAction_category_level_idx" ON "CauseOfAction"("category", "level");

-- CreateIndex
CREATE INDEX "CauseOfAction_category_active_level_idx" ON "CauseOfAction"("category", "active", "level");

-- CreateIndex
CREATE INDEX "CauseOfAction_name_idx" ON "CauseOfAction"("name");

-- CreateIndex
CREATE INDEX "CauseOfAction_parentId_idx" ON "CauseOfAction"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "CauseOfAction_category_code_key" ON "CauseOfAction"("category", "code");

-- CreateIndex
CREATE INDEX "Intake_status_receivedAt_idx" ON "Intake"("status", "receivedAt");

-- CreateIndex
CREATE INDEX "Intake_causeId_idx" ON "Intake"("causeId");

-- CreateIndex
CREATE INDEX "Intake_ownerUserId_idx" ON "Intake"("ownerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Matter_internalCode_key" ON "Matter"("internalCode");

-- CreateIndex
CREATE UNIQUE INDEX "Matter_firmCaseNo_key" ON "Matter"("firmCaseNo");

-- CreateIndex
CREATE UNIQUE INDEX "Matter_intakeId_key" ON "Matter"("intakeId");

-- CreateIndex
CREATE INDEX "Matter_status_updatedAt_idx" ON "Matter"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "Matter_ownerId_idx" ON "Matter"("ownerId");

-- CreateIndex
CREATE INDEX "Matter_primaryClientId_idx" ON "Matter"("primaryClientId");

-- CreateIndex
CREATE INDEX "Matter_category_status_idx" ON "Matter"("category", "status");

-- CreateIndex
CREATE INDEX "Matter_causeId_idx" ON "Matter"("causeId");

-- CreateIndex
CREATE INDEX "CustomFieldDef_entityType_order_idx" ON "CustomFieldDef"("entityType", "order");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldDef_entityType_key_key" ON "CustomFieldDef"("entityType", "key");

-- CreateIndex
CREATE INDEX "MatterMember_userId_idx" ON "MatterMember"("userId");

-- CreateIndex
CREATE INDEX "MatterClient_clientId_idx" ON "MatterClient"("clientId");

-- CreateIndex
CREATE INDEX "MatterProcedure_matterId_order_idx" ON "MatterProcedure"("matterId", "order");

-- CreateIndex
CREATE INDEX "MatterProcedure_status_idx" ON "MatterProcedure"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MatterProcedure_matterId_order_key" ON "MatterProcedure"("matterId", "order");

-- CreateIndex
CREATE INDEX "MatterStage_procedureId_order_idx" ON "MatterStage"("procedureId", "order");

-- CreateIndex
CREATE INDEX "Task_matterId_completed_dueAt_idx" ON "Task"("matterId", "completed", "dueAt");

-- CreateIndex
CREATE INDEX "Task_assigneeId_completed_idx" ON "Task"("assigneeId", "completed");

-- CreateIndex
CREATE INDEX "Hearing_procedureId_startsAt_idx" ON "Hearing"("procedureId", "startsAt");

-- CreateIndex
CREATE INDEX "Hearing_startsAt_idx" ON "Hearing"("startsAt");

-- CreateIndex
CREATE INDEX "Deadline_procedureId_dueAt_completed_idx" ON "Deadline"("procedureId", "dueAt", "completed");

-- CreateIndex
CREATE INDEX "Deadline_dueAt_completed_idx" ON "Deadline"("dueAt", "completed");

-- CreateIndex
CREATE UNIQUE INDEX "DeadlineRule_code_key" ON "DeadlineRule"("code");

-- CreateIndex
CREATE INDEX "DeadlineRule_enabled_sortOrder_idx" ON "DeadlineRule"("enabled", "sortOrder");

-- CreateIndex
CREATE INDEX "ProcedureMemo_procedureId_idx" ON "ProcedureMemo"("procedureId");

-- CreateIndex
CREATE INDEX "Party_matterId_role_ordinal_idx" ON "Party"("matterId", "role", "ordinal");

-- CreateIndex
CREATE INDEX "Party_name_idx" ON "Party"("name");

-- CreateIndex
CREATE INDEX "Party_idNumber_idx" ON "Party"("idNumber");

-- CreateIndex
CREATE INDEX "Party_enterpriseSocialCode_idx" ON "Party"("enterpriseSocialCode");

-- CreateIndex
CREATE INDEX "procedure_parties_procedureId_standing_ordinal_idx" ON "procedure_parties"("procedureId", "standing", "ordinal");

-- CreateIndex
CREATE INDEX "procedure_parties_partyId_idx" ON "procedure_parties"("partyId");

-- CreateIndex
CREATE UNIQUE INDEX "procedure_parties_procedureId_partyId_standing_key" ON "procedure_parties"("procedureId", "partyId", "standing");

-- CreateIndex
CREATE INDEX "RelatedEntity_name_idx" ON "RelatedEntity"("name");

-- CreateIndex
CREATE INDEX "MatterLink_matterId_idx" ON "MatterLink"("matterId");

-- CreateIndex
CREATE INDEX "MatterLink_relatedMatterId_idx" ON "MatterLink"("relatedMatterId");

-- CreateIndex
CREATE UNIQUE INDEX "MatterLink_matterId_relatedMatterId_key" ON "MatterLink"("matterId", "relatedMatterId");

-- CreateIndex
CREATE INDEX "Note_matterId_occurredAt_idx" ON "Note"("matterId", "occurredAt");

-- CreateIndex
CREATE INDEX "Document_matterId_category_idx" ON "Document"("matterId", "category");

-- CreateIndex
CREATE INDEX "Document_intakeId_idx" ON "Document"("intakeId");

-- CreateIndex
CREATE INDEX "Document_procedureId_idx" ON "Document"("procedureId");

-- CreateIndex
CREATE INDEX "Document_familyId_idx" ON "Document"("familyId");

-- CreateIndex
CREATE INDEX "Document_folderId_idx" ON "Document"("folderId");

-- CreateIndex
CREATE INDEX "Document_templateId_idx" ON "Document"("templateId");

-- CreateIndex
CREATE INDEX "Document_matterId_archiveChecklistItemId_idx" ON "Document"("matterId", "archiveChecklistItemId");

-- CreateIndex
CREATE INDEX "Document_stageId_idx" ON "Document"("stageId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceRequest_contractScanId_key" ON "InvoiceRequest"("contractScanId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceRequest_invoiceFileId_key" ON "InvoiceRequest"("invoiceFileId");

-- CreateIndex
CREATE INDEX "InvoiceRequest_matterId_status_idx" ON "InvoiceRequest"("matterId", "status");

-- CreateIndex
CREATE INDEX "InvoiceRequest_status_requestedAt_idx" ON "InvoiceRequest"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "InvoiceRequest_requestedById_idx" ON "InvoiceRequest"("requestedById");

-- CreateIndex
CREATE INDEX "Billing_matterId_status_idx" ON "Billing"("matterId", "status");

-- CreateIndex
CREATE INDEX "FeeEntry_matterId_type_occurredAt_idx" ON "FeeEntry"("matterId", "type", "occurredAt");

-- CreateIndex
CREATE INDEX "FeeEntry_type_occurredAt_idx" ON "FeeEntry"("type", "occurredAt");

-- CreateIndex
CREATE INDEX "FeeEntry_beneficiaryUserId_occurredAt_idx" ON "FeeEntry"("beneficiaryUserId", "occurredAt");

-- CreateIndex
CREATE INDEX "CommissionPlan_matterId_idx" ON "CommissionPlan"("matterId");

-- CreateIndex
CREATE INDEX "CommissionPlan_userId_idx" ON "CommissionPlan"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionPlan_matterId_userId_key" ON "CommissionPlan"("matterId", "userId");

-- CreateIndex
CREATE INDEX "TimelineEvent_matterId_occurredAt_idx" ON "TimelineEvent"("matterId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "ArchiveRecord_archiveNo_key" ON "ArchiveRecord"("archiveNo");

-- CreateIndex
CREATE INDEX "ArchiveRecord_matterId_idx" ON "ArchiveRecord"("matterId");

-- CreateIndex
CREATE INDEX "ArchiveRecord_archivedAt_idx" ON "ArchiveRecord"("archivedAt");

-- CreateIndex
CREATE INDEX "ArchiveRecord_status_idx" ON "ArchiveRecord"("status");

-- CreateIndex
CREATE INDEX "ArchiveRecord_archivedById_status_idx" ON "ArchiveRecord"("archivedById", "status");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "StageTemplate_procedureType_idx" ON "StageTemplate"("procedureType");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTemplate_docxBlobId_key" ON "DocumentTemplate"("docxBlobId");

-- CreateIndex
CREATE INDEX "DocumentTemplate_category_enabled_idx" ON "DocumentTemplate"("category", "enabled");

-- CreateIndex
CREATE INDEX "DocumentTemplate_isBuiltIn_idx" ON "DocumentTemplate"("isBuiltIn");

-- CreateIndex
CREATE INDEX "WritingTemplate_category_enabled_idx" ON "WritingTemplate"("category", "enabled");

-- CreateIndex
CREATE INDEX "WritingTemplate_stage_enabled_idx" ON "WritingTemplate"("stage", "enabled");

-- CreateIndex
CREATE INDEX "DocumentFolder_matterId_orderIndex_idx" ON "DocumentFolder"("matterId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentFolder_matterId_name_key" ON "DocumentFolder"("matterId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SealRequest_code_key" ON "SealRequest"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SealRequest_draftDocId_key" ON "SealRequest"("draftDocId");

-- CreateIndex
CREATE UNIQUE INDEX "SealRequest_stampedDocId_key" ON "SealRequest"("stampedDocId");

-- CreateIndex
CREATE INDEX "SealRequest_status_requestedAt_idx" ON "SealRequest"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "SealRequest_requestedById_status_idx" ON "SealRequest"("requestedById", "status");

-- CreateIndex
CREATE INDEX "SealRequest_sealType_status_idx" ON "SealRequest"("sealType", "status");

-- CreateIndex
CREATE INDEX "SealRequest_matterId_idx" ON "SealRequest"("matterId");

-- CreateIndex
CREATE INDEX "SmsMessage_receivedById_processed_receivedAt_idx" ON "SmsMessage"("receivedById", "processed", "receivedAt");

-- CreateIndex
CREATE INDEX "SmsMessage_receivedById_needsManualAction_idx" ON "SmsMessage"("receivedById", "needsManualAction");

-- CreateIndex
CREATE INDEX "SmsMessage_matchedMatterId_idx" ON "SmsMessage"("matchedMatterId");

-- CreateIndex
CREATE INDEX "SmsMessage_smsType_receivedAt_idx" ON "SmsMessage"("smsType", "receivedAt");

-- CreateIndex
CREATE INDEX "PreservationCase_matterId_idx" ON "PreservationCase"("matterId");

-- CreateIndex
CREATE INDEX "PreservationCase_status_idx" ON "PreservationCase"("status");

-- CreateIndex
CREATE INDEX "PreservationTarget_caseId_idx" ON "PreservationTarget"("caseId");

-- CreateIndex
CREATE INDEX "PreservationProperty_targetId_idx" ON "PreservationProperty"("targetId");

-- CreateIndex
CREATE INDEX "PreservationProperty_status_expiryDate_idx" ON "PreservationProperty"("status", "expiryDate");

-- CreateIndex
CREATE INDEX "PreservationPropertyRenewal_propertyId_idx" ON "PreservationPropertyRenewal"("propertyId");

-- CreateIndex
CREATE INDEX "ExpressTracking_matterId_idx" ON "ExpressTracking"("matterId");

-- CreateIndex
CREATE INDEX "ExpressTracking_trackingNo_idx" ON "ExpressTracking"("trackingNo");

-- CreateIndex
CREATE INDEX "ExpressTracking_createdById_createdAt_idx" ON "ExpressTracking"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewRecord_documentId_reviewedAt_idx" ON "ReviewRecord"("documentId", "reviewedAt");

-- CreateIndex
CREATE INDEX "ReviewRecord_matterId_reviewedAt_idx" ON "ReviewRecord"("matterId", "reviewedAt");

-- CreateIndex
CREATE INDEX "FirmFile_category_archivedAt_createdAt_idx" ON "FirmFile"("category", "archivedAt", "createdAt");

-- CreateIndex
CREATE INDEX "FirmFile_supersededById_idx" ON "FirmFile"("supersededById");

-- CreateIndex
CREATE INDEX "Announcement_pinned_archivedAt_publishedAt_idx" ON "Announcement"("pinned", "archivedAt", "publishedAt");

-- CreateIndex
CREATE INDEX "Announcement_authorId_createdAt_idx" ON "Announcement"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "ExternalContact_category_archivedAt_name_idx" ON "ExternalContact"("category", "archivedAt", "name");

-- CreateIndex
CREATE INDEX "ExternalContact_status_archivedAt_createdAt_idx" ON "ExternalContact"("status", "archivedAt", "createdAt");

-- CreateIndex
CREATE INDEX "ExternalContact_reviewedById_idx" ON "ExternalContact"("reviewedById");

-- CreateIndex
CREATE INDEX "ExternalContact_name_idx" ON "ExternalContact"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Firm_slug_key" ON "Firm"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Firm_email_key" ON "Firm"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FirmUser_email_key" ON "FirmUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FirmUser_calendarToken_key" ON "FirmUser"("calendarToken");

-- CreateIndex
CREATE INDEX "Jurisprudence_fuero_idx" ON "Jurisprudence"("fuero");

-- CreateIndex
CREATE INDEX "Jurisprudence_jurisdiction_idx" ON "Jurisprudence"("jurisdiction");

-- CreateIndex
CREATE INDEX "Jurisprudence_category_idx" ON "Jurisprudence"("category");

-- CreateIndex
CREATE INDEX "Jurisprudence_date_idx" ON "Jurisprudence"("date");

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CauseOfAction" ADD CONSTRAINT "CauseOfAction_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CauseOfAction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intake" ADD CONSTRAINT "Intake_causeId_fkey" FOREIGN KEY ("causeId") REFERENCES "CauseOfAction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intake" ADD CONSTRAINT "Intake_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intake" ADD CONSTRAINT "Intake_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matter" ADD CONSTRAINT "Matter_causeId_fkey" FOREIGN KEY ("causeId") REFERENCES "CauseOfAction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matter" ADD CONSTRAINT "Matter_primaryClientId_fkey" FOREIGN KEY ("primaryClientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matter" ADD CONSTRAINT "Matter_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matter" ADD CONSTRAINT "Matter_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "Intake"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterMember" ADD CONSTRAINT "MatterMember_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterMember" ADD CONSTRAINT "MatterMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterClient" ADD CONSTRAINT "MatterClient_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterClient" ADD CONSTRAINT "MatterClient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterProcedure" ADD CONSTRAINT "MatterProcedure_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterProcedure" ADD CONSTRAINT "MatterProcedure_leadLawyerId_fkey" FOREIGN KEY ("leadLawyerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterStage" ADD CONSTRAINT "MatterStage_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "MatterProcedure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "MatterStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hearing" ADD CONSTRAINT "Hearing_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "MatterProcedure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deadline" ADD CONSTRAINT "Deadline_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "MatterProcedure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureMemo" ADD CONSTRAINT "ProcedureMemo_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "MatterProcedure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "Intake"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_parties" ADD CONSTRAINT "procedure_parties_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "MatterProcedure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_parties" ADD CONSTRAINT "procedure_parties_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelatedEntity" ADD CONSTRAINT "RelatedEntity_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterLink" ADD CONSTRAINT "MatterLink_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatterLink" ADD CONSTRAINT "MatterLink_relatedMatterId_fkey" FOREIGN KEY ("relatedMatterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConflictCheck" ADD CONSTRAINT "ConflictCheck_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "Intake"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConflictCheck" ADD CONSTRAINT "ConflictCheck_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConflictHit" ADD CONSTRAINT "ConflictHit_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "ConflictCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "Intake"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "MatterProcedure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "MatterStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "DocumentFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceRequest" ADD CONSTRAINT "InvoiceRequest_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceRequest" ADD CONSTRAINT "InvoiceRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceRequest" ADD CONSTRAINT "InvoiceRequest_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceRequest" ADD CONSTRAINT "InvoiceRequest_contractScanId_fkey" FOREIGN KEY ("contractScanId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceRequest" ADD CONSTRAINT "InvoiceRequest_invoiceFileId_fkey" FOREIGN KEY ("invoiceFileId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Billing" ADD CONSTRAINT "Billing_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeEntry" ADD CONSTRAINT "FeeEntry_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeEntry" ADD CONSTRAINT "FeeEntry_billingId_fkey" FOREIGN KEY ("billingId") REFERENCES "Billing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeEntry" ADD CONSTRAINT "FeeEntry_parentFeeEntryId_fkey" FOREIGN KEY ("parentFeeEntryId") REFERENCES "FeeEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeEntry" ADD CONSTRAINT "FeeEntry_beneficiaryUserId_fkey" FOREIGN KEY ("beneficiaryUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeEntry" ADD CONSTRAINT "FeeEntry_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionPlan" ADD CONSTRAINT "CommissionPlan_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionPlan" ADD CONSTRAINT "CommissionPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchiveRecord" ADD CONSTRAINT "ArchiveRecord_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_docxBlobId_fkey" FOREIGN KEY ("docxBlobId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentFolder" ADD CONSTRAINT "DocumentFolder_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SealRequest" ADD CONSTRAINT "SealRequest_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SealRequest" ADD CONSTRAINT "SealRequest_draftDocId_fkey" FOREIGN KEY ("draftDocId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SealRequest" ADD CONSTRAINT "SealRequest_stampedDocId_fkey" FOREIGN KEY ("stampedDocId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SealRequest" ADD CONSTRAINT "SealRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SealRequest" ADD CONSTRAINT "SealRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SealRequest" ADD CONSTRAINT "SealRequest_stampedById_fkey" FOREIGN KEY ("stampedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SealRequest" ADD CONSTRAINT "SealRequest_parentSealRequestId_fkey" FOREIGN KEY ("parentSealRequestId") REFERENCES "SealRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsMessage" ADD CONSTRAINT "SmsMessage_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsMessage" ADD CONSTRAINT "SmsMessage_matchedMatterId_fkey" FOREIGN KEY ("matchedMatterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreservationCase" ADD CONSTRAINT "PreservationCase_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreservationCase" ADD CONSTRAINT "PreservationCase_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreservationTarget" ADD CONSTRAINT "PreservationTarget_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "PreservationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreservationProperty" ADD CONSTRAINT "PreservationProperty_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "PreservationTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreservationPropertyRenewal" ADD CONSTRAINT "PreservationPropertyRenewal_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "PreservationProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreservationPropertyRenewal" ADD CONSTRAINT "PreservationPropertyRenewal_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpressTracking" ADD CONSTRAINT "ExpressTracking_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpressTracking" ADD CONSTRAINT "ExpressTracking_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRecord" ADD CONSTRAINT "ReviewRecord_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRecord" ADD CONSTRAINT "ReviewRecord_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRecord" ADD CONSTRAINT "ReviewRecord_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirmFile" ADD CONSTRAINT "FirmFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirmFile" ADD CONSTRAINT "FirmFile_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "FirmFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalContact" ADD CONSTRAINT "ExternalContact_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalContact" ADD CONSTRAINT "ExternalContact_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirmUser" ADD CONSTRAINT "FirmUser_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

