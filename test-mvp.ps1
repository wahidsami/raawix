# MVP Proof Run - End-to-End Test Script (PowerShell)
# This script verifies the complete MVP functionality

$ErrorActionPreference = "Stop"

$API_URL = "http://localhost:3001"
$API_KEY = "dev-api-key-change-in-production"
$TEST_URL = "https://example.com"

Write-Host "=== MVP Proof Run - End-to-End Test ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Start scan
Write-Host "Step 1: Initiating scan..." -ForegroundColor Yellow
$scanBody = @{
    seedUrl = $TEST_URL
    maxPages = 5
    maxDepth = 2
} | ConvertTo-Json

$scanResponse = Invoke-RestMethod -Uri "$API_URL/api/scan" `
    -Method POST `
    -Headers @{
        "Content-Type" = "application/json"
        "X-API-Key" = $API_KEY
    } `
    -Body $scanBody

$SCAN_ID = $scanResponse.scanId
Write-Host "Scan ID: $SCAN_ID" -ForegroundColor Green
Write-Host "Response: $($scanResponse | ConvertTo-Json)" -ForegroundColor Gray
Write-Host ""

# Step 2: Wait for scan to complete
Write-Host "Step 2: Waiting for scan to complete..." -ForegroundColor Yellow
$STATUS = "running"
$ATTEMPTS = 0
$MAX_ATTEMPTS = 60  # 5 minutes max

while ($STATUS -ne "completed" -and $STATUS -ne "failed" -and $ATTEMPTS -lt $MAX_ATTEMPTS) {
    Start-Sleep -Seconds 5
    $ATTEMPTS++
    
    $statusResponse = Invoke-RestMethod -Uri "$API_URL/api/scan/$SCAN_ID" `
        -Headers @{ "X-API-Key" = $API_KEY }
    
    $STATUS = $statusResponse.status
    Write-Host "  Attempt $ATTEMPTS : Status = $STATUS" -ForegroundColor Gray
    
    if ($STATUS -eq "completed") {
        Write-Host "✅ Scan completed!" -ForegroundColor Green
        break
    } elseif ($STATUS -eq "failed") {
        Write-Host "❌ Scan failed!" -ForegroundColor Red
        $statusResponse | ConvertTo-Json
        exit 1
    }
}

if ($STATUS -ne "completed") {
    Write-Host "❌ Scan did not complete within timeout" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 3: Verify artifacts
Write-Host "Step 3: Verifying artifacts..." -ForegroundColor Yellow
$pagesDir = "output\$SCAN_ID\pages"
if (Test-Path $pagesDir) {
    $pageDirs = Get-ChildItem -Path $pagesDir -Directory
    $PAGE_COUNT = $pageDirs.Count
    Write-Host "✅ Pages directory exists with $PAGE_COUNT pages" -ForegroundColor Green
    
    # Check first page artifacts
    $page1Dir = Join-Path $pagesDir "1"
    if (Test-Path (Join-Path $page1Dir "page.json")) {
        Write-Host "✅ page.json exists" -ForegroundColor Green
    }
    if (Test-Path (Join-Path $page1Dir "page.html")) {
        Write-Host "✅ page.html exists" -ForegroundColor Green
    }
    if (Test-Path (Join-Path $page1Dir "screenshot.png")) {
        Write-Host "✅ screenshot.png exists" -ForegroundColor Green
    }
    if (Test-Path (Join-Path $page1Dir "a11y.json")) {
        Write-Host "✅ a11y.json exists" -ForegroundColor Green
    }
} else {
    Write-Host "❌ Pages directory not found" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Verify report.json
Write-Host "Step 4: Verifying report.json..." -ForegroundColor Yellow
$reportPath = "output\$SCAN_ID\report.json"
if (Test-Path $reportPath) {
    Write-Host "✅ report.json exists" -ForegroundColor Green
    
    $report = Get-Content $reportPath | ConvertFrom-Json
    $TOTAL_PAGES = $report.summary.totalPages
    $TOTAL_RULES = $report.summary.totalRules
    Write-Host "  Total Pages: $TOTAL_PAGES" -ForegroundColor Gray
    Write-Host "  Total Rules: $TOTAL_RULES" -ForegroundColor Gray
    
    if ($TOTAL_PAGES -gt 0 -and $TOTAL_RULES -gt 0) {
        Write-Host "✅ Report structure valid" -ForegroundColor Green
    } else {
        Write-Host "❌ Report structure invalid" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ report.json not found" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 5: Test widget guidance endpoint
Write-Host "Step 5: Testing widget guidance endpoint..." -ForegroundColor Yellow
$guidanceUrl = "$API_URL/api/widget/guidance?url=$([System.Web.HttpUtility]::UrlEncode($TEST_URL))&scanId=$SCAN_ID"
try {
    $guidanceResponse = Invoke-RestMethod -Uri $guidanceUrl
    $LANDMARKS_COUNT = $guidanceResponse.landmarks.Count
    $FORMS_COUNT = $guidanceResponse.formSteps.Count
    $ACTIONS_COUNT = $guidanceResponse.keyActions.Count
    Write-Host "✅ Guidance endpoint works" -ForegroundColor Green
    Write-Host "  Landmarks: $LANDMARKS_COUNT" -ForegroundColor Gray
    Write-Host "  Forms: $FORMS_COUNT" -ForegroundColor Gray
    Write-Host "  Key Actions: $ACTIONS_COUNT" -ForegroundColor Gray
} catch {
    Write-Host "❌ Guidance endpoint failed" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}
Write-Host ""

# Step 6: Test widget issues endpoint
Write-Host "Step 6: Testing widget issues endpoint..." -ForegroundColor Yellow
$issuesUrl = "$API_URL/api/widget/issues?url=$([System.Web.HttpUtility]::UrlEncode($TEST_URL))&scanId=$SCAN_ID"
try {
    $issuesResponse = Invoke-RestMethod -Uri $issuesUrl
    $ISSUES_COUNT = $issuesResponse.issues.Count
    Write-Host "✅ Issues endpoint works" -ForegroundColor Green
    Write-Host "  Issues found: $ISSUES_COUNT" -ForegroundColor Gray
    
    if ($ISSUES_COUNT -gt 0) {
        Write-Host "  First issue:" -ForegroundColor Gray
        $firstIssue = $issuesResponse.issues[0]
        Write-Host "    Severity: $($firstIssue.severity)" -ForegroundColor Gray
        Write-Host "    Title: $($firstIssue.title)" -ForegroundColor Gray
        Write-Host "    Impact: $($firstIssue.userImpact)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Issues endpoint failed" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}
Write-Host ""

# Step 7: Verify Cache-Control headers
Write-Host "Step 7: Verifying Cache-Control headers..." -ForegroundColor Yellow
$artifactUrl = "$API_URL/api/scan/$SCAN_ID/artifact/pages/1/screenshot.png"
try {
    $headers = Invoke-WebRequest -Uri $artifactUrl `
        -Headers @{ "X-API-Key" = $API_KEY } `
        -Method Head
    
    if ($headers.Headers['Cache-Control'] -like "*no-store*") {
        Write-Host "✅ Cache-Control: no-store header present" -ForegroundColor Green
    } else {
        Write-Host "❌ Cache-Control header missing or incorrect" -ForegroundColor Red
        Write-Host "Headers: $($headers.Headers | ConvertTo-Json)"
        exit 1
    }
} catch {
    Write-Host "❌ Failed to verify headers" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}
Write-Host ""

# Step 8: Test widget config endpoint
Write-Host "Step 8: Testing widget config endpoint..." -ForegroundColor Yellow
$configUrl = "$API_URL/api/widget/config?scanId=$SCAN_ID&lang=en"
try {
    $configResponse = Invoke-RestMethod -Uri $configUrl
    Write-Host "✅ Config endpoint works" -ForegroundColor Green
    Write-Host "  Scan ID: $($configResponse.scanId)" -ForegroundColor Gray
    Write-Host "  Language: $($configResponse.language)" -ForegroundColor Gray
    Write-Host "  Feature Flags: $($configResponse.featureFlags | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Config endpoint failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "=== MVP Proof Run Complete ===" -ForegroundColor Cyan
Write-Host "✅ All tests passed!" -ForegroundColor Green
Write-Host "Scan ID: $SCAN_ID" -ForegroundColor Gray
Write-Host "Report: output\$SCAN_ID\report.json" -ForegroundColor Gray

