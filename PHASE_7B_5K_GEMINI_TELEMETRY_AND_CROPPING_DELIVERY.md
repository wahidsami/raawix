# RAAWI X — Phase 7B.5K Delivery Report
## Gemini-Compatible Image Cropping, Explicit Fallbacks, and Sanitized Provider Telemetry

**Date:** 2026-10-22  
**Repository:** `wahidsami/raawix`  
**Branch:** `feature/semantic-core`  
**Milestone:** Phase 7B.5K  
**Status:** COMPLETE — All gates passed, 10/10 regression tests green, clean workspace build.

---

### 1. Executive Summary

In response to the Phase 7B.5J investigation findings, Phase 7B.5K delivers four key architectural improvements to ensure seamless operation with both Gemini and OpenAI vision providers:

1. **Provider-Agnostic Image Cropping:**
   `VisionAnalyzer.processImagesForAssistiveMap` was previously gated exclusively on `OpenAIVisionProvider.isEnabled()`. When running with `GEMINI_ENABLED=true` and OpenAI disabled, the scanner bypassed the Playwright element screenshot pipeline entirely, leaving `pages/{pageNumber}/vision/images/` unpopulated and forcing `AssistiveMapGenerator` into full-viewport fallback. We corrected this gate to `isAiVisionEnabled()`, ensuring image crops are captured whenever either Gemini or OpenAI is configured.

2. **Explicit Fallback & Source Attribution:**
   `AssistiveMap.imageDescriptions` now explicitly distinguishes between cropped element images (`imageSource: 'crop'`) and full viewport fallbacks (`imageSource: 'viewport_fallback'`). When falling back to the viewport screenshot, the safety note explicitly alerts downstream consumers (`AI-generated description (viewport fallback) - verify accuracy`).

3. **Sanitized Provider Telemetry & Diagnostics:**
   A dedicated sanitization and telemetry module (`apps/scanner/src/vision/provider-telemetry.ts`) records structured telemetry across all AI vision operations without ever exposing API keys, authorization headers, base64 payloads, or raw HTTP error bodies:
   - **On HTTP errors (e.g. 401, 403, 429, 500):** Emits `{ provider, operation, status: 'http_error', httpStatus, errorCategory: 'http_error', incorporated: false }`. Downstream finding records omit `evidenceJson.geminiDescription`, ensuring failed API calls are never falsely attributed as AI-verified findings.
   - **On empty responses (HTTP 200 OK, but no text candidates):** Emits `{ status: 'empty_response', httpStatus: 200, errorCategory: 'empty_response', incorporated: false }`, distinctly separated from `provider_disabled`.
   - **On disabled/uninitialized providers:** Emits `{ provider: 'none', status: 'provider_disabled', incorporated: false }`.
   - **AssistiveMap Telemetry:** `AssistiveMap.providerTelemetry` captures aggregate counters (`labelOverridesAttempted`, `labelOverridesSucceeded`, `imageDescriptionsAttempted`, `imageDescriptionsSucceeded`, `cropsUsed`, `viewportFallbacksUsed`, and sanitized `failures[]`).

4. **Persistence Integrity in ScanRepository:**
   `ScanRepository.saveVisionFinding` was hardened to ensure `finding.evidenceJson` (including `descriptionDiagnostics` and `textDiagnostics`) is never overwritten by default empty objects, preserving audit trails in the database.

---

### 2. Files Modified & Added

| File | Change Type | Purpose |
| :--- | :--- | :--- |
| `apps/scanner/src/vision/provider-telemetry.ts` | **NEW** | Sanitization routines, provider diagnostics types (`ProviderDiagnostics`, `AssistiveMapProviderTelemetry`), and secret-safe diagnostic builders. |
| `apps/scanner/src/vision/analyzer.ts` | **MODIFIED** | Updated `isAiVisionEnabled()` check to include Gemini; added sanitized diagnostics to `analyzeCandidate` for OCR and element descriptions; made DOM property queries (`outerHTML`, `classList`) defensive. |
| `apps/scanner/src/assistive/assistive-map-generator.ts` | **MODIFIED** | Added `providerTelemetry` to `AssistiveMap`; added `imageSource: 'crop' \| 'viewport_fallback'` to `ImageDescription`; track attempted vs succeeded operations and crop vs fallback usage. |
| `apps/scanner/src/db/scan-repository.ts` | **MODIFIED** | Guarded `evidenceJson` mapping to prevent clobbering existing diagnostic metadata. |
| `apps/scanner/src/vision/gemini-telemetry-regression.test.ts` | **NEW** | 10 unit and integration regression tests covering all 7 required scenarios + candidate analysis + sanitization guarantees. |

---

### 3. Regression Test Coverage Matrix

All 10 tests in `apps/scanner/src/vision/gemini-telemetry-regression.test.ts` execute deterministically with mocked providers and zero external network calls:

| Scenario | Test Name | Assertion Highlights | Result |
| :---: | :--- | :--- | :---: |
| **1** | Gemini enabled, OpenAI disabled | Verifies `processImagesForAssistiveMap` executes, Playwright element `screenshot` is called, and `pages/1/vision/images/` directory is created. | **PASS** |
| **2** | OpenAI enabled, Gemini disabled | Verifies existing OpenAI behavior is 100% preserved; image cropping executes identically. | **PASS** |
| **3** | Both providers disabled | Verifies image cropping is safely skipped; zero element queries or screenshots triggered; images directory not created. | **PASS** |
| **4** | Provider HTTP failure telemetry | Provider returns HTTP 403 `API_KEY_INVALID`; verifies diagnostic emits `status: 'http_error'`, `httpStatus: 403`, `incorporated: false`; asserts zero secret strings or endpoints in serialized output. | **PASS** |
| **5** | Empty provider response distinction | Verifies `status: 'empty_response'` (HTTP 200, empty candidates) is cleanly distinguishable from `status: 'provider_disabled'`. | **PASS** |
| **6** | Successful provider response & provenance | Successful mock response; verifies `imageDescriptions['#hero-img'].source === 'gemini'`, `confidence === 'medium'`, `map.providerTelemetry.imageDescriptionsSucceeded === 1`. | **PASS** |
| **7** | Credential & Payload Sanitization | Verifies Bearer tokens, API key prefixes (`sk-proj-`, `AIzaSy`), authorization headers, and base64 image strings are stripped completely from telemetry. | **PASS** |
| **8** | Crop vs Viewport Fallback Distinction | When crop exists on disk: `imageSource: 'crop'`, `cropsUsed: 1`, standard safety note. When missing: `imageSource: 'viewport_fallback'`, `viewportFallbacksUsed: 1`, explicit fallback safety note. | **PASS** |
| **9** | Candidate analysis HTTP failure handling | `VisionAnalyzer.analyzeCandidate` records sanitized telemetry on HTTP 403 without setting `evidenceJson.geminiDescription` (prevents false positive AI attribution). | **PASS** |
| **10** | Candidate analysis with provider disabled | `VisionAnalyzer.analyzeCandidate` records `provider_disabled` with `incorporated: false` when no provider is configured. | **PASS** |

---

### 4. Verification & Validation Evidence

1. **Focused Regression Tests (`gemini-telemetry-regression.test.ts`):**
   ```text
   RUN  v1.6.1 D:/Waheed/RaawiX/apps/scanner
   ✓ src/vision/gemini-telemetry-regression.test.ts (10 tests) 81ms
   Test Files  1 passed (1)
        Tests  10 passed (10)
   ```

2. **Existing Scanner Vision & Assistive Tests:**
   ```text
   RUN  v1.6.1 D:/Waheed/RaawiX/apps/scanner
   ✓ src/vision/vision-telemetry.test.ts (4 tests) 13ms
   ✓ src/assistive/assistive-map.test.ts (13 tests) 77ms
   Test Files  2 passed (2)
        Tests  17 passed (17)
   ```

3. **Widget Suite Verification:**
   ```text
   # apps/widget unit test suite:
   tests 12 | pass 12 | fail 0 (duration 8.6s)
   
   # Automated Phase 7B.5H widget acceptance test (live page package consumption & drift):
   tests 3  | pass 3  | fail 0 (duration 1.7s)
   ```

4. **Workspace Build Verification:**
   ```text
   raawi-x@0.1.0 build
   pnpm -r build
   Scope: 11 of 12 workspace projects
   - apps/test-sites: Done
   - apps/widget: Done (dist/widget.iife.js 93.38 kB)
   - packages/core: Done
   - packages/semantic-engine: Done
   - packages/report: Done
   - packages/rules: Done
   - apps/agent-runtime: Done
   - apps/report-ui: Done
   - apps/scanner: Done (tsc -b && copy-static-assets)
   All workspace projects compiled with exit code 0.
   ```

---

### 5. Next Steps for Deployment

1. Merge `feature/semantic-core` changes containing Phase 7B.5K.
2. In the Coolify VPS environment for `raawi-x-phase2-test-scanner`, ensure the container environment configuration has:
   ```env
   GEMINI_ENABLED=true
   GEMINI_API_KEY=<valid-google-ai-api-key>
   GEMINI_MODEL=gemini-2.5-flash
   ```
3. Upon next deployment, image crops will be created in `pages/{pageNumber}/vision/images/` and passed directly to Gemini, with complete secret-safe telemetry stored in `AssistiveMap.providerTelemetry` and `VisionFinding.evidenceJson`.
