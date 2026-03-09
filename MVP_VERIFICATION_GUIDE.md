# MVP Verification Guide

## Quick Start

### 1. Start Scanner API

```bash
# Terminal 1
pnpm scanner:dev
```

Wait for: `Scanner API server running on port 3001`

### 2. Run Test Script

**Windows (PowerShell):**
```powershell
.\test-mvp.ps1
```

**Linux/Mac (Bash):**
```bash
chmod +x test-mvp.sh
./test-mvp.sh
```

### 3. Manual Verification (If Script Fails)

**Step 1: Initiate Scan**
```powershell
$body = @{
    seedUrl = "https://example.com"
    maxPages = 5
    maxDepth = 2
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3001/api/scan" `
    -Method POST `
    -Headers @{
        "Content-Type" = "application/json"
        "X-API-Key" = "dev-api-key-change-in-production"
    } `
    -Body $body

$SCAN_ID = $response.scanId
Write-Host "Scan ID: $SCAN_ID"
```

**Step 2: Monitor Progress**
```powershell
# Check status every 5 seconds
while ($true) {
    $status = Invoke-RestMethod -Uri "http://localhost:3001/api/scan/$SCAN_ID" `
        -Headers @{ "X-API-Key" = "dev-api-key-change-in-production" }
    
    Write-Host "Status: $($status.status), Pages: $($status.summary.totalPages)"
    
    if ($status.status -eq "completed" -or $status.status -eq "failed") {
        break
    }
    
    Start-Sleep -Seconds 5
}
```

**Step 3: Verify Artifacts**
```powershell
$scanDir = "output\$SCAN_ID"
Write-Host "Checking: $scanDir"

# Check report.json
if (Test-Path "$scanDir\report.json") {
    $report = Get-Content "$scanDir\report.json" | ConvertFrom-Json
    Write-Host "✅ report.json exists"
    Write-Host "  Pages: $($report.pages.Count)"
    Write-Host "  Total Rules: $($report.summary.totalRules)"
    
    # Check for vision findings
    $visionResults = ($report.results | ForEach-Object { $_.ruleResults } | Where-Object { $_.ruleId -like "vision-*" })
    Write-Host "  Vision findings: $($visionResults.Count)"
}

# Check pages
$pagesDir = "$scanDir\pages"
if (Test-Path $pagesDir) {
    $pageDirs = Get-ChildItem $pagesDir -Directory
    Write-Host "✅ Pages directory: $($pageDirs.Count) pages"
    
    foreach ($pageDir in $pageDirs) {
        $pageNum = $pageDir.Name
        Write-Host "  Page $pageNum :"
        Write-Host "    - page.json: $(if (Test-Path "$($pageDir.FullName)\page.json") { '✅' } else { '❌' })"
        Write-Host "    - page.html: $(if (Test-Path "$($pageDir.FullName)\page.html") { '✅' } else { '❌' })"
        Write-Host "    - screenshot.png: $(if (Test-Path "$($pageDir.FullName)\screenshot.png") { '✅' } else { '❌' })"
        Write-Host "    - a11y.json: $(if (Test-Path "$($pageDir.FullName)\a11y.json") { '✅' } else { '❌' })"
        
        $visionPath = "$($pageDir.FullName)\vision\vision.json"
        if (Test-Path $visionPath) {
            $vision = Get-Content $visionPath | ConvertFrom-Json
            Write-Host "    - vision.json: ✅ ($($vision.Count) findings)"
        }
    }
}
```

**Step 4: Test Widget Endpoints**
```powershell
# Test guidance endpoint
$guidance = Invoke-RestMethod -Uri "http://localhost:3001/api/widget/guidance?url=https://example.com&scanId=$SCAN_ID"
Write-Host "✅ Guidance endpoint:"
Write-Host "  Landmarks: $($guidance.landmarks.Count)"
Write-Host "  Key Actions: $($guidance.keyActions.Count)"

# Test issues endpoint
$issues = Invoke-RestMethod -Uri "http://localhost:3001/api/widget/issues?url=https://example.com&scanId=$SCAN_ID"
Write-Host "✅ Issues endpoint:"
Write-Host "  Issues: $($issues.issues.Count)"
```

## Verification Checklist

### ✅ Report.json Structure
- [ ] File exists at `output/{scanId}/report.json`
- [ ] Valid JSON structure
- [ ] Contains `scanId`, `seedUrl`, `startedAt`, `completedAt`
- [ ] Contains `pages` array (5 pages)
- [ ] Contains `results` array (5 PageRuleResults)
- [ ] Contains `summary` with accurate counts

### ✅ WCAG Rule Results
- [ ] 10 WCAG rules per page = 50 total rule results
- [ ] Rules include: 1.1.1, 2.4.2, 3.1.1, 4.1.2, 2.4.4, 2.4.7, 2.1.1, 2.1.2, 1.4.3, 1.4.10
- [ ] Each rule result has: ruleId, wcagId, status, confidence, evidence, howToVerify

### ✅ Vision Findings
- [ ] Vision findings saved to `output/{scanId}/pages/{n}/vision/vision.json`
- [ ] Vision findings appear in `report.json` as rule results
- [ ] Rule IDs prefixed with `vision-` (e.g., `vision-clickable-unlabeled`)
- [ ] Screenshot crops saved to `vision/{findingId}.png`
- [ ] Evidence includes crop paths and selectors

### ✅ Widget Endpoints
- [ ] `/api/widget/guidance` returns landmarks, forms, key actions
- [ ] Key actions include vision-enriched elements
- [ ] `/api/widget/issues` returns WCAG + vision findings
- [ ] Issues have user-friendly descriptions
- [ ] Issues sorted by severity

### ✅ Database (If Enabled)
- [ ] Scan record in `Scan` table
- [ ] Page records in `Page` table
- [ ] Finding records in `Finding` table
- [ ] VisionFinding records in `VisionFinding` table
- [ ] `GET /api/scan/:id` reads from database

## Expected Results

### Scan Execution
- **Duration:** 30-60 seconds
- **Pages:** 5 pages scanned
- **Status:** completed

### Artifacts
- **Per Page:** page.json, page.html, screenshot.png, a11y.json
- **Vision:** vision.json + screenshot crops (if vision enabled)
- **Total:** 20+ files + report.json

### Report
- **Format:** Valid `ScanRun` JSON
- **WCAG Rules:** 50 rule results (10 × 5 pages)
- **Vision Findings:** Integrated as rule results
- **Summary:** Accurate counts by level and status

### Widget
- **Guidance:** Landmarks, forms, vision-enriched actions
- **Issues:** WCAG + vision findings with explanations

## Troubleshooting

### Server Won't Start
1. Check if port 3001 is in use
2. Verify build: `pnpm build`
3. Check for missing dependencies: `pnpm install`

### Scan Fails
1. Check console logs for errors
2. Verify target URL is accessible
3. Check network connectivity

### Vision Findings Missing
1. Verify `VISION_ENABLED=true` (default: enabled)
2. Check `output/{scanId}/pages/{n}/vision/vision.json` exists
3. Verify vision findings in `report.json`

### Database Issues
1. Database is optional - system works without it
2. If using database, verify `DATABASE_URL` is set
3. Run migrations: `pnpm --filter scanner db:migrate`

