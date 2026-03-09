# pgAdmin Setup Guide for Raawi X

## Step-by-Step Instructions

### Step 1: Connect to PostgreSQL Server

1. In pgAdmin, look at the **left sidebar**
2. Find your PostgreSQL server (usually named "PostgreSQL" or shows your server version)
3. If it's not connected, **right-click** on it → **Connect Server**
4. Enter your PostgreSQL password (the one you set during installation)
5. Click **OK**

### Step 2: Create Database

1. **Right-click** on "Databases" (in the left sidebar, under your server)
2. Select **Create** → **Database...**

3. In the **Create - Database** dialog:
   - **Database name**: `raawi_x`
   - **Owner**: Leave as default (usually `postgres`) or select your user
   - Click **Save**

### Step 3: Create User (Optional but Recommended)

1. In the left sidebar, expand your server
2. **Right-click** on **Login/Group Roles**
3. Select **Create** → **Login/Group Role...**

4. In the **Create - Login/Group Role** dialog:
   - Go to **General** tab:
     - **Name**: `raawi`
   
   - Go to **Definition** tab:
     - **Password**: `raawi_password`
     - **Password expiration**: Leave unchecked
   
   - Go to **Privileges** tab:
     - Check **Can login?**
     - Check **Create databases?** (optional)
   
   - Click **Save**

### Step 4: Grant Permissions to User

1. **Right-click** on the `raawi_x` database (you just created)
2. Select **Properties**

3. Go to **Security** tab:
   - Click **+** button to add a new privilege
   - **Grantee**: Select `raawi`
   - **Privileges**: Check **ALL** (or at least: CONNECT, CREATE, TEMPORARY)
   - Click **Save**

### Step 5: Grant Schema Permissions (Important!)

1. Expand `raawi_x` database in the left sidebar
2. Expand **Schemas**
3. **Right-click** on **public** schema
4. Select **Properties**

5. Go to **Security** tab:
   - Click **+** button
   - **Grantee**: Select `raawi`
   - **Privileges**: Check **ALL** (or at least: USAGE, CREATE)
   - Click **Save**

### Step 6: Verify Setup

1. **Right-click** on `raawi_x` database
2. Select **Query Tool**
3. Paste this SQL and click **Execute** (F5):

```sql
-- Check if user exists
SELECT usename FROM pg_user WHERE usename = 'raawi';

-- Check database exists
SELECT datname FROM pg_database WHERE datname = 'raawi_x';

-- Check permissions (should show raawi user)
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public';
```

## Alternative: Quick SQL Method

If you prefer, you can use the Query Tool directly:

1. **Right-click** on your PostgreSQL server → **Query Tool**
2. Paste this SQL:

```sql
-- Create database
CREATE DATABASE raawi_x;

-- Create user
CREATE USER raawi WITH PASSWORD 'raawi_password';

-- Grant database privileges
GRANT ALL PRIVILEGES ON DATABASE raawi_x TO raawi;

-- Connect to the new database
\c raawi_x

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO raawi;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO raawi;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO raawi;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO raawi;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO raawi;
```

3. Click **Execute** (F5)

**Note**: The `\c` command might not work in pgAdmin Query Tool. If you get an error, just run the first 3 commands, then manually connect to `raawi_x` database and run the rest.

## Next Steps

After creating the database:

1. Update `apps/scanner/.env`:
   ```env
   DATABASE_URL=postgresql://raawi:raawi_password@localhost:5432/raawi_x?schema=public
   ```

2. Run migrations:
   ```bash
   pnpm --filter scanner db:generate
   pnpm --filter scanner db:migrate
   pnpm --filter scanner db:seed
   ```

3. Verify tables in pgAdmin:
   - Expand `raawi_x` → `Schemas` → `public` → `Tables`
   - You should see 10 tables after running migrations

