# Raawi X — Phase 7B.5I: Gemini Runtime Diagnostic Report

**Document Version:** 1.0.0  
**Date:** 2026-10-22  
**Target Environment:** Isolated Test Scanner (`raawi-x-phase2-test-scanner` on Coolify VPS)  
**Test API Endpoint:** `https://test-api.unifinitylab.com`  
**Latest Scan Audited:** `scan_1792649614072_hgdcsvz`  
**Reference Report:** `PHASE_7B_5H_POST_DEPLOYMENT_GEMINI_SCAN_REPORT.md`  
**Audit Scope:** Diagnostic analysis of Gemini configuration, provider initialization, outbound request evidence, response processing, and AssistiveMap data flow.

---

## 1. Overall Diagnostic Verdict

### **Verdict: PARTIALLY CONFIRMED**

| Category | Status | Summary of Evidence |
|---|:---:|---|
| **Deployed Revision & Defect Fix** | **CONFIRMED** | Container restarted `2026-10-22T06:10:01Z` following redeployment. Live scan `scan_1792649614072_hgdcsvz` verified that the Phase 7B.5F fix in commit `ee661c6` was active: defect `RA-001-022` ("Authenticated Workspace Navigation Unclear") produced 0 false positives. |
| **Provider Selection Logic in Code** | **CONFIRMED** | Both `VisionAnalyzer` and `AssistiveMapGenerator` prioritize `GeminiVisionProvider` over `OpenAIVisionProvider` when `GeminiVisionProvider.isEnabled()` is true. |
| **Gemini Output Generated in Scan** | **CONFIRMED NOT OBSERVED** | Zero text extraction, zero element descriptions, zero `evidenceJson`, and empty collections (`labelOverrides: {}`, `imageDescriptions: {}`) in persisted scan and live page package. |
| **Container Environment Variables** | **UNKNOWN (Safe Client-Side)** | Whether `process.env.GEMINI_ENABLED === 'true'` and whether `process.env.GEMINI_API_KEY` is populated inside the running Coolify container cannot be directly verified from client-side API responses, as safe security controls intentionally redact all API keys and environment variables. |
| **Outbound Request Execution** | **UNKNOWN vs NOT ATTEMPTED** | No error telemetry is persisted in scan artifacts when `describeElement` returns `{ description: null }`. Timing evidence (3.8s for 8 Playwright screenshot crops, ~550ms/crop) strongly indicates no network round-trips occurred (i.e. `isEnabled()` evaluated to `false`). |
| **Code-Level Architecture Gaps** | **CONFIRMED** | Inspection revealed an unpatched dependency in `VisionAnalyzer.processImagesForAssistiveMap` (line 595), which exclusively checks `OpenAIVisionProvider.isEnabled()` and bypasses image cropping when OpenAI is disabled. |

---

## 2. Answers to Core Diagnostic Questions

### Q1: Does the live container run the expected revision (`ee661c6`)?
- **Status:** **CONFIRMED (Behavioral & Lifecycle Evidence)**
- **Evidence:**
  1. The container process freshly restarted at `2026-10-22T06:10:01Z` (`uptime: 63.8s` at preflight `06:11:04Z`), corresponding to the user's Coolify redeployment of commit `ee661c6`.
  2. The false positive defect `RA-001-022` ("Authenticated Workspace Navigation Unclear") on `https://broken-workshop.dequelabs.com/`, which was triggered in earlier Phase 7B.5E/5G scans, was completely absent (0 occurrences) in `scan_1792649614072_hgdcsvz`. The agent summary reported `accountControls: 0`, `logoutControls: 0`, and `hasAuthenticatedWorkspace: false`, directly matching the patch applied in `ee661c6`.

### Q2: Does `GEMINI_ENABLED` evaluate to `true` in the running process?
- **Status:** **UNKNOWN (Direct Inspection) / STRONGLY INDICATED AS FALSE**
- **Evidence:**
  1. In `apps/scanner/src/config.ts` (line 100), `config.gemini.enabled` requires strict string equality: `process.env.GEMINI_ENABLED === 'true'`.
  2. `GET /api/scanner/config` only returns non-sensitive limits (`allowedPorts`, `allowLocalhost`, `maxPagesHardLimit`, `raawiAgentEnabled`). It does not expose `geminiEnabled`.
  3. `GET /api/widget/config` returns `featureFlags.translation: false`. Code review of `apps/scanner/src/api/gemini-translator.ts` reveals this flag actually checks `config.openai.enabled && !!config.openai.apiKey`, so it does not reflect Gemini's state.
  4. The complete absence of AI descriptions and the timing data strongly indicate that `GeminiVisionProvider.isEnabled()` returned `false`.

### Q3: Is `GEMINI_API_KEY` present, without reading or displaying its value?
- **Status:** **UNKNOWN (Secret-Safe Boundary)**
- **Evidence:**
  1. `GEMINI_API_KEY` is strictly protected by server-side security boundaries and is never reflected in API payloads, error messages, or logs.
  2. In `apps/scanner/src/vision/gemini-provider.ts` (line 37):
     ```typescript
     static isEnabled(): boolean {
       return config.gemini.enabled && !!config.gemini.apiKey;
     }
     ```
  3. If either `GEMINI_ENABLED` is not `'true'` OR `GEMINI_API_KEY` is empty/undefined, `isEnabled()` returns `false`.

### Q4: Which provider does each relevant pipeline path actually select?
- **Status:** **CONFIRMED**
- **Evidence:**
  - **Path A (`VisionAnalyzer` in `apps/scanner/src/vision/analyzer.ts`, lines 27-33):**
    ```typescript
    if (GeminiVisionProvider.isEnabled()) {
      this.geminiProvider = new GeminiVisionProvider();
      this.logger.info('Gemini Vision provider enabled');
    } else if (OpenAIVisionProvider.isEnabled() && config.openai.visionElementEnrichment) {
      this.geminiProvider = new OpenAIVisionProvider();
      this.logger.info('OpenAI Vision provider enabled');
    }
    ```
    *Result:* If `GeminiVisionProvider.isEnabled()` is true, `GeminiVisionProvider` is selected. If false, `this.geminiProvider` is `undefined` (because OpenAI element enrichment defaults to `false`).
  - **Path B (`AssistiveMapGenerator` in `apps/scanner/src/assistive/assistive-map-generator.ts`, lines 71-75):**
    ```typescript
    if (GeminiVisionProvider.isEnabled()) {
      this.geminiProvider = new GeminiVisionProvider();
    } else if (OpenAIVisionProvider.isEnabled()) {
      this.geminiProvider = new OpenAIVisionProvider();
    }
    ```
    *Result:* If `GeminiVisionProvider.isEnabled()` is true, `GeminiVisionProvider` is selected. If false, `this.geminiProvider` is `undefined` (because OpenAI is not configured).

### Q5: Was a Gemini API request attempted during `scan_1792649614072_hgdcsvz`?
- **Status:** **NOT OBSERVED (Successful Request) / HIGH PROBABILITY NO REQUEST ATTEMPTED**
- **Evidence:**
  1. **Finding Data:** In all 8 `clickable_unlabeled` findings in Layer 2:
     - `detectedText: null`
     - `confidence: "high"` (if Gemini OCR ran, line 303 would downgrade to `"medium"`)
     - Zero text items in `evidence`
     - `evidenceJson: undefined` (neither `geminiTextExtraction` nor `geminiDescription` was attached)
  2. **Timing Data:** The 8 Playwright screenshot crops in Layer 2 were taken between `06:14:07.127Z` and `06:14:10.981Z` (total elapsed: 3,854 ms, or ~550 ms per crop). 550 ms per element is the typical duration for Playwright `element.screenshot()`. It is insufficient time to have executed two outbound HTTPS calls to Google per element (16 calls total) across 8 elements.
  3. **Conclusion:** No successful request occurred. The timing strongly indicates that `this.geminiProvider` was `undefined` (`isEnabled() === false`), so no network call was attempted.

### Q6: If Gemini returned a response, where was it lost, rejected, or left unused?
- **Status:** **CONFIRMED CODE PATH BEHAVIOR**
- **Evidence:**
  1. In `VisionAnalyzer.analyzeCandidate` (lines 300 & 322):
     ```typescript
     if (geminiTextResult.text && geminiTextResult.text.trim().length > 0) { ... }
     if (geminiDescResult.description && geminiDescResult.description.trim().length > 0) { ... }
     ```
     If Gemini returns `{ description: null, rawResponse: { error, status } }`, the code silently drops `rawResponse`. It does not attach the error to `evidenceJson`.
  2. In `AssistiveMapGenerator.processVisionFindings` (lines 164-175):
     ```typescript
     if (geminiResult.description) {
       label = geminiResult.description;
       ...
     }
     ```
     If `description` is null, no label is created.
  3. In `AssistiveMapGenerator.processImages` (lines 258-278):
     ```typescript
     if (geminiResult.description) {
       description = geminiResult.description;
       ...
     }
     ```
     If `description` is null, `map.imageDescriptions[selector]` is skipped.

### Q7: Does the implementation silently fall back to OpenAI or DOM heuristics? Is that distinguishable in safe diagnostics?
- **Status:** **CONFIRMED & DISTINGUISHABLE**
- **Evidence:**
  - When `this.geminiProvider` is undefined, the pipeline silently falls back to pure DOM heuristic analysis.
  - **Distinguishability Evidence:**
    1. In the persisted AssistiveMap: All 9 action intents explicitly state `source: "dom"` and `confidence: "high"`. None have `source: "gemini"`.
    2. `labelOverrides` and `imageDescriptions` are `{}` (empty).
    3. In the Page Package `semanticModel`:
       ```json
       "sourceMix": { "dom": 1, "vision": 0, "ai": 0 },
       "fusionSignals": { "hasDom": true, "hasVision": false, "hasAssistiveMap": false, "hasA11y": true }
       ```
    4. This allows any consumer or diagnostic test to conclusively prove whether AI enrichment occurred or if deterministic fallback was used.

---

## 3. Critical Code Architecture Gap Discovered

During this diagnostic review, a separate code-level defect was uncovered in `apps/scanner/src/vision/analyzer.ts`:

### Defect: `processImagesForAssistiveMap` checks only OpenAI
- **File:** `apps/scanner/src/vision/analyzer.ts`
- **Lines:** 590–597
- **Code:**
  ```typescript
  private async processImagesForAssistiveMap(
    page: Page,
    pageNumber: number,
    outputDir: string
  ): Promise<void> {
    if (!OpenAIVisionProvider.isEnabled()) {
      return; // Skip if AI vision not enabled
    }
  ```
- **Impact:**
  - Even if `GEMINI_ENABLED=true` and `GEMINI_API_KEY` are configured, `processImagesForAssistiveMap` will return immediately because `OpenAIVisionProvider.isEnabled()` is false!
  - As a result, candidate images on the page are **never cropped** to `pages/1/vision/images/`.
  - When `AssistiveMapGenerator.processImages` later searches for image crops via `findImageCrop(artifact, selector, src, scanId)`, it finds nothing and falls back to `artifact.screenshotPath` (the full viewport screenshot).
  - Calling Gemini with a full webpage screenshot to describe a single thumbnail image is degraded behavior.

---

## 4. Most Likely Explanation

Separating proven facts from inferences:

### Proven Facts:
1. Commit `ee661c6` was deployed on Coolify (`06:10:01Z`).
2. Both `VisionAnalyzer` and `AssistiveMapGenerator` contain code prioritizing `GeminiVisionProvider`.
3. In `scan_1792649614072_hgdcsvz`, zero Gemini descriptions were produced, and `labelOverrides` / `imageDescriptions` were `{}`.
4. If `describeElement` returns `{ description: null }`, errors are logged to container stdout but omitted from scan detail artifacts.
5. In `VisionAnalyzer` line 595, image cropping for AssistiveMap is hardcoded to `OpenAIVisionProvider.isEnabled()`.

### Most Likely Inference:
The Coolify VPS container for `raawi-x-phase2-test-scanner` either:
- **Primary Hypothesis:** Does not have `GEMINI_ENABLED=true` set in its Coolify environment variables, or `GEMINI_API_KEY` was not injected into the Docker container process, causing `GeminiVisionProvider.isEnabled()` to evaluate to `false` at runtime.
- **Secondary Hypothesis:** If `GEMINI_ENABLED=true` and `GEMINI_API_KEY` are present in Coolify, the API key may be unauthorized, quota-limited, or blocked by Docker outbound network policies (e.g. DNS / firewall blocking `generativelanguage.googleapis.com`), causing calls to return HTTP errors that are caught and discarded as `{ description: null }`.

---

## 5. Proposed Minimal Safe Follow-Up Test (For Approval Only)

Per Section 3 of the instructions, existing client-side scan artifacts cannot confirm container environment variable presence without a direct diagnostic mechanism.

**Proposed Test:** A minimal, read-only diagnostic probe endpoint:
1. **Endpoint Name:** `GET /api/diagnostics/gemini-status` (Requires auth, or internal only).
2. **Behavior:**
   - Evaluates `GeminiVisionProvider.isEnabled()`.
   - Returns non-sensitive status object:
     ```json
     {
       "geminiEnabled": true/false,
       "hasApiKey": true/false,
       "apiKeyLength": 39,
       "model": "gemini-1.5-flash",
       "outboundStatus": "pending_approval"
     }
     ```
   - **Outbound Request:** **NO.** This does not make an outbound network call to Google.
   - **Scan:** **NO.** Exactly 0 scans, crawls, or Playwright instances are launched.
   - **Secret Safety:** The actual `GEMINI_API_KEY` value is never printed, logged, or returned. Only boolean presence and string length are evaluated.
   - **Alternative (No Code Change):** The VPS operator inspects the container logs directly (`docker logs <container_id> | grep -i gemini`) to check for the startup message `Gemini Vision provider enabled` or warn message `Gemini API request failed`.

---

## 6. Verification Boundaries Observed

- **Scans Launched:** Exactly 0.
- **Outbound API Calls:** Exactly 0.
- **Source Code Modified:** None.
- **Remote Environment Touched:** None.
- **Secrets Disclosed:** 0.

*Awaiting coordinator review.*
