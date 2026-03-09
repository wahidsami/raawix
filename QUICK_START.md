# Raawi X - Quick Start Guide

## 🚀 Start Everything

### Option 1: Sequential (One Window)
Runs all services in the current terminal window:
```bash
pnpm start
```
or
```powershell
.\start-all.ps1
```

**What it does:**
1. ✅ Checks Docker
2. ✅ Starts Docker containers (Postgres + Redis)
3. ✅ Verifies database
4. ✅ Starts Scanner API (port 3001)
5. ✅ Starts Dashboard (port 5173) - after scanner

**Note:** Services run sequentially. Press `Ctrl+C` to stop all.

---

### Option 2: Parallel (Separate Windows) ⭐ Recommended
Starts each service in its own PowerShell window:
```bash
pnpm start:parallel
```
or
```powershell
.\start-all-parallel.ps1
```

**What it does:**
1. ✅ Starts Docker containers
2. ✅ Opens Scanner API in new window
3. ✅ Opens Dashboard in new window

**Benefits:**
- See logs from each service separately
- Easy to restart individual services
- Better for development

---

## 🛑 Stop Everything

```bash
pnpm stop
```
or
```powershell
.\stop-all.ps1
```

**What it does:**
1. ✅ Stops Scanner API (port 3001)
2. ✅ Stops Dashboard (port 5173)
3. ✅ Stops Docker containers

---

## 📋 Manual Start (Step by Step)

If you prefer to start services manually:

### 1. Start Docker Infrastructure
```bash
pnpm infra:up
```

### 2. Verify Database (if first time)
```bash
# Check if tables exist
docker exec raawix_postgres psql -U postgres -d raawix -c "\dt"

# If no tables, run migrations
pnpm --filter scanner db:migrate
pnpm --filter scanner db:seed
```

### 3. Start Scanner API
```bash
pnpm scanner:dev
```

### 4. Start Dashboard (in new terminal)
```bash
pnpm dev
```

---

## 🔧 Advanced Options

### Start with Options
```powershell
# Skip Docker (if already running)
.\start-all.ps1 -SkipInfra

# Skip Scanner (only start dashboard)
.\start-all.ps1 -SkipScanner

# Skip Dashboard (only start scanner)
.\start-all.ps1 -SkipDashboard
```

### Check Service Status
```bash
# Check Docker containers
docker ps --filter "name=raawix"

# Check ports
Get-NetTCPConnection -LocalPort 3001,5173 -ErrorAction SilentlyContinue
```

---

## 🌐 Access Services

After starting:

- **Scanner API:** http://localhost:3001
- **Dashboard:** http://localhost:5173
- **Health Check:** http://localhost:3001/health

### Login Credentials
- **Email:** `admin@local`
- **Password:** `admin123`

---

## 🐛 Troubleshooting

### Port Already in Use
The scripts automatically stop processes on ports 3001 and 5173. If issues persist:
```powershell
# Find and stop process on port 3001
Get-NetTCPConnection -LocalPort 3001 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Find and stop process on port 5173
Get-NetTCPConnection -LocalPort 5173 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### Docker Not Running
```bash
# Check Docker status
docker ps

# Start Docker Desktop, then:
pnpm infra:up
```

### Database Not Ready
```bash
# Check if containers are healthy
docker ps --filter "name=raawix"

# Check database connection
docker exec raawix_postgres psql -U postgres -d raawix -c "SELECT version();"

# If no tables, run migrations
pnpm --filter scanner db:migrate
pnpm --filter scanner db:seed
```

---

## 📝 Scripts Overview

| Script | Description |
|--------|-------------|
| `start-all.ps1` | Start all services sequentially (one window) |
| `start-all-parallel.ps1` | Start all services in separate windows |
| `stop-all.ps1` | Stop all services and Docker containers |

---

## 🎯 Quick Commands Reference

```bash
# Start everything (parallel - recommended)
pnpm start:parallel

# Start everything (sequential)
pnpm start

# Stop everything
pnpm stop

# Start only Docker
pnpm infra:up

# Stop only Docker
pnpm infra:down

# View Docker logs
pnpm infra:logs

# Reset Docker (removes volumes)
pnpm infra:reset
```

---

## ✅ Verification Checklist

After starting, verify:

- [ ] Docker containers running: `docker ps --filter "name=raawix"`
- [ ] Scanner API accessible: http://localhost:3001/health
- [ ] Dashboard accessible: http://localhost:5173
- [ ] Can login to dashboard with `admin@local` / `admin123`
- [ ] Database shows "enabled" in scanner logs

---

**Happy scanning! 🚀**

