# Raawi X — Phase 7B.5N.2 Engineering Report: Physical Request Limits & Lifecycle Correctness

**Repository:** `wahidsami/raawix`  
**Branch:** `feature/semantic-core`  
**Base Commit:** `f67723e4e03f0eb6c2a5c3b8fa6210cc0ec6d506`  
**Phase:** 7B.5N.2 (Enforce Physical Request Limits)  
**Status:** DELIVERED & COMMITTED (Awaiting Coordinator Review)

---

## 1. Executive Summary

Phase 7B.5N.2 corrects the rate-limiter defects identified in the Phase 7B.5N.1 audit report (`PHASE_7B_5N_GEMINI_RATE_LIMIT_BUDGET_REPORT.md`). All changes were executed with surgical precision and minimal footprint:
1. **Process-Wide Request Scheduler:** Created a concurrency-safe, mutex-serialized dispatch queue in `GeminiBudgetTracker` enforcing a configurable rolling 60-second request window (`GEMINI_MAX_REQUESTS_PER_MINUTE`, defaulting to a conservative 15 RPM).
2. **Physical Outbound Accounting:** Every outbound HTTP dispatch attempt, including retries (e.g. following transient HTTP 429 or HTTP 503), acquires a `DispatchSlot` and is recorded against both the per-scan ceiling (`GEMINI_MAX_REQUESTS_PER_SCAN`, default 15) and the process-wide 60-second limit. Pre-rejected requests (such as quota-blocked or budget-exhausted calls) do NOT count as physical dispatches.
3. **Process-Wide Quota Circuit Breaker:** When confirmed quota exhaustion (`quota_exhausted` via Google's `RESOURCE_EXHAUSTED` payload) occurs, a bounded 60-second global circuit breaker trips, instantly halting futile outbound calls across all scans in the process before network dispatch.
4. **Scan-State Lifecycle & Ephemeral Isolation:** Eliminated the shared `'default'` state key. Un-keyed callers receive unique ephemeral IDs (`_ephemeral_${counter}_${ts}`). Added `pendingRequests` reference counting so scan cleanup does not orphan or delete states while requests are in-flight. Hooked `geminiBudgetTracker.cleanup(scanId)` into the `finally` block of `JobQueue.executeJob`, backed by a 15-minute TTL eviction policy.
5. **Deterministic Testing (Zero Real-Time Waiting):** Added injectable virtual clock and sleep hooks (`setCustomTimer`) in `GeminiBudgetTracker`. The 7 new regression scenarios (Scenarios 32–38) execute in ~180 milliseconds without waiting for real-world 60-second timers.

---

## 2. Exact Behavior Changes

### A. Configuration (`apps/scanner/src/config.ts`)
- Added `maxRequestsPerMinute: parseInt(process.env.GEMINI_MAX_REQUESTS_PER_MINUTE || '15', 10)` under `config.gemini`.
- Treated 15 RPM as a configurable safety parameter rather than an immutable Google quota ceiling.

### B. Concurrency-Safe Request Scheduler (`apps/scanner/src/vision/gemini-budget.ts`)
- **Mutex Dispatch Chain:** Implemented `acquireDispatchSlot(scanId)` backed by `this.schedulerQueue = this.schedulerQueue.then(async () => { ... })`. This serializes slot checks and reservations, preventing concurrent race conditions.
- **Rolling 60-Second Window:** Tracks `dispatchTimestamps: number[]`. When `dispatchTimestamps.length >= maxRequestsPerMinute`, the scheduler computes the time remaining until the oldest dispatch timestamp reaches 60,000 ms (`waitMs = oldest + 60000 - now`) and suspends dispatch via `sleep(waitMs)`. Timestamps at or beyond 60s are pruned (`<= cutoff`).
- **Physical Dispatch Reservation:** Upon slot acquisition, `state.requestsAttempted++`, `state.pendingRequests++`, and the dispatch timestamp are recorded. Returns a `release()` callback.
- **Process-Wide Circuit Breaker:** Added `globalCircuitOpen`, `globalCircuitReason`, and `globalCircuitTrippedAt` with a bounded 60-second TTL. Tripped by `tripCircuit(scanId, 'quota_exhausted')`.
- **Scan Isolation:** Replaced `'default'` fallback with `resolveScanId(scanId)` generating unique `_ephemeral_${counter}_${now}` identifiers.
- **Safe State Cleanup:** `cleanup(scanId)` checks `state.pendingRequests > 0`. If requests are in-flight, it sets `state.markedForCleanup = true`, deferring deletion until the last slot's `release()` executes. Un-referenced stale states are evicted after 15 minutes (`evictStaleStates`).
- **Injectable Timer Hooks:** Added `setCustomTimer(nowFn, sleepFn)` and automatic cleanup in `reset()` to enable virtual-clock deterministic unit testing.

### C. Outbound Dispatch & Retry Integration (`apps/scanner/src/vision/gemini-provider.ts`)
- In `executeWithRetry`:
  - Each attempt in the retry loop (`for (let attempt = 0; attempt <= maxRetries; attempt++)`) calls `await geminiBudgetTracker.acquireDispatchSlot(this.scanId)`.
  - If `!slot.allowed`, the provider aborts immediately without dispatching HTTP calls or incrementing dispatch counters.
  - The slot is released in `finally { slot.release?.(); }`, guaranteeing `pendingRequests` decrements accurately.
  - If a 429 response contains `RESOURCE_EXHAUSTED` / `quota`, `geminiBudgetTracker.tripCircuit(this.scanId, 'quota_exhausted')` is triggered, engaging the process-wide circuit breaker.

### D. Lifecycle Integration (`apps/scanner/src/job-queue.ts`)
- In `JobQueue.executeJob`:
  - Added `geminiBudgetTracker.cleanup(scanId)` inside the existing `finally` block alongside `activePageCaptures.delete(scanId)` and `running.delete(job.id)`.

---

## 3. Test Verification Results

### A. Focused Regression Suite (`gemini-telemetry-regression.test.ts`)
Command: `pnpm --filter @raawi-x/scanner test -- src/vision/gemini-telemetry-regression.test.ts --run`
- **Result:** 38 / 38 tests passed (100%) in **174 ms**.
- **Coverage of Phase 7B.5N.2 Requirements:**
  - **Scenario 32:** Physical request accounting includes retries (HTTP 503 x 2 + HTTP 200 = 3 physical attempts recorded).
  - **Scenario 33:** Rolling-window pacing with concurrent requests (5 simultaneous requests paced through 3 RPM limit without race conditions).
  - **Scenario 34:** Concurrent scans sharing the process-level limit (Scan A and Scan B saturate 2 RPM; Scan C waits until window rolls over).
  - **Scenario 35:** Confirmed quota exhaustion halts subsequent requests process-wide (Scan A encounters quota exhaustion; Scan B is blocked before network dispatch).
  - **Scenario 36:** HTTP 503 retry behavior remains bounded (1 initial + 2 retries = 3 physical attempts, then halts with `service_unavailable`).
  - **Scenario 37:** Per-scan budget exhaustion stops dispatches without consuming global slots (3rd request blocked without calling `doFetch`).
  - **Scenario 38:** Cleanup without cross-scan state leakage (ephemeral IDs isolated, idle cleanup immediate, pending requests defer cleanup safely).

### B. Full Scanner Test Suite
Command: `pnpm --filter @raawi-x/scanner test -- --run`
- **Result:** 26 / 26 test files passed, 183 / 183 tests passed (100%) in **7.06 s**.

### C. Scanner Production Build
Command: `pnpm --filter @raawi-x/scanner build`
- **Result:** TypeScript clean compile (`tsc -b`), static assets copied (`copy-static-assets.mjs`). Exit code 0.

---

## 4. Operational & Resource Status
- **Disk Space:**
  - Drive C: 22.8 GB free
  - Drive D: 78.8 GB free
- **Operational Discipline:**
  - Zero live scans, crawls, or browser-agent runs initiated.
  - Zero outbound calls made to Google Gemini or OpenAI APIs (100% mocked fetch and timers).
  - Zero Coolify configuration changes, deployments, or remote database mutations.
  - Zero new dependencies added.

---

## 5. Remaining Limitations & Architectural Notes
1. **Single-Process Scope:** `GeminiBudgetTracker` paces and enforces limits process-wide (within the scanner Node process). If scanner workers are clustered horizontally across multiple machines or separate container instances in the future without sticky routing, process-level schedulers do not share state across containers without a distributed Redis token-bucket. For the current single-process architecture, this in-memory scheduler is concurrency-safe and zero-latency.
2. **Global Quota TTL:** The process-wide circuit breaker stays open for 60 seconds (`globalCircuitTtlMs = 60000`) after confirmed quota exhaustion before allowing a single probe request to check if Google quota reset. This prevents infinite lockouts while protecting the system from futile loops.
