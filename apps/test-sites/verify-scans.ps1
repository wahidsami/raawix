# Verification Script for Test Sites Scans
# Validates scan results for /good and /messy pages

param(
    [string]$GoodScanId = "",
    [string]$MessyScanId = "",
    [string]$API_URL = "http://localhost:3001",
    [string]$API_KEY = "dev-api-key-change-in-production"
)

$ErrorActionPreference = "Continue"

Write-Host "=== Test Sites Scan Verification ===" -ForegroundColor Cyan
Write-Host ""

# Function to wait for scan completion
function Wait-ForScanCompletion {
    param(
        [string]$ScanId,
        [int]$MaxWaitSeconds = 300
    )
    
    $startTime = Get-Date
    $status = "running"
    
    while ($status -eq "running" -or $status -eq "pending") {
        $elapsed = ((Get-Date) - $startTime).TotalSeconds
        if ($elapsed -gt $MaxWaitSeconds) {
            Write-Host "  ⚠️  Scan timeout after $MaxWaitSeconds seconds" -ForegroundColor Yellow
            return $false
        }
        
        try {
            $response = Invoke-RestMethod -Uri "$API_URL/api/scan/$ScanId" `
                -Headers @{ "X-API-Key" = $API_KEY } `
                -ErrorAction Stop
            $status = $response.status
            
            if ($status -eq "completed") {
                return $true
            } elseif ($status -eq "failed") {
                Write-Host "  ❌ Scan failed: $($response.error)" -ForegroundColor Red
                return $false
            }
            
            Start-Sleep -Seconds 2
        } catch {
            Write-Host "  ⚠️  Error checking status: $_" -ForegroundColor Yellow
            Start-Sleep -Seconds 2
        }
    }
    
    return $false
}

# Function to analyze report
function Analyze-Report {
    param(
        [string]$ScanId,
        [string]$PageType
    )
    
    $reportPath = "apps\scanner\output\$ScanId\report.json"
    if (-not (Test-Path $reportPath)) {
        Write-Host "  ❌ Report not found: $reportPath" -ForegroundColor Red
        return $null
    }
    
    $report = Get-Content $reportPath -Raw | ConvertFrom-Json
    
    $results = @{
        TotalPages = $report.summary.totalPages
        TotalRules = $report.summary.totalRules
        PassCount = $report.summary.byStatus.pass
        FailCount = $report.summary.byStatus.fail
        NeedsReviewCount = $report.summary.byStatus.needs_review
        Wcag1_1_1_Failures = 0
        VisionFindings = 0
        ImageAltIssues = 0
    }
    
    # Analyze each page's rule results
    foreach ($pageResult in $report.results) {
        foreach ($ruleResult in $pageResult.ruleResults) {
            # Check for WCAG 1.1.1 (missing alt text)
            if ($ruleResult.wcagId -eq "1.1.1" -and $ruleResult.status -eq "fail") {
                $results.Wcag1_1_1_Failures++
                $results.ImageAltIssues++
            }
            
            # Check for vision findings
            if ($ruleResult.ruleId -like "vision-*") {
                $results.VisionFindings++
            }
        }
    }
    
    return $results
}

# Verify Good Page
if ($GoodScanId) {
    Write-Host "=== Verifying Good Page Scan ===" -ForegroundColor Yellow
    Write-Host "Scan ID: $GoodScanId" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "Waiting for scan to complete..." -ForegroundColor Gray
    if (Wait-ForScanCompletion -ScanId $GoodScanId) {
        Write-Host "✅ Scan completed" -ForegroundColor Green
        Write-Host ""
        
        $goodResults = Analyze-Report -ScanId $GoodScanId -PageType "good"
        if ($goodResults) {
            Write-Host "Results:" -ForegroundColor Cyan
            Write-Host "  Total Pages: $($goodResults.TotalPages)" -ForegroundColor Gray
            Write-Host "  Total Rules: $($goodResults.TotalRules)" -ForegroundColor Gray
            Write-Host "  Pass: $($goodResults.PassCount)" -ForegroundColor Green
            Write-Host "  Fail: $($goodResults.FailCount)" -ForegroundColor $(if ($goodResults.FailCount -eq 0) { "Green" } else { "Red" })
            Write-Host "  Needs Review: $($goodResults.NeedsReviewCount)" -ForegroundColor Gray
            Write-Host "  WCAG 1.1.1 Failures: $($goodResults.Wcag1_1_1_Failures)" -ForegroundColor $(if ($goodResults.Wcag1_1_1_Failures -eq 0) { "Green" } else { "Red" })
            Write-Host "  Vision Findings: $($goodResults.VisionFindings)" -ForegroundColor Gray
            Write-Host ""
            
            # Validation
            $allPassed = $true
            if ($goodResults.Wcag1_1_1_Failures -gt 0) {
                Write-Host "  ❌ FAIL: Good page should have 0 WCAG 1.1.1 failures (missing alt text)" -ForegroundColor Red
                $allPassed = $false
            } else {
                Write-Host "  ✅ PASS: Good page has no missing alt text issues" -ForegroundColor Green
            }
            
            if (-not $allPassed) {
                Write-Host ""
                Write-Host "❌ Good page verification FAILED" -ForegroundColor Red
            } else {
                Write-Host ""
                Write-Host "✅ Good page verification PASSED" -ForegroundColor Green
            }
        }
    } else {
        Write-Host "❌ Scan did not complete" -ForegroundColor Red
    }
    Write-Host ""
}

# Verify Messy Page
if ($MessyScanId) {
    Write-Host "=== Verifying Messy Page Scan ===" -ForegroundColor Yellow
    Write-Host "Scan ID: $MessyScanId" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "Waiting for scan to complete..." -ForegroundColor Gray
    if (Wait-ForScanCompletion -ScanId $MessyScanId) {
        Write-Host "✅ Scan completed" -ForegroundColor Green
        Write-Host ""
        
        $messyResults = Analyze-Report -ScanId $MessyScanId -PageType "messy"
        if ($messyResults) {
            Write-Host "Results:" -ForegroundColor Cyan
            Write-Host "  Total Pages: $($messyResults.TotalPages)" -ForegroundColor Gray
            Write-Host "  Total Rules: $($messyResults.TotalRules)" -ForegroundColor Gray
            Write-Host "  Pass: $($messyResults.PassCount)" -ForegroundColor Gray
            Write-Host "  Fail: $($messyResults.FailCount)" -ForegroundColor $(if ($messyResults.FailCount -gt 0) { "Yellow" } else { "Gray" })
            Write-Host "  Needs Review: $($messyResults.NeedsReviewCount)" -ForegroundColor Gray
            Write-Host "  WCAG 1.1.1 Failures: $($messyResults.Wcag1_1_1_Failures)" -ForegroundColor $(if ($messyResults.Wcag1_1_1_Failures -gt 0) { "Yellow" } else { "Red" })
            Write-Host "  Vision Findings: $($messyResults.VisionFindings)" -ForegroundColor $(if ($messyResults.VisionFindings -gt 0) { "Yellow" } else { "Red" })
            Write-Host ""
            
            # Validation
            $allPassed = $true
            if ($messyResults.Wcag1_1_1_Failures -eq 0) {
                Write-Host "  ❌ FAIL: Messy page should have at least 1 WCAG 1.1.1 failure (missing alt text)" -ForegroundColor Red
                $allPassed = $false
            } else {
                Write-Host "  ✅ PASS: Messy page has $($messyResults.Wcag1_1_1_Failures) missing alt text issue(s)" -ForegroundColor Green
            }
            
            if ($messyResults.VisionFindings -eq 0) {
                Write-Host "  ❌ FAIL: Messy page should have at least 1 vision finding (icon-only clickable)" -ForegroundColor Red
                $allPassed = $false
            } else {
                Write-Host "  ✅ PASS: Messy page has $($messyResults.VisionFindings) vision finding(s)" -ForegroundColor Green
            }
            
            if (-not $allPassed) {
                Write-Host ""
                Write-Host "❌ Messy page verification FAILED" -ForegroundColor Red
            } else {
                Write-Host ""
                Write-Host "✅ Messy page verification PASSED" -ForegroundColor Green
            }
        }
    } else {
        Write-Host "❌ Scan did not complete" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "=== Verification Complete ===" -ForegroundColor Cyan

