# Quick Start Guide

## First Time Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**

   Create `apps/scanner/.env`:
   ```env
   PORT=3001
   API_KEY=dev-api-key-change-in-production
   REPORT_UI_ORIGIN=http://localhost:5173
   MAX_CONCURRENT_SCANS=5
   OUTPUT_DIR=./output
   ```

   Create `apps/report-ui/.env`:
   ```env
   VITE_API_URL=http://localhost:3001
   VITE_API_KEY=dev-api-key-change-in-production
   ```

3. **Build packages:**
   ```bash
   pnpm build
   ```

## Running in Development

### Terminal 1 - Start the Scanner API:
```bash
pnpm scanner:dev
```

### Terminal 2 - Start the Report UI:
```bash
pnpm dev
```

## Testing the API

### Using curl:

1. **Start a scan:**
   ```bash
   curl -X POST http://localhost:3001/api/scan \
     -H "Content-Type: application/json" \
     -H "X-API-Key: dev-api-key-change-in-production" \
     -d '{"url": "https://example.com"}'
   ```

2. **Get scan results:**
   ```bash
   curl http://localhost:3001/api/scan/SCAN_ID \
     -H "X-API-Key: dev-api-key-change-in-production"
   ```

### Using the UI:

1. Open http://localhost:5173
2. Enter a URL (e.g., `https://example.com`)
3. Click "Start Scan"
4. Wait for results to appear

## Project Structure

- `apps/scanner/` - Express API server with security features
- `apps/report-ui/` - React frontend for viewing scan results
- `apps/widget/` - Embeddable JavaScript widget
- `packages/core/` - Shared types and utilities
- `packages/rules/` - WCAG rule engine
- `packages/report/` - Report generation utilities

## Security Notes

⚠️ **IMPORTANT:** The default API key is for development only. Change it in production!

The scanner includes:
- API key authentication
- Rate limiting (100 req/15min per IP)
- SSRF protection (blocks private IPs, localhost, non-standard ports)
- CORS protection (locked to report-ui origin)
- Path traversal protection for file storage
- Request validation with Zod

See README.md for full security documentation.

