# Phase 2 Implementation - Playwright Scanning Pipeline

## ✅ Completed Features

### 1. Updated API Schema
- **POST /api/scan** now accepts:
  ```json
  {
    "seedUrl": "https://example.com",
    "maxPages": 25,
    "maxDepth": 2,
    "includePatterns": ["/blog/.*"],
    "excludePatterns": ["/admin/.*"]
  }
  ```
- Legacy format (`url` field) still supported for backward compatibility

### 2. BFS Crawler Implementation
- **Location**: `apps/scanner/src/crawler/bfs-crawler.ts`
- Features:
  - Breadth-first search crawling
  - Same hostname restriction (only crawls within seed URL's domain)
  - URL normalization (removes hashes, normalizes trailing slashes)
  - Pattern matching (include/exclude regex patterns)
  - Concurrency control (2 pages at a time)
  - Respects maxPages and maxDepth limits
  - Error handling per page (doesn't crash entire scan)

### 3. Playwright Page Capture
- **Location**: `apps/scanner/src/crawler/page-capture.ts`
- Features:
  - Headless Chromium browser
  - Waits for `domcontentloaded` + `networkidle` (20s timeout)
  - Captures:
    - Full-page screenshot (PNG)
    - HTML content (serialized)
    - Page metadata (title, final URL)
    - Accessibility snapshot (best-effort)
  - Error handling per page

### 4. Artifact Storage
- **Structure**: `output/{scanId}/pages/{n}/`
  - `page.json` - Metadata (title, URLs, timestamps, paths)
  - `page.html` - Full HTML content
  - `screenshot.png` - Full-page screenshot
  - `a11y.json` - Accessibility snapshot (if available)
- Path traversal protection maintained

### 5. Updated Job Queue
- **Location**: `apps/scanner/src/job-queue.ts`
- Features:
  - Multi-page scan processing
  - Runs WCAG rules on each captured page
  - Aggregates findings across all pages
  - Maintains page-level error tracking
  - Generates comprehensive reports

### 6. Enhanced API Endpoints

#### POST /api/scan
- Returns: `{ scanId, status: "accepted" }`
- Validates request with Zod schema
- Supports both new and legacy formats

#### GET /api/scan/:id
- **While running**: Returns status + partial summary (pages scanned, current findings)
- **When completed**: Returns full result with:
  - All findings aggregated
  - Summary statistics
  - Page scan results array
  - Artifact paths

## File Structure

```
apps/scanner/src/
├── crawler/
│   ├── bfs-crawler.ts      # BFS crawling logic
│   ├── page-capture.ts     # Playwright page capture
│   └── url-utils.ts        # URL normalization & validation
├── job-queue.ts            # Updated job processing
├── middleware/
│   └── validation.ts       # Updated Zod schema
└── index.ts                # Updated API endpoints
```

## Dependencies Added

- `playwright@^1.40.0` - Browser automation
- Playwright Chromium browser (installed via `npx playwright install chromium`)

## Configuration

All existing security features remain:
- SSRF protection (validates each URL before crawling)
- API key authentication
- Rate limiting
- CORS protection
- Path traversal protection

## Usage Example

```bash
# Start a multi-page scan
curl -X POST http://localhost:3001/api/scan \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key-change-in-production" \
  -d '{
    "seedUrl": "https://example.com",
    "maxPages": 10,
    "maxDepth": 2,
    "includePatterns": ["/.*"],
    "excludePatterns": ["/admin/.*"]
  }'

# Check status
curl http://localhost:3001/api/scan/{scanId} \
  -H "X-API-Key: dev-api-key-change-in-production"
```

## Next Steps

The scanning pipeline is now ready for Phase 2. You can:
1. Test with real websites
2. Monitor scan progress via GET endpoint
3. Review captured artifacts in `output/{scanId}/pages/`
4. Extend with additional WCAG rules
5. Add more sophisticated crawling strategies

