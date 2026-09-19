-- AlterTable
ALTER TABLE "Jurisprudence" ADD COLUMN     "descriptorPaths" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "descriptorRoots" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "Jurisprudence_descriptorRoots_idx" ON "Jurisprudence" USING GIN ("descriptorRoots");

-- CreateIndex
CREATE INDEX "Jurisprudence_descriptorPaths_idx" ON "Jurisprudence" USING GIN ("descriptorPaths");
