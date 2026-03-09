# Raawi X - Complete System Startup Script
# This script starts all services: Scanner API and Dashboard
# Note: Requires local PostgreSQL running on localhost:5432

param(
    [switch]$SkipScanner,
    [switch]$SkipDashboard,
    [switch]$SkipTestSites
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Raawi X - System Startup" -ForegroundColor Cyan
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
Write-Host "[1/4] Checking PostgreSQL..." -ForegroundColor Cyan
try {
    # Try to connect to PostgreSQL on default port
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

# Step 2: Verify Database Configuration
Write-Host ""
Write-Host "[2/4] Verifying Database Configuration..." -ForegroundColor Cyan
$envFile = "apps/scanner/.env"
if (Test-Path $envFile) {
    $dbUrl = Get-Content $envFile | Select-String "DATABASE_URL"
    if ($dbUrl) {
        Write-Host "  ✅ DATABASE_URL found in .env" -ForegroundColor Green
        if ($dbUrl -match "raawi_x") {
            Write-Host "  ✅ Database name: raawi_x" -ForegroundColor Green
        }
    } else {
        Write-Host "  ⚠️  DATABASE_URL not found in .env" -ForegroundColor Yellow
        Write-Host "  Make sure apps/scanner/.env has DATABASE_URL set" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠️  .env file not found at apps/scanner/.env" -ForegroundColor Yellow
    Write-Host "  Copy apps/scanner/.env.example to apps/scanner/.env and configure" -ForegroundColor Yellow
}

# Step 3: Build Widget (if test sites will be started)
if (-not $SkipTestSites) {
    Write-Host ""
    Write-Host "[3/7] Building Widget..." -ForegroundColor Cyan
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
}

# Step 4: Start Portal Good (if not skipped)
if (-not $SkipTestSites) {
    Write-Host ""
    Write-Host "[4/7] Starting Portal Good..." -ForegroundColor Cyan
    
    if (Test-Port -Port 4173) {
        Write-Host "  Port 4173 is in use, stopping existing process..." -ForegroundColor Yellow
        Stop-Port -Port 4173
    }
    
    Write-Host "  Starting Portal Good on port 4173..." -ForegroundColor Yellow
    Write-Host "  (Portal Good will run in background)" -ForegroundColor Gray
    Write-Host ""
    
    # Start portal-good in background
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; pnpm portal-good:dev"
    Start-Sleep -Seconds 2
    Write-Host "  ✅ Portal Good started" -ForegroundColor Green
    Write-Host "     - URL: http://localhost:4173" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "[4/7] Skipping Portal Good (--SkipTestSites)" -ForegroundColor Gray
}

# Step 5: Start Gov Sim (if not skipped)
if (-not $SkipTestSites) {
    Write-Host ""
    Write-Host "[5/7] Starting Gov Sim..." -ForegroundColor Cyan
    
    if (Test-Port -Port 4174) {
        Write-Host "  Port 4174 is in use, stopping existing process..." -ForegroundColor Yellow
        Stop-Port -Port 4174
    }
    
    Write-Host "  Starting Gov Sim on port 4174..." -ForegroundColor Yellow
    Write-Host "  (Gov Sim will run in background)" -ForegroundColor Gray
    Write-Host ""
    
    # Start gov-sim in background
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; pnpm gov-sim:dev"
    Start-Sleep -Seconds 2
    Write-Host "  ✅ Gov Sim started" -ForegroundColor Green
    Write-Host "     - URL: http://localhost:4174" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "[5/7] Skipping Gov Sim (--SkipTestSites)" -ForegroundColor Gray
}

# Step 6: Start Scanner API
if (-not $SkipScanner) {
    Write-Host ""
    Write-Host "[6/7] Starting Scanner API..." -ForegroundColor Cyan
    
    if (Test-Port -Port 3001) {
        Write-Host "  Port 3001 is in use, stopping existing process..." -ForegroundColor Yellow
        Stop-Port -Port 3001
    }
    
    Write-Host "  Starting scanner on port 3001..." -ForegroundColor Yellow
    Write-Host "  (Scanner will run in this window)" -ForegroundColor Gray
    Write-Host ""
    
    # Start scanner in current window (user can see logs)
    pnpm scanner:dev
} else {
    Write-Host ""
    Write-Host "[6/7] Skipping Scanner API (--SkipScanner)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "[7/7] Starting Dashboard..." -ForegroundColor Cyan
    
    if (Test-Port -Port 5173) {
        Write-Host "  Port 5173 is in use, stopping existing process..." -ForegroundColor Yellow
        Stop-Port -Port 5173
    }
    
    Write-Host "  Starting dashboard on port 5173..." -ForegroundColor Yellow
    Write-Host "  (Dashboard will run in this window)" -ForegroundColor Gray
    Write-Host ""
    
    pnpm dev
}

# If scanner was skipped, start dashboard separately
if ($SkipScanner -and -not $SkipDashboard) {
    Write-Host ""
    Write-Host "[7/7] Starting Dashboard..." -ForegroundColor Cyan
    
    if (Test-Port -Port 5173) {
        Write-Host "  Port 5173 is in use, stopping existing process..." -ForegroundColor Yellow
        Stop-Port -Port 5173
    }
    
    Write-Host "  Starting dashboard on port 5173..." -ForegroundColor Yellow
    Write-Host "  (Dashboard will run in this window)" -ForegroundColor Gray
    Write-Host ""
    
    pnpm dev
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  System Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "All services started successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Services:" -ForegroundColor Yellow
Write-Host "  - Scanner API: http://localhost:3001" -ForegroundColor Gray
if (-not $SkipTestSites) {
    Write-Host "  - Portal Good: http://localhost:4173" -ForegroundColor Gray
    Write-Host "  - Gov Sim: http://localhost:4174" -ForegroundColor Gray
}
Write-Host "  - Dashboard: http://localhost:5173" -ForegroundColor Gray
Write-Host ""
Write-Host "Database:" -ForegroundColor Yellow
Write-Host "  - PostgreSQL: localhost:5432" -ForegroundColor Gray
Write-Host "  - Database: raawi_x" -ForegroundColor Gray
Write-Host "  - View in pgAdmin: Connect to server → raawi_x database" -ForegroundColor Gray
Write-Host ""
Write-Host "Login:" -ForegroundColor Yellow
Write-Host "  Email: admin@local" -ForegroundColor Gray
Write-Host "  Password: admin123" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Cyan
Write-Host ""

