-- AlterTable
ALTER TABLE "SealRequest" ADD COLUMN     "stampedAutomatically" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "signaturePng" TEXT;
