# Quick Start: Local Postgres Setup

## 1. Create Database (One-time setup)

```sql
-- Connect to PostgreSQL
psql -U postgres

-- Run these commands:
CREATE DATABASE raawi_x;
CREATE USER raawi WITH PASSWORD 'raawi_password';
GRANT ALL PRIVILEGES ON DATABASE raawi_x TO raawi;
\c raawi_x
GRANT ALL ON SCHEMA public TO raawi;
```

## 2. Configure Environment

Edit `apps/scanner/.env`:

```env
DATABASE_URL=postgresql://raawi:raawi_password@localhost:5432/raawi_x?schema=public
```

## 3. Setup Database

```bash
# Generate Prisma client
pnpm --filter scanner db:generate

# Run migrations
pnpm --filter scanner db:migrate

# Create admin user
pnpm --filter scanner db:seed
```

## 4. Start Services

```bash
# Terminal 1: Scanner API
pnpm scanner:dev

# Terminal 2: Dashboard
pnpm dev
```

## 5. Login

- URL: http://localhost:5173
- Email: `admin@local`
- Password: `admin123`

## View Tables in pgAdmin

1. Open pgAdmin
2. Connect to PostgreSQL server
3. Expand: `raawi_x` → `Schemas` → `public` → `Tables`
4. You should see 10 tables

---

For detailed instructions, see [docs/LOCAL_POSTGRES_SETUP.md](docs/LOCAL_POSTGRES_SETUP.md)

