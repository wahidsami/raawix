-- Verify the fix worked and check if we're ready for Layer 3

-- 1. Final Sites state
SELECT 
    id,
    domain,
    "createdAt",
    (SELECT COUNT(*) FROM "PageVersion" WHERE "siteId" = "Site".id) as page_version_count
FROM "Site"
ORDER BY "createdAt" DESC;

-- 2. Check if getHostname() will match (simulate what it would extract)
SELECT 
    scan."scanId",
    scan."seedUrl",
    -- This is what getHostname() will now return (with port)
    CASE 
        WHEN scan."seedUrl" LIKE 'http://%' THEN 
            SUBSTRING(scan."seedUrl" FROM 'http://([^/]+)')
        WHEN scan."seedUrl" LIKE 'https://%' THEN 
            SUBSTRING(scan."seedUrl" FROM 'https://([^/]+)')
        ELSE scan."seedUrl"
    END as extracted_domain,
    -- Check if a Site exists with this domain
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM "Site" s
            WHERE s.domain = 
                CASE 
                    WHEN scan."seedUrl" LIKE 'http://%' THEN 
                        SUBSTRING(scan."seedUrl" FROM 'http://([^/]+)')
                    WHEN scan."seedUrl" LIKE 'https://%' THEN 
                        SUBSTRING(scan."seedUrl" FROM 'https://([^/]+)')
                    ELSE scan."seedUrl"
                END
        ) THEN '✅ MATCH'
        ELSE '❌ NO MATCH'
    END as site_exists
FROM "Scan" scan
WHERE scan.status = 'completed'
ORDER BY scan."completedAt" DESC
LIMIT 5;

