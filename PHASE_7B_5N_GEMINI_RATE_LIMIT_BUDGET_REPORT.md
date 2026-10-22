# Raawi X — Phase 7B.5N: Controlled Gemini Rate-Limit Resilience Report

**Repository:** `wahidsami/raawix`  
**Branch:** `feature/semantic-core`  
**Base Commit:** `4ecb74b7bcf46e7df239c1581ba36aa80777326b`  
**Phase:** 7B.5N — Controlled Gemini Rate-Limit Resilience  
**Date:** 2026-10-22  

---

## 1. Executive Summary

Phase 7B.5N establishes comprehensive rate-limit resilience, bounded request budgeting, circuit breaking, and cross-layer deduplication for external Google Gemini AI vision integration in Raawi X.

In the authorized Phase 7B.5M verification scan (`scan_1792657060743_e63osv1`), 3 of 8 element descriptions in Layer 2 succeeded with HTTP 200, but subsequent calls encountered HTTP 429 quota exhaustion and HTTP 503 service overload. Because the scanner lacked request budgeting, retry bounds, circuit breaking, and Layer 2-to-Layer 3 deduplication, Layer 3 attempted 8 subsequent HTTP calls that repeatedly failed with HTTP 429.

Phase 7B.5N addresses each of these root causes through minimal, surgical improvements:
1. **Per-scan request budgeting & circuit breaker (`GeminiBudgetTracker`):** Limits total requests per scan (`maxRequestsPerScan: 15`, default) and retry delay budget (`maxRetryBudgetMs: 10000`, default). Immediately trips the circuit breaker upon confirmed quota exhaustion (`quota_exhausted`), eliminating futile outbound requests.
2. **Bounded exponential backoff with jitter and `Retry-After` support:** Transient HTTP 429 rate limits and HTTP 503 service unavailable responses back off using exponential delay with randomized jitter, honoring standard `Retry-After` headers within the scan budget ceiling.
3. **Layer 2 to Layer 3 description reuse:** `AssistiveMapGenerator.processVisionFindings` inspects existing Layer 2 findings (`finding.evidenceJson.geminiDescription`). When an unlabeled control in the DOM matches the finding's correlated selector and already has a successful Gemini description, the description is incorporated directly with `source: 'gemini'` and `confidence: 'medium'`, eliminating duplicate API requests.
4. **Diagnostic status granularity and zero secret leakage:** Categorizes diagnostics into `rate_limit_exceeded`, `quota_exhausted`, `service_unavailable`, and `request_budget_exhausted` while guaranteeing that no credentials, authorization headers, base64 payloads, or raw provider bodies are exposed.
5. **Deterministic regression test suite:** 10 new test scenarios (Scenarios 22–31) added to `gemini-telemetry-regression.test.ts`. All 31/31 regression tests and all 176/176 scanner tests pass with zero regressions.

---

## 2. Request-Flow Audit Findings

| Audit Question | Verified Mechanism Prior to Phase 7B.5N | Correction Implemented in Phase 7B.5N |
|---|---|---|
| **Calls triggered per candidate / page** | Layer 2 could trigger up to 2 calls per candidate (`extractText` + `describeElement`). Layer 3 triggered an additional call per unlabeled control plus 1 call per image. For 8 findings + 8 images, this could generate 24–32 calls. | Capped total Gemini calls per scan via `config.gemini.maxRequestsPerScan: 15`. Circuit breaker halts further attempts once quota is exhausted or budget is reached. |
| **Retry & backoff behavior** | Zero retries. HTTP 429 and 503 failed immediately without backoff, yet subsequent items in the loop continued hammering the endpoint. | Implemented bounded exponential backoff with jitter up to `maxRetries: 2` and `maxDelayMs: 5000`. Honors standard `Retry-After` headers. Halts retries if cumulative delay exceeds `maxRetryBudgetMs: 10000`. |
| **Layer 2 & Layer 3 redundancy** | Layer 2 evaluated unlabeled icon buttons and generated Gemini descriptions. Layer 3 re-evaluated the same controls, checked only `detectedText`, ignored `geminiDescription`, and called Gemini again on the full viewport screenshot. | Layer 3 checks `finding.evidenceJson.geminiDescription`. When present and matching the DOM element selector, Layer 3 reuses it directly, increments telemetry counters, and performs zero network requests. |
| **Layer 3 repeated calls after rate limiting** | `processImages` had no circuit breaker awareness. When image 1 failed with 429, images 2 through 8 each attempted separate outbound HTTP requests, all failing with 429. | Circuit breaker trips on HTTP 429 quota exhaustion. Subsequent image candidates in Layer 3 skip outbound requests, record sanitized failures (`quota_exhausted` or `request_budget_exhausted`), and preserve existing DOM findings and cached images. |

---

## 3. Minimal Changes Implemented

### A. Configuration (`apps/scanner/src/config.ts`)
Added bounded configuration options under `config.gemini`:
- `maxRequestsPerScan: 15` (environment variable: `GEMINI_MAX_REQUESTS_PER_SCAN`)
- `maxRetries: 2` (environment variable: `GEMINI_MAX_RETRIES`)
- `baseDelayMs: 1000` (environment variable: `GEMINI_BASE_DELAY_MS`)
- `maxDelayMs: 5000` (environment variable: `GEMINI_MAX_DELAY_MS`)
- `maxRetryBudgetMs: 10000` (environment variable: `GEMINI_MAX_RETRY_BUDGET_MS`)

### B. Gemini Budget Tracker (`apps/scanner/src/vision/gemini-budget.ts`)
Created `GeminiBudgetTracker` singleton providing:
- Per-scan state isolation keyed by `scanId`.
- Atomic request attempt recording and limit enforcement.
- Circuit breaker state (`isCircuitOpen`, `getCircuitReason`, `tripCircuit`).
- Cumulative retry delay tracking against `maxRetryBudgetMs`.

### C. Resilient Gemini Provider (`apps/scanner/src/vision/gemini-provider.ts`)
- Constructor accepts `scanId?: string` and registers logger and budget state.
- Centralized `executeWithRetry`:
  - Validates budget before executing requests.
  - Distinguishes HTTP 429 quota exhaustion (`RESOURCE_EXHAUSTED` / `quota`) from transient concurrency rate limits.
  - Parses `Retry-After` header (integer seconds or HTTP date string).
  - Implements bounded exponential backoff with random jitter.
  - Handles HTTP 503 (service unavailable) with separate retry bounds.
  - Non-retryable HTTP errors (400, 401, 403, 404) fail immediately without retry delay.

### D. Provider Telemetry & Sanitization (`apps/scanner/src/vision/provider-telemetry.ts`)
- Extended `DiagnosticStatus` and `ErrorCategory` with:
  - `'rate_limit_exceeded'`
  - `'quota_exhausted'`
  - `'service_unavailable'`
  - `'request_budget_exhausted'`
- `createProviderDiagnostics` maps raw responses to sanitized statuses while strictly stripping raw error text, API keys, and authorization headers.

### E. Safe Cross-Layer Reuse (`apps/scanner/src/assistive/assistive-map-generator.ts`)
- In `processVisionFindings`: Checks for existing Layer 2 description in `finding.evidenceJson?.geminiDescription?.candidates?.[0]?.content?.parts?.[0]?.text`.
- Reuses the description when the DOM element selector matches and is unlabeled.
- Assigns `source: 'gemini'`, `confidence: 'medium'`, and `safetyNote: 'AI-generated label - verify accuracy'`.
- Records success in `map.providerTelemetry` and makes zero outbound HTTP requests.

---

## 4. Verification Evidence

### A. Regression Suite Results
Suite: `apps/scanner/src/vision/gemini-telemetry-regression.test.ts`
- **Total Tests:** 31
- **Passed:** 31
- **Failed:** 0
- **Duration:** 1.29s

| Scenario | Focus | Verdict |
|---|---|---|
| **Scenario 1–21** | Cropping, thought-content isolation, fallback paths, and model resolution (Phase 7B.5K/L) | **PASS** |
| **Scenario 22** | HTTP 429 triggers bounded backoff and respects retry ceiling | **PASS** |
| **Scenario 23** | HTTP 503 follows separate retry policy and bounds | **PASS** |
| **Scenario 24** | Valid `Retry-After` header is respected up to budget ceiling | **PASS** |
| **Scenario 25** | Exhausted request budget stops further provider calls immediately | **PASS** |
| **Scenario 26** | Layer 2 successful descriptions preserved when later calls fail | **PASS** |
| **Scenario 27** | Layer 3 safely falls back to DOM/heuristic output when AI calls fail | **PASS** |
| **Scenario 28** | Layer 3 safely reuses Layer 2 description when identity & provenance match | **PASS** |
| **Scenario 29** | Layer 3 rejects reuse when selector/element identity mismatches | **PASS** |
| **Scenario 30** | Provider telemetry counters remain exact across retries, failures, and budget exhaustion | **PASS** |
| **Scenario 31** | Zero secrets, keys, or raw error bodies exposed in diagnostics or evidenceJson | **PASS** |

### B. Full Scanner Suite
- Command: `pnpm --filter @raawi-x/scanner test -- --run`
- **Test Files:** 26 passed (26)
- **Tests:** 176 passed (176)
- **Duration:** 6.79s
- **Regressions:** Zero

### C. Build Verification
- Command: `pnpm --filter @raawi-x/scanner build`
- TypeScript project compilation (`tsc -b`): Clean exit code 0.

---

## 5. Strict Operational Boundaries Adherence

- **Zero scans or crawls launched:** No live scans submitted to `test-api.unifinitylab.com` or local environments.
- **Zero outbound external AI requests:** All verification executed using isolated local test harnesses and unit test spies.
- **Zero remote environment mutations:** No deployments, Coolify updates, production access, database migrations, or billing changes.
- **Data protection:** Guaranteed zero secrets, authorization headers, or base64 image strings exposed in logs or telemetry.
- **Branch integrity:** All work contained on `feature/semantic-core`.
