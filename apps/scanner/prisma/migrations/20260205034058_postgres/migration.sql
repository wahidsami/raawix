-- AlterTable
ALTER TABLE "Scan" ADD COLUMN     "entityId" UUID,
ADD COLUMN     "needsReviewRate" DOUBLE PRECISION,
ADD COLUMN     "propertyId" UUID,
ADD COLUMN     "reportSentAt" TIMESTAMP(3),
ADD COLUMN     "scoreA" DOUBLE PRECISION,
ADD COLUMN     "scoreAA" DOUBLE PRECISION,
ADD COLUMN     "scoreAAA" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "entityId" UUID,
ADD COLUMN     "propertyId" UUID;

-- CreateTable
CREATE TABLE "Entity" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT,
    "type" TEXT NOT NULL,
    "sector" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "logoPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityContact" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entityId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntityContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entityId" UUID NOT NULL,
    "domain" TEXT NOT NULL,
    "displayNameEn" TEXT,
    "displayNameAr" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanAuthProfile" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "propertyId" UUID NOT NULL,
    "authType" TEXT NOT NULL DEFAULT 'none',
    "loginUrl" TEXT,
    "successUrlPrefix" TEXT,
    "successSelector" TEXT,
    "usernameSelector" TEXT,
    "passwordSelector" TEXT,
    "submitSelector" TEXT,
    "usernameValue" TEXT,
    "passwordValue" TEXT,
    "postLoginSeedPaths" JSONB,
    "extraHeaders" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestResult" TEXT,
    "lastTestError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScanAuthProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scanner_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "maxPages" INTEGER NOT NULL DEFAULT 200,
    "maxDepth" INTEGER NOT NULL DEFAULT 10,
    "maxRuntimeMs" INTEGER NOT NULL DEFAULT 600000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scanner_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Entity_code_key" ON "Entity"("code");

-- CreateIndex
CREATE INDEX "Entity_status_idx" ON "Entity"("status");

-- CreateIndex
CREATE INDEX "Entity_type_idx" ON "Entity"("type");

-- CreateIndex
CREATE INDEX "Entity_code_idx" ON "Entity"("code");

-- CreateIndex
CREATE INDEX "EntityContact_entityId_idx" ON "EntityContact"("entityId");

-- CreateIndex
CREATE INDEX "EntityContact_email_idx" ON "EntityContact"("email");

-- CreateIndex
CREATE INDEX "Property_entityId_idx" ON "Property"("entityId");

-- CreateIndex
CREATE INDEX "Property_domain_idx" ON "Property"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "Property_entityId_domain_key" ON "Property"("entityId", "domain");

-- CreateIndex
CREATE UNIQUE INDEX "ScanAuthProfile_propertyId_key" ON "ScanAuthProfile"("propertyId");

-- CreateIndex
CREATE INDEX "ScanAuthProfile_propertyId_idx" ON "ScanAuthProfile"("propertyId");

-- CreateIndex
CREATE INDEX "ScanAuthProfile_authType_idx" ON "ScanAuthProfile"("authType");

-- CreateIndex
CREATE INDEX "Scan_entityId_idx" ON "Scan"("entityId");

-- CreateIndex
CREATE INDEX "Scan_propertyId_idx" ON "Scan"("propertyId");

-- CreateIndex
CREATE INDEX "Site_propertyId_idx" ON "Site"("propertyId");

-- CreateIndex
CREATE INDEX "Site_entityId_idx" ON "Site"("entityId");

-- AddForeignKey
ALTER TABLE "EntityContact" ADD CONSTRAINT "EntityContact_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanAuthProfile" ADD CONSTRAINT "ScanAuthProfile_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
