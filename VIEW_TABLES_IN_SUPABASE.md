# How to View Raawi X Tables in Supabase Studio

## Understanding Supabase Structure

**Important**: Supabase local runs **ONE project** with **multiple databases**.

- **Project**: The Supabase instance (one per local setup)
- **Database**: A PostgreSQL database (can have multiple: `postgres`, `raawix`, etc.)

We created a **database** called `raawix`, not a new project.

## The Issue

Supabase Studio's **Table Editor** shows tables from the **default `postgres` database** by default. Our tables are in the `raawix` database, so they don't appear in Table Editor.

## Solution: Move Tables to `postgres` Database

This is the easiest way to see tables in Supabase Studio.

### Step 1: Update `.env` File

Edit `apps/scanner/.env` and change `DATABASE_URL`:

**From:**
```env
DATABASE_URL='postgresql://postgres:postgres@localhost:54322/raawix'
```

**To:**
```env
DATABASE_URL='postgresql://postgres:postgres@localhost:54322/postgres'
```

### Step 2: Sync Schema to `postgres` Database

```powershell
cd apps/scanner
npx prisma db push
```

This will create all tables in the `postgres` database.

### Step 3: View in Supabase Studio

1. Open: **http://localhost:54323**
2. Click **"Table Editor"** in the left sidebar
3. You should now see all 7 tables:
   - `Scan`
   - `Page`
   - `Finding`
   - `VisionFinding`
   - `Site`
   - `PageVersion`
   - `AssistiveMap`

## Alternative: View `raawix` Database via SQL Editor

If you prefer to keep tables in `raawix` database:

1. Open Supabase Studio: **http://localhost:54323**
2. Go to **SQL Editor**
3. Run this SQL to list tables:
   ```sql
   -- Connect to raawix database
   \c raawix
   
   -- List all tables
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```

4. Or query tables directly:
   ```sql
   SELECT * FROM "Scan" LIMIT 10;
   ```

## Why Use `postgres` Database?

**Advantages:**
- ✅ Tables show up in Table Editor automatically
- ✅ Easier to browse and edit data
- ✅ Visual interface for all tables
- ✅ No need to switch databases

**Note**: The `postgres` database will have Supabase's default tables (like `auth.users`), but our tables will be in the `public` schema, separate from them.

## Verify Tables Exist

After syncing to `postgres`, verify in Supabase Studio:

1. **Table Editor** → Should show all 7 tables
2. **SQL Editor** → Run:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('Scan', 'Page', 'Finding', 'VisionFinding', 'Site', 'PageVersion', 'AssistiveMap');
   ```

## Next Steps

Once tables are visible in Supabase Studio:
- ✅ You can browse data visually
- ✅ Edit records if needed
- ✅ Run SQL queries
- ✅ Monitor data as scans run

