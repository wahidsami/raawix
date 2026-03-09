# Supabase Local Setup for Raawi X

## Overview

Supabase uses PostgreSQL, so it works perfectly with Prisma! This guide will help you connect Raawi X to your local Supabase instance.

## Prerequisites

- Supabase CLI installed ✅ (You have it!)
- Docker Desktop running (required for Supabase local)

## Step-by-Step Setup

### Step 1: Start Supabase

If Supabase is not running:

```powershell
supabase start
```

This will:
- Start Docker containers
- Initialize the database
- Show connection details

### Step 2: Get Connection Details

Run:

```powershell
supabase status
```

This will show output like:
```
API URL: http://localhost:54321
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
```

**Important**: 
- Database port is **54322** (not 5432!)
- Default username: `postgres`
- Default password: `postgres` (or check your Supabase config)
- Default database: `postgres`

### Step 3: Update .env File

Edit `apps/scanner/.env` and update `DATABASE_URL`:

**Option A: Use default 'postgres' database (simplest)**
```env
DATABASE_URL='postgresql://postgres:postgres@localhost:54322/postgres'
```

**Option B: Create 'raawix' database (recommended)**
1. Open Supabase Studio: http://localhost:54323
2. Go to SQL Editor
3. Run: `CREATE DATABASE raawix;`
4. Update .env:
```env
DATABASE_URL='postgresql://postgres:postgres@localhost:54322/raawix'
```

**Note**: Replace `postgres:postgres` with your actual Supabase password if different.

### Step 4: Run Migration

```powershell
pnpm --filter scanner db:migrate
```

This will:
- Create all tables (Scan, Page, Finding, VisionFinding, Site, PageVersion, AssistiveMap)
- Set up indexes and relationships

### Step 5: Verify Connection

You can verify the connection by:

1. **Using Supabase Studio**:
   - Open: http://localhost:54323
   - Go to Table Editor
   - You should see the new tables

2. **Using Prisma Studio** (if you want):
   ```powershell
   pnpm --filter scanner db:studio
   ```
   Opens at: http://localhost:5555

## Finding Your Supabase Password

If the default password doesn't work:

1. **Check Supabase config**:
   ```powershell
   supabase status
   ```
   Look for "DB URL" in the output

2. **Or check Supabase Studio**:
   - Open: http://localhost:54323
   - Settings → Database
   - Look for connection string

3. **Or check your Supabase project folder**:
   - Look for `.env` file in your Supabase project directory
   - Or check `supabase/config.toml`

## Common Issues

### "Docker not running"
- Start Docker Desktop
- Then run: `supabase start`

### "Port 54322 already in use"
- Another Supabase instance might be running
- Check: `supabase status`
- Or stop other instances: `supabase stop`

### "Connection refused"
- Make sure Supabase is running: `supabase start`
- Verify port is 54322 (not 5432)

## Using Supabase Studio

Supabase Studio is your database GUI (free!):
- URL: http://localhost:54323
- Features:
  - View/edit tables
  - Run SQL queries
  - Manage database
  - View connection details

## Next Steps

After migration succeeds:
1. ✅ Database tables created
2. ✅ Third Layer assistive maps will be stored in database
3. ✅ Page packages will use database for fast lookups
4. ✅ You can view data in Supabase Studio

## Alternative: File-Based Storage

If you prefer not to use database:
- Comment out `DATABASE_URL` in `.env`
- System will use file-based storage
- Assistive maps saved to `assistive-model.json` files
- All features work without database!

