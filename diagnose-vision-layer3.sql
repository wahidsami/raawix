-- Diagnose why Vision (Layer 2) and Assistive Maps (Layer 3) are not appearing

-- 1. Check the latest scan's status and pages
SELECT 
    scan."scanId",
    scan.status,
    scan."seedUrl",
    scan."startedAt",
    scan."completedAt",
    COUNT(DISTINCT p.id) as page_count,
    COUNT(DISTINCT f.id) as finding_count,
    COUNT(DISTINCT vf.id) as vision_finding_count
FROM "Scan" scan
LEFT JOIN "Page" p ON p."scanId" = scan.id
LEFT JOIN "Finding" f ON f."pageId" = p.id
LEFT JOIN "VisionFinding" vf ON vf."pageId" = p.id
WHERE scan."scanId" LIKE 'scan_%'
GROUP BY scan."scanId", scan.status, scan."seedUrl", scan."startedAt", scan."completedAt"
ORDER BY scan."startedAt" DESC
LIMIT 5;

-- 2. Check if pages have visionPath metadata
SELECT 
    p."pageNumber",
    p.url,
    p."screenshotPath",
    p."canonicalUrl",
    CASE WHEN p."pageFingerprintJson" IS NOT NULL THEN 'YES' ELSE 'NO' END as has_fingerprint,
    COUNT(vf.id) as vision_findings_in_db,
    MAX(scan."startedAt") as scan_started_at
FROM "Page" p
LEFT JOIN "VisionFinding" vf ON vf."pageId" = p.id
JOIN "Scan" scan ON p."scanId" = scan.id
WHERE scan."scanId" LIKE 'scan_%'
GROUP BY p.id, p."pageNumber", p.url, p."screenshotPath", p."canonicalUrl", p."pageFingerprintJson"
ORDER BY MAX(scan."startedAt") DESC, p."pageNumber" ASC
LIMIT 10;

-- 3. Check if Assistive Maps were created for recent scans
SELECT 
    scan."scanId",
    scan."seedUrl",
    scan."completedAt",
    COUNT(DISTINCT pv.id) as page_version_count,
    COUNT(DISTINCT am.id) as assistive_map_count
FROM "Scan" scan
LEFT JOIN "PageVersion" pv ON pv."scanId" = scan."scanId"
LEFT JOIN "AssistiveMap" am ON am."pageVersionId" = pv.id
WHERE scan.status = 'completed'
GROUP BY scan."scanId", scan."seedUrl", scan."completedAt"
ORDER BY scan."completedAt" DESC
LIMIT 5;

-- 4. Check if vision analysis ran (check for vision findings in artifacts)
-- This requires checking the file system, but we can check if vision findings exist in DB
SELECT 
    vf.id,
    vf.kind,
    vf.confidence,
    vf."pageId",
    p."pageNumber",
    p.url,
    scan."scanId",
    scan."startedAt"
FROM "VisionFinding" vf
JOIN "Page" p ON vf."pageId" = p.id
JOIN "Scan" scan ON p."scanId" = scan.id
WHERE scan."scanId" LIKE 'scan_%'
ORDER BY scan."startedAt" DESC, p."pageNumber" ASC
LIMIT 20;

