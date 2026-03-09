# Supabase → Docker Migration Guide

## Overview

This migration replaces Supabase (Postgres + Auth) with a local Docker-based stack:
- **Postgres 15** in Docker
- **Redis 7** (optional) in Docker
- **JWT Auth** in scanner API (replaces Supabase Auth)
- **Prisma** continues to work with Docker Postgres

## Phase 1: Docker Compose Setup ✅

### Files Created:
- `infra/docker-compose.yml` - Postgres + Redis containers
- `infra/.env.example` - Environment variable template

### Scripts Added to Root `package.json`:
- `pnpm infra:up` - Start Docker containers
- `pnpm infra:down` - Stop Docker containers
- `pnpm infra:reset` - Reset (remove volumes) and restart
- `pnpm infra:logs` - View container logs

### Usage:
```bash
# Start infrastructure
pnpm infra:up

# Check status
docker ps

# View logs
pnpm infra:logs

# Stop infrastructure
pnpm infra:down
```

## Phase 2: Configuration Changes

### Environment Variables

**Create `infra/.env`** (copy from `.env.example`):
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=raawix
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/raawix?schema=public
```

**Update `apps/scanner/.env`**:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/raawix?schema=public
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
```

**Update `apps/report-ui/.env`** (remove Supabase, add API URL):
```env
VITE_API_URL=http://localhost:3001
# Remove VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

### Removed Dependencies

**Dashboard (`apps/report-ui/package.json`):**
- ❌ Remove `@supabase/supabase-js` (if present)

**Scanner (`apps/scanner/package.json`):**
- ✅ Added `bcryptjs` for password hashing
- ✅ Added `jsonwebtoken` for JWT
- ✅ Added `@types/bcryptjs` and `@types/jsonwebtoken`

## Phase 3: Database Schema Updates

### Added AdminUser Model

**File: `apps/scanner/prisma/schema.prisma`**
```prisma
model AdminUser {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email        String   @unique
  passwordHash String
  role         String   @default("admin")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([email])
  @@schema("public")
}
```

### Seed Script

**File: `apps/scanner/prisma/seed.ts`**
- Creates default admin user: `admin@local` / `admin123`
- Uses bcrypt for password hashing

**Run seed:**
```bash
pnpm --filter scanner db:seed
```

## Phase 4: JWT Auth Implementation

### Scanner API Auth Endpoints

**File: `apps/scanner/src/api/auth.ts`**
- `POST /api/auth/login` - Login with email/password, returns JWT
- `GET /api/auth/me` - Get current user from JWT token

**File: `apps/scanner/src/middleware/auth.ts`**
- `requireAuth` middleware - Protects routes with JWT

### Dashboard Auth Changes

**File: `apps/report-ui/src/lib/api.ts`**
- New API client with JWT token management
- Replaces Supabase client

**File: `apps/report-ui/src/hooks/useAuth.ts`**
- Updated to use JWT instead of Supabase Auth
- Token stored in localStorage

**File: `apps/report-ui/src/components/auth/LoginForm.tsx`**
- Updated to use new API client
- Default credentials: `admin@local` / `admin123`

## Phase 5: Migration Steps

### Step 1: Start Docker Infrastructure

```bash
# Start Postgres and Redis
pnpm infra:up

# Verify containers are running
docker ps
```

### Step 2: Update Environment Variables

1. Copy `infra/.env.example` to `infra/.env`
2. Update `apps/scanner/.env` with Docker Postgres URL
3. Update `apps/report-ui/.env` (remove Supabase vars)

### Step 3: Run Database Migration

```bash
cd apps/scanner

# Generate Prisma client
pnpm db:generate

# Run migration (creates AdminUser table)
pnpm db:migrate

# Seed default admin user
pnpm db:seed
```

### Step 4: Install Dependencies

```bash
# Install new dependencies (bcryptjs, jsonwebtoken)
pnpm install
```

### Step 5: Test

1. **Start scanner:**
   ```bash
   pnpm scanner:dev
   ```

2. **Start dashboard:**
   ```bash
   pnpm dev
   ```

3. **Login:**
   - Email: `admin@local`
   - Password: `admin123`

4. **Verify:**
   - Dashboard loads
   - Can create scans
   - Widget endpoints work

## Verification Checklist

- [ ] Docker containers running (`docker ps`)
- [ ] Database connection works (`pnpm --filter scanner db:studio`)
- [ ] AdminUser table exists
- [ ] Default admin user created
- [ ] Scanner API starts without errors
- [ ] Dashboard login works
- [ ] JWT token stored in localStorage
- [ ] Protected routes work
- [ ] Scan creation works
- [ ] Widget endpoints accessible

## Troubleshooting

### "Connection refused" to Postgres
- Check Docker containers: `docker ps`
- Check Postgres logs: `docker logs raawix_postgres`
- Verify `DATABASE_URL` in `.env`

### "Admin user already exists"
- This is normal if seed was run before
- User exists, proceed to login

### "Invalid token" errors
- Clear localStorage: `localStorage.removeItem('raawix_token')`
- Login again

### Migration conflicts
- If Prisma migration fails, reset:
  ```bash
  pnpm infra:reset
  pnpm --filter scanner db:migrate
  ```

## Rollback (if needed)

If you need to rollback to Supabase:

1. Stop Docker: `pnpm infra:down`
2. Restore Supabase: `supabase start`
3. Update `DATABASE_URL` to Supabase URL
4. Revert dashboard auth changes (use Supabase client)
5. Remove AdminUser model from schema

## Security Notes

⚠️ **Development Only:**
- Default admin password is `admin123` (weak)
- JWT secret is `dev-secret-change-in-production` (weak)
- Change these in production!

**Production Checklist:**
- [ ] Set strong `JWT_SECRET` in environment
- [ ] Change default admin password
- [ ] Use strong Postgres password
- [ ] Enable SSL for Postgres connection
- [ ] Set `JWT_EXPIRES_IN` appropriately

## Next Steps

After migration:
1. Complete remaining dashboard phases (see `DASHBOARD_REMAINING_PHASES.md`)
2. Add more admin users via seed script or API
3. Implement password reset flow (optional)
4. Add role-based access control (optional)

