# MVP Verification Checklist

## Pre-Execution Setup

- [ ] Scanner API server running (`pnpm scanner:dev`)
- [ ] Report UI running (`pnpm dev`)
- [ ] API key configured: `dev-api-key-change-in-production`
- [ ] Output directory exists: `./output`

## Test Execution

### 1. End-to-End Scan (5 pages)

**Command:**
```bash
# PowerShell
$body = @{seedUrl="https://example.com";maxPages=5;maxDepth=2} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3001/api/scan" -Method POST -Headers @{"Content-Type"="application/json";"X-API-Key"="dev-api-key-change-in-production"} -Body $body

# Or use test script
.\test-mvp.ps1
```

**Verification:**
- [ ] Scan ID returned
- [ ] Status changes: queued → running → completed
- [ ] No errors in console/logs

### 2. Artifacts Verification

**Check:** `output/{scanId}/pages/`

For each page (1-5):
- [ ] `page.json` exists (metadata)
- [ ] `page.html` exists (HTML content)
- [ ] `screenshot.png` exists (full-page screenshot)
- [ ] `a11y.json` exists (accessibility snapshot)

**Expected Structure:**
```
output/
└── scan_1234567890_abc123/
    ├── report.json
    └── pages/
        ├── 1/
        │   ├── page.json
        │   ├── page.html
        │   ├── screenshot.png
        │   └── a11y.json
        ├── 2/
        │   └── ...
        └── 5/
            └── ...
```

### 3. report.json Verification

**Check:** `output/{scanId}/report.json`

- [ ] File exists
- [ ] Valid JSON structure
- [ ] Contains `scanId`, `seedUrl`, `startedAt`, `completedAt`
- [ ] Contains `pages` array (5 pages)
- [ ] Contains `results` array (rule results per page)
- [ ] Contains `summary` with:
  - [ ] `totalPages: 5`
  - [ ] `totalRules: > 0`
  - [ ] `byLevel.A` and `byLevel.AA` counts
  - [ ] `byStatus` counts (pass, fail, needs_review, na)

### 4. Report UI Verification

**Steps:**
1. Navigate to http://localhost:5173
2. Enter API URL: `http://localhost:3001`
3. Enter API Key: `dev-api-key-change-in-production`
4. Start scan or view existing scan

**Verify:**
- [ ] API configuration screen works
- [ ] Scan form accepts input
- [ ] Scan status updates (queued → running → completed)
- [ ] Summary cards display:
  - [ ] A failures count
  - [ ] AA failures count
  - [ ] Needs review count
  - [ ] Total pages count
- [ ] Page table shows all 5 pages
- [ ] Clicking a page opens findings detail modal
- [ ] Screenshot thumbnails load
- [ ] Evidence snippets display correctly
- [ ] WCAG IDs and levels shown

### 5. Widget Guidance Endpoint

**Test:**
```bash
# PowerShell
$url = "https://example.com"
Invoke-RestMethod -Uri "http://localhost:3001/api/widget/guidance?url=$url&scanId=$scanId"
```

**Verify:**
- [ ] Returns 200 OK
- [ ] Contains `landmarks` array (at least 1 landmark)
- [ ] Contains `formSteps` array (if forms exist)
- [ ] Contains `keyActions` array (at least 1 action)
- [ ] Contains `summary` string
- [ ] Contains `normalizedUrl`
- [ ] Cached response (second request faster)

### 6. Widget Issues Endpoint

**Test:**
```bash
# PowerShell
$url = "https://example.com"
Invoke-RestMethod -Uri "http://localhost:3001/api/widget/issues?url=$url&scanId=$scanId"
```

**Verify:**
- [ ] Returns 200 OK
- [ ] Contains `issues` array
- [ ] Each issue has:
  - [ ] `severity` (critical/important/minor)
  - [ ] `title` (user-friendly)
  - [ ] `description` (user-friendly)
  - [ ] `userImpact` (explains impact)
  - [ ] `howToFix` (actionable guidance)
- [ ] Issues sorted by severity
- [ ] Cached response (second request faster)

### 7. Widget Config Endpoint

**Test:**
```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3001/api/widget/config?scanId=$scanId&lang=en"
```

**Verify:**
- [ ] Returns 200 OK
- [ ] Contains `scanId` (if provided)
- [ ] Contains `language` (en or ar)
- [ ] Contains `featureFlags` object with:
  - [ ] `textSize: true`
  - [ ] `lineSpacing: true`
  - [ ] `contrastMode: true`
  - [ ] `focusHighlight: true`
  - [ ] `readingMode: true`
  - [ ] `pageGuidance: true`
  - [ ] `knownIssues: true`
- [ ] Contains `apiUrl`

### 8. Cache-Control Headers

**Test:**
```bash
# PowerShell
$headers = Invoke-WebRequest -Uri "http://localhost:3001/api/scan/$scanId/artifact/pages/1/screenshot.png" -Headers @{"X-API-Key"="dev-api-key-change-in-production"} -Method Head
$headers.Headers['Cache-Control']
```

**Verify:**
- [ ] `Cache-Control` header present
- [ ] Contains `no-store`
- [ ] Contains `no-cache`
- [ ] Contains `must-revalidate`
- [ ] Contains `private`
- [ ] `Pragma: no-cache` present
- [ ] `Expires: 0` present

### 9. Retention Policy

**Verify:**
- [ ] Retention enabled by default (7 days)
- [ ] Configurable via `SCAN_RETENTION_DAYS` env var
- [ ] Can be disabled via `SCAN_RETENTION_ENABLED=false`
- [ ] Cleanup runs on server startup
- [ ] Cleanup scheduled every 24 hours
- [ ] Old scans (>7 days) are deleted
- [ ] Recent scans are preserved

**Test (Manual):**
1. Create a test scan
2. Modify `report.json` mtime to 8 days ago
3. Restart server or wait for cleanup
4. Verify scan directory is deleted

## Expected Results Summary

### Scan Results
- **Pages Scanned:** 5
- **Rules Evaluated:** 10 per page = 50 total
- **Artifacts per Page:** 4 (page.json, page.html, screenshot.png, a11y.json)
- **Total Artifacts:** 20 files + report.json

### Report Structure
- **Format:** Valid `ScanRun` JSON
- **Summary:** Contains A/AA level breakdowns
- **Findings:** User-friendly issue descriptions

### Widget Endpoints
- **Guidance:** Landmarks, forms, key actions extracted
- **Issues:** User-friendly explanations (not compliance claims)
- **Config:** Feature flags and language support

## Notes

- All endpoints are read-only
- No PII collection
- Widget endpoints cached (1 hour TTL)
- Artifacts have Cache-Control: no-store
- Retention policy: 7 days default

## Test Scripts

- **Bash:** `./test-mvp.sh`
- **PowerShell:** `.\test-mvp.ps1`

Both scripts automate the entire verification process.

