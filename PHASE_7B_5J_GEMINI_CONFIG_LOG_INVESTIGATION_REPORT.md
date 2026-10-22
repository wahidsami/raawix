# Raawi X — Phase 7B.5J: Read-Only Gemini Configuration and Log Investigation Report

**Document Version:** 1.0.0  
**Date:** 2026-10-22  
**Target Environment:** Isolated Test Scanner (`raawi-x-phase2-test-scanner` on Coolify VPS)  
**Test API Endpoint:** `https://test-api.unifinitylab.com`  
**Previous Scan Reference:** `scan_1792649614072_hgdcsvz`  
**Prior Diagnostic Reference:** `PHASE_7B_5I_GEMINI_RUNTIME_DIAGNOSTIC_REPORT.md`  

---

## 1. Executive Summary & Diagnostic Findings

| Investigation Area | Status | Summary of Evidence & Findings |
|---|:---:|---|
| **Step 1: Test Container Logs** | **BLOCKED (Read-Only Access Boundary)** | Direct container stdout/stderr logs (`docker logs`) are confined to the private Coolify/Docker host and are not exposed over the public API. However, application-level error telemetry in `VisionAnalyzer` and `AssistiveMapGenerator` was analyzed: both classes discard provider error payloads when `description` is null, preventing API error codes from reaching persisted scan artifacts. |
| **Step 2: Coolify Environment Config** | **BLOCKED (Operator Access Required)** | Direct inspection of environment variables inside the Coolify resource panel (`raawi-x-phase2-test-scanner`) requires operator login to the Coolify dashboard. Client-side inspection confirms that public test API responses intentionally redact all credentials. Scan timing (3.8s for 8 Playwright crops) and empty annotation collections indicate `GeminiVisionProvider.isEnabled()` evaluated to `false` in the live process. |
| **Step 3: Image-Processing Defect** | **CONFIRMED & DOCUMENTED** | `VisionAnalyzer.processImagesForAssistiveMap()` (line 595) hardcodes `if (!OpenAIVisionProvider.isEnabled()) return;`. It completely ignores `GeminiVisionProvider`. Even if Gemini is configured, image cropping is skipped, breaking downstream AssistiveMap image description. Minimal 1-line correction proposed. |

---

## 2. Step 1 — Inspection of Existing Startup and Request Logs

### 2.1 Log Generation Architecture
In the scanner codebase:
- `StructuredLogger` ([logger.ts:3-25](file:///d:/Waheed/RaawiX/apps/scanner/src/utils/logger.ts)) outputs structured JSON log entries to standard process streams (`console.log`, `console.warn`, `console.error`).
- In Docker / Coolify containers, these process streams are captured by Docker's logging daemon (`json-file` or `journald`).
- **Relevant Log Traces in Code:**
  1. **Provider Startup:**
     ```typescript
     // apps/scanner/src/vision/analyzer.ts:29
     this.logger.info('Gemini Vision provider enabled');
     ```
  2. **API Request Failures & HTTP Codes:**
     ```typescript
     // apps/scanner/src/vision/gemini-provider.ts:82, 177
     this.logger.warn('Gemini API request failed', {
       status: response.status,
       error: errorText.substring(0, 200),
     });
     ```
  3. **Network / Exception Failures:**
     ```typescript
     // apps/scanner/src/vision/gemini-provider.ts:97, 205
     this.logger.warn('Gemini element description failed', {
       imagePath,
       error: error instanceof Error ? error.message : 'Unknown error',
     });
     ```
  4. **Rate Limit Warning:**
     ```typescript
     // apps/scanner/src/assistive/assistive-map-generator.ts:224
     this.logger.warn('Vision AI image processing rate limit reached', { scanId, maxImages });
     ```

### 2.2 Access Boundary & Precise Blocker
- **Blocker:** The developer environment operates from a local workstation without Docker daemon access to the remote VPS host. The remote Express server (`test-api.unifinitylab.com`) does not expose a remote log streaming or administrative `/logs` endpoint (and operational rules strictly prohibit adding diagnostic endpoints).
- **Silent Dropping of Error Evidence:**
  Inspection of `VisionAnalyzer.analyzeCandidate` ([analyzer.ts:321-335](file:///d:/Waheed/RaawiX/apps/scanner/src/vision/analyzer.ts#L321-L335)) reveals why provider errors are absent from scan artifacts:
  ```typescript
  const geminiDescResult = await this.geminiProvider.describeElement(cropPath, finding.kind);
  if (geminiDescResult.description && geminiDescResult.description.trim().length > 0) {
    ...
    finding.evidenceJson.geminiDescription = geminiDescResult.rawResponse;
  }
  ```
  When Gemini fails (e.g., HTTP 400, 401, 403, 429), `geminiDescResult` returns:
  `{ description: null, rawResponse: { error: errorText, status: response.status } }`.
  Because `description` is null, the `if` guard evaluates to `false`, and `rawResponse` is **never attached to `finding.evidenceJson`**.
  Consequently, provider failures are only logged to container stdout and are completely omitted from the persisted scan findings.

---

## 3. Step 2 — Safe Verification of Coolify Environment Configuration

### 3.1 Required Environment Contract for Gemini
Per `apps/scanner/src/config.ts` (lines 99–106) and `apps/scanner/src/vision/gemini-provider.ts` (lines 36–38):
- `config.gemini.enabled`: Evaluates `process.env.GEMINI_ENABLED === 'true'`.
- `config.gemini.apiKey`: Evaluates `process.env.GEMINI_API_KEY || ''`.
- `GeminiVisionProvider.isEnabled()`:
  ```typescript
  static isEnabled(): boolean {
    return config.gemini.enabled && !!config.gemini.apiKey;
  }
  ```

### 3.2 Current Verification Status
- **Direct Container Inspection:** Requires Coolify operator access to the Coolify Dashboard UI (`https://<coolify-host>/project/.../environment-variables`) for resource `raawi-x-phase2-test-scanner`.
- **Public API Redaction:** Safe scanner endpoints (`/health`, `/api/scanner/config`) strictly exclude API keys and provider environment variables.
- **Runtime Behavioral Evidence:**
  In `scan_1792649614072_hgdcsvz`:
  1. Across 8 interactive element candidates, 8 Playwright screenshot crops were captured in 3,854 ms total (`06:14:07.127Z` to `06:14:10.981Z`), an average of ~550 ms per crop.
  2. 550 ms is the exact expected time for Playwright's local `element.screenshot()` on a headless Linux container.
  3. If `isEnabled()` were true and outbound Gemini calls were being made, each element would have executed an OCR text extraction request AND a description request (16 HTTPS roundtrips total to `generativelanguage.googleapis.com` with base64 payload upload). 16 external HTTPS roundtrips cannot occur within 3.8s alongside 8 Playwright screenshot captures.
  4. **Inference:** The container process is almost certainly running with `GEMINI_ENABLED` not equal to `'true'`, or `GEMINI_API_KEY` unpopulated in the Docker container environment.

---

## 4. Step 3 — The Image-Processing Defect in `VisionAnalyzer`

### 4.1 Description of the Confirmed Issue
- **File:** `apps/scanner/src/vision/analyzer.ts`
- **Function:** `processImagesForAssistiveMap()`
- **Lines:** 590–597
- **Existing Code:**
  ```typescript
  /**
   * Process images for assistive map generation
   * Crops images that need alt text descriptions and stores them for Gemini processing
   */
  private async processImagesForAssistiveMap(
    page: Page,
    pageNumber: number,
    outputDir: string
  ): Promise<void> {
    if (!OpenAIVisionProvider.isEnabled()) {
      return; // Skip if AI vision not enabled
    }

    try {
      // Create images directory
      const imagesDir = join(outputDir, 'pages', pageNumber.toString(), 'vision', 'images');
      await mkdir(imagesDir, { recursive: true });
      ...
  ```

### 4.2 Failure Mode & Downstream Breakage
1. **Hardcoded OpenAI Guard:** Line 595 tests `!OpenAIVisionProvider.isEnabled()`.
2. **Immediate Return:** On any deployment where OpenAI is disabled (`OPENAI_ENABLED=false` or `OPENAI_API_KEY` missing)—such as the current test scanner—`processImagesForAssistiveMap()` exits immediately.
3. **No Image Crops Created:** None of the images on the page (e.g. recipe cards, avatars, icons) are cropped into `pages/1/vision/images/`.
4. **AssistiveMap Degradation:**
   In `apps/scanner/src/assistive/assistive-map-generator.ts` (lines 234–235):
   ```typescript
   const imageCropPath = await this.findImageCrop(artifact, selector, src, scanId);
   const imagePath = imageCropPath || artifact.screenshotPath;
   ```
   Because no crops exist, `findImageCrop` returns `null`, and `imagePath` falls back to `artifact.screenshotPath` (the full-page viewport screenshot).
5. **Prompt Misalignment:**
   When `geminiProvider.describeElement(imagePath, 'image', context)` is called, it sends the **entire webpage viewport** to Gemini with the prompt:
   `"Describe this image in exactly one sentence..."`
   Gemini describes the overall dashboard instead of the specific recipe image, corrupting the assistive alt-text mapping.

### 4.3 Smallest Appropriate Code Correction (Proposed)
The condition in `VisionAnalyzer.processImagesForAssistiveMap()` should check whether **any** supported vision provider is enabled:

```diff
--- a/apps/scanner/src/vision/analyzer.ts
+++ b/apps/scanner/src/vision/analyzer.ts
@@ -592,7 +592,7 @@ export class VisionAnalyzer {
     pageNumber: number,
     outputDir: string
   ): Promise<void> {
-    if (!OpenAIVisionProvider.isEnabled()) {
+    if (!GeminiVisionProvider.isEnabled() && !OpenAIVisionProvider.isEnabled()) {
       return; // Skip if AI vision not enabled
     }
```

*Note: Per operational instructions, this fix has NOT been implemented in this phase.*

---

## 5. Separation of Facts, Inferences, and Unknowns

### Confirmed Facts:
1. Commit `ee661c6` is deployed and running on `raawi-x-phase2-test-scanner` (verified by the absence of defect `RA-001-022`).
2. In `scan_1792649614072_hgdcsvz`, zero Gemini text extractions, zero element descriptions, and zero `evidenceJson` structures were generated.
3. `AssistiveMapGenerator` produced 9 high-confidence action intents from the DOM, but `labelOverrides` and `imageDescriptions` remained empty `{}`.
4. `VisionAnalyzer.analyzeCandidate` does not attach error responses to `evidenceJson` when `describeElement` returns `{ description: null }`.
5. `VisionAnalyzer.processImagesForAssistiveMap()` line 595 checks only `OpenAIVisionProvider.isEnabled()`, bypassing image cropping when OpenAI is disabled.

### Inferences:
1. Given that 8 Playwright crops completed in 3.8s (~550 ms/crop) with zero error telemetry or partial latency, `GeminiVisionProvider.isEnabled()` almost certainly evaluated to `false` inside the container.
2. Even if Gemini credentials were active, image descriptions in `AssistiveMap` would have suffered from degraded full-page screenshot fallback due to the defect in `processImagesForAssistiveMap()`.

### Unknowns:
1. The exact environment variable values in the running container process (`GEMINI_ENABLED` and `GEMINI_API_KEY`) cannot be read without direct operator access to Coolify's environment settings.
2. Whether Docker egress network policies permit outbound HTTPS calls to `generativelanguage.googleapis.com` from inside the VPS container has not yet been demonstrated with an active request.

---

## 6. Recommended Next Actions

1. **Coordinator Coolify Verification (Operator Step):**
   In the Coolify dashboard for resource `raawi-x-phase2-test-scanner`:
   - Verify that `GEMINI_ENABLED` is set to exactly `true` (lowercase).
   - Verify that `GEMINI_API_KEY` is set to a valid Google AI Studio API key.
   - Inspect container startup logs for `Gemini Vision provider enabled`.
2. **Apply Minimal Image-Cropping Correction (Code Step):**
   Apply the 1-line fix to [apps/scanner/src/vision/analyzer.ts:595](file:///d:/Waheed/RaawiX/apps/scanner/src/vision/analyzer.ts#L595) so image cropping activates under `GeminiVisionProvider.isEnabled()`.
3. **Capture Provider Error Telemetry (Code Hardening Step):**
   Update `VisionAnalyzer.analyzeCandidate` to attach `geminiDescResult.rawResponse` to `evidenceJson` even when `description` is null, making future provider failures visible in scan artifacts.

---

## 7. Verification Boundaries Observed

- **Scans Launched:** Exactly 0.
- **Outbound API Calls:** Exactly 0.
- **Code Modifications:** None.
- **Commits / Pushes:** None.
- **Secret Disclosures:** Zero.

*Awaiting coordinator review.*
