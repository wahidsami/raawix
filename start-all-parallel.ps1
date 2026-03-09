# Raawi X - Parallel System Startup Script
# Starts all services in separate PowerShell windows

param(
    [switch]$SkipInfra,
    [switch]$SkipScanner,
    [switch]$SkipDashboard,
    [switch]$SkipTestSites
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Raawi X - Parallel System Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if a port is in use
function Test-Port {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return $null -ne $connection
}

# Function to stop process on a port
function Stop-Port {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($connection) {
        $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "Stopping process on port $Port (PID: $($process.Id))..." -ForegroundColor Yellow
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 1
        }
    }
}

# Step 1: Check PostgreSQL Connection
Write-Host "[1/3] Checking PostgreSQL..." -ForegroundColor Cyan
try {
    $pgTest = Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    if ($pgTest.TcpTestSucceeded) {
        Write-Host "  ✅ PostgreSQL is running on port 5432" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Could not connect to PostgreSQL on port 5432" -ForegroundColor Yellow
        Write-Host "  Make sure PostgreSQL is running and accessible" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠️  Could not verify PostgreSQL connection" -ForegroundColor Yellow
    Write-Host "  Make sure PostgreSQL is running on localhost:5432" -ForegroundColor Yellow
}

# Verify Database Configuration
Write-Host ""
Write-Host "  Verifying database configuration..." -ForegroundColor Cyan
$envFile = "apps/scanner/.env"
if (Test-Path $envFile) {
    $dbUrl = Get-Content $envFile | Select-String "DATABASE_URL"
    if ($dbUrl -and $dbUrl -match "raawi_x") {
        Write-Host "  ✅ DATABASE_URL configured for raawi_x" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  DATABASE_URL may not be configured correctly" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠️  .env file not found" -ForegroundColor Yellow
}

# Step 2: Build Widget (if test sites will be started)
if (-not $SkipTestSites) {
    Write-Host ""
    Write-Host "[2/6] Building Widget..." -ForegroundColor Cyan
    Write-Host "  Building widget from TypeScript source..." -ForegroundColor Yellow
    
    try {
        pnpm --filter widget build
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Widget built successfully" -ForegroundColor Green
            
            # Copy built widget and icon to both test sites
            $widgetSource = "apps/widget/dist/widget.iife.js"
            $iconSource = "apps/widget/dist/RaawixIcon.png"
            $portalGoodDest = "test-sites/portal-good/public/widget.iife.js"
            $govSimDest = "test-sites/gov-sim/public/widget.iife.js"
            $portalGoodIconDest = "test-sites/portal-good/public/RaawixIcon.png"
            $govSimIconDest = "test-sites/gov-sim/public/RaawixIcon.png"
            
            if (Test-Path $widgetSource) {
                if (-not (Test-Path "test-sites/portal-good/public")) {
                    New-Item -ItemType Directory -Path "test-sites/portal-good/public" -Force | Out-Null
                }
                if (-not (Test-Path "test-sites/gov-sim/public")) {
                    New-Item -ItemType Directory -Path "test-sites/gov-sim/public" -Force | Out-Null
                }
                Copy-Item -Path $widgetSource -Destination $portalGoodDest -Force
                Copy-Item -Path $widgetSource -Destination $govSimDest -Force
                Write-Host "  ✅ Widget copied to portal-good and gov-sim" -ForegroundColor Green
                
                # Copy icon if it exists
                if (Test-Path $iconSource) {
                    Copy-Item -Path $iconSource -Destination $portalGoodIconDest -Force
                    Copy-Item -Path $iconSource -Destination $govSimIconDest -Force
                    Write-Host "  ✅ Widget icon copied to portal-good and gov-sim" -ForegroundColor Green
                } elseif (Test-Path "apps/widget/public/RaawixIcon.png") {
                    Copy-Item -Path "apps/widget/public/RaawixIcon.png" -Destination $portalGoodIconDest -Force
                    Copy-Item -Path "apps/widget/public/RaawixIcon.png" -Destination $govSimIconDest -Force
                    Write-Host "  ✅ Widget icon copied from public folder" -ForegroundColor Green
                } else {
                    Write-Host "  ⚠️  Widget icon not found - widget will show 'A' fallback" -ForegroundColor Yellow
                }
            } else {
                Write-Host "  ⚠️  Widget build file not found at $widgetSource" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  ⚠️  Widget build failed, but continuing..." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ⚠️  Error building widget: $_" -ForegroundColor Yellow
        Write-Host "  Continuing anyway (test sites may use old widget)" -ForegroundColor Yellow
    }
    Write-Host ""
} else {
    Write-Host "[2/6] Skipping Widget Build (--SkipTestSites)" -ForegroundColor Gray
}

# Step 3: Start Scanner API in new window
if (-not $SkipScanner) {
    Write-Host ""
    Write-Host "[3/6] Starting Scanner API in new window..." -ForegroundColor Cyan
    
    if (Test-Port -Port 3001) {
        Stop-Port -Port 3001
    }
    
    $scannerScript = @"
cd '$PWD'
Write-Host 'Scanner API starting on port 3001...' -ForegroundColor Cyan
pnpm scanner:dev
"@
    
    $scannerScript | Out-File -FilePath "$env:TEMP\start-scanner.ps1" -Encoding UTF8
    Start-Process powershell -ArgumentList "-NoExit", "-File", "$env:TEMP\start-scanner.ps1"
    Write-Host "  ✅ Scanner API window opened" -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "[3/5] Skipping Scanner API" -ForegroundColor Gray
}

# Step 4: Start Portal Good in new window
if (-not $SkipTestSites) {
    Write-Host ""
    Write-Host "[4/6] Starting Portal Good in new window..." -ForegroundColor Cyan
    
    if (Test-Port -Port 4173) {
        Stop-Port -Port 4173
    }
    
    $portalGoodScript = @"
cd '$PWD'
Write-Host 'Portal Good starting on port 4173...' -ForegroundColor Cyan
pnpm portal-good:dev
"@
    
    $portalGoodScript | Out-File -FilePath "$env:TEMP\start-portal-good.ps1" -Encoding UTF8
    Start-Process powershell -ArgumentList "-NoExit", "-File", "$env:TEMP\start-portal-good.ps1"
    Write-Host "  ✅ Portal Good window opened" -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "[4/6] Skipping Portal Good" -ForegroundColor Gray
}

# Step 5: Start Gov Sim in new window
if (-not $SkipTestSites) {
    Write-Host ""
    Write-Host "[5/6] Starting Gov Sim in new window..." -ForegroundColor Cyan
    
    if (Test-Port -Port 4174) {
        Stop-Port -Port 4174
    }
    
    $govSimScript = @"
cd '$PWD'
Write-Host 'Gov Sim starting on port 4174...' -ForegroundColor Cyan
pnpm gov-sim:dev
"@
    
    $govSimScript | Out-File -FilePath "$env:TEMP\start-gov-sim.ps1" -Encoding UTF8
    Start-Process powershell -ArgumentList "-NoExit", "-File", "$env:TEMP\start-gov-sim.ps1"
    Write-Host "  ✅ Gov Sim window opened" -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "[5/6] Skipping Gov Sim" -ForegroundColor Gray
}

# Step 6: Start Dashboard in new window
if (-not $SkipDashboard) {
    Write-Host ""
    Write-Host "[6/6] Starting Dashboard in new window..." -ForegroundColor Cyan
    
    if (Test-Port -Port 5173) {
        Stop-Port -Port 5173
    }
    
    $dashboardScript = @"
cd '$PWD'
Write-Host 'Dashboard starting on port 5173...' -ForegroundColor Cyan
pnpm dev
"@
    
    $dashboardScript | Out-File -FilePath "$env:TEMP\start-dashboard.ps1" -Encoding UTF8
    Start-Process powershell -ArgumentList "-NoExit", "-File", "$env:TEMP\start-dashboard.ps1"
    Write-Host "  ✅ Dashboard window opened" -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "[6/6] Skipping Dashboard" -ForegroundColor Gray
}

# Step 7: Summary
Write-Host ""
Write-Host "[7/7] System Status" -ForegroundColor Cyan
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  All Services Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Services running in separate windows:" -ForegroundColor Yellow
if (-not $SkipScanner) {
    Write-Host "  ✅ Scanner API: http://localhost:3001" -ForegroundColor Green
}
if (-not $SkipTestSites) {
    Write-Host "  ✅ Portal Good: http://localhost:4173" -ForegroundColor Green
    Write-Host "  ✅ Gov Sim: http://localhost:4174" -ForegroundColor Green
}
if (-not $SkipDashboard) {
    Write-Host "  ✅ Dashboard: http://localhost:5173" -ForegroundColor Green
}
Write-Host ""
Write-Host "Login Credentials:" -ForegroundColor Yellow
Write-Host "  Email: admin@local" -ForegroundColor Gray
Write-Host "  Password: admin123" -ForegroundColor Gray
Write-Host ""
Write-Host "To stop services:" -ForegroundColor Cyan
Write-Host "  - Close the PowerShell windows" -ForegroundColor Gray
Write-Host "  - Or run: pnpm infra:down" -ForegroundColor Gray
Write-Host ""

