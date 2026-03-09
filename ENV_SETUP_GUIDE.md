# Environment Variables Setup Guide

## Where to Set Environment Variables

### Option 1: `.env` File (Recommended for Development)

Create a `.env` file in the **root directory** of the project:

```
D:\Waheed\RaawiX\.env
```

**Steps:**
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and set your values:
   ```bash
   # Use any text editor
   notepad .env
   # or
   code .env
   ```

3. The scanner automatically loads `.env` via `dotenv/config` in `apps/scanner/src/index.ts`

### Option 2: System Environment Variables (Production)

For production deployment, set environment variables in your hosting platform:

#### **Docker / Docker Compose**
```yaml
# docker-compose.yml
services:
  scanner:
    environment:
      - DATABASE_URL=postgresql://...
      - RATE_LIMIT_AUTH_MAX=1000
      - RATE_LIMIT_SCAN_MAX=10
```

#### **Windows (PowerShell)**
```powershell
# Set for current session
$env:RATE_LIMIT_AUTH_MAX = "1000"
$env:RATE_LIMIT_SCAN_MAX = "10"

# Set permanently (requires admin)
[System.Environment]::SetEnvironmentVariable("RATE_LIMIT_AUTH_MAX", "1000", "Machine")
```

#### **Linux / macOS**
```bash
# Set for current session
export RATE_LIMIT_AUTH_MAX=1000
export RATE_LIMIT_SCAN_MAX=10

# Set permanently (add to ~/.bashrc or ~/.zshrc)
echo 'export RATE_LIMIT_AUTH_MAX=1000' >> ~/.bashrc
```

#### **Cloud Platforms**

**Vercel / Netlify:**
- Go to Project Settings → Environment Variables
- Add variables in the dashboard

**AWS / Azure / GCP:**
- Use their respective environment variable configuration
- Or use secrets management services

---

## Required Variables for Production Scalability

### Minimum Required (for large portals)

```bash
# Rate Limiting
RATE_LIMIT_AUTH_MAX=1000          # Authenticated users
RATE_LIMIT_SCAN_MAX=10            # Scans per hour
RATE_LIMIT_READ_MAX=500           # Read operations per 15min

# Concurrency
MAX_CONCURRENT_SCANS=5            # Max concurrent scans
MAX_CONCURRENT_REQUESTS=5         # Max concurrent heavy ops
```

### Optional (but recommended)

```bash
# Polling (client-side, set in frontend .env)
VITE_POLLING_BASE_INTERVAL=5000
VITE_POLLING_MAX_INTERVAL=30000
```

---

## File Structure

```
RaawiX/
├── .env                    # ← Create this file (gitignored)
├── .env.example            # ← Template (committed to git)
├── apps/
│   ├── scanner/
│   │   └── src/
│   │       └── index.ts    # ← Loads .env via dotenv/config
│   └── report-ui/
│       └── .env            # ← Frontend env vars (if needed)
└── ENV_SETUP_GUIDE.md      # ← This file
```

---

## Quick Start

### 1. Create `.env` file

```bash
# In project root
cd D:\Waheed\RaawiX
copy .env.example .env
```

### 2. Edit `.env` with your values

```bash
# Minimum for production scalability
RATE_LIMIT_AUTH_MAX=1000
RATE_LIMIT_SCAN_MAX=10
RATE_LIMIT_READ_MAX=500
```

### 3. Restart the scanner

```bash
# Stop current scanner
# Then restart
pnpm scanner:dev
```

---

## Verification

Check if variables are loaded:

```typescript
// In scanner terminal, you should see:
console.log('Rate limit auth max:', process.env.RATE_LIMIT_AUTH_MAX);
// Should output: 1000 (or your set value)
```

Or check in browser console (for frontend vars):
```javascript
console.log('Polling interval:', import.meta.env.VITE_POLLING_BASE_INTERVAL);
```

---

## Important Notes

1. **`.env` is gitignored** - Never commit `.env` to version control
2. **`.env.example` is committed** - This is the template
3. **Restart required** - Changes to `.env` require restarting the scanner
4. **Case sensitive** - Variable names are case-sensitive
5. **No quotes needed** - Don't wrap values in quotes unless they contain spaces

---

## Troubleshooting

### Variables not loading?

1. **Check file location**: `.env` must be in project root
2. **Check file name**: Must be exactly `.env` (not `.env.txt`)
3. **Restart scanner**: Environment variables load at startup
4. **Check syntax**: No spaces around `=` sign
   ```bash
   # ✅ Correct
   RATE_LIMIT_AUTH_MAX=1000
   
   # ❌ Wrong
   RATE_LIMIT_AUTH_MAX = 1000
   ```

### Variables not taking effect?

1. **Check default values**: Some variables have defaults in `config.ts`
2. **Check type**: Some variables need to be numbers (no quotes)
3. **Check precedence**: System env vars override `.env` file

---

## Production Checklist

- [ ] Create `.env` file from `.env.example`
- [ ] Set `RATE_LIMIT_AUTH_MAX=1000`
- [ ] Set `RATE_LIMIT_SCAN_MAX=10`
- [ ] Set `RATE_LIMIT_READ_MAX=500`
- [ ] Set `DATABASE_URL` (production database)
- [ ] Set `JWT_SECRET` (strong random secret)
- [ ] Set `API_KEY` (strong random key)
- [ ] Verify `.env` is in `.gitignore`
- [ ] Test with large portal (500+ pages)
- [ ] Monitor rate limit headers in responses

---

**Last Updated**: After implementing production scalability  
**Status**: Ready for production deployment

