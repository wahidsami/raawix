# Local PostgreSQL Setup for Raawi X

This guide explains how to set up Raawi X with a local native PostgreSQL installation (no Docker/Supabase required).

## Prerequisites

- PostgreSQL installed locally (version 12+)
- pgAdmin installed (optional, for GUI)
- Node.js and pnpm installed

## Step 1: Create Database and User

### Option A: Using psql (Command Line)

Open a terminal and connect to PostgreSQL:

```bash
psql -U postgres
```

Then run these SQL commands:

```sql
-- Create database
CREATE DATABASE raawi_x;

-- Create user (optional, or use existing postgres user)
CREATE USER raawi WITH PASSWORD 'raawi_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE raawi_x TO raawi;

-- Connect to the new database
\c raawi_x

-- Grant schema privileges (if using separate user)
GRANT ALL ON SCHEMA public TO raawi;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO raawi;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO raawi;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO raawi;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO raawi;
```

### Option B: Using pgAdmin (GUI)

1. Open pgAdmin
2. Connect to your PostgreSQL server
3. Right-click on "Databases" → "Create" → "Database"
   - Name: `raawi_x`
   - Owner: `postgres` (or your user)
4. (Optional) Create a new user:
   - Right-click "Login/Group Roles" → "Create" → "Login/Group Role"
   - Name: `raawi`
   - Password: `raawi_password`
   - Privileges: Grant all necessary permissions

## Step 2: Configure Environment Variables

### Scanner API

Copy the example file and update it:

```bash
cd apps/scanner
cp .env.example .env
```

Edit `apps/scanner/.env` and set:

```env
DATABASE_URL=postgresql://raawi:raawi_password@localhost:5432/raawi_x?schema=public
```

**Note:** If you're using the default `postgres` user instead of creating a separate user:

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/raawi_x?schema=public
```

### Dashboard

Copy the example file:

```bash
cd apps/report-ui
cp .env.example .env
```

Edit `apps/report-ui/.env` and set:

```env
VITE_API_URL=http://localhost:3001
```

## Step 3: Run Database Migrations

Generate Prisma client and run migrations:

```bash
# From project root
pnpm --filter scanner db:generate
pnpm --filter scanner db:migrate
```

This will create all necessary tables:
- `AdminUser` (for authentication)
- `Scan`, `Page`, `Finding`, `VisionFinding` (scan data)
- `Site`, `PageVersion`, `AssistiveMap` (assistive maps)
- `WidgetEvent`, `WidgetDailyAggregate` (analytics)

## Step 4: Seed Database

Create the default admin user:

```bash
pnpm --filter scanner db:seed
```

This creates:
- Email: `admin@local`
- Password: `admin123`

**⚠️ Security Note:** Change this password in production!

## Step 5: Verify Setup

### Using pgAdmin

1. Open pgAdmin
2. Connect to your PostgreSQL server
3. Expand `raawi_x` database → `Schemas` → `public` → `Tables`
4. You should see all tables listed

### Using psql

```bash
psql -U raawi -d raawi_x
```

```sql
-- List all tables
\dt

-- Check AdminUser table
SELECT email, role FROM "AdminUser";

-- Check table count
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';
```

You should see 10 tables:
1. AdminUser
2. Scan
3. Page
4. Finding
5. VisionFinding
6. Site
7. PageVersion
8. AssistiveMap
9. WidgetEvent
10. WidgetDailyAggregate

## Step 6: Start Services

### Start Scanner API

```bash
pnpm scanner:dev
```

You should see:
```
Database: enabled
[DB] Prisma client initialized successfully
```

### Start Dashboard

```bash
pnpm dev
```

Then open: http://localhost:5173

Login with:
- Email: `admin@local`
- Password: `admin123`

## Troubleshooting

### "Connection refused"

- Check PostgreSQL is running:
  ```bash
  # Windows
  Get-Service postgresql*
  
  # Linux/Mac
  sudo systemctl status postgresql
  ```

### "Authentication failed"

- Verify username/password in `DATABASE_URL`
- Check PostgreSQL `pg_hba.conf` allows local connections

### "Database does not exist"

- Run the SQL commands from Step 1 to create the database

### "Permission denied"

- Make sure the user has proper privileges (see Step 1)
- Try using the `postgres` superuser for testing

### "Prisma client not generated"

```bash
pnpm --filter scanner db:generate
```

## Connection String Format

The `DATABASE_URL` follows this format:

```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA
```

Example:
```
postgresql://raawi:raawi_password@localhost:5432/raawi_x?schema=public
```

## Production Considerations

1. **Change default admin password** - Update the seed script or manually change the password hash
2. **Use strong database password** - Don't use `raawi_password` in production
3. **Set JWT_SECRET** - Use a strong random secret in production
4. **Enable SSL** - Add `?sslmode=require` to `DATABASE_URL` for remote connections
5. **Backup regularly** - Set up automated backups for the `raawi_x` database

## Next Steps

- Run a test scan to verify data is being saved
- Check widget endpoints work with database lookups
- Verify dashboard can view scans and findings

