# Full Test Suite - Start servers, scan pages, verify results
# This script orchestrates the complete test workflow

$ErrorActionPreference = "Stop"

$API_URL = "http://localhost:3001"
$API_KEY = "dev-api-key-change-in-production"
$TEST_SITES_URL = "http://localhost:4173"
$DASHBOARD_URL = "http://localhost:5173"

Write-Host "=== Raawi X Full Test Suite ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop any existing processes
Write-Host "Step 1: Stopping existing processes..." -ForegroundColor Yellow
$ports = @(3001, 4173, 5173)
foreach ($port in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conn) {
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        Write-Host "  Stopped process on port $port" -ForegroundColor Gray
        Start-Sleep -Seconds 1
    }
}
Write-Host "✅ Processes stopped" -ForegroundColor Green
Write-Host ""

# Step 2: Set environment variables for scanner
Write-Host "Step 2: Setting environment variables..." -ForegroundColor Yellow
$env:ALLOW_LOCALHOST = "true"
$env:ALLOWED_PORTS = "80,443,4173,5173,3000,3001"
Write-Host "✅ Environment variables set" -ForegroundColor Green
Write-Host "  ALLOW_LOCALHOST=true" -ForegroundColor Gray
Write-Host "  ALLOWED_PORTS=80,443,4173,5173,3000,3001" -ForegroundColor Gray
Write-Host ""

# Step 3: Start test-sites server
Write-Host "Step 3: Starting test-sites server..." -ForegroundColor Yellow
$testSitesJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    pnpm --filter @raawi-x/test-sites dev 2>&1
}
Write-Host "  Waiting for test-sites to start..." -ForegroundColor Gray
$testSitesReady = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    try {
        $response = Invoke-WebRequest -Uri "$TEST_SITES_URL" -TimeoutSec 1 -ErrorAction Stop
        $testSitesReady = $true
        break
    } catch {
        # Continue waiting
    }
}
if ($testSitesReady) {
    Write-Host "✅ Test-sites server running on $TEST_SITES_URL" -ForegroundColor Green
} else {
    Write-Host "⚠️  Test-sites server may not be ready yet" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Start scanner API
Write-Host "Step 4: Starting scanner API..." -ForegroundColor Yellow
$scannerJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    $env:ALLOW_LOCALHOST = "true"
    $env:ALLOWED_PORTS = "80,443,4173,5173,3000,3001"
    pnpm --filter scanner dev 2>&1
}
Write-Host "  Waiting for scanner to start..." -ForegroundColor Gray
$scannerReady = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    try {
        $response = Invoke-WebRequest -Uri "$API_URL" -TimeoutSec 1 -ErrorAction Stop
        $scannerReady = $true
        break
    } catch {
        # Continue waiting
    }
}
if ($scannerReady) {
    Write-Host "✅ Scanner API running on $API_URL" -ForegroundColor Green
} else {
    Write-Host "⚠️  Scanner API may not be ready yet" -ForegroundColor Yellow
}
Write-Host ""

# Step 5: Start dashboard (report-ui)
Write-Host "Step 5: Starting dashboard (report-ui)..." -ForegroundColor Yellow
$dashboardJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    pnpm --filter report-ui dev 2>&1
}
Write-Host "  Waiting for dashboard to start..." -ForegroundColor Gray
$dashboardReady = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    try {
        $response = Invoke-WebRequest -Uri "$DASHBOARD_URL" -TimeoutSec 1 -ErrorAction Stop
        $dashboardReady = $true
        break
    } catch {
        # Continue waiting
    }
}
if ($dashboardReady) {
    Write-Host "✅ Dashboard running on $DASHBOARD_URL" -ForegroundColor Green
    Write-Host "  Open in browser: $DASHBOARD_URL" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  Dashboard may not be ready yet" -ForegroundColor Yellow
}
Write-Host ""

# Step 6: Scan good page
Write-Host "Step 6: Scanning /good page..." -ForegroundColor Yellow
$goodBody = @{
    seedUrl = "$TEST_SITES_URL/good"
    maxPages = 2
    maxDepth = 1
} | ConvertTo-Json

try {
    $goodResponse = Invoke-RestMethod -Uri "$API_URL/api/scan" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "X-API-Key" = $API_KEY
        } `
        -Body $goodBody
    
    $GOOD_SCAN_ID = $goodResponse.scanId
    Write-Host "✅ Good page scan initiated" -ForegroundColor Green
    Write-Host "  Scan ID: $GOOD_SCAN_ID" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to scan good page: $_" -ForegroundColor Red
    $GOOD_SCAN_ID = ""
}
Write-Host ""

# Step 7: Scan messy page
Write-Host "Step 7: Scanning /messy page..." -ForegroundColor Yellow
$messyBody = @{
    seedUrl = "$TEST_SITES_URL/messy"
    maxPages = 2
    maxDepth = 1
} | ConvertTo-Json

try {
    $messyResponse = Invoke-RestMethod -Uri "$API_URL/api/scan" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "X-API-Key" = $API_KEY
        } `
        -Body $messyBody
    
    $MESSY_SCAN_ID = $messyResponse.scanId
    Write-Host "✅ Messy page scan initiated" -ForegroundColor Green
    Write-Host "  Scan ID: $MESSY_SCAN_ID" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to scan messy page: $_" -ForegroundColor Red
    $MESSY_SCAN_ID = ""
}
Write-Host ""

# Step 8: Run verification
Write-Host "Step 8: Running verification..." -ForegroundColor Yellow
Write-Host ""

if ($GOOD_SCAN_ID -and $MESSY_SCAN_ID) {
    & "apps\test-sites\verify-scans.ps1" -GoodScanId $GOOD_SCAN_ID -MessyScanId $MESSY_SCAN_ID
} else {
    Write-Host "⚠️  Skipping verification - one or both scans failed to start" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Test Suite Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Servers are still running in background jobs." -ForegroundColor Gray
Write-Host "To stop them, run:" -ForegroundColor Yellow
Write-Host "  Stop-Job -Id `$testSitesJob.Id, `$scannerJob.Id, `$dashboardJob.Id" -ForegroundColor Gray
Write-Host "  Remove-Job -Id `$testSitesJob.Id, `$scannerJob.Id, `$dashboardJob.Id" -ForegroundColor Gray
Write-Host ""
Write-Host "Services running:" -ForegroundColor Cyan
Write-Host "  📱 Test Sites: $TEST_SITES_URL" -ForegroundColor Green
Write-Host "  🔍 Scanner API: $API_URL" -ForegroundColor Green
Write-Host "  📊 Dashboard: $DASHBOARD_URL" -ForegroundColor Green
Write-Host ""
Write-Host "Or manually stop processes on ports 3001, 4173, and 5173" -ForegroundColor Gray

