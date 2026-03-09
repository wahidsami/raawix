# Raawi X - Stop All Services Script

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Raawi X - Stopping All Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to stop process on a port
function Stop-Port {
    param([int]$Port, [string]$ServiceName)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($connection) {
        $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "Stopping $ServiceName on port $Port (PID: $($process.Id))..." -ForegroundColor Yellow
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
            Write-Host "  ✅ $ServiceName stopped" -ForegroundColor Green
            return $true
        }
    }
    return $false
}

# Note: PostgreSQL is not stopped (it's a system service)
Write-Host "[1/2] Note: PostgreSQL will continue running" -ForegroundColor Gray
Write-Host "  (PostgreSQL is a system service, not managed by this script)" -ForegroundColor DarkGray

# Stop Scanner API
Write-Host ""
Write-Host "[2/2] Stopping Scanner API..." -ForegroundColor Cyan
if (Stop-Port -Port 3001 -ServiceName "Scanner API") {
    Start-Sleep -Seconds 1
} else {
    Write-Host "  ℹ️  Scanner API not running" -ForegroundColor Gray
}

# Stop Dashboard
Write-Host ""
Write-Host "[2/4] Stopping Dashboard..." -ForegroundColor Cyan
if (Stop-Port -Port 5173 -ServiceName "Dashboard") {
    Start-Sleep -Seconds 1
} else {
    Write-Host "  ℹ️  Dashboard not running" -ForegroundColor Gray
}

# Stop Portal Good
Write-Host ""
Write-Host "[3/4] Stopping Portal Good..." -ForegroundColor Cyan
if (Stop-Port -Port 4173 -ServiceName "Portal Good") {
    Start-Sleep -Seconds 1
} else {
    Write-Host "  ℹ️  Portal Good not running" -ForegroundColor Gray
}

# Stop Gov Sim
Write-Host ""
Write-Host "[4/4] Stopping Gov Sim..." -ForegroundColor Cyan
if (Stop-Port -Port 4174 -ServiceName "Gov Sim") {
    Start-Sleep -Seconds 1
} else {
    Write-Host "  ℹ️  Gov Sim not running" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  All Services Stopped!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

