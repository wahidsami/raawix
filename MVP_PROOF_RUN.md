# MVP Proof Run - End-to-End Verification

## Test Execution Plan

This document tracks the execution of a full end-to-end scan to verify the MVP is working correctly.

## Test Steps

### 1. End-to-End Scan Execution

**Target Website:** https://example.com (public, stable test site)

**Scan Configuration:**
- Seed URL: `https://example.com`
- Max Pages: 5
- Max Depth: 2

**Expected Results:**
- ✅ Artifacts saved to `output/{scanId}/pages/{n}/`
- ✅ `report.json` generated in `output/{scanId}/`
- ✅ Report UI renders summary + findings

### 2. Widget Endpoints Verification

**Endpoints to Test:**
- ✅ `/api/widget/guidance?url=https://example.com` - Returns landmarks/forms/actions
- ✅ `/api/widget/issues?url=https://example.com` - Returns user-friendly issues

### 3. Additional Features

- ✅ Scan retention policy (7 days default, env-based)
- ✅ Cache-Control: no-store on artifact responses

## Implementation Status

### ✅ Completed Implementations

1. **Scan Retention Policy**
   - ✅ Implemented in `apps/scanner/src/utils/retention.ts`
   - ✅ Default: 7 days (configurable via `SCAN_RETENTION_DAYS`)
   - ✅ Runs on startup and every 24 hours
   - ✅ Deletes scans older than retention period
   - ✅ Logs cleanup operations

2. **Cache-Control Headers**
   - ✅ Added to artifact endpoint (`/api/scan/:id/artifact/*`)
   - ✅ Headers: `Cache-Control: no-store, no-cache, must-revalidate, private`
   - ✅ Additional: `Pragma: no-cache`, `Expires: 0`
   - ✅ Prevents caching of sensitive scan artifacts

3. **Test Scripts**
   - ✅ Created `test-mvp.sh` (Bash)
   - ✅ Created `test-mvp.ps1` (PowerShell)
   - ✅ Comprehensive end-to-end verification

## Execution Log

### Step 1: Start Scanner API

```bash
cd apps/scanner
pnpm dev
```

**Status:** ✅ Ready (implementation complete)

### Step 2: Initiate Scan

```bash
curl -X POST http://localhost:3001/api/scan \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key-change-in-production" \
  -d '{"seedUrl":"https://example.com","maxPages":5,"maxDepth":2}'
```

**Expected Response:**
```json
{
  "scanId": "scan_...",
  "status": "accepted",
  "message": "Scan job queued"
}
```

**Status:** ⏳ Pending execution

### Step 3: Monitor Scan Progress

```bash
curl http://localhost:3001/api/scan/{scanId} \
  -H "X-API-Key: dev-api-key-change-in-production"
```

**Status:** ⏳ Pending execution

### Step 4: Verify Artifacts

Check `output/{scanId}/pages/` for:
- ✅ `page.json` (metadata)
- ✅ `page.html` (HTML content)
- ✅ `screenshot.png` (full-page screenshot)
- ✅ `a11y.json` (accessibility snapshot)

**Status:** ⏳ Pending execution

### Step 5: Verify report.json

Check `output/{scanId}/report.json` for:
- ✅ Complete `ScanRun` structure
- ✅ All pages included
- ✅ Rule results for each page
- ✅ Summary statistics

**Status:** ⏳ Pending execution

### Step 6: Verify Report UI

1. Start Report UI: `pnpm dev` (from root)
2. Navigate to http://localhost:5173
3. Enter API URL and API Key
4. Start scan or view existing scan
5. Verify:
   - ✅ Summary cards display correctly
   - ✅ Page table shows all pages
   - ✅ Findings detail modal works
   - ✅ Screenshots load correctly

**Status:** ⏳ Pending execution

### Step 7: Test Widget Endpoints

**Test Guidance Endpoint:**
```bash
curl "http://localhost:3001/api/widget/guidance?url=https://example.com"
```

**Expected:** Returns landmarks, forms, key actions

**Status:** ⏳ Pending execution

**Test Issues Endpoint:**
```bash
curl "http://localhost:3001/api/widget/issues?url=https://example.com"
```

**Expected:** Returns user-friendly issues list

**Status:** ⏳ Pending execution

### Step 8: Verify Retention Policy

Check that retention cleanup runs:
- ✅ Old scans (>7 days) are deleted
- ✅ Recent scans are preserved
- ✅ Cleanup runs on startup and every 24 hours

**Status:** ⏳ Pending execution

### Step 9: Verify Cache-Control Headers

Check artifact endpoint headers:
```bash
curl -I "http://localhost:3001/api/scan/{scanId}/artifact/pages/1/screenshot.png" \
  -H "X-API-Key: dev-api-key-change-in-production"
```

**Expected Headers:**
```
Cache-Control: no-store, no-cache, must-revalidate, private
Pragma: no-cache
Expires: 0
```

**Status:** ✅ Implemented (ready for verification)

### Step 10: Verify Retention Policy

Check retention configuration:
```bash
# Check config
echo $SCAN_RETENTION_DAYS  # Should be 7 (default) or configured value

# Manually trigger cleanup (for testing)
# Retention runs automatically every 24 hours and on startup
```

**Status:** ✅ Implemented (ready for verification)

## Results

### Scan Execution
- **Scan ID:** TBD
- **Status:** TBD
- **Pages Scanned:** TBD
- **Duration:** TBD

### Artifacts Verification
- **Pages Directory:** TBD
- **Files per Page:** TBD
- **Total Artifacts:** TBD

### Report Verification
- **report.json Exists:** TBD
- **Structure Valid:** TBD
- **Summary Counts:** TBD

### Widget Endpoints
- **Guidance Endpoint:** TBD
- **Issues Endpoint:** TBD
- **Response Format:** TBD

### Additional Features
- **Retention Policy:** ✅ Implemented (7 days default)
- **Cache-Control Headers:** ✅ Implemented (no-store)

## Notes

- All endpoints are read-only
- No PII collection
- Caching enabled for widget endpoints (1 hour TTL)
- Retention policy configurable via `SCAN_RETENTION_DAYS` env var

## Next Steps

1. Execute scan and verify all steps
2. Document actual results
3. Mark as "MVP Proof Run Complete"

