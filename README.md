# Raawi X - Compliance Audit Scanner

A compliance audit scanner with an assistive experience layer for accessibility testing and reporting.

## Project Structure

This is a monorepo managed with pnpm workspaces:

```
raawi-x/
├── apps/
│   ├── scanner/          # Node.js TypeScript API server
│   ├── report-ui/        # React + TypeScript + Vite frontend
│   └── widget/           # Embeddable JavaScript widget
├── packages/
│   ├── core/             # Shared types and utilities
│   ├── rules/            # WCAG rule engine and rules
│   └── report/           # JSON to HTML report generation
└── package.json          # Root workspace configuration
```

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

## Installation

1. Install dependencies:
```bash
pnpm install
```

2. Build all packages:
```bash
pnpm build
```

## Development

### Start the Scanner API

```bash
pnpm scanner:dev
```

The API server will start on `http://localhost:3001` by default.

### Start the Report UI

```bash
pnpm dev
```

The UI will start on `http://localhost:5173` by default.

### Environment Variables

Create a `.env` file in `apps/scanner/`:

```env
PORT=3001
API_KEY=your-secure-api-key-here
REPORT_UI_ORIGIN=http://localhost:5173
MAX_CONCURRENT_SCANS=5
OUTPUT_DIR=./output
# Development only - allow localhost and custom ports
ALLOW_LOCALHOST=true
ALLOWED_PORTS=80,443,4173,5173,3000,3001
```

Create a `.env` file in `apps/report-ui/`:

```env
VITE_API_URL=http://localhost:3001
VITE_API_KEY=your-secure-api-key-here
```

## Security Features

### API Security

The scanner API includes multiple security layers:

1. **API Key Authentication**
   - All API endpoints require `X-API-Key` header
   - Configure via `API_KEY` environment variable

2. **Rate Limiting**
   - 100 requests per 15 minutes per IP address
   - Configurable via `rateLimit` in config

3. **Request Validation**
   - All requests validated with Zod schemas
   - Strict type checking and sanitization

4. **CORS Protection**
   - Locked to `REPORT_UI_ORIGIN` only
   - Prevents unauthorized cross-origin requests

5. **Security Headers**
   - Helmet.js middleware for security headers
   - XSS protection, content security policy, etc.

6. **SSRF Protection**
   - Only allows `http://` and `https://` protocols
   - DNS resolution with private IP blocking
   - Blocks localhost and loopback addresses
   - Blocks private IP ranges (127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
   - Port restrictions (only 80 and 443 allowed in MVP)

7. **Path Traversal Protection**
   - Sanitized file paths for output storage
   - Validated paths stay within output directory
   - No `..` or path separators in filenames

8. **Resource Management**
   - In-memory job queue with concurrency limits
   - Prevents resource exhaustion
   - Configurable via `MAX_CONCURRENT_SCANS`

## API Endpoints

### POST /api/scan

Start a new scan job.

**Headers:**
- `X-API-Key`: Your API key
- `Content-Type`: application/json

**Request Body:**
```json
{
  "url": "https://example.com",
  "options": {
    "rules": ["wcag-1.1.1", "wcag-2.4.2"],
    "timeout": 30000,
    "depth": 1
  }
}
```

**Response:**
```json
{
  "scanId": "scan_1234567890_abc123",
  "status": "accepted",
  "message": "Scan job queued"
}
```

### GET /api/scan/:id

Get scan results.

**Headers:**
- `X-API-Key`: Your API key

**Response (Pending/Running):**
```json
{
  "scanId": "scan_1234567890_abc123",
  "status": "running",
  "startedAt": "2024-01-01T00:00:00.000Z"
}
```

**Response (Completed):**
```json
{
  "scanId": "scan_1234567890_abc123",
  "url": "https://example.com",
  "status": "completed",
  "startedAt": "2024-01-01T00:00:00.000Z",
  "completedAt": "2024-01-01T00:00:10.000Z",
  "findings": [...],
  "summary": {
    "total": 5,
    "errors": 2,
    "warnings": 2,
    "info": 1
  }
}
```

## Widget Usage

Build the widget:

```bash
cd apps/widget
pnpm build
```

The widget will be output to `apps/widget/dist/widget.js`.

Embed in your HTML:

```html
<div id="raawi-widget-container"></div>
<script src="path/to/widget.js"></script>
<script>
  const widget = new RaawiXWidget({
    apiUrl: 'http://localhost:3001',
    apiKey: 'your-api-key',
    onScanComplete: (result) => {
      console.log('Scan completed:', result);
    },
    onError: (error) => {
      console.error('Error:', error);
    }
  });
  
  widget.init('raawi-widget-container');
</script>
```

## Output Storage

Scan results are stored in the `output/` directory (configurable via `OUTPUT_DIR`):

```
output/
└── scan_1234567890_abc123/
    ├── result.json
    └── report.html
```

## Production Deployment

### Security Checklist

- [ ] Change default `API_KEY` to a strong, randomly generated key
- [ ] Set `REPORT_UI_ORIGIN` to your production frontend URL
- [ ] Configure proper CORS origins
- [ ] Set up HTTPS/TLS for all services
- [ ] Review and adjust rate limiting thresholds
- [ ] Set up proper logging and monitoring
- [ ] Configure firewall rules
- [ ] Use environment variables for all secrets
- [ ] Review output directory permissions
- [ ] Set up backup and retention policies for scan results

### Environment Variables

**Scanner (`apps/scanner/.env`):**
```env
PORT=3001
API_KEY=<generate-strong-random-key>
REPORT_UI_ORIGIN=https://your-frontend-domain.com
MAX_CONCURRENT_SCANS=10
OUTPUT_DIR=/var/raawi-x/output
NODE_ENV=production
```

**Report UI (`apps/report-ui/.env`):**
```env
VITE_API_URL=https://your-api-domain.com
VITE_API_KEY=<same-as-scanner-api-key>
```

## Database Setup (PostgreSQL)

The scanner supports PostgreSQL persistence for fast queries and UI/widget endpoints.

### Prerequisites

1. **Install PostgreSQL** (if not already installed)
2. **Create database:**
   ```sql
   CREATE DATABASE raawi_x;
   ```

3. **Set environment variable:**
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/raawi_x
   GEMINI_ENABLED=false
   GEMINI_API_KEY=your-gemini-api-key-here
   ```

### Database Commands

```bash
# Generate Prisma client (required before building)
pnpm --filter scanner db:generate

# Create and apply migration
pnpm --filter scanner db:migrate

# Deploy migrations (production)
pnpm --filter scanner db:migrate:deploy

# Open Prisma Studio (database GUI)
pnpm --filter scanner db:studio
```

For `db:migrate` (Prisma `migrate dev`), set `SHADOW_DATABASE_URL` to a dedicated shadow DB (e.g. `raawix_shadow`). See [docs/PRISMA_MIGRATE.md](docs/PRISMA_MIGRATE.md) for setup and troubleshooting.

**Note**: Database is optional. If `DATABASE_URL` is not set, the system falls back to file-based storage.

## Development Scripts

- `pnpm dev` - Start report-ui in development mode
- `pnpm scanner:dev` - Start scanner API in development mode
- `pnpm build` - Build all packages
- `pnpm lint` - Lint all packages
- `pnpm format` - Format code with Prettier
- `pnpm type-check` - Type check all packages

## Widget API Endpoints

The scanner API provides read-only endpoints for the accessibility widget:

### GET /api/widget/guidance
Fetch page guidance (landmarks, forms, key actions) by URL.

**Query Parameters:**
- `url` (required): Page URL
- `scanId` (optional): Specific scan ID
- `lang` (optional): Language code (`en` or `ar`)

### GET /api/widget/issues
Fetch known accessibility issues for a page (user-friendly explanations).

**Query Parameters:**
- `url` (required): Page URL
- `scanId` (optional): Specific scan ID
- `lang` (optional): Language code (`en` or `ar`)

### GET /api/widget/config
Get widget configuration (feature flags, language, API URL).

**Query Parameters:**
- `scanId` (optional): Scan ID
- `domain` (optional): Domain key
- `lang` (optional): Language code

**Features:**
- ✅ Read-only (no modifications)
- ✅ Cached (1 hour TTL)
- ✅ No PII collection
- ✅ Language support (en/ar)

See `WIDGET_API_DOCUMENTATION.md` for complete API documentation.

## Scan Retention Policy

Scans are automatically deleted after a retention period:

- **Default:** 7 days
- **Configurable:** `SCAN_RETENTION_DAYS` environment variable
- **Disable:** Set `SCAN_RETENTION_ENABLED=false`
- **Cleanup:** Runs on startup and every 24 hours

## Security Headers

Artifact endpoints include security headers:
- `Cache-Control: no-store, no-cache, must-revalidate, private`
- `Pragma: no-cache`
- `Expires: 0`

This prevents caching of sensitive scan artifacts.

## MVP Proof Run

See `MVP_PROOF_RUN.md` and `VERIFICATION_CHECKLIST.md` for end-to-end testing instructions.

## License

MIT

