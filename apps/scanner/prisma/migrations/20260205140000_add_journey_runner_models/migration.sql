-- CreateEnum (Phase 4 JourneyRunner: when to run journey)
CREATE TYPE "JourneyWhen" AS ENUM ('before_crawl', 'after_crawl');

-- CreateTable
CREATE TABLE "Journey" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "propertyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "when" "JourneyWhen" NOT NULL,
    "stepsJson" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Journey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Journey_propertyId_idx" ON "Journey"("propertyId");

-- AddForeignKey
ALTER TABLE "Journey" ADD CONSTRAINT "Journey_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
