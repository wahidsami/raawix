# Prisma Migrate (Scanner)

How to run Prisma migrations for the scanner app (`apps/scanner`).

## Root cause of "relation Scan already exists"

`prisma migrate dev` replays all migrations in order on a **shadow database**. This repo had two init migrations that both created the same tables (`20260108020255_init` and `20260108030437_init`). When the shadow DB replayed them, the first migration created `Scan`, and the third tried to create it again, causing:

```text
Migration `20260108030437_init` failed to apply cleanly to the shadow database.
Error: relation "Scan" already exists
```

**Fix:** The duplicate init migration `20260108030437_init` was turned into a no-op (empty migration), so replay no longer creates the same tables twice. A dedicated shadow database is recommended for local dev via `SHADOW_DATABASE_URL`. The `add_agent_finding_and_page_agent_path` migration is named `20260108100000_...` so it runs **after** the three init migrations (lexicographic order); applying it before the inits would fail with "relation Page does not exist".

---

## Environment variables

| Variable | Required for | Description |
|----------|--------------|-------------|
| `DATABASE_URL` | All | Main database URL (scanner and production). |
| `SHADOW_DATABASE_URL` | `prisma migrate dev` only | Dedicated shadow DB URL. **Not used** by `prisma migrate deploy`. |

**Examples:**

```env
# Main DB (same for dev and production)
DATABASE_URL=postgresql://user:password@localhost:5432/raawix?schema=public

# Shadow DB (local dev only; must be a different database)
SHADOW_DATABASE_URL=postgresql://user:password@localhost:5432/raawix_shadow?schema=public
```

Use the same host, user, and password as `DATABASE_URL`; only the **database name** should differ. If your main DB is `raawi_x`, use e.g. `raawi_x_shadow`. Do not point `SHADOW_DATABASE_URL` at the same database as `DATABASE_URL`.

---

## Create the shadow database

### Option A: New Docker Compose setup

If you use `infra/docker-compose.yml` and are starting Postgres for the first time, the shadow DB is created automatically by the init script:

```bash
cd infra
docker-compose up -d postgres
# Wait for healthy. Then raawix and raawix_shadow both exist.
```

### Option B: Existing Docker Postgres

If the Postgres container already has data, init scripts do not run again. Create the shadow DB manually:

```bash
docker exec -it raawix_postgres psql -U postgres -d raawix -c 'CREATE DATABASE raawix_shadow;'
```

(Use your actual user and main DB name if different.)

### Option C: Local PostgreSQL (no Docker)

Using the same user that you use for `DATABASE_URL`:

```bash
# If your main DB is raawix:
psql -U postgres -d postgres -c 'CREATE DATABASE raawix_shadow;'

# If your main DB is raawi_x (match the name):
psql -U postgres -d postgres -c 'CREATE DATABASE raawi_x_shadow;'
```

Then set `SHADOW_DATABASE_URL` to that database (e.g. `.../raawi_x_shadow?schema=public`).

---

## Run migrations

### Local dev: `prisma migrate dev`

1. Create the shadow DB (see above).
2. In `apps/scanner/.env` (or root `.env`), set:
   - `DATABASE_URL` – main DB
   - `SHADOW_DATABASE_URL` – shadow DB (e.g. `.../raawix_shadow?schema=public`)
3. From **apps/scanner**:

```bash
cd apps/scanner
npx prisma migrate dev
```

This applies pending migrations to the main DB and uses the shadow DB only for validation. It does not change production.

### Production / CI: `prisma migrate deploy`

Only `DATABASE_URL` is needed. The shadow DB is **not** used.

```bash
cd apps/scanner
npx prisma migrate deploy
```

Do **not** run `migrate dev` in production. Use `migrate deploy` only.

---

## Summary

| Command | Uses shadow DB? | Needs `SHADOW_DATABASE_URL`? |
|---------|-----------------|------------------------------|
| `prisma migrate dev` | Yes | Yes (recommended) |
| `prisma migrate deploy` | No | No |

---

## Caveats

- **Docker:** Init script in `infra/postgres-init/01-create-shadow-db.sql` runs only when the Postgres data volume is first created. For an existing container, create `raawix_shadow` manually (Option B above).
- **CI:** For deploy-only pipelines, set only `DATABASE_URL`. If your CI runs `prisma migrate dev`, set `SHADOW_DATABASE_URL` to a valid shadow DB URL (or a throwaway DB).
- **Production:** Never run `migrate dev` in production. Use `migrate deploy` only; no shadow DB or `SHADOW_DATABASE_URL` required.
- **"Underlying table for model Page does not exist":** Ensure the shadow DB exists and is empty before the first `migrate dev`, and that its name matches your convention (e.g. `raawi_x_shadow` when `DATABASE_URL` uses `raawi_x`). Create it manually if needed (see "Create the shadow database" above).
