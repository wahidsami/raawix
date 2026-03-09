# Hosting Raawi X on Coolify

This guide explains how to host the **Scanner** and **Report UI** of Raawi X on [Coolify](https://coolify.io/).

## 1. Prerequisites (PostgreSQL)

You should have a PostgreSQL database already running. The user has provided an internal connection string:

```
postgres://postgres:k22nzyXvNzniS8rGfNuKVLxKp1tdkTXRdUp2f69fb4J6VUjpA7HeAi5Oqsqk4GGV@k0scc8cksk0sgcs44ksgkck4:5432/postgres
```

## 2. Scanner Service Setup

The **Scanner** is the backend API and processing engine.

### Coolify Configuration
1.  **Project**: Your Raawi X Project.
2.  **Resource**: Create a new **Public Repository** or **Private Repository** (depending on your setup).
3.  **Docker File Path**: `apps/scanner/Dockerfile`.
4.  **Exposed Port**: `3001`.

### Environment Variables (Copy & Paste to Coolify)

Set these in the **Environment Variables** tab of the service in Coolify.

#### Scanner (Backend)
```env
# Database & URLs
DATABASE_URL=postgresql://postgres:k22nzyXvNzniS8rGfNuKVLxKp1tdkTXRdUp2f69fb4J6VUjpA7HeAi5Oqsqk4GGV@k0scc8cksk0sgcs44ksgkck4:5432/postgres?schema=public
REPORT_UI_ORIGIN=https://rxreport.unifinitylab.com

# Core Configuration
NODE_ENV=production
PORT=3001
JWT_SECRET=8f4b2c1d9e7a6f5c3d2b1a0e9f8c7b6a4d3e2f1c0b9a8d7e6f5c4b3a2d1e9f8
API_KEY=3f9e7b8c4d2a1e6f9c7b5d3a8e1f4c6b9d2a7e5c
JWT_EXPIRES_IN=7d

# Scanner Limits & Rate Limiting
MAX_CONCURRENT_SCANS=5
RATE_LIMIT_MAX=1000
ALLOW_LOCALHOST=false
ALLOWED_PORTS=80,443
OUTPUT_DIR=./output
AUDIT_LOG_DIR=./logs

# Vision / AI Configuration
GEMINI_ENABLED=false
GEMINI_API_KEY=AIzaSyD_IStMFOYtLQyLO3eB-9odyOVCpXUTDTY  
GEMINI_MODEL=gemini-2.0-flash
```

> [!IMPORTANT]
> Change `JWT_SECRET` and `API_KEY` to strong random strings in production.

---

## 3. Report UI Service Setup

The **Report UI** is a static Vite application served by Nginx.

### Coolify Configuration
1.  **Project**: Your Raawi X Project.
2.  **Resource**: Create another **Public Repository** or **Private Repository**.
3.  **Docker File Path**: `apps/report-ui/Dockerfile`.
4.  **Exposed Port**: `80`.
5.  **Domain**: `https://rxreport.unifinitylab.com`.

### Build Environment Variables (Copy & Paste to Coolify)
Set these specifically in the **Build Environment Variables** section:

```env
VITE_API_URL=https://rxapi.unifinitylab.com
```

> [!IMPORTANT]
> These must be set as **Build Args** so they are baked into the frontend assets.

---

## 4. Summary of URLs

- **Report UI**: `https://rxreport.unifinitylab.com`
- **Scanner API**: `https://rxapi.unifinitylab.com`
- **Internal DB**: Provided via internal Coolify network.

---

## 5. Troubleshooting Build Errors

If you see an error like `error TS5083: Cannot read file '/app/tsconfig.json'` or `error TS6306: Referenced project ... must have setting "composite": true`:

1.  **Fixed Dockerfiles**: I have updated `apps/scanner/Dockerfile` and `apps/report-ui/Dockerfile` to copy the root `tsconfig.json`. This is required because the apps extend the root configuration.
2.  **Commit and Push**: You **MUST** commit and push these changes to your repository for Coolify to see the fix.
3.  **Redeploy**: Once pushed, trigger a new deployment in Coolify.
