-- Check if vision files exist on disk (we can't check directly, but we can check page metadata)

-- 1. Check latest scan's pages and their metadata
SELECT 
    scan."scanId",
    scan.status,
    scan."seedUrl",
    scan."startedAt",
    scan."completedAt",
    p."pageNumber",
    p.url,
    p."screenshotPath",
    p."canonicalUrl",
    CASE WHEN p."pageFingerprintJson" IS NOT NULL THEN 'YES' ELSE 'NO' END as has_fingerprint,
    -- Check if vision findings file would exist (we can't check directly, but we know the path pattern)
    -- Vision file would be at: output/{scanId}/pages/{pageNumber}/vision/vision.json
    'output/' || scan."scanId" || '/pages/' || p."pageNumber" || '/vision/vision.json' as expected_vision_path
FROM "Scan" scan
JOIN "Page" p ON p."scanId" = scan.id
WHERE scan."scanId" LIKE 'scan_%'
ORDER BY scan."startedAt" DESC, p."pageNumber" ASC
LIMIT 10;

-- 2. Check if pages have the required metadata for Layer 3
SELECT 
    scan."scanId",
    COUNT(*) as total_pages,
    COUNT(CASE WHEN p."canonicalUrl" IS NOT NULL THEN 1 END) as pages_with_canonical_url,
    COUNT(CASE WHEN p."pageFingerprintJson" IS NOT NULL THEN 1 END) as pages_with_fingerprint,
    COUNT(CASE WHEN p."canonicalUrl" IS NOT NULL AND p."pageFingerprintJson" IS NOT NULL THEN 1 END) as pages_ready_for_layer3
FROM "Scan" scan
JOIN "Page" p ON p."scanId" = scan.id
WHERE scan.status = 'completed'
GROUP BY scan."scanId"
ORDER BY scan."startedAt" DESC
LIMIT 5;

