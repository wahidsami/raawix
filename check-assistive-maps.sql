-- Diagnostic queries to check why assistive maps aren't appearing

-- 1. Check if any Sites exist
SELECT COUNT(*) as site_count, 
       array_agg(domain) as domains
FROM "Site";

-- 2. Check if any PageVersions exist
SELECT COUNT(*) as page_version_count,
       COUNT(DISTINCT "siteId") as unique_sites,
       COUNT(DISTINCT "scanId") as unique_scans
FROM "PageVersion";

-- 3. Check if any AssistiveMaps exist
SELECT COUNT(*) as assistive_map_count
FROM "AssistiveMap";

-- 4. Check PageVersions with their Sites and AssistiveMaps
SELECT 
    pv.id as page_version_id,
    pv."canonicalUrl",
    pv."scanId",
    pv."generatedAt",
    s.domain,
    CASE WHEN am.id IS NOT NULL THEN 'YES' ELSE 'NO' END as has_assistive_map,
    am."updatedAt" as map_updated_at
FROM "PageVersion" pv
LEFT JOIN "Site" s ON pv."siteId" = s.id
LEFT JOIN "AssistiveMap" am ON pv.id = am."pageVersionId"
ORDER BY pv."generatedAt" DESC
LIMIT 20;

-- 5. Check recent scans and their page counts
SELECT 
    scan."scanId",
    scan.status,
    scan."startedAt",
    scan."completedAt",
    COUNT(DISTINCT p.id) as page_count,
    COUNT(DISTINCT pv.id) as page_version_count,
    COUNT(DISTINCT am.id) as assistive_map_count
FROM "Scan" scan
LEFT JOIN "Page" p ON scan.id = p."scanId"  -- Page.scanId references Scan.id (UUID)
LEFT JOIN "PageVersion" pv ON pv."scanId" = scan."scanId"  -- PageVersion.scanId is text, matches Scan.scanId
LEFT JOIN "AssistiveMap" am ON am."pageVersionId" = pv.id
GROUP BY scan."scanId", scan.status, scan."startedAt", scan."completedAt"
ORDER BY scan."startedAt" DESC
LIMIT 10;

-- 6. Check if PageVersions have required fields for assistive map generation
SELECT 
    COUNT(*) as total,
    COUNT("canonicalUrl") as has_canonical_url,
    COUNT("fingerprintHash") as has_fingerprint_hash,
    COUNT("scanId") as has_scan_id
FROM "PageVersion";

