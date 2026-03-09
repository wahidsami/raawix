-- Migration: Create Entity, EntityContact, and Property tables
-- Run this SQL script in your PostgreSQL database if Prisma migrations fail

-- Create Entity table
CREATE TABLE IF NOT EXISTS "Entity" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT,
    "type" TEXT NOT NULL,
    "sector" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- Create EntityContact table
CREATE TABLE IF NOT EXISTS "EntityContact" (
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

-- Create Property table
CREATE TABLE IF NOT EXISTS "Property" (
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

-- Add foreign keys
ALTER TABLE "EntityContact" ADD CONSTRAINT "EntityContact_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Property" ADD CONSTRAINT "Property_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX IF NOT EXISTS "Entity_status_idx" ON "Entity"("status");
CREATE INDEX IF NOT EXISTS "Entity_type_idx" ON "Entity"("type");
CREATE INDEX IF NOT EXISTS "EntityContact_entityId_idx" ON "EntityContact"("entityId");
CREATE INDEX IF NOT EXISTS "EntityContact_email_idx" ON "EntityContact"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Property_entityId_domain_key" ON "Property"("entityId", "domain");
CREATE INDEX IF NOT EXISTS "Property_entityId_idx" ON "Property"("entityId");
CREATE INDEX IF NOT EXISTS "Property_domain_idx" ON "Property"("domain");

-- Add entityId and propertyId to Scan table (if columns don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Scan' AND column_name = 'entityId') THEN
        ALTER TABLE "Scan" ADD COLUMN "entityId" UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Scan' AND column_name = 'propertyId') THEN
        ALTER TABLE "Scan" ADD COLUMN "propertyId" UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Scan' AND column_name = 'reportSentAt') THEN
        ALTER TABLE "Scan" ADD COLUMN "reportSentAt" TIMESTAMP(3);
    END IF;
END $$;

-- Add foreign keys to Scan table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Scan_entityId_fkey'
    ) THEN
        ALTER TABLE "Scan" ADD CONSTRAINT "Scan_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Scan_propertyId_fkey'
    ) THEN
        ALTER TABLE "Scan" ADD CONSTRAINT "Scan_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Add indexes to Scan table
CREATE INDEX IF NOT EXISTS "Scan_entityId_idx" ON "Scan"("entityId");
CREATE INDEX IF NOT EXISTS "Scan_propertyId_idx" ON "Scan"("propertyId");

-- Add propertyId and entityId to Site table (if columns don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Site' AND column_name = 'propertyId') THEN
        ALTER TABLE "Site" ADD COLUMN "propertyId" UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Site' AND column_name = 'entityId') THEN
        ALTER TABLE "Site" ADD COLUMN "entityId" UUID;
    END IF;
END $$;

-- Add foreign key to Site table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Site_propertyId_fkey'
    ) THEN
        ALTER TABLE "Site" ADD CONSTRAINT "Site_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Add indexes to Site table
CREATE INDEX IF NOT EXISTS "Site_propertyId_idx" ON "Site"("propertyId");
CREATE INDEX IF NOT EXISTS "Site_entityId_idx" ON "Site"("entityId");

-- Grant permissions to the database user
-- Replace 'raawi' with your actual database user if different
GRANT ALL PRIVILEGES ON TABLE "Entity" TO raawi;
GRANT ALL PRIVILEGES ON TABLE "EntityContact" TO raawi;
GRANT ALL PRIVILEGES ON TABLE "Property" TO raawi;

-- Grant permissions on sequences (for UUID generation)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO raawi;

-- If tables were created in a different schema, grant on that schema
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO raawi;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO raawi;

