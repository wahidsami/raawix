# RAAWI X — Phase 4: Pipeline Accuracy and Reporting Reliability Remediation Report

**Repository:** `wahidsami/raawix`  
**Branch:** `feature/semantic-core`  
**Evidence Source:** `PHASE_3_SCAN_EVIDENCE_AND_ACCURACY_REVIEW.md`  
**Reference Scan:** `scan_1792479482089_scvi6r1`  
**Author:** AI Engineering Agent  
**Date:** October 20, 2026  
**Status:** COMPLETE — PENDING COORDINATOR REVIEW (STOP)

---

## 1. Executive Summary

During Phase 3 evidence review of reference scan `scan_1792479482089_scvi6r1` (`https://www.w3.org/WAI/demos/bad/`), six systemic defects were identified across the scanner pipeline:
1. **False positive hidden input violations** (`input[type="hidden"]` flagged as failing form control name checks).
2. **Missing stylesheet awareness** causing false failures on CSS-driven focus rings and false positives on contrast.
3. **Misleading interaction telemetry** where pre-interaction static profile issues caused 0-step, 0-probe traces to be reported as completed failed agent runs.
4. **Excel localization gaps** in Arabic workbooks leaving dynamically injected English finding messages and recommendations.
5. **Brittle assistive map selectors and incomplete API** generating non-unique single-tag selectors like `a` with no individual `:id` retrieval endpoint.
6. **Vision layer telemetry blindness** swallowing errors into silent empty arrays and skipping artifacts on 0-finding pages.

In Phase 4, all six defect areas were systematically remediated, verified, and unit-tested locally under strict operational boundaries:
- **Zero Live Scans:** No network requests or rescans of external targets.
- **Zero Remote Mutations:** No access or modifications to production/staging environments, databases, or Coolify configs.
- **Widget Deferred:** In-page assistive widget features remain explicitly deferred to the future widget roadmap.
- **Direct Branch Commitment:** All code, schemas, and tests are implemented directly on `feature/semantic-core`.
- **Full Test Suite Health:** All 22 test suites and 100 unit tests in `@raawi-x/scanner` pass with zero failures.

---

## 2. Defect Remediation Details

### Workstream 1: Hidden-Input Handling (WCAG 4.1.2 & Focus Utilities)
- **Problem:** Hidden input elements (`<input type="hidden">`) lack accessible names by specification, yet were caught by general form control selectors and flagged as WCAG 4.1.2 accessibility violations. They were also included in focusable element counts and agent form field lists.
- **Root Cause:**
  - `packages/rules/src/wcag-rules.ts`: `wcag412Rule` used `input:not([type="hidden"])`, but lacked case-insensitivity and attribute presence checks, and `wcag212Rule` included raw `input`.
  - `packages/rules/src/utils/focus.ts`: `FOCUSABLE_SELECTORS` contained `input:not([disabled])` without excluding `[type="hidden"]`.
  - `apps/scanner/src/agent/page-understanding.ts`: `fields` and `formFields` collected all `input` elements including hidden inputs.
- **Changes Applied:**
  - `packages/rules/src/wcag-rules.ts`: Updated `wcag412Rule` and `wcag212Rule` selectors to strictly filter out `input[type="hidden" i]`.
  - `packages/rules/src/utils/focus.ts`: Updated `FOCUSABLE_SELECTORS` to `input:not([disabled]):not([type="hidden" i])`.
  - `apps/scanner/src/agent/page-understanding.ts`: Explicitly filtered out hidden inputs from `fields` and `formFields`.
- **Verification:**
  - Added unit test: `apps/scanner/src/rules/hidden-input.test.ts` (4 test cases).
  - Confirmed: Hidden CSRF tokens, session IDs, and metadata inputs are never flagged, while visible inputs missing labels remain flagged.

---

### Workstream 2: Focus and Contrast Stylesheet Evaluation
- **Problem:** Static HTML AST evaluation lacks runtime computed styles (cascade, stylesheet rules, CSS variables, and `:focus`/`:focus-visible` pseudo-classes). This caused false positives on WCAG 2.4.7 (Focus Visible) and WCAG 1.4.3 (Contrast Minimum) when styles were defined in external stylesheets rather than inline `style` attributes.
- **Root Cause:** Playwright crawler captured HTML and screenshot but did not extract computed styles from the browser context during page evaluation. Rules evaluated against static DOM attributes alone.
- **Changes Applied:**
  - `packages/core/src/index.ts`: Extended `PageArtifact` and `PageScanResult` with `computedStyles?: ComputedPageStyles` and `computedStylesPath?: string`.
  - `apps/scanner/src/crawler/computed-styles-capture.ts`: Implemented `captureComputedStyles(page)` to evaluate element styles directly via Playwright's browser engine:
    - Normalizes `:focus` and `:focus-visible` styles against unfocused baselines (outline, box-shadow, border).
    - Extracts computed text color, background color, font size, and font weight for interactive and content elements.
    - Persists results to `computed-styles.json`.
  - `apps/scanner/src/crawler/page-capture.ts`: Integrated computed style capture into Layer 1 pipeline.
  - `apps/scanner/src/runner/report-generator.ts`: Reads `computed-styles.json` and attaches `computedStyles` to `PageScanResult` before rule evaluation.
  - `packages/rules/src/wcag-rules.ts`:
    - Updated `wcag247Rule`: Inspects computed focus rings from `page.computedStyles`. If styles were not captured, returns `'needs_review'` rather than claiming a false failure.
    - Updated `wcag143Rule`: Utilizes computed colors when available, accurately evaluates 4.5:1 (normal text) and 3:1 (large text) contrast ratios, and falls back gracefully.
- **Verification:**
  - Added unit test: `apps/scanner/src/rules/computed-styles.test.ts` (7 test cases).
  - Validated: Stylesheet-based focus indicators pass; low-contrast stylesheet colors fail accurately; static AST runs without computed styles return `needs_review` instead of false failures.

---

### Workstream 3: Trustworthy Interaction Agent Telemetry
- **Problem:** In scan `scan_1792479482089_scvi6r1`, the interaction agent reported `status: 'fail'` with `traceSummary: '0 steps, 0 probes attempted, 1 issue'`. The single issue was actually detected during the pre-interaction static profile phase, not during dynamic keyboard exploration.
- **Root Cause:**
  - Static DOM inspection issues and live keyboard interaction issues were merged into an untyped list without source attribution.
  - `analysis-agent-summary.ts` marked any run with `issueCount > 0` as `fail`, even if zero steps or probes were executed.
- **Changes Applied:**
  - `packages/core/src/index.ts`: Added `source?: 'static_profile' | 'keyboard_interaction' | 'probe'` to `InteractionArtifact['issues']` and `RaawiTaskAssessment['issue']`.
  - `apps/scanner/src/agent/page-understanding.ts` & `interaction-agent.ts`: Tagged pre-interaction static assessments as `source: 'static_profile'`.
  - `apps/scanner/src/utils/analysis-agent-summary.ts` (and `.js`):
    - Added lifecycle statuses: `'incomplete'` and `'inconclusive'`.
    - When `stepCount === 0 && probeAttemptCount === 0`, status is set to `'incomplete'` (not `'fail'`).
    - Formatted `traceSummary` as `0 steps, 0 probes attempted (static assessment: X issue(s))`.
    - Localized status formatter `formatAnalysisAgentPageStatus` maps `'incomplete'` to `'Incomplete'` / `'غير مكتمل'`.
- **Verification:**
  - Added unit test: `apps/scanner/src/agent/telemetry.test.ts` (3 test cases).
  - Verified: Zero-step runs are reported as `incomplete`; active runs with interaction steps and failures report as `fail`; clean interaction runs report as `pass`.

---

### Workstream 4: Shared Bilingual Excel Localization
- **Problem:** When generating Arabic Excel exports (`scan_scvi6r1_ar.xlsx`), sheet titles and static headers were in Arabic, but dynamic finding messages, recommendations, and agent trace summaries remained in English.
- **Root Cause:** Finding translations previously existed only inside the React frontend (`report-ui`), while the Excel generator ran in a backend Node.js service without access to the frontend translation registry.
- **Changes Applied:**
  - `packages/core/src/localization.ts`: Created shared localization module containing:
    - `getLocalizedFindingMessage(message, lang)`: Translates dynamic messages using parameter-preserving regexes (preserves numbers, RGB values with commas, element selectors, and URLs).
    - `getLocalizedRecommendation(rec, lang)`: Localizes remediation advice.
    - `getLocalizedAgentKind(kind, lang)`: Maps agent types (`analysis` -> `'وكيل التحليل'`).
    - `getLocalizedTraceSummary(summary, lang)`: Localizes trace telemetry strings (e.g., `'0 steps, 0 probes attempted (static assessment: 1 issue(s))'` -> `'0 خطوة، 0 فحص تجريبي (تقييم ثابت: 1 مشكلة)'`).
    - `getLocalizedStatus(status, lang)` & `getLocalizedSeverity(severity, lang)`.
  - `apps/scanner/src/services/excel-report-generator.ts` (and `.js`):
    - Integrated shared localization functions for Arabic workbooks.
    - Preserved English workbooks and raw technical evidence (numbers, selectors, URLs).
    - Maintained full Right-to-Left (RTL) workbook formatting (`sheetView: [{ rtl: true }]`).
- **Verification:**
  - Added unit test: `apps/scanner/src/services/excel-localization.test.ts` (6 test cases).
  - Generated real `.xlsx` files and verified cell values, RTL properties, dynamic regex parameter extraction, and English stability.

---

### Workstream 5: Assistive-Map Selector & API Completeness
- **Problem:**
  - Action-intent elements generated brittle, non-unique CSS selectors like `a` or `.footer-text`.
  - The API had `GET /api/assistive-maps` (listing), but no individual `GET /api/assistive-maps/:id` endpoint existed, causing 404 errors when attempting to retrieve single maps.
- **Changes Applied:**
  - `apps/scanner/src/assistive/assistive-map-generator.ts` (and `.js`):
    - Upgraded `generateSelector(element, doc)`:
      1. Validates unique ID selectors (`#id`).
      2. Validates unique `[data-testid="..."]` or `[data-id="..."]`.
      3. Validates unique link href selectors (`a[href="..."]`).
      4. Validates unique name/type attributes.
      5. Validates unique class combinations.
      6. Builds hierarchical ancestor paths with `:nth-of-type` verifying `querySelectorAll(sel).length === 1`.
      7. Provides safe positional fallback if uniqueness cannot be established.
  - `apps/scanner/src/api/dashboard.ts` (and `.js`):
    - Implemented `GET /api/assistive-maps/:id` with `requireAuth`.
    - Supports querying by either `AssistiveMap.id` or `PageVersion.id`.
    - Handles UUID validation, returning 404 on invalid IDs or missing records, and 503 if the database is unavailable.
    - Returns full formatted map details including `data`, `json`, `confidenceSummary`, and page relations.
  - `apps/report-ui/src/lib/api.ts`: Added `getAssistiveMap(id: string)` method to the frontend API client.
- **Verification:**
  - Added unit test: `apps/scanner/src/assistive/assistive-map.test.ts` (10 test cases).
  - Verified selector uniqueness on duplicate elements and verified API authentication, 404, 503, and 200 responses.

---

### Workstream 6: Vision Execution Telemetry
- **Problem:**
  - `VisionAnalyzer.analyzePage` caught top-level errors and silently returned `[]`.
  - `page-capture.ts` skipped writing `vision.json` whenever findings count was 0.
  - As a result, catastrophic execution failures and clean 0-finding pages were indistinguishable, both reporting `status: 'done', meta: { visionCount: 0 }`.
- **Changes Applied:**
  - `apps/scanner/src/vision/analyzer.ts` (and `.js`):
    - Removed silent error swallowing: `analyzePage` rethrows errors on critical execution failure.
    - `saveFindings` persists `vision.json` even when findings array is empty `[]`.
  - `apps/scanner/src/crawler/page-capture.ts` (and `.js`):
    - Explicitly tracks `visionOutcome`: `'completed' | 'skipped' | 'failed'`.
    - When vision completes cleanly with 0 findings: writes `vision.json` to disk, records `result.visionPath`, and emits event `{ status: 'done', meta: { visionCount: 0, outcome: 'completed' } }`.
    - When vision fails or throws an exception: records `visionOutcome = 'failed'` and emits `{ status: 'failed', meta: { visionCount: 0, outcome: 'failed', error: '...' } }`.
    - When vision is disabled in configuration: emits `{ status: 'done', meta: { visionCount: 0, outcome: 'skipped', skipped: true, reason: 'vision_disabled' } }`.
    - When Layer 2 is disabled in scan options: emits `{ status: 'done', meta: { visionCount: 0, outcome: 'skipped', skipped: true, reason: 'layer2_disabled' } }`.
  - `apps/scanner/src/events/scan-events.ts`: Extended `LayerStatusEvent.meta` with `outcome`, `reason`, and `error`.
- **Verification:**
  - Added unit test: `apps/scanner/src/vision/vision-telemetry.test.ts` (4 test cases).
  - Verified: Errors are rethrown and emitted as `status: 'failed'`; clean 0-finding executions write valid JSON artifacts and emit `outcome: 'completed'`.

---

## 3. Test & Verification Summary

| Test Suite File | Workstream Covered | Tests Passed | Status |
| :--- | :--- | :--- | :--- |
| `src/rules/hidden-input.test.ts` | WS1: Hidden Inputs (WCAG 4.1.2/2.1.2/Focus) | 4 / 4 | PASS |
| `src/rules/computed-styles.test.ts` | WS2: Focus & Contrast Stylesheet Evaluation | 7 / 7 | PASS |
| `src/agent/telemetry.test.ts` | WS3: Interaction Agent Lifecycle Telemetry | 3 / 3 | PASS |
| `src/services/excel-localization.test.ts` | WS4: Shared Excel Localization & RTL | 6 / 6 | PASS |
| `src/assistive/assistive-map.test.ts` | WS5: Assistive Map Selectors & `:id` API | 10 / 10 | PASS |
| `src/vision/vision-telemetry.test.ts` | WS6: Vision Telemetry & Artifacts | 4 / 4 | PASS |
| **All other scanner test suites** | Monorepo Regression Safety | 66 / 66 | PASS |
| **Total Test Suite Health** | **Comprehensive Scanner Pipeline** | **100 / 100** | **PASS** |

### Package Build Verification
- `@raawi-x/core`: Built cleanly with `tsc -b` (0 errors).
- `@raawi-x/rules`: Built cleanly with `tsc -b` (0 errors).
- `@raawi-x/report`: Built cleanly with `tsc -b` (0 errors).
- `@raawi-x/scanner`: Built cleanly with `tsc -b` and static assets copied (0 errors).
- `@raawi-x/report-ui`: Built cleanly with `tsc -b` and `vite build` (0 errors).

---

## 4. Deferred Widget Implementation Roadmap

In accordance with strict coordinator instructions, in-page assistive widget runtime features were **strictly excluded** from Phase 4 and are deferred to future widget development phases:

1. **Widget Live DOM Injection:** In-page script tag delivery and hydration of the accessibility toolbar.
2. **Dynamic DOM Remediation Engine:** Live client-side application of `labelOverrides` and `imageDescriptions` to customer DOM nodes.
3. **Voice Command & Speech Synthesis:** Speech recognition and speech synthesis handlers for Arabic voice navigation.
4. **Assistive Widget Telemetry Collection:** Real-time collection and aggregation of `WidgetEvent` (page views, widget opens, voice command activations).
5. **Widget Analytics Dashboard UI:** Customer-facing analytics graphs for widget usage and interaction heatmaps.

---

## 5. Runtime Verification Checklist for Next Authorized Scan

When the scan coordinator authorizes a live scan on `https://www.w3.org/WAI/demos/bad/`, use this verification checklist to validate the pipeline:

- [ ] **WCAG 4.1.2 (Hidden Inputs):** Confirm `<input type="hidden">` CSRF tokens and metadata inputs generate 0 violations.
- [ ] **WCAG 2.4.7 (Focus Visible):** Confirm elements with stylesheet `:focus`/`:focus-visible` outlines pass without requiring inline style attributes.
- [ ] **WCAG 1.4.3 (Contrast):** Confirm stylesheet-based colors are evaluated using computed styles; verify static runs without computed styles produce `needs_review` rather than false failures.
- [ ] **Interaction Agent Telemetry:** Confirm pages with 0 keyboard steps report status `Incomplete` (`incomplete`) rather than `Fail` (`fail`).
- [ ] **Arabic Excel Export:** Download `scan_<id>_ar.xlsx` and verify:
  - Sheet `نتائج WCAG`: Column `الرسالة` contains localized Arabic text with numbers and selectors preserved.
  - Sheet `وكيل التحليل`: Column `الوكيل` displays `'وكيل التحليل'` and `الحالة` displays `'غير مكتمل'` or `'نجاح'`.
  - Sheet `تتبّع الوكيل`: Column `ملخص التتبع` displays localized summary (e.g., `'0 خطوة، 0 فحص تجريبي...'`).
- [ ] **Assistive Map Selectors:** Query `GET /api/assistive-maps` and `GET /api/assistive-maps/:id`. Verify selectors are unique hierarchical paths (e.g., `footer > a[href="..."]`) rather than generic single-letter tags.
- [ ] **Vision Telemetry & Artifacts:** Check `pages/1/vision/vision.json`:
  - When clean: `vision.json` exists with `[]` and SSE event emits `{ status: 'done', meta: { visionCount: 0, outcome: 'completed' } }`.
  - If vision encounters an error: SSE event emits `{ status: 'failed', meta: { outcome: 'failed', error: '...' } }`.

---

## 6. Conclusion & Recommendation

All remediation workstreams specified in Phase 4 are complete, fully verified by automated unit tests, and committed to `feature/semantic-core`. The scanner pipeline is now reliable, evidence-driven, and ready for coordinator review.

**Status:** STOP — Awaiting coordinator review before pushing or initiating future phases.
