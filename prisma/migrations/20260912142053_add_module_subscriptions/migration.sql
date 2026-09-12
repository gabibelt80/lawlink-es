-- AlterTable
ALTER TABLE "Firm" ADD COLUMN     "enabledBaseModules" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "ModuleConfig" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "premium" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleConfig_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "FirmModuleSubscription" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "lastPaymentAt" TIMESTAMP(3),
    "lastPaymentAmount" DECIMAL(10,2),
    "providerSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FirmModuleSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FirmModuleSubscription_providerSubscriptionId_key" ON "FirmModuleSubscription"("providerSubscriptionId");

-- CreateIndex
CREATE INDEX "FirmModuleSubscription_firmId_idx" ON "FirmModuleSubscription"("firmId");

-- CreateIndex
CREATE INDEX "FirmModuleSubscription_status_idx" ON "FirmModuleSubscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FirmModuleSubscription_firmId_moduleKey_key" ON "FirmModuleSubscription"("firmId", "moduleKey");

-- AddForeignKey
ALTER TABLE "FirmModuleSubscription" ADD CONSTRAINT "FirmModuleSubscription_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
