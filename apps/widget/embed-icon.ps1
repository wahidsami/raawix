# Script to embed RaawixIcon.png as base64 data URL in widget.ts
# This replaces the empty string in getIconDataUrl() with the actual base64 data URL

param(
    [string]$IconPath = "RaawixIcon.png"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Embedding Icon in Widget ===" -ForegroundColor Cyan
Write-Host ""

# Try to find the icon file
$iconFile = $null
$searchPaths = @(
    $IconPath,
    ".\$IconPath",
    "..\$IconPath",
    "..\..\$IconPath",
    "apps\widget\$IconPath",
    "apps\widget\public\$IconPath"
)

foreach ($path in $searchPaths) {
    if (Test-Path $path) {
        $iconFile = Get-Item $path
        Write-Host "Found icon: $($iconFile.FullName)" -ForegroundColor Green
        break
    }
}

if (-not $iconFile) {
    Write-Host "❌ Icon file not found: $IconPath" -ForegroundColor Red
    Write-Host "Searched in:" -ForegroundColor Yellow
    foreach ($path in $searchPaths) {
        Write-Host "  - $path" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "Please place RaawixIcon.png in one of these locations:" -ForegroundColor Yellow
    Write-Host "  - Project root: .\RaawixIcon.png" -ForegroundColor Gray
    Write-Host "  - Widget directory: .\apps\widget\RaawixIcon.png" -ForegroundColor Gray
    Write-Host "  - Widget public: .\apps\widget\public\RaawixIcon.png" -ForegroundColor Gray
    exit 1
}

# Read icon file and convert to base64
Write-Host "Converting icon to base64..." -ForegroundColor Yellow
$iconBytes = [System.IO.File]::ReadAllBytes($iconFile.FullName)
$iconBase64 = [Convert]::ToBase64String($iconBytes)

# Determine image MIME type from extension
$extension = $iconFile.Extension.ToLower()
$mimeType = switch ($extension) {
    ".png" { "image/png" }
    ".jpg" { "image/jpeg" }
    ".jpeg" { "image/jpeg" }
    ".svg" { "image/svg+xml" }
    ".gif" { "image/gif" }
    default { "image/png" }
}

$dataUrl = "data:$mimeType;base64,$iconBase64"
Write-Host "✅ Icon converted to base64 (length: $($dataUrl.Length) chars)" -ForegroundColor Green
Write-Host ""

# Read widget.ts
$widgetPath = "apps\widget\src\widget.ts"
if (-not (Test-Path $widgetPath)) {
    Write-Host "❌ Widget file not found: $widgetPath" -ForegroundColor Red
    exit 1
}

Write-Host "Updating widget.ts..." -ForegroundColor Yellow
$widgetContent = Get-Content $widgetPath -Raw

# Find the getIconDataUrl method and replace the return statement
# Pattern: find return ''; within the getIconDataUrl method
$methodPattern = '(private getIconDataUrl\(\): string \{[^}]*?)(return '';)'
$replacement = "`$1return '$dataUrl';"

if ($widgetContent -match $methodPattern) {
    $widgetContent = $widgetContent -replace $methodPattern, $replacement
    Write-Host "✅ Updated widget.ts with embedded icon" -ForegroundColor Green
} else {
    Write-Host "⚠️  Could not find return statement to replace" -ForegroundColor Yellow
    Write-Host "   Please manually update getIconDataUrl() to return: '$dataUrl'" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Find this line in apps\widget\src\widget.ts:" -ForegroundColor Gray
    Write-Host "     return '';" -ForegroundColor Gray
    Write-Host "   Replace with:" -ForegroundColor Gray
    Write-Host "     return '$dataUrl';" -ForegroundColor Gray
}

# Write updated content
Set-Content -Path $widgetPath -Value $widgetContent -NoNewline
Write-Host ""
Write-Host "✅ Icon embedded successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Rebuild widget: pnpm --filter widget build" -ForegroundColor Yellow
Write-Host "  2. Copy to test-sites: Copy-Item apps\widget\dist\widget.iife.js -Destination apps\test-sites\public\widget.iife.js -Force" -ForegroundColor Yellow

