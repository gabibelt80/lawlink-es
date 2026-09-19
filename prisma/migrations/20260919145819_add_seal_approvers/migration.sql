-- AlterTable
ALTER TABLE "SealRequest" ADD COLUMN     "assignedLawyerId" TEXT,
ADD COLUMN     "principalLawyerId" TEXT;

-- AddForeignKey
ALTER TABLE "SealRequest" ADD CONSTRAINT "SealRequest_assignedLawyerId_fkey" FOREIGN KEY ("assignedLawyerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SealRequest" ADD CONSTRAINT "SealRequest_principalLawyerId_fkey" FOREIGN KEY ("principalLawyerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
