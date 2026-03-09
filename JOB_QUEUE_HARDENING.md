# Job Queue Hardening - Implementation Summary

## Overview

The job queue has been hardened with a strict state machine, idempotent execution, concurrency limits, timeouts, and structured logging.

## ✅ Implemented Features

### 1. Strict State Machine

**States:**
- `queued` → Initial state when job is created
- `running` → Job is actively executing
- `completed` → Job finished successfully
- `failed` → Job failed (error or timeout)
- `canceled` → Job was canceled by user

**Valid Transitions:**
```
queued → running | canceled
running → completed | failed | canceled
completed → (terminal)
failed → (terminal)
canceled → (terminal)
```

**Implementation:**
- `transitionState()` method enforces valid transitions
- Throws error on invalid transitions
- All state changes logged with structured logger

### 2. Concurrency Limits

**Job Level:**
- Enforced in `processQueue()`: `if (this.running.size >= config.maxConcurrentScans)`
- Default: 5 concurrent scans (configurable via `MAX_CONCURRENT_SCANS`)
- Tracked via `running: Set<string>`

**Page Crawl Level:**
- Enforced in `BFSCrawler.crawl()`: `batch.length < this.concurrency`
- Default: 2 pages at a time
- Prevents resource exhaustion during crawling

**Code Locations:**
- Job level: `apps/scanner/src/job-queue.ts:115-144`
- Page level: `apps/scanner/src/crawler/bfs-crawler.ts:71-93`

### 3. Per-Scan Timeout (Job TTL)

**Implementation:**
- Each job has a `ttl` (time to live) timestamp
- TTL = `Date.now() + maxRuntimeMs + 5 minutes buffer`
- Timeout enforced in two places:
  1. **Promise.race()** in `executeJob()` - kills running job
  2. **cleanupStaleJobs()** - cleans up queued/running jobs that exceeded TTL

**Behavior:**
- If timeout occurs during execution → job marked as `failed`
- If job in queue exceeds TTL → marked as `failed` before execution
- Audit log: `scan_timeout` event

**Code Locations:**
- TTL assignment: `apps/scanner/src/job-queue.ts:67-70`
- Timeout promise: `apps/scanner/src/job-queue.ts:158-162`
- Cleanup: `apps/scanner/src/job-queue.ts:250-264`

### 4. Idempotent Job Execution

**Strategy: Restart Cleanly**

**If `report.json` exists:**
- Load existing report
- Short-circuit to `completed` state
- Return immediately (no re-execution)
- Log: "Existing scan found, short-circuiting to completed"

**If partial artifacts exist:**
- Remove `pages/` directory
- Restart scan cleanly
- Log: "Partial artifacts found, cleaning up for restart"

**Implementation:**
```typescript
// Check 1: In addJob() - before creating job
if (existsSync(reportPath)) {
  // Load and return existing scan
}

// Check 2: In executeJob() - before execution
if (existsSync(reportPath)) {
  // Load and short-circuit
}

// Cleanup: If partial artifacts exist
if (existsSync(pagesDir)) {
  await rm(pagesDir, { recursive: true, force: true });
}
```

**Code Locations:**
- `apps/scanner/src/job-queue.ts:60-85` (addJob idempotency)
- `apps/scanner/src/job-queue.ts:280-310` (executeJob idempotency)

### 5. Structured Logging with scanId Correlation

**Implementation:**
- Created `StructuredLogger` class in `apps/scanner/src/utils/logger.ts`
- All logs include `scanId` for correlation
- JSON format for easy parsing
- Log levels: `info`, `warn`, `error`

**Log Format:**
```json
{
  "timestamp": "2024-12-19T...",
  "level": "info",
  "scanId": "scan_...",
  "message": "...",
  "metadata": { ... }
}
```

**Usage:**
- Created per job execution: `new StructuredLogger(scanId)`
- All operations logged with context
- Audit logs still use `auditLogger` for persistence

**Code Location:**
- `apps/scanner/src/utils/logger.ts`

## API Changes

### New Endpoint: POST /api/scan/:id/cancel

Cancel a running or queued scan.

**Request:**
```
POST /api/scan/:id/cancel
Headers: X-API-Key: ...
```

**Response:**
```json
{
  "scanId": "scan_...",
  "status": "canceled",
  "message": "Scan canceled successfully"
}
```

**Behavior:**
- Can cancel `queued` or `running` jobs
- Cannot cancel `completed`, `failed`, or `canceled` jobs
- Removes job from queue if `queued`
- Stops execution if `running`
- Logs cancellation event

## State Machine Flow

```
┌─────────┐
│ queued  │
└────┬────┘
     │
     ├───[start execution]───┐
     │                        │
     └───[cancel]───┐         │
                    │         │
                    ▼         ▼
              ┌──────────┐  ┌─────────┐
              │ canceled │  │ running │
              └──────────┘  └────┬────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼            ▼            ▼
              ┌──────────┐  ┌─────────┐  ┌──────────┐
              │completed │  │ failed  │  │ canceled │
              └──────────┘  └─────────┘  └──────────┘
```

## Concurrency Enforcement

### Job Level
- **Limit**: `config.maxConcurrentScans` (default: 5)
- **Enforcement**: `processQueue()` checks `running.size`
- **Tracking**: `Set<string>` of running scan IDs

### Page Crawl Level
- **Limit**: `concurrency = 2` (hardcoded in BFSCrawler)
- **Enforcement**: Batch processing in `crawl()` loop
- **Behavior**: Processes up to 2 pages in parallel

## Timeout Handling

### Per-Scan Timeout
- **Duration**: `config.quotas.maxRuntimeMs` (default: 10 minutes)
- **Enforcement**: `Promise.race([crawlPromise, timeoutPromise])`
- **Result**: Job marked as `failed` with timeout error

### Job TTL
- **Duration**: `maxRuntimeMs + 5 minutes buffer`
- **Enforcement**: `cleanupStaleJobs()` checks TTL
- **Result**: Stale jobs marked as `failed` before execution

## Idempotency Guarantees

### Scenario 1: Complete Report Exists
- **Detection**: `existsSync(reportPath)`
- **Action**: Load report, return `completed` state
- **Result**: No re-execution, instant response

### Scenario 2: Partial Artifacts Exist
- **Detection**: `existsSync(pagesDir)` but no `report.json`
- **Action**: Remove `pages/` directory, restart cleanly
- **Result**: Clean restart, no partial data corruption

### Scenario 3: No Artifacts
- **Detection**: No `report.json` and no `pages/`
- **Action**: Normal execution
- **Result**: Full scan execution

## Structured Logging Examples

### Job Created
```json
{
  "timestamp": "2024-12-19T...",
  "level": "info",
  "scanId": "scan_123",
  "message": "Scan job created",
  "seedUrl": "https://example.com",
  "maxPages": 25,
  "maxDepth": 2
}
```

### State Transition
```json
{
  "timestamp": "2024-12-19T...",
  "level": "info",
  "scanId": "scan_123",
  "message": "State transition",
  "oldStatus": "queued",
  "newStatus": "running"
}
```

### Idempotency Check
```json
{
  "timestamp": "2024-12-19T...",
  "level": "info",
  "scanId": "scan_123",
  "message": "Existing scan found, short-circuiting to completed",
  "pages": 10
}
```

## Error Handling

### Invalid State Transition
- **Error**: `Invalid state transition: completed -> running`
- **Action**: Throws error, prevents invalid state change
- **Logging**: Error logged with structured logger

### Timeout During Execution
- **Error**: `Scan exceeded maximum runtime of 600000ms`
- **Action**: Job marked as `failed`, cleanup performed
- **Logging**: `scan_timeout` audit event

### Cancel During Execution
- **Detection**: `this.canceled.has(scanId)` checks
- **Action**: Job marked as `canceled`, execution stops
- **Logging**: Info log with cancellation reason

## Testing Recommendations

1. **State Machine Tests**:
   - Verify valid transitions work
   - Verify invalid transitions throw errors
   - Verify terminal states cannot transition

2. **Concurrency Tests**:
   - Verify job-level limit enforced
   - Verify page-level limit enforced
   - Verify queue processes correctly

3. **Timeout Tests**:
   - Verify per-scan timeout works
   - Verify TTL cleanup works
   - Verify stale jobs are cleaned up

4. **Idempotency Tests**:
   - Verify existing report short-circuits
   - Verify partial artifacts are cleaned up
   - Verify restart works correctly

5. **Cancel Tests**:
   - Verify queued jobs can be canceled
   - Verify running jobs can be canceled
   - Verify terminal jobs cannot be canceled

## Configuration

```typescript
// apps/scanner/src/config.ts
maxConcurrentScans: 5,           // Job-level concurrency
quotas: {
  maxPagesHardLimit: 200,        // Max pages per scan
  maxRuntimeMs: 600000,          // 10 minutes per scan
}
```

## Summary

✅ **Strict state machine** with validated transitions
✅ **Concurrency limits** at job and page levels
✅ **Per-scan timeout** with TTL cleanup
✅ **Idempotent execution** with restart strategy
✅ **Structured logging** with scanId correlation
✅ **Cancel endpoint** for job management
✅ **Defense in depth** with multiple safety checks

The job queue is now hardened with robust state management, resource limits, and observability.

