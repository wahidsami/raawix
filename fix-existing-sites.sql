-- Fix existing Sites that have full URLs instead of just hostname:port
-- This will update Sites to have the correct domain format

-- 1. Show current Sites (before fix)
SELECT 
    id,
    domain,
    "createdAt"
FROM "Site"
ORDER BY "createdAt" DESC;

-- 2. First, delete Sites with full URLs if a correct one already exists
-- (Keep the one with correct format, delete the full URL ones)
DELETE FROM "Site" s1
WHERE (s1.domain LIKE 'http://%' OR s1.domain LIKE 'https://%')
  AND EXISTS (
    SELECT 1 FROM "Site" s2
    WHERE s2.domain = 
      CASE 
        WHEN s1.domain LIKE 'http://%' THEN 
            SUBSTRING(s1.domain FROM 'http://([^/]+)')
        WHEN s1.domain LIKE 'https://%' THEN 
            SUBSTRING(s1.domain FROM 'https://([^/]+)')
        ELSE s1.domain
      END
    AND s2.id != s1.id
  );

-- 3. Now update remaining Sites with full URLs to extract just hostname:port
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
WHERE domain LIKE 'http://%' OR domain LIKE 'https://%';

-- 4. Show updated Sites (after fix)
SELECT 
    id,
    domain,
    "updatedAt"
FROM "Site"
ORDER BY "updatedAt" DESC;

-- 5. Check for duplicate domains after fix (should be none if unique constraint works)
SELECT 
    domain,
    COUNT(*) as count
FROM "Site"
GROUP BY domain
HAVING COUNT(*) > 1;

