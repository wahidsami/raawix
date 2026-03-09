# PowerShell script to scan test pages
# Make sure scanner API is running: pnpm scanner:dev

$API_URL = "http://localhost:3001"
$API_KEY = "dev-api-key-change-in-production"

Write-Host "=== Scanning Test Pages ===" -ForegroundColor Cyan
Write-Host ""

# Check if scanner is running
try {
    $response = Invoke-WebRequest -Uri "$API_URL" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Scanner API is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Scanner API is not running!" -ForegroundColor Red
    Write-Host "   Start it with: pnpm scanner:dev" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Scan good page
Write-Host "Scanning /good page..." -ForegroundColor Yellow
$goodBody = @{
    seedUrl = "http://localhost:4173/good"
    maxPages = 1
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

    Write-Host "✅ Good page scan initiated" -ForegroundColor Green
    Write-Host "   Scan ID: $($goodResponse.scanId)" -ForegroundColor Gray
    Write-Host "   Status: $($goodResponse.status)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to scan good page: $_" -ForegroundColor Red
}

Write-Host ""

# Scan messy page
Write-Host "Scanning /messy page..." -ForegroundColor Yellow
$messyBody = @{
    seedUrl = "http://localhost:4173/messy"
    maxPages = 1
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

    Write-Host "✅ Messy page scan initiated" -ForegroundColor Green
    Write-Host "   Scan ID: $($messyResponse.scanId)" -ForegroundColor Gray
    Write-Host "   Status: $($messyResponse.status)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to scan messy page: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Scan Initiated ===" -ForegroundColor Cyan
Write-Host "Check scan status with:" -ForegroundColor Yellow
Write-Host "  Invoke-RestMethod -Uri `"$API_URL/api/scan/{scanId}`" -Headers @{`"X-API-Key`" = `"$API_KEY`"}" -ForegroundColor Gray

