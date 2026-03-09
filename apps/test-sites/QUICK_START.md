# Quick Start - Test Sites with Article Sections

## One-Command Test

Run the full automated test suite:

```powershell
.\apps\test-sites\run-full-test.ps1
```

This script will:
1. ✅ Stop existing processes on ports 3001, 4173, 5173
2. ✅ Start test-sites server (port 4173)
3. ✅ Start scanner API (port 3001)
4. ✅ Start dashboard/report-ui (port 5173)
5. ✅ Scan both `/good` and `/messy` pages
6. ✅ Verify scan results automatically

## Manual Step-by-Step

### Step 1: Stop Existing Processes

```powershell
$ports = @(3001, 4173, 5173)
foreach ($port in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conn) {
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        Write-Host "Stopped process on port $port"
    }
}
```

### Step 2: Set Environment Variables

```powershell
$env:ALLOW_LOCALHOST = "true"
$env:ALLOWED_PORTS = "80,443,4173,5173,3000,3001"
```

### Step 3: Start Test Sites Server

**Terminal 1:**
```powershell
pnpm test-sites:dev
```

Wait for: `VITE ready in xxx ms` and `Local: http://localhost:4173`

### Step 4: Start Scanner API

**Terminal 2:**
```powershell
$env:ALLOW_LOCALHOST = "true"
$env:ALLOWED_PORTS = "80,443,4173,5173,3000,3001"
pnpm scanner:dev
```

Wait for: `Server listening on port 3001`

### Step 5: Start Dashboard (Optional but Recommended)

**Terminal 3:**
```powershell
pnpm dev
# or
pnpm --filter report-ui dev
```

Wait for: `VITE ready in xxx ms` and `Local: http://localhost:5173`

Open in browser: **http://localhost:5173** to view scan results visually

### Step 6: Scan Pages

**Terminal 3:**
```powershell
.\apps\test-sites\scan-test-pages.ps1
```

Or manually:
```powershell
$API_URL = "http://localhost:3001"
$API_KEY = "dev-api-key-change-in-production"

# Scan good page
$good = @{seedUrl="http://localhost:4173/good";maxPages=2;maxDepth=1} | ConvertTo-Json
$goodResponse = Invoke-RestMethod -Uri "$API_URL/api/scan" -Method POST -Headers @{"Content-Type"="application/json";"X-API-Key"=$API_KEY} -Body $good

# Scan messy page
$messy = @{seedUrl="http://localhost:4173/messy";maxPages=2;maxDepth=1} | ConvertTo-Json
$messyResponse = Invoke-RestMethod -Uri "$API_URL/api/scan" -Method POST -Headers @{"Content-Type"="application/json";"X-API-Key"=$API_KEY} -Body $messy

Write-Host "Good Scan ID: $($goodResponse.scanId)"
Write-Host "Messy Scan ID: $($messyResponse.scanId)"
```

### Step 7: Verify Results

```powershell
.\apps\test-sites\verify-scans.ps1 -GoodScanId {goodScanId} -MessyScanId {messyScanId}
```

## What Was Added

### Both Pages Now Include:

1. **Article Section** (`<article aria-labelledby="article-title">`)
   - Heading: "Accessibility in Real Interfaces"
   - 3 meaningful paragraphs about accessibility
   - Image with figure/figcaption

2. **Good Page:**
   - ✅ Image has proper `alt` attribute
   - ✅ Semantic HTML structure
   - ✅ Figcaption complements alt text

3. **Messy Page:**
   - ❌ Image missing `alt` attribute (intentional)
   - ⚠️ Extra divs wrapping article (messy structure)
   - ❌ Icon-only clickable element without accessible name

## Expected Verification Results

### Good Page
- ✅ WCAG 1.1.1: **0 failures** (image has alt)
- ✅ Vision findings: **0 or minimal**
- ✅ Article narrates correctly

### Messy Page
- ❌ WCAG 1.1.1: **≥1 failure** (missing alt)
- ⚠️ Vision findings: **≥1 finding** (icon-only clickable)
- ✅ Article still narrates correctly

## Widget Narration

The widget's narration engine will:
- ✅ Read article heading: "Accessibility in Real Interfaces"
- ✅ Read first 1-2 sentences of each paragraph
- ✅ Skip decorative figcaption by default
- ✅ Continue reading through all sections

Test with voice command: **"Read page"** or click **"Read Page"** button in widget.

## Troubleshooting

### Port Already in Use
```powershell
Get-NetTCPConnection -LocalPort 3001 | Select-Object OwningProcess
Stop-Process -Id {PID} -Force
```

### Scanner Not Accepting Localhost
Ensure `.env` file in `apps/scanner/` has:
```
ALLOW_LOCALHOST=true
ALLOWED_PORTS=80,443,4173,5173,3000,3001
```

### Widget Not Loading
```powershell
# Build widget
pnpm --filter widget build

# Copy to test-sites
Copy-Item apps\widget\dist\widget.iife.js -Destination apps\test-sites\public\widget.iife.js -Force
```

## Files Modified

- ✅ `apps/test-sites/src/pages/GoodPage.tsx` - Added article section with proper alt
- ✅ `apps/test-sites/src/pages/MessyPage.tsx` - Added article section with missing alt + icon-only element
- ✅ `apps/test-sites/verify-scans.ps1` - New verification script
- ✅ `apps/test-sites/run-full-test.ps1` - New full test suite script
- ✅ `apps/test-sites/TEST_CHECKLIST.md` - Detailed verification checklist

