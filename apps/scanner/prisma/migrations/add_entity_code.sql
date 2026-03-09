-- Migration: Add Entity.code column
-- Run this SQL script in your PostgreSQL database

-- Add code column (nullable initially for existing entities)
ALTER TABLE "Entity" ADD COLUMN IF NOT EXISTS "code" TEXT;

-- Create unique index on code
CREATE UNIQUE INDEX IF NOT EXISTS "Entity_code_key" ON "Entity"("code");

-- Generate codes for existing entities (if any)
-- Government entities: GOV-000001, GOV-000002, etc.
-- Private entities: RAAWI-XXXXXX format
DO $$
DECLARE
    entity_record RECORD;
    entity_code TEXT;
    counter INTEGER := 1;
BEGIN
    FOR entity_record IN SELECT id, type FROM "Entity" WHERE code IS NULL ORDER BY "createdAt" ASC
    LOOP
        IF entity_record.type = 'government' THEN
            entity_code := 'GOV-' || LPAD(counter::TEXT, 6, '0');
        ELSE
            -- Generate random 6-char code for private
            entity_code := 'RAAWI-' || UPPER(
                SUBSTRING(MD5(RANDOM()::TEXT || entity_record.id::TEXT) FROM 1 FOR 6)
            );
        END IF;
        
        -- Ensure uniqueness (retry if collision)
        WHILE EXISTS (SELECT 1 FROM "Entity" WHERE code = entity_code) LOOP
            IF entity_record.type = 'government' THEN
                counter := counter + 1;
                entity_code := 'GOV-' || LPAD(counter::TEXT, 6, '0');
            ELSE
                entity_code := 'RAAWI-' || UPPER(
                    SUBSTRING(MD5(RANDOM()::TEXT || entity_record.id::TEXT || NOW()::TEXT) FROM 1 FOR 6)
                );
            END IF;
        END LOOP;
        
        UPDATE "Entity" SET code = entity_code WHERE id = entity_record.id;
        
        IF entity_record.type = 'government' THEN
            counter := counter + 1;
        END IF;
    END LOOP;
END $$;

-- Make code NOT NULL after backfilling
ALTER TABLE "Entity" ALTER COLUMN "code" SET NOT NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS "Entity_code_idx" ON "Entity"("code");

