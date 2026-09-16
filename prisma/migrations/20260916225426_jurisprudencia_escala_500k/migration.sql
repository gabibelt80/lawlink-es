-- AlterTable
ALTER TABLE "Jurisprudence" ADD COLUMN     "citesUuids" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "descriptors" JSONB,
ADD COLUMN     "fechaUmod" TIMESTAMP(3),
ADD COLUMN     "numeroSumario" TEXT;

-- CreateTable
CREATE TABLE "JurisprudenceMatterLink" (
    "id" TEXT NOT NULL,
    "jurisprudenceId" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "relevanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "note" TEXT,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JurisprudenceMatterLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JurisprudenceIngestLog" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "agentId" TEXT,
    "totalFound" INTEGER NOT NULL DEFAULT 0,
    "totalNew" INTEGER NOT NULL DEFAULT 0,
    "totalSkip" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "error" TEXT,

    CONSTRAINT "JurisprudenceIngestLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JurisprudenceMatterLink_matterId_relevanceScore_idx" ON "JurisprudenceMatterLink"("matterId", "relevanceScore");

-- CreateIndex
CREATE INDEX "JurisprudenceMatterLink_jurisprudenceId_idx" ON "JurisprudenceMatterLink"("jurisprudenceId");

-- CreateIndex
CREATE UNIQUE INDEX "JurisprudenceMatterLink_jurisprudenceId_matterId_key" ON "JurisprudenceMatterLink"("jurisprudenceId", "matterId");

-- CreateIndex
CREATE INDEX "JurisprudenceIngestLog_startedAt_idx" ON "JurisprudenceIngestLog"("startedAt");

-- CreateIndex
CREATE INDEX "JurisprudenceIngestLog_status_idx" ON "JurisprudenceIngestLog"("status");

-- CreateIndex
CREATE INDEX "Jurisprudence_numeroSumario_idx" ON "Jurisprudence"("numeroSumario");

-- CreateIndex
CREATE INDEX "Jurisprudence_date_fuero_idx" ON "Jurisprudence"("date", "fuero");

-- AddForeignKey
ALTER TABLE "JurisprudenceMatterLink" ADD CONSTRAINT "JurisprudenceMatterLink_jurisprudenceId_fkey" FOREIGN KEY ("jurisprudenceId") REFERENCES "Jurisprudence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JurisprudenceMatterLink" ADD CONSTRAINT "JurisprudenceMatterLink_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
