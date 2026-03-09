-- Check if Pages have the required fields for Layer 3 generation
-- These fields come from PageArtifact and are needed to create PageVersions

-- 1. Check Pages table - do they have canonicalUrl and pageFingerprintJson?
SELECT 
    COUNT(*) as total_pages,
    COUNT("canonicalUrl") as pages_with_canonical_url,
    COUNT("pageFingerprintJson") as pages_with_fingerprint,
    COUNT(DISTINCT "scanId") as unique_scans
FROM "Page";

-- 2. Show sample pages with their metadata
SELECT 
    p."pageNumber",
    p.url,
    p."canonicalUrl",
    CASE WHEN p."pageFingerprintJson" IS NOT NULL THEN 'YES' ELSE 'NO' END as has_fingerprint,
    scan."scanId" as scan_id,
    scan.status as scan_status,
    scan."completedAt"
FROM "Page" p
JOIN "Scan" scan ON p."scanId" = scan.id
ORDER BY scan."startedAt" DESC, p."pageNumber" ASC
LIMIT 20;

-- 3. Check if Sites exist for the scanned domains
SELECT 
    s.domain,
    s.id as site_id,
    COUNT(pv.id) as page_version_count
FROM "Site" s
LEFT JOIN "PageVersion" pv ON pv."siteId" = s.id
GROUP BY s.domain, s.id
ORDER BY s."createdAt" DESC;

-- 4. Check recent scans and whether they have pages with required metadata
SELECT 
    scan."scanId",
    scan.status,
    scan."seedUrl",
    scan."completedAt",
    COUNT(p.id) as total_pages,
    COUNT(CASE WHEN p."canonicalUrl" IS NOT NULL AND p."pageFingerprintJson" IS NOT NULL THEN 1 END) as pages_ready_for_layer3,
    COUNT(pv.id) as page_versions_created,
    COUNT(am.id) as assistive_maps_created
FROM "Scan" scan
LEFT JOIN "Page" p ON p."scanId" = scan.id
LEFT JOIN "PageVersion" pv ON pv."scanId" = scan."scanId"
LEFT JOIN "AssistiveMap" am ON am."pageVersionId" = pv.id
WHERE scan.status = 'completed'
GROUP BY scan."scanId", scan.status, scan."seedUrl", scan."completedAt"
ORDER BY scan."completedAt" DESC
LIMIT 10;

