# Create Raawi X Database in Supabase

## Problem

The default Supabase `postgres` database has existing tables in the `auth` schema that conflict with Prisma migrations. We need a clean database just for Raawi X.

## Solution: Create New Database

### Step 1: Open Supabase Studio

1. Open your browser: **http://localhost:54323**
2. You should see the Supabase Studio interface

### Step 2: Open SQL Editor

1. Look at the **left sidebar**
2. Click on **"SQL Editor"** (it has a SQL icon)
3. This opens the SQL query editor

### Step 3: Create Database

1. In the SQL editor, paste this command:
   ```sql
   CREATE DATABASE raawix;
   ```

2. Click the **"Run"** button (or press `Ctrl+Enter`)

3. You should see a success message: **"Success. No rows returned"**

### Step 4: Update Connection String

Edit `apps/scanner/.env` and update line 10:

**Change from:**
```env
DATABASE_URL='postgresql://postgres:postgres@localhost:54322/postgres'
```

**To:**
```env
DATABASE_URL='postgresql://postgres:postgres@localhost:54322/raawix'
```

**Note:** If your Supabase password is different from `postgres`, replace it in the connection string.

### Step 5: Run Migration

```powershell
pnpm --filter scanner db:migrate
```

This will create all Raawi X tables in the new `raawix` database.

## Verify Database Created

After creating the database, you can verify it exists:

1. In Supabase Studio, look at the **left sidebar**
2. You might see a database selector (if Supabase supports multiple databases in the UI)
3. Or check via SQL Editor:
   ```sql
   SELECT datname FROM pg_database WHERE datname = 'raawix';
   ```

## Troubleshooting

### "Database already exists"
- The database was already created
- Just proceed to Step 4 (update .env)

### "Permission denied"
- Make sure you're using the `postgres` user
- Check your password in Supabase Studio → Settings → Database

### "Connection refused"
- Make sure Supabase is running: `supabase status`
- Verify port 54322 is correct

## What Gets Created

After migration, the `raawix` database will have these tables:
- `Scan` - Scan metadata
- `Page` - Page information
- `Finding` - Accessibility findings
- `VisionFinding` - Vision analysis findings
- `Site` - Website records
- `PageVersion` - Page version tracking
- `AssistiveMap` - Third layer assistive maps

All tables will be in the `public` schema (clean, no Supabase auth tables).

