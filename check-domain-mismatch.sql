-- Check if Site domains match scanned domains
-- This will show if there's a domain mismatch preventing PageVersion creation

-- 1. Show all Sites with their domains
SELECT 
    s.domain,
    s.id as site_id,
    s."createdAt",
    COUNT(pv.id) as page_version_count
FROM "Site" s
LEFT JOIN "PageVersion" pv ON pv."siteId" = s.id
GROUP BY s.domain, s.id, s."createdAt"
ORDER BY s."createdAt" DESC;

-- 2. Show recent scans and their extracted domains
SELECT 
    scan."scanId",
    scan."seedUrl",
    -- Extract domain from seedUrl
    CASE 
        WHEN scan."seedUrl" LIKE 'http://%' THEN 
            SUBSTRING(scan."seedUrl" FROM 'http://([^/]+)')
        WHEN scan."seedUrl" LIKE 'https://%' THEN 
            SUBSTRING(scan."seedUrl" FROM 'https://([^/]+)')
        ELSE scan."seedUrl"
    END as extracted_domain,
    scan."completedAt"
FROM "Scan" scan
WHERE scan.status = 'completed'
ORDER BY scan."completedAt" DESC
LIMIT 10;

-- 3. Check if Site domains match scanned domains
SELECT 
    s.domain as site_domain,
    CASE 
        WHEN scan."seedUrl" LIKE 'http://%' THEN 
            SUBSTRING(scan."seedUrl" FROM 'http://([^/]+)')
        WHEN scan."seedUrl" LIKE 'https://%' THEN 
            SUBSTRING(scan."seedUrl" FROM 'https://([^/]+)')
        ELSE scan."seedUrl"
    END as scan_domain,
    CASE 
        WHEN s.domain = 
            CASE 
                WHEN scan."seedUrl" LIKE 'http://%' THEN 
                    SUBSTRING(scan."seedUrl" FROM 'http://([^/]+)')
                WHEN scan."seedUrl" LIKE 'https://%' THEN 
                    SUBSTRING(scan."seedUrl" FROM 'https://([^/]+)')
                ELSE scan."seedUrl"
            END
        THEN 'MATCH' 
        ELSE 'NO MATCH' 
    END as domain_match,
    scan."scanId",
    scan."completedAt"
FROM "Site" s
CROSS JOIN "Scan" scan
WHERE scan.status = 'completed'
ORDER BY scan."completedAt" DESC
LIMIT 20;

