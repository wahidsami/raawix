-- Safe fix for Sites with duplicate domains
-- This handles foreign key constraints and ensures no duplicates

-- Step 1: Show current Sites and identify duplicates
SELECT 
    id,
    domain,
    "createdAt",
    CASE 
        WHEN domain LIKE 'http://%' OR domain LIKE 'https://%' THEN 'NEEDS_FIX'
        ELSE 'OK'
    END as status
FROM "Site"
ORDER BY "createdAt" DESC;

-- Step 2: Show which Sites have PageVersions (can't delete these)
SELECT 
    s.id,
    s.domain,
    COUNT(pv.id) as page_version_count
FROM "Site" s
LEFT JOIN "PageVersion" pv ON pv."siteId" = s.id
GROUP BY s.id, s.domain
ORDER BY page_version_count DESC;

-- Step 3: For Sites with full URLs, update them to correct format
-- But only if the correct format doesn't already exist
-- If it does exist, we'll need to migrate PageVersions first (if any)

-- First, let's see what the extracted domain would be for each Site
SELECT 
    id,
    domain as current_domain,
    CASE 
        WHEN domain LIKE 'http://%' THEN 
            SUBSTRING(domain FROM 'http://([^/]+)')
        WHEN domain LIKE 'https://%' THEN 
            SUBSTRING(domain FROM 'https://([^/]+)')
        ELSE domain
    END as extracted_domain,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "Site" s2 
            WHERE s2.domain = 
                CASE 
                    WHEN "Site".domain LIKE 'http://%' THEN 
                        SUBSTRING("Site".domain FROM 'http://([^/]+)')
                    WHEN "Site".domain LIKE 'https://%' THEN 
                        SUBSTRING("Site".domain FROM 'https://([^/]+)')
                    ELSE "Site".domain
                END
            AND s2.id != "Site".id
        ) THEN 'DUPLICATE_WILL_EXIST'
        ELSE 'SAFE_TO_UPDATE'
    END as update_status
FROM "Site"
WHERE domain LIKE 'http://%' OR domain LIKE 'https://%';

-- Step 4: For Sites that would create duplicates, we need to:
-- Option A: If the correct Site has no PageVersions, delete it and update the full URL one
-- Option B: If the correct Site has PageVersions, we need to migrate them (complex)
-- Option C: Just delete the full URL Sites if they have no PageVersions

-- Let's delete Sites with full URLs that have no PageVersions
-- (These are safe to delete)
DELETE FROM "Site" s
WHERE (s.domain LIKE 'http://%' OR s.domain LIKE 'https://%')
  AND NOT EXISTS (
    SELECT 1 FROM "PageVersion" pv WHERE pv."siteId" = s.id
  )
  AND EXISTS (
    SELECT 1 FROM "Site" s2
    WHERE s2.domain = 
      CASE 
        WHEN s.domain LIKE 'http://%' THEN 
            SUBSTRING(s.domain FROM 'http://([^/]+)')
        WHEN s.domain LIKE 'https://%' THEN 
            SUBSTRING(s.domain FROM 'https://([^/]+)')
        ELSE s.domain
      END
    AND s2.id != s.id
  );

-- Step 5: Now update remaining Sites with full URLs (these should be safe now)
UPDATE "Site"
SET domain = 
    CASE 
        WHEN domain LIKE 'http://%' THEN 
            SUBSTRING(domain FROM 'http://([^/]+)')
        WHEN domain LIKE 'https://%' THEN 
            SUBSTRING(domain FROM 'https://([^/]+)')
        ELSE domain
    END,
    "updatedAt" = NOW()
WHERE (domain LIKE 'http://%' OR domain LIKE 'https://%')
  AND NOT EXISTS (
    -- Make sure the target domain doesn't already exist
    SELECT 1 FROM "Site" s2
    WHERE s2.domain = 
      CASE 
        WHEN "Site".domain LIKE 'http://%' THEN 
            SUBSTRING("Site".domain FROM 'http://([^/]+)')
        WHEN "Site".domain LIKE 'https://%' THEN 
            SUBSTRING("Site".domain FROM 'https://([^/]+)')
        ELSE "Site".domain
      END
    AND s2.id != "Site".id
  );

-- Step 6: Verify final state
SELECT 
    id,
    domain,
    "updatedAt",
    (SELECT COUNT(*) FROM "PageVersion" WHERE "siteId" = "Site".id) as page_version_count
FROM "Site"
ORDER BY "updatedAt" DESC NULLS LAST, "createdAt" DESC;

-- Step 7: Check for any remaining duplicates
SELECT 
    domain,
    COUNT(*) as count,
    array_agg(id) as site_ids
FROM "Site"
GROUP BY domain
HAVING COUNT(*) > 1;

