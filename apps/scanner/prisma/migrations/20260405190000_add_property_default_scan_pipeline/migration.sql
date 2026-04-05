-- AlterTable
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "defaultScanPipeline" JSONB;
