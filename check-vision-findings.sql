-- Check Vision Findings for a specific scan
-- Replace 'scan_1767992232929_0gw944y' with your actual scanId

-- 1. Check if scan exists
SELECT 
  "scanId",
  status,
  "startedAt",
  "completedAt",
  "hostname",
  "maxPages",
  "maxDepth"
FROM "Scan"
WHERE "scanId" = 'scan_1767992232929_0gw944y';

-- 2. Count total vision findings for this scan
SELECT 
  COUNT(*) as total_vision_findings,
  COUNT(DISTINCT "pageId") as pages_with_vision_findings
FROM "VisionFinding"
WHERE "scanId" = (
  SELECT id FROM "Scan" WHERE "scanId" = 'scan_1767992232929_0gw944y'
);

-- 3. Vision findings by page
SELECT 
  p."pageNumber",
  p.url,
  COUNT(vf.id) as vision_findings_count,
  STRING_AGG(DISTINCT vf.kind, ', ') as finding_kinds,
  STRING_AGG(DISTINCT vf.confidence, ', ') as confidence_levels
FROM "Page" p
LEFT JOIN "VisionFinding" vf ON vf."pageId" = p.id
WHERE p."scanId" = (
  SELECT id FROM "Scan" WHERE "scanId" = 'scan_1767992232929_0gw944y'
)
GROUP BY p."pageNumber", p.url
ORDER BY p."pageNumber";

-- 4. Detailed vision findings
SELECT 
  vf.id,
  vf.kind,
  vf.confidence,
  vf."detectedText",
  vf."correlatedSelector",
  p."pageNumber",
  p.url
FROM "VisionFinding" vf
JOIN "Page" p ON p.id = vf."pageId"
WHERE vf."scanId" = (
  SELECT id FROM "Scan" WHERE "scanId" = 'scan_1767992232929_0gw944y'
)
ORDER BY p."pageNumber", vf.kind;

-- 5. Check if pages have visionPath metadata
SELECT 
  p."pageNumber",
  p.url,
  p."visionPath",
  CASE 
    WHEN p."visionPath" IS NOT NULL THEN 'Has vision path'
    ELSE 'No vision path'
  END as vision_status
FROM "Page" p
WHERE p."scanId" = (
  SELECT id FROM "Scan" WHERE "scanId" = 'scan_1767992232929_0gw944y'
)
ORDER BY p."pageNumber";

