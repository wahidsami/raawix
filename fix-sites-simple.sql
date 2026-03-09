-- Simple fix: Just delete Sites with full URLs since they have no PageVersions
-- The correct Site (localhost:4173) already exists, so we just need to remove the bad ones

-- Step 1: Verify which Sites have PageVersions
SELECT 
    s.id,
    s.domain,
    COUNT(pv.id) as page_version_count
FROM "Site" s
LEFT JOIN "PageVersion" pv ON pv."siteId" = s.id
GROUP BY s.id, s.domain
ORDER BY page_version_count DESC, s."createdAt" DESC;

-- Step 2: Delete Sites with full URLs (they have no PageVersions, so safe to delete)
DELETE FROM "Site"
WHERE domain LIKE 'http://%' OR domain LIKE 'https://%';

-- Step 3: Verify final state - should only have correct format Sites
SELECT 
    id,
    domain,
    "createdAt",
    (SELECT COUNT(*) FROM "PageVersion" WHERE "siteId" = "Site".id) as page_version_count
FROM "Site"
ORDER BY "createdAt" DESC;

-- Step 4: Verify no duplicates
SELECT 
    domain,
    COUNT(*) as count
FROM "Site"
GROUP BY domain
HAVING COUNT(*) > 1;

