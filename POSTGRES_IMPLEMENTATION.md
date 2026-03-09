# Postgres Persistence Implementation - Raawi X

## Overview

Postgres persistence has been added to the Raawi X scanner using Prisma ORM. The database stores scan metadata, page indices, rule results, and vision findings for fast queries and powering UI/widget endpoints.

## Implementation Status

✅ **Complete** - All features implemented

## Database Schema

**Location**: `apps/scanner/prisma/schema.prisma`

### Tables

1. **Scan**
   - `id` (UUID, primary key)
   - `scanId` (String, unique) - Custom scan ID format
   - `seedUrl`, `status`, `startedAt`, `completedAt`
   - `maxPages`, `maxDepth`, `hostname`
   - `summaryJson` (JSON) - ScanRunSummary
   - Indexes: scanId, (hostname, completedAt), status

2. **Page**
   - `id` (UUID, primary key)
   - `scanId` (foreign key to Scan)
   - `pageNumber`, `url`, `title`, `finalUrl`
   - `screenshotPath`, `htmlPath`, `a11yPath`, `visionPath`
   - `error`
   - Unique constraint: (scanId, pageNumber)
   - Indexes: scanId, url

3. **Finding**
   - `id` (UUID, primary key)
   - `scanId`, `pageId` (foreign keys)
   - `ruleId`, `wcagId`, `level` (A/AA/AAA/vision)
   - `status`, `confidence`, `message`
   - `evidenceJson` (JSON), `howToVerify`
   - Indexes: scanId, pageId, ruleId, wcagId, status

4. **VisionFinding**
   - `id` (UUID, primary key)
   - `scanId`, `pageId` (foreign keys)
   - `kind`, `bboxJson` (JSON), `detectedText`
   - `confidence`, `correlatedSelector`
   - `evidenceJson` (JSON), `suggestedWcagIdsJson` (JSON)
   - Indexes: scanId, pageId, kind

## Configuration

### Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/raawi_x
```

**Note**: Database is only enabled if `DATABASE_URL` is set. If not set, the system falls back to file-based storage only.

### Prisma Commands

```bash
# Generate Prisma client
pnpm --filter scanner db:generate

# Create migration
pnpm --filter scanner db:migrate

# Deploy migrations (production)
pnpm --filter scanner db:migrate:deploy

# Open Prisma Studio
pnpm --filter scanner db:studio
```

## Pipeline Integration

### 1. Scan Creation (`apps/scanner/src/job-queue.ts`)

**On scan creation:**
- Inserts `Scan` record with status `queued`
- Stores: scanId, seedUrl, maxPages, maxDepth, hostname

### 2. Scan Start

**On scan start:**
- Updates `Scan` status to `running`

### 3. Page Capture (`apps/scanner/src/crawler/bfs-crawler.ts`)

**On each page capture:**
- Upserts `Page` row after successful capture
- Stores: pageNumber, url, title, finalUrl, paths, error

### 4. Report Generation (`apps/scanner/src/job-queue.ts`)

**After report generation:**
- Bulk inserts `Finding` rows (all rule results)
- Bulk inserts `VisionFinding` rows (from vision.json files)
- Updates `Scan` with `summaryJson` and status `completed`

### 5. API Endpoints (`apps/scanner/src/index.ts`)

**GET /api/scan/:id:**
- Reads from database first (if available)
- Falls back to `report.json` if DB entry missing
- Uses `dbScanToApiResponse` adapter

### 6. Widget Endpoints (`apps/scanner/src/api/widget-service.ts`)

**Updated to query database:**
- `getPageGuidance`: Queries DB for latest scan by hostname
- `getPageIssues`: Queries DB for latest scan by hostname
- Falls back to file system if DB not available

## Repository Pattern

**Location**: `apps/scanner/src/db/scan-repository.ts`

**Methods**:
- `createScan()` - Create scan record
- `updateScanStatus()` - Update scan status
- `upsertPage()` - Upsert page record
- `saveReportResults()` - Bulk insert findings and vision findings
- `getScan()` - Get scan by scanId
- `getLatestScanForHostname()` - Get latest completed scan for hostname

## Retention Policy

**Location**: `apps/scanner/src/utils/retention.ts`

**Updated to:**
- Delete scans from database (cascade deletes related records)
- Delete corresponding `output/{scanId}` folders
- Runs on startup and every 24 hours
- Configurable via `SCAN_RETENTION_DAYS` (default: 7 days)

## Security

✅ **API key auth** - Uses existing API key authentication  
✅ **Env-only credentials** - DATABASE_URL loaded from environment only  
✅ **No logging of DATABASE_URL** - Credentials never logged  
✅ **Path traversal protection** - All file operations validated  

## Artifacts

Artifacts remain on disk under `output/{scanId}`:
- Screenshots, HTML, a11y snapshots, vision crops
- Future: Can move to object storage (S3, etc.)

## Migration Guide

1. **Set up PostgreSQL database:**
   ```sql
   CREATE DATABASE raawi_x;
   ```

2. **Set DATABASE_URL environment variable:**
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/raawi_x
   ```

3. **Run migrations:**
   ```bash
   pnpm --filter scanner db:migrate
   ```

4. **Start scanner:**
   ```bash
   pnpm scanner:dev
   ```

## Fallback Behavior

- If `DATABASE_URL` is not set, database operations are skipped
- System falls back to file-based storage (`report.json`)
- All endpoints continue to work without database

## Testing

To test Postgres persistence:

1. Set `DATABASE_URL` environment variable
2. Run migrations: `pnpm --filter scanner db:migrate`
3. Start scanner: `pnpm scanner:dev`
4. Create a scan via API
5. Verify data in database:
   - Check `Scan` table for scan record
   - Check `Page` table for page records
   - Check `Finding` and `VisionFinding` tables after scan completes
6. Query via API: `GET /api/scan/:id` should return data from database

## Notes

- Database is **optional** - system works without it
- Artifacts remain on disk (not in database)
- Database is used for **fast queries** and **UI/widget endpoints**
- All database operations are **non-blocking** - failures don't crash scans
- Retention policy cleans up both database and file system

