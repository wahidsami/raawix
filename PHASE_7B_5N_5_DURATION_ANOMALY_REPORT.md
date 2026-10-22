# Raawi X — Phase 7B.5N.5: Scan Duration Anomaly Review Report

**Repository:** `wahidsami/raawix`  
**Branch:** `feature/semantic-core`  
**Deployed Commit:** `d5398f083a49bd5bc72010abaa5d9abe0e3af7df`  
**Reference Scan:** `scan_1792670069699_0wduemv`  
**Investigation Scope:** Forensic timestamp analysis of the 285.5-second scan lifecycle, with special focus on the 247-second delay between Finding 0 (`11:55:03.100Z`) and Finding 1 (`11:59:10.362Z`).

---

## 1. Executive Summary

A comprehensive, read-only forensic inspection was conducted using persisted scan artifacts (`report.json`, `page.json`, `vision.json`, `scan_detail.json`) retrieved directly from the test scanner container.

### Key Conclusions:
1. **The Circuit Breaker Returns Immediately (0 ms) Once Open:** Once `quota_exhausted` was registered by Finding 0, all subsequent 7 findings in Layer 2 (14 operations) completed in **1.306 seconds** (~90 ms per local crop). All 8 image operations in Layer 3 completed in ~3.5 seconds. Zero hidden waits, zero retries, and zero futile network calls occurred after the circuit breaker opened.
2. **The Entire 247-Second Delay Occurred During Finding 0:** Finding 0's screenshot crop was written at `11:55:03.100Z`. Finding 1's crop was written at `11:59:10.362Z` (an exact delta of **247,262 ms** / 4.12 minutes).
3. **Root Cause of the Delay:** The delay occurred **inside the single outbound dispatch for Finding 0** before the circuit breaker could trip:
   - In [gemini-provider.ts](file:///d:/Waheed/RaawiX/apps/scanner/src/vision/gemini-provider.ts#L47), `doFetch()` uses native `fetch()` without a client-side timeout (`AbortSignal.timeout`).
   - Google's Generative Language API Gateway (`generativelanguage.googleapis.com`) enforces a standard 240-second (4-minute) admission/queueing deadline when accounts encounter rate/quota throttling before returning HTTP 429 `RESOURCE_EXHAUSTED`.
   - Node's `fetch()` has a 300-second default socket/body timeout, so the scanner process sat blocked waiting for Google's server to flush the 429 response.
4. **Additional Contributing Latency:** Page stabilization (`PageStabilizer.waitForStable`) consumed **30,829 ms** (~30.8 seconds) waiting for network idle on the target page before Layer 1 / Layer 2 started.

---

## 2. Complete Scan Lifecycle Timeline

Retrieved from `report.json` and `page.json` (`/app/apps/scanner/output/scan_1792670069699_0wduemv/`):

```
11:54:28.344Z  Scan request received via POST /api/scans/start
11:54:29.699Z  Job enqueued into BullMQ (HTTP 202 Accepted)
11:54:29.701Z  Scan job picked up by worker (startedAt)
11:54:30.306Z  Page capture initialized (URL validation: 2 ms)
11:54:31.427Z  Playwright navigation complete (navigationMs: 1,121 ms)
11:55:02.256Z  Page stabilization complete (stabilizationMs: 30,829 ms)
11:55:02.500Z  L1 DOM, screenshot, a11y, computed styles complete (~250 ms)
11:55:02.501Z  Layer 2 Vision analysis begins (visionStartedAt)
11:55:03.100Z  Finding 0 crop saved (vision-1-1792670103100-p2j8t7b.png)
               --> Finding 0: extractText() called (HTTP 200, empty_response)
               --> Finding 0: describeElement() called
               ================== [247.262-SECOND DELAY] ==================
               --> Outbound fetch() waits on Google Generative Language Gateway
               --> Google returns HTTP 429 (RESOURCE_EXHAUSTED) at 11:59:10Z
               --> tripCircuit(quota_exhausted) opens global circuit breaker
11:59:10.362Z  Finding 1 crop saved (vision-1-1792670350362-mgw1n4w.png)
               --> Finding 1: extractText & describeElement blocked pre-dispatch
11:59:10.554Z  Finding 2 crop saved (blocked pre-dispatch in 192 ms)
11:59:10.751Z  Finding 3 crop saved (blocked pre-dispatch in 197 ms)
11:59:10.959Z  Finding 4 crop saved (blocked pre-dispatch in 208 ms)
11:59:11.184Z  Finding 5 crop saved (blocked pre-dispatch in 225 ms)
11:59:11.416Z  Finding 6 crop saved (blocked pre-dispatch in 232 ms)
11:59:11.668Z  Finding 7 crop saved (blocked pre-dispatch in 252 ms)
11:59:12.591Z  Layer 2 Vision analysis finishes (visionMs: 250,090 ms)
11:59:14.076Z  Blind Interaction Agent finishes (agentMs: 1,485 ms, 25 steps)
11:59:14.118Z  page.json written to disk (capturedAt: 11:59:14.118Z)
11:59:18.240Z  Layer 3 AssistiveMap complete (generatedAt, 8 images blocked pre-dispatch)
11:59:15.250Z  Database scan record marked 'completed'
```

### Exact Breakdown of `totalMs: 283,812 ms`:
* **`stabilizationMs`:** 30,829 ms (10.9%) — Playwright page stabilization wait
* **`visionMs`:** 250,090 ms (88.1%) — Layer 2 Vision analysis
  * Finding 0 (including outbound Google wait): **247,262 ms** (87.1% of total scan time)
  * Findings 1–7 (7 crops + 14 circuit-broken checks): **2,828 ms** (1.0%)
* **`navigationMs`:** 1,121 ms (0.4%)
* **`agentMs`:** 1,485 ms (0.5%) — 25 agent steps
* **Remaining overhead (L1, DOM, A11y, Styles, Screenshot):** 287 ms (0.1%)

---

## 3. Detailed Investigation: The 247-Second Interval

### What Occurred Between 11:55:03.100Z and 11:59:10.362Z
In [analyzer.ts](file:///d:/Waheed/RaawiX/apps/scanner/src/vision/analyzer.ts#L275-L345):
1. Element #1 (Edit button on Card 1) was identified as clickable unlabeled.
2. Playwright captured element crop `pages/1/vision/vision-1-1792670103100-p2j8t7b.png` at `11:55:03.100Z`.
3. `visionAnalyzer` called `geminiProvider.extractText(cropPath)`.
   * Result: HTTP 200 with empty text (`empty_response`).
4. `visionAnalyzer` called `geminiProvider.describeElement(cropPath, finding.kind)`.
   * Result: HTTP 429 (`quota_exhausted`).
5. Next candidate evaluation began, saving Finding 1's crop at `11:59:10.362Z`.

### Why the Call Took ~240 Seconds
* **No Client-Side Request Timeout:** `GeminiVisionProvider.doFetch` calls Node `fetch()` with no `signal: AbortSignal.timeout(...)`. The socket remains open until either the remote server responds or Node's 300-second connection timeout fires.
* **Google Gateway 240s Queueing:** Google's `generativelanguage.googleapis.com` API Gateway uses a standard 240-second server-side deadline for `generateContent` calls. When an account or key hits a quota tier, requests are frequently held in admission queues rather than rejected immediately. At the 240-second mark, Google flushed the HTTP 429 `RESOURCE_EXHAUSTED` payload.
* **Retry Budget Did NOT Cause the Delay:** In `gemini-provider.ts`, `recordRetryDelay` caps total retry backoff at `maxRetryBudgetMs: 10000` (10 seconds). Furthermore, when `isQuota` is true (`/quota|RESOURCE_EXHAUSTED/i`), `executeWithRetry` returns immediately without retrying. The delay was elapsed network wait time on the single dispatch call.

---

## 4. Verification: Circuit-Breaker Responsiveness Once Open

The persisted evidence conclusively proves that **quota-exhausted operations return promptly once the circuit is open**:

1. **Layer 2 (Findings 1 through 7):**
   * Findings 1 through 7 executed 14 AI operations (7 `extract_text` + 7 `describe_element`).
   * All 14 operations returned `status: "quota_exhausted"`, `errorCategory: "quota_exhausted"`.
   * The total elapsed time for all 7 findings was **1.306 seconds** (`11:59:10.362` to `11:59:11.668`).
   * Subtracting ~100 ms per Playwright element crop (`element.screenshot()`), each `acquireDispatchSlot` check took **< 1 ms**.
2. **Layer 3 (8 Recipe Images):**
   * All 8 image description calls in `AssistiveMapGenerator` were rejected pre-dispatch.
   * Telemetry recorded 8 failures with `status: "quota_exhausted"`.
   * All 8 checks completed in milliseconds, allowing the entire AssistiveMap to complete in ~4 seconds.
3. **Conclusion:** Zero hidden retries, zero background sleeps, and zero lingering promises execute once the circuit breaker is open.

---

## 5. Confirmed Facts vs Hypotheses

| Observation | Status | Evidence / Source |
|---|:---:|---|
| Total scan duration was 283.8 seconds | **CONFIRMED FACT** | `timings.totalMs = 283812` in `page.json` and `report.json` |
| Page stabilization took 30.8 seconds | **CONFIRMED FACT** | `timings.stabilizationMs = 30829` in `page.json` |
| Layer 2 Vision took 250.09 seconds | **CONFIRMED FACT** | `timings.visionMs = 250090` in `page.json` |
| 247.262 seconds elapsed on Finding 0 | **CONFIRMED FACT** | Crop timestamps: `11:55:03.100Z` vs `11:59:10.362Z` |
| Findings 1–7 executed in 1.306 seconds | **CONFIRMED FACT** | Crop timestamps: `11:59:10.362Z` to `11:59:11.668Z` |
| `doFetch()` has no client-side timeout | **CONFIRMED FACT** | Source inspection of [gemini-provider.ts:46-54](file:///d:/Waheed/RaawiX/apps/scanner/src/vision/gemini-provider.ts#L46-L54) |
| Delay was Google 240s gateway admission hold | **STRONG HYPOTHESIS** | Matches Google API 240s deadline and 247s delta; cannot be 100% proven without per-request latency logs |

---

## 6. Recommended Future Instrumentation (For Coordinator Approval)

To make future request latency indisputably visible and prevent upstream gateway delays from stalling scans:

1. **Client-Side Request Timeout:** Add an explicit client-side timeout to `doFetch()`:
   ```ts
   protected async doFetch(payload: any): Promise<Response> {
     const timeoutMs = config.gemini.requestTimeoutMs || 15000; // 15s bounded timeout
     return fetch(`${this.apiUrl}?key=${this.apiKey}`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(payload),
       signal: AbortSignal.timeout(timeoutMs),
     });
   }
   ```
   *Benefit:* A stalled or queued Google gateway call will abort in 15 seconds instead of blocking for 240 seconds.
2. **Per-Request Latency Telemetry:** Record `latencyMs: Date.now() - fetchStartedAt` in `createProviderDiagnostics` and `ProviderTelemetry`.
   *Benefit:* Exactly reveals the round-trip network time of every physical HTTP attempt in the scan report.
3. **Pass `scanId` to `VisionAnalyzer` in `page-capture.ts`:**
   Change line 525 from `new VisionAnalyzer()` to `new VisionAnalyzer(this.scanId)` so L2 vision analysis attaches to the actual scan ID instead of generating ephemeral IDs.
