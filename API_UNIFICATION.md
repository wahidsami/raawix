# API Response Model Unification

## Overview

The API response model has been unified to always derive from `output/{scanId}/report.json` as the single source of truth.

## Changes Made

### 1. Unified API Response Model

Created `apps/scanner/src/api/response-adapter.ts` with:

- **`ScanApiResponse`** interface: Unified response format with:
  - Scan metadata (id, seedUrl, startedAt, completedAt, status, error)
  - Summary (totalPages, totalRules, aFailures, aaFailures, needsReview, byStatus)
  - Pages list with per-page counts (pass, fail, needs_review, na, total)
  - Findings drill-down with full evidence, howToVerify, and screenshot paths

- **`scanRunToApiResponse()`** function: Converts `ScanRun` (from report.json) to unified API response
  - Includes screenshot path URLs (relative to API base URL)
  - Flattens all rule results into findings array
  - Calculates per-page counts

- **`scanRunToLegacyResult()`** function: Adapter for backward compatibility (if needed)

### 2. Updated GET /api/scan/:id Endpoint

**Before:**
- Returned `ScanRun` directly from job queue
- Mixed sources (job queue vs report.json)
- Inconsistent response format

**After:**
- **Always reads from `report.json` first** (source of truth)
- Falls back to job queue only for pending/running scans
- Returns unified `ScanApiResponse` format
- Includes screenshot URLs in findings

**Response Structure:**
```typescript
{
  scanId: string;
  seedUrl: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  error?: string;
  summary: {
    totalPages: number;
    totalRules: number;
    aFailures: number;      // WCAG A failures
    aaFailures: number;     // WCAG AA failures
    needsReview: number;    // Items needing review
    byStatus: {
      pass: number;
      fail: number;
      needs_review: number;
      na: number;
    };
  };
  pages: Array<{
    pageNumber: number;
    url: string;
    title?: string;
    finalUrl?: string;
    status: 'success' | 'failed';
    error?: string;
    counts: {
      pass: number;
      fail: number;
      needs_review: number;
      na: number;
      total: number;
    };
    screenshotPath?: string;  // Full URL to screenshot
  }>;
  findings: Array<{
    pageNumber: number;
    pageUrl: string;
    ruleId: string;
    wcagId?: string;
    level?: 'A' | 'AA' | 'AAA';
    status: 'pass' | 'fail' | 'needs_review' | 'na';
    confidence: 'high' | 'medium' | 'low';
    message?: string;
    evidence: EvidenceItem[];
    howToVerify: string;
    screenshotPath?: string;  // Full URL to screenshot
  }>;
}
```

### 3. GET /api/scan/:id/report Endpoint

**Unchanged:** Still returns raw `ScanRun` from `report.json` for:
- Backward compatibility
- Direct access to canonical format
- UI components that prefer raw format

### 4. Removed Fallbacks

- Removed all fallbacks to different `ScanResult` shape
- All responses now derive from `report.json` when available
- Job queue only used for in-progress scans (before report.json exists)

## Benefits

1. **Single Source of Truth**: `report.json` is always the canonical source
2. **Consistent Format**: All API responses use the same structure
3. **Rich Findings**: Includes evidence, howToVerify, and screenshot paths
4. **Per-Page Counts**: Easy to display page-level statistics
5. **Screenshot URLs**: Pre-built URLs for easy access
6. **Backward Compatible**: Raw report.json still available via `/report` endpoint

## Migration Notes

### For API Consumers

**Old behavior:**
```typescript
// GET /api/scan/:id returned ScanRun directly
const scanRun = await fetch('/api/scan/:id');
```

**New behavior:**
```typescript
// GET /api/scan/:id returns unified ScanApiResponse
const response = await fetch('/api/scan/:id');
// response.summary.aFailures, response.findings, etc.
```

**If you need raw ScanRun:**
```typescript
// Use /api/scan/:id/report for raw format
const scanRun = await fetch('/api/scan/:id/report');
```

### For Report UI

The report UI currently uses `/api/scan/:id/report` which returns raw `ScanRun`. This continues to work.

To use the unified format:
```typescript
// Switch to /api/scan/:id for unified response
const response = await fetch('/api/scan/:id');
// Use response.summary, response.pages, response.findings
```

## File Changes

- ✅ Created: `apps/scanner/src/api/response-adapter.ts`
- ✅ Updated: `apps/scanner/src/index.ts` (GET /api/scan/:id endpoint)
- ✅ No changes needed: `apps/scanner/src/index.ts` (GET /api/scan/:id/report endpoint)

## Testing

- ✅ Build successful
- ✅ TypeScript compilation passes
- ✅ No linter errors
- ⚠️ Integration tests needed to verify response format

## Next Steps

1. Update report-ui to use unified response format (optional)
2. Add integration tests for API response format
3. Document API response format in README
4. Consider deprecating legacy endpoints if not needed

