# Test Sites Verification Checklist

## Pre-requisites

- [ ] Widget is built: `pnpm --filter widget build`
- [ ] Widget is copied to test-sites public: `Copy-Item apps\widget\dist\widget.iife.js -Destination apps\test-sites\public\widget.iife.js -Force`
- [ ] Environment variables set in scanner `.env`:
  - `ALLOW_LOCALHOST=true`
  - `ALLOWED_PORTS=80,443,4173,5173,3000,3001`

## Quick Test (Automated)

Run the full test suite:
```powershell
.\apps\test-sites\run-full-test.ps1
```

This will:
1. Stop existing processes
2. Start test-sites server (port 4173)
3. Start scanner API (port 3001)
4. Scan both /good and /messy pages
5. Verify scan results

## Manual Test Steps

### 1. Start Servers

**Terminal 1 - Test Sites:**
```powershell
pnpm test-sites:dev
```
Should see: `VITE ready in xxx ms` and server on `http://localhost:4173`

**Terminal 2 - Scanner:**
```powershell
$env:ALLOW_LOCALHOST = "true"
$env:ALLOWED_PORTS = "80,443,4173,5173,3000,3001"
pnpm scanner:dev
```
Should see: `Server listening on port 3001`

### 2. Scan Pages

**Option A: Use provided script**
```powershell
.\apps\test-sites\scan-test-pages.ps1
```

**Option B: Manual scan**
```powershell
# Good page
$body = @{seedUrl="http://localhost:4173/good";maxPages=2;maxDepth=1} | ConvertTo-Json
$good = Invoke-RestMethod -Uri "http://localhost:3001/api/scan" -Method POST -Headers @{"Content-Type"="application/json";"X-API-Key"="dev-api-key-change-in-production"} -Body $body

# Messy page
$body = @{seedUrl="http://localhost:4173/messy";maxPages=2;maxDepth=1} | ConvertTo-Json
$messy = Invoke-RestMethod -Uri "http://localhost:3001/api/scan" -Method POST -Headers @{"Content-Type"="application/json";"X-API-Key"="dev-api-key-change-in-production"} -Body $body
```

### 3. Wait for Scans to Complete

Check status:
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/scan/{scanId}" -Headers @{"X-API-Key"="dev-api-key-change-in-production"}
```

Or use verification script:
```powershell
.\apps\test-sites\verify-scans.ps1 -GoodScanId {goodScanId} -MessyScanId {messyScanId}
```

### 4. Verify Scan Results

#### Good Page Verification

- [ ] **WCAG 1.1.1 (Image Alt Text):** Should PASS or have 0 failures
  - Check: `apps\scanner\output\{scanId}\report.json`
  - Look for rule results with `wcagId: "1.1.1"` and `status: "fail"`
  - Expected: 0 failures (image has proper alt text)

- [ ] **Article Section:** Should be detected in landmarks
  - Check: `/api/widget/guidance?url=http://localhost:4173/good&scanId={scanId}`
  - Should include article landmark

- [ ] **Vision Findings:** Should not flag the image as problematic
  - Check report.json for `vision-*` rule results
  - Image should not appear in vision findings

#### Messy Page Verification

- [ ] **WCAG 1.1.1 (Image Alt Text):** Should FAIL with at least 1 failure
  - Check: `apps\scanner\output\{scanId}\report.json`
  - Look for rule results with `wcagId: "1.1.1"` and `status: "fail"`
  - Expected: At least 1 failure (image missing alt attribute)
  - Evidence should show the `<img>` selector/snippet

- [ ] **Vision Findings:** Should include at least 1 finding
  - Check report.json for `vision-*` rule results
  - Should detect the icon-only clickable element near the image
  - Element should be flagged as missing accessible name/role

- [ ] **Article Section:** Should still be detected despite messy structure
  - Check: `/api/widget/guidance?url=http://localhost:4173/messy&scanId={scanId}`
  - Should include article landmark (even with extra divs)

### 5. Widget Intelligence Verification

#### On /messy with scanId configured:

- [ ] **"Read issues" command:**
  - Should mention missing image description in user-friendly language
  - Should not use technical jargon
  - Should explain impact to user

- [ ] **"Read page" command:**
  - Should narrate the article text smoothly
  - Should read article heading: "Accessibility in Real Interfaces"
  - Should read first 1-2 sentences of paragraphs
  - Should NOT read decorative figcaption by default
  - Should continue reading through all main sections

#### On /good:

- [ ] **Issues should not include missing-alt blocker**
  - "Read issues" should not mention image alt text problems
  - Or should explicitly state "No critical issues found"

### 6. Article Content Verification

Both pages should have:

- [ ] `<article aria-labelledby="article-title">` element
- [ ] `<h2 id="article-title">Accessibility in Real Interfaces</h2>`
- [ ] 2-3 meaningful paragraphs
- [ ] `<figure>` containing `<img>` and optional `<figcaption>`
- [ ] Same image URL in both pages (for consistency)

**Good page specific:**
- [ ] Image has `alt="Screenshot of an accessible landing page showing clear headings, buttons, and form labels."`
- [ ] Figcaption complements but doesn't duplicate alt text

**Messy page specific:**
- [ ] Image is missing `alt` attribute (or has `alt=""`)
- [ ] Article wrapped in extra divs (intentionally messy structure)
- [ ] Icon-only clickable element near image:
  - No `role` attribute
  - No `tabindex`
  - No accessible name (no `aria-label` or text content)
  - Has `onclick` handler
  - Styled with `cursor: pointer`

## Expected Results Summary

### Good Page
- ✅ WCAG 1.1.1: **0 failures**
- ✅ Vision findings: **0 or minimal** (no image issues)
- ✅ Article narrates correctly
- ✅ No missing alt text issues

### Messy Page
- ❌ WCAG 1.1.1: **≥1 failure** (missing alt)
- ⚠️ Vision findings: **≥1 finding** (icon-only clickable)
- ✅ Article still narrates correctly (despite messy structure)
- ❌ Missing alt text issue detected and reported

## Troubleshooting

### Scans not starting
- Check scanner is running: `Get-NetTCPConnection -LocalPort 3001`
- Check environment variables are set
- Check test-sites is running: `Get-NetTCPConnection -LocalPort 4173`

### Verification script fails
- Ensure scans completed: Check status endpoint
- Check report.json exists: `Test-Path apps\scanner\output\{scanId}\report.json`
- Review report.json manually for rule results

### Widget not narrating article
- Check widget is loaded: `window.raawiAccessibilityWidget` in browser console
- Check scanId is set: `window.RAWI_SCAN_ID`
- Check API is accessible: `window.RAWI_API_URL`
- Try "Read page" command and check transcript

