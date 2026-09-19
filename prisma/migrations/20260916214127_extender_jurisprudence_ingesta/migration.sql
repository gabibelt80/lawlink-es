/*
  Warnings:

  - You are about to drop the `ModuleConfig` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[fingerprint]` on the table `Jurisprudence` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'SYSTEM_ADMIN'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole' LIMIT 1)
  ) THEN
    ALTER TYPE "UserRole" ADD VALUE 'SYSTEM_ADMIN';
  END IF;
END $$;

-- AlterTable
ALTER TABLE "Jurisprudence" ADD COLUMN     "fingerprint" TEXT,
ADD COLUMN     "hash" TEXT,
ADD COLUMN     "ingestBatchId" TEXT,
ADD COLUMN     "pdfPath" TEXT,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "tribunal" TEXT;

-- DropTable
DROP TABLE "ModuleConfig";

-- CreateIndex
CREATE UNIQUE INDEX "Jurisprudence_fingerprint_key" ON "Jurisprudence"("fingerprint");

-- CreateIndex
CREATE INDEX "Jurisprudence_status_idx" ON "Jurisprudence"("status");

-- CreateIndex
CREATE INDEX "Jurisprudence_sourceId_idx" ON "Jurisprudence"("sourceId");

-- CreateIndex
CREATE INDEX "Jurisprudence_fingerprint_idx" ON "Jurisprudence"("fingerprint");
