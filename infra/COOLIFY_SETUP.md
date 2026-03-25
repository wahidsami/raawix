# Coolify setup guide – Raawi-x project

Use this after creating a project named **Raawi-x** in Coolify and connecting your GitHub.

You will add **3 resources**:

1. **PostgreSQL** (database)
2. **Scanner** (API – Node.js)
3. **Report UI** (frontend – Nginx)

Then configure env vars and domains.

---

## 1. Add PostgreSQL database

1. In project **Raawi-x** → **+ Add Resource** → **Database** → **PostgreSQL**.
2. Name: `raawix-db` (or any name).
3. Set a strong **password** and note it (you’ll use it in `DATABASE_URL`).
4. Create the resource. Coolify will give you an **internal URL** (e.g. `postgresql://user:pass@raawix-db:5432/postgres`). Use this as `DATABASE_URL` for the Scanner.

---

## 2. Add Scanner (API) application

1. **+ Add Resource** → **Application** → **GitHub**.
2. Connect GitHub if needed, select repo **wahidsami/raawix**, branch **main**.
3. **Build Pack:** choose **Dockerfile** (not Nixpacks).
4. **Dockerfile location:** `apps/scanner/Dockerfile`
5. **Build context (Base Directory):** leave empty or `.` (repo root). The Dockerfile expects to be built from the **repository root**.
6. **Port:** `3001` (exposed in the Dockerfile).
7. Create the resource.

**Important — `NODE_ENV` (build vs runtime)**  
If Coolify shows a warning that `NODE_ENV=production` skips devDependencies at build time, fix it like this:

- Edit **`NODE_ENV`** → uncheck **Available at Buildtime**, leave **Available at Runtime** checked.  
- Keep the value **`production`** for runtime (the running API).

The Dockerfiles already set `NODE_ENV=development` for `pnpm install` / build steps; leaving `NODE_ENV` as **runtime-only** avoids the platform injecting `production` too early and keeps builds correct and often faster (full install instead of broken retries).

**Environment variables** (Scanner → Environment Variables):

| Variable | Value | Required |
|----------|--------|----------|
| `NODE_ENV` | `production` (**runtime only** — see above) | Yes |
| `PORT` | `3001` | Yes |
| `DATABASE_URL` | `postgresql://USER:PASSWORD@raawix-db:5432/postgres` (use the DB URL from step 1; replace USER/PASSWORD) | Yes |
| `JWT_SECRET` | Generate a long random string | Yes |
| `API_KEY` | Generate a long random string (for API access) | Yes |
| `JWT_EXPIRES_IN` | `7d` | Yes |
| `REPORT_UI_ORIGIN` | `https://<your-report-ui-domain>` (e.g. `https://report.raawix.example.com`) | Yes |
| `ALLOW_LOCALHOST` | `false` | Yes |
| `ALLOWED_PORTS` | `80,443` | Yes |
| `OUTPUT_DIR` | `./output` | Yes |
| `AUDIT_LOG_DIR` | `./logs` | Yes |

Optional: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `OPENAI_*`, `GEMINI_*`, etc. (see [COOLIFY_ENV.md](./COOLIFY_ENV.md)).

**Deploy:** Save, then **Deploy**. Wait until the Scanner is running and note its **public URL** (e.g. `https://api.raawix.example.com`). You’ll use this for Report UI and for `REPORT_UI_ORIGIN` if you use the same domain pattern.

---

## 3. Add Report UI (frontend) application

1. **+ Add Resource** → **Application** → **GitHub**.
2. Same repo **wahidsami/raawix**, branch **main**.
3. **Build Pack:** **Dockerfile**.
4. **Dockerfile location:** `apps/report-ui/Dockerfile`
5. **Build context (Base Directory):** leave empty or `.`
6. **Port:** `80` (Nginx listens on 80).
7. Create the resource.

**Build-time environment variable** (so the UI talks to your Scanner in production):

| Variable | Value |
|----------|--------|
| `VITE_API_URL` | `https://<your-scanner-domain>` (e.g. `https://api.raawix.example.com`) |

Add this under **Environment Variables** and ensure it’s applied at **build** time (Coolify usually applies envs to both build and run; if there’s a “Build” vs “Runtime” toggle, set it for Build).

**Deploy:** Save, then **Deploy**.

---

## 4. Domains and routing

- **Scanner:** set a domain (e.g. `api.raawix.example.com`) in the Scanner application → **Domain**. Coolify will handle HTTPS (e.g. Let’s Encrypt).
- **Report UI:** set a domain (e.g. `report.raawix.example.com` or `app.raawix.example.com`) in the Report UI application → **Domain**.

Then:

1. In **Scanner** env, set `REPORT_UI_ORIGIN=https://report.raawix.example.com` (or whatever domain you gave Report UI).
2. In **Report UI**, set **build** env `VITE_API_URL=https://api.raawix.example.com` (or whatever domain you gave Scanner).
3. Redeploy both if you changed env vars.

---

## 5. Deployment order

1. Deploy **PostgreSQL** and wait until it’s healthy.
2. Deploy **Scanner** (so migrations run and API is up).
3. Deploy **Report UI** (so the built UI points at the Scanner URL).

---

## 6. After first deploy

- Open **Report UI** in the browser and log in. If you use the seed, default is often `admin@local` / `admin123` (change in production).
- Run migrations: they run automatically on Scanner start (`pnpm db:migrate:deploy` in the Dockerfile). If the DB was empty, the seed is not run automatically; you may need to run it once (e.g. via a one-off command or locally against the same DB).

---

## 7. Troubleshooting

| Issue | Check |
|-------|--------|
| Scanner won’t start | `DATABASE_URL` correct? DB container reachable from Scanner? Logs in Coolify. |
| Report UI shows “network error” / API fails | `VITE_API_URL` set at **build** time and matches Scanner domain? Rebuild Report UI after changing it. |
| Login redirect or CORS | `REPORT_UI_ORIGIN` in Scanner must match Report UI domain exactly (including `https://`). If you set `WIDGET_ORIGINS` on the Scanner, **include** `https://<your-report-ui-domain>` in the comma-separated list (otherwise CORS will block the dashboard). |
| 408 / timeout on push | Unrelated to Coolify; was a Git push size issue (already fixed by rewriting history). |

---

## 8. Security notes (production)

- **Do not paste** `DATABASE_URL`, `JWT_SECRET`, `API_KEY`, or cloud API keys into public chats or tickets. If they were exposed, **rotate** them in Coolify and anywhere else they were reused.
- **`VITE_API_KEY` on Report UI:** Anything prefixed with `VITE_` is compiled into the public JavaScript bundle. Anyone can read it. The main dashboard uses **JWT** after login; the API key is only needed for the legacy **ScanDashboard** route. Prefer **omitting** `VITE_API_KEY` in production (legacy route will not work with API auth) or accept that the key is public—**never** use the same value as a secret server-only `API_KEY` if you need that key to stay private.
- **Report UI build:** The Dockerfile passes `VITE_API_URL` / `VITE_API_KEY` as Docker `ARG`/`ENV` during `pnpm build`. In Coolify, ensure those values are available when the image is **built** (redeploy after changing them).

---

## Summary

| Resource | Type | Repo | Dockerfile | Port |
|----------|------|------|------------|------|
| raawix-db | PostgreSQL | – | – | 5432 (internal) |
| Scanner | Application | wahidsami/raawix | apps/scanner/Dockerfile | 3001 |
| Report UI | Application | wahidsami/raawix | apps/report-ui/Dockerfile | 80 |

Build context for both apps: **repository root** (default when Base Directory is empty).

---

## 9. Faster Docker builds (optional)

Typical first-time or cold-cache builds take **a few minutes**, mostly from:

- **`pnpm install`** (monorepo + lockfile)
- **TypeScript / Vite build**
- **Scanner only:** `playwright install --with-deps chromium` (browser + OS packages)

Ways to improve:

1. **`NODE_ENV` runtime-only** (see above) — avoids bad installs and warnings.
2. **Coolify build cache** — if your Coolify version supports Docker registry/build cache for apps, enable it so unchanged layers reuse `pnpm install` and base images.
3. **Redeploy only what changed** — after a UI-only commit, redeploy **Report UI** only; after API-only changes, redeploy **Scanner** only.
4. **Do not set `NODE_ENV=production` at build** for either service in Coolify.

The repo Dockerfiles use BuildKit cache mounts for OS package managers and the pnpm store where supported (Docker BuildKit / `docker buildx`).
