-- Check if Sites exist and why PageVersions aren't being created

-- 1. Check if Sites exist for the scanned domains
SELECT 
    s.domain,
    s.id as site_id,
    s."createdAt",
    COUNT(pv.id) as page_version_count
FROM "Site" s
LEFT JOIN "PageVersion" pv ON pv."siteId" = s.id
GROUP BY s.domain, s.id, s."createdAt"
ORDER BY s."createdAt" DESC;

-- 2. Check if any Sites exist at all
SELECT COUNT(*) as total_sites FROM "Site";

-- 3. Check the domain from recent scans
SELECT DISTINCT 
    scan."seedUrl",
    scan."completedAt",
    -- Extract domain from seedUrl (simplified - assumes http:// or https://)
    CASE 
        WHEN scan."seedUrl" LIKE 'http://%' THEN 
            SUBSTRING(scan."seedUrl" FROM 'http://([^/]+)')
        WHEN scan."seedUrl" LIKE 'https://%' THEN 
            SUBSTRING(scan."seedUrl" FROM 'https://([^/]+)')
        ELSE scan."seedUrl"
    END as extracted_domain
FROM "Scan" scan
WHERE scan.status = 'completed'
ORDER BY scan."completedAt" DESC
LIMIT 10;

-- 4. Check if Sites match the scanned domains
SELECT 
    s.domain as site_domain,
    CASE 
        WHEN scan."seedUrl" LIKE 'http://%' THEN 
            SUBSTRING(scan."seedUrl" FROM 'http://([^/]+)')
        WHEN scan."seedUrl" LIKE 'https://%' THEN 
            SUBSTRING(scan."seedUrl" FROM 'https://([^/]+)')
        ELSE scan."seedUrl"
    END as scan_domain,
    MAX(scan."completedAt") as latest_scan_completed,
    COUNT(DISTINCT scan.id) as scan_count
FROM "Site" s
FULL OUTER JOIN "Scan" scan ON s.domain = 
    CASE 
        WHEN scan."seedUrl" LIKE 'http://%' THEN 
            SUBSTRING(scan."seedUrl" FROM 'http://([^/]+)')
        WHEN scan."seedUrl" LIKE 'https://%' THEN 
            SUBSTRING(scan."seedUrl" FROM 'https://([^/]+)')
        ELSE scan."seedUrl"
    END
WHERE scan.status = 'completed' OR s.domain IS NOT NULL
GROUP BY s.domain, scan."seedUrl"
ORDER BY latest_scan_completed DESC NULLS LAST
LIMIT 20;

