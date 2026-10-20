# Tasks - Phase 2: Execute One Controlled End-to-End Scan

- [x] 1. Pre-Launch Verification
  - [x] Verify test environment isolation (`test-api.unifinitylab.com` / `test-report.unifinitylab.com`)
  - [x] Verify `DISABLE_LEGACY_SCAN_API=true` protection (HTTP 404 confirmed)
  - [x] Verify target `https://www.w3.org/WAI/demos/bad/` is reachable over HTTPS (HTTP 200 confirmed)
  - [x] Prepare exact scan start payload matching API schema
- [x] 2. Launch Exactly ONE Scan
  - [x] Submit `POST /api/scans/start` with approved bounded parameters
  - [x] Immediately capture and record the returned `scanId`: `scan_1792479482089_scvi6r1`
- [x] 3. Lifecycle Observation & Live Monitoring
  - [x] Connect to SSE stream `/api/scans/:id/events`
  - [x] Track state transitions: queued -> running -> completed (34.9s duration)
  - [x] Capture per-page timings, layer statuses, and agent progress events
- [x] 4. Post-Scan Evidence Verification (Cross-Layer)
  - [x] Verify Layer 1 (DOM, HTML, 10 WCAG rule findings: 7 pass, 2 fail, 1 needs review)
  - [x] Verify Layer 2 (screenshot.png, vision analysis completed, visionCount: 0)
  - [x] Verify Layer 3A (interaction agent executed in 83ms, 1 finding: unnamed_task_control)
  - [x] Verify Layer 3B (assistive map generated with 2 action intents, persisted to DB)
  - [x] Check Test Report UI rendering for this scan (75% score, bilingual EN/AR verified)
- [x] 5. Export Verification (English & Arabic Excel Workbooks)
  - [x] Download English Excel workbook (`locale=en`) for this scan (11,876 bytes)
  - [x] Download Arabic Excel workbook (`locale=ar`) for this scan (12,460 bytes)
  - [x] Directly inspect workbooks for structure, metadata, RTL/LTR, and row-level finding translations
- [x] 6. Comprehensive Deliverable
  - [x] Produce `PHASE_2_CONTROLLED_E2E_SCAN_REPORT.md`
  - [x] Executive verdict: PASS (with target Cloudflare edge challenge note)
  - [x] Stop for coordinator review

## Execution Review
- Single scan `scan_1792479482089_scvi6r1` executed end-to-end in 34.9 seconds.
- All three layers (L1 DOM/WCAG, L2 Vision, L3A Keyboard Agent, L3B Assistive Map) succeeded and persisted.
- Target edge served Cloudflare challenge page (`title: "Just a moment..."`), which was fully audited.
- Real finding rows populated English and Arabic Excel workbooks; row-level status (`Pass`/`نجح`, `Fail`/`فشل`, `Needs Review`/`يحتاج مراجعة`) and severities (`Critical`/`حرج`, `Important`/`مهم`) verified.

# Tasks - Phase 3: Existing Scan Evidence and Accuracy Review

- [x] 1. Cross-Layer Evidence Verification
  - [x] Correlate scan lifecycle, page metadata, HTML, WCAG findings, vision, keyboard trace, assistive map, and UI/exports
- [x] 2. Layer 1 Accuracy & False Positive Assessment
  - [x] Verify Cloudflare challenge page impact vs intended W3C target (audited page was `<title>Just a moment...</title>`)
  - [x] Analyze hidden Turnstile response input `#cf-chl-widget-wmnkd_response` in WCAG 4.1.2 and WCAG 2.4.7 (confirmed false positive)
  - [x] Evaluate focus indicator sampling logic (sampling hidden inputs for focus styles and only checking inline styles)
  - [x] Analyze contrast review on `div.main-wrapper.QOLSX4` (WCAG 1.4.3 JSDOM inline-only check causes 19 elements to fall back to needs_review)
  - [x] Document impact on reported compliance score (75% applies only to challenge page)
- [x] 3. Keyboard Agent Discrepancy Investigation
  - [x] Trace `unnamed_task_control` generation vs `0 steps, 0 probes attempted, 1 issue` in trace
  - [x] Inspect source in `page-understanding.ts`, `interaction-agent.ts`, and `analysis-agent-summary.ts` for metric calculations
  - [x] Determine that trace represents pre-interaction static page-profile assessment of hidden input; active loop exited in 83ms without tab steps
- [x] 4. Vision Layer Verification
  - [x] Trace vision pipeline execution from `screenshot.png` to `visionCount: 0` (ran in 8.1s, heuristic check only)
  - [x] Determine that external AI vision models (OpenAI/Gemini) were disabled by configuration; zero findings on 2 text links was expected
  - [x] Assess telemetry: `saveFindings()` is skipped when findings count is 0; `vision.json` is not written to disk by design
- [x] 5. Assistive Map Assessment
  - [x] Inspect the 2 action intents (`a` -> Cloudflare, `.footer-text` -> Privacy) in database/artifacts
  - [x] Evaluate API retrieval endpoints: `GET /api/assistive-maps` works, but individual `:id` endpoint returns 404
  - [x] Assess suitability: accurately models footer links, but selector `a` is too generic
- [x] 6. Bilingual Report & Excel Localization Audit
  - [x] Identify dynamic English messages and recommendations in Arabic workbook sheet `نتائج WCAG` and `وكيل التحليل`
  - [x] Check trace summary localization in Arabic sheet `تتبّع الوكيل` (`0 steps, 0 probes attempted, 1 issue` remains English)
  - [x] Trace Excel export localization code (`excel-report-generator.ts`): runs in backend Node.js and has no access to frontend `getLocalizedIssueMessage`
- [x] 7. Comprehensive Deliverable & Recommendations
  - [x] Compile prioritized defect list (P1-P4) with impact and proposed remediation
  - [x] Write `PHASE_3_SCAN_EVIDENCE_AND_ACCURACY_REVIEW.md`
  - [x] Stop for coordinator review
# Tasks - Phase 4: Pipeline Accuracy and Reporting Reliability Remediation

- [x] 1. Workstream 1: Correct Hidden-Input Handling
  - [x] Audit and fix selector in `packages/rules/src/wcag-rules.ts` (WCAG 4.1.2)
  - [x] Audit and fix selector in `packages/rules/src/utils/focus.ts` (`getFocusableElements`)
  - [x] Audit and fix selector in `apps/scanner/src/agent/page-understanding.ts` (`fields`, `fieldsWithoutName`)
  - [x] Audit other form/focus rules in `packages/rules` for hidden input issues (WCAG 2.1.2 modal/region checks)
  - [x] Write unit tests verifying hidden inputs are ignored and visible unnamed inputs still flagged (`hidden-input.test.ts` passing)
- [x] 2. Workstream 2: Correct Focus and Contrast Evaluation
  - [x] Inspect integration between Playwright browser capture and rule evaluation
  - [x] Implement computed-style aware focus evaluation (supporting stylesheet `:focus`/`:focus-visible`)
  - [x] Implement computed-style aware contrast evaluation (supporting stylesheet colors and graceful fallback)
  - [x] Write tests covering stylesheet focus indicators, stylesheet contrast, and large-text handling (`computed-styles.test.ts` passing)
- [x] 3. Workstream 3: Make Interaction Telemetry Trustworthy
  - [x] Refactor `apps/scanner/src/agent/page-understanding.ts` & `interaction-agent.ts` to distinguish static vs interaction findings
  - [x] Update `analysis-agent-summary.ts` lifecycle status & summary (do not represent 0-step trace as completed failed test)
  - [x] Write tests for: 1 static issue with 0 steps/probes; completed interaction with steps; failed execution (`telemetry.test.ts` passing)
- [x] 4. Workstream 4: Share Localization with Excel Exporter
  - [x] Create shared localization module in `@raawi-x/core` with message translations, recommendations, and trace formatters
  - [x] Wire `apps/scanner/src/services/excel-report-generator.ts` to use shared localization for Arabic workbooks
  - [x] Keep English exports and raw technical evidence (numbers, selectors, URLs) intact
  - [x] Write tests generating and inspecting real XLSX workbooks for cell values, RTL, and formatting (`excel-localization.test.ts` passing)
- [x] 5. Workstream 5: Assistive-Map Selector & API Completeness
  - [x] Improve action-intent selector generation in `assistive-map-generator.ts` for uniqueness with safe fallback
  - [x] Add `GET /api/assistive-maps/:id` in `apps/scanner/src/api/dashboard.ts` with auth, resource association, and 404
  - [x] Write tests for selector uniqueness and `GET /api/assistive-maps/:id` endpoint (`assistive-map.test.ts` passing)
- [x] 6. Workstream 6: Vision Execution Telemetry
  - [x] Update `VisionAnalyzer` and `page-capture.ts` to explicitly distinguish 0 findings, skipped, and failed/exception
  - [x] Enhance event metadata and artifact handling for clean vs failed vision
  - [x] Write tests verifying error outcomes are not reported as successful zero-finding analysis (`vision-telemetry.test.ts` passing)
- [x] 7. Full Validation, Report & Git Push
  - [x] Run all package tests and app builds (100/100 tests passing)
  - [x] Produce `PHASE_4_ACCURACY_REMEDIATION_REPORT.md`
  - [x] Commit and push to `feature/semantic-core`
  - [x] Stop for coordinator review

# Tasks - Phase 5.1: Architectural Foundation and Shadow DOM Encapsulation

- [x] 1. Pre-Implementation Inspection & Setup
  - [x] Audit existing `apps/widget` build config (`vite.config.ts`), package scripts, and test suite
  - [x] Check existing `widget-e2e` Playwright and unit test configuration
- [x] 2. Core Modular Architecture & Shadow DOM Container
  - [x] Create `apps/widget/src/core/shadow-container.ts` (<raawi-accessibility-widget> custom element with open Shadow Root)
  - [x] Create `apps/widget/src/core/i18n.ts` (centralized, typed bilingual AR/EN dictionary)
  - [x] Create `apps/widget/src/core/state.ts` (widget state & preference manager with clean lifecycle)
  - [x] Create `apps/widget/src/styles/widget-styles.ts` (scoped design tokens, reset, modern emerald theme, zero global leaks)
- [x] 3. Modular Shell Components
  - [x] Create `apps/widget/src/components/launcher.ts` (accessible launcher button, inline crisp SVG icon, aria-expanded, keyboard controls)
  - [x] Create `apps/widget/src/components/panel.ts` (modular panel inside Shadow Root, tabs, topbar, reset, close, footer with WCAG disclaimer)
  - [x] Replace / optimize 2.5MB icon with high-res inline SVG
- [x] 4. Entry Point & Integration Contract Compatibility
  - [x] Wire `apps/widget/src/index.ts` / entry point to export `RaawiXAccessibility` / `AccessibilityWidget`
  - [x] Maintain global bootstrap contract (`window.RAWI_API_URL`, `window.RAWI_ENTITY_CODE`, `window.VOICE_ENABLED`, auto-init)
  - [x] Prevent duplicate instances and duplicate event listeners
  - [x] Eliminate all destructive global CSS overrides (`* { font-size: inherit !important }`, etc.)
- [x] 5. Automated Tests for Phase 5.1
  - [x] Add unit / component tests for Shadow DOM mounting, style isolation, keyboard accessibility, and i18n
  - [x] Add tests verifying host DOM content and typographic scale remain untouched
  - [x] Verify handling of multiple launcher/panel states and minimal host documents
- [x] 6. Build, Validation & Report
  - [x] Run `pnpm --filter @raawi-x/widget build` and verify bundle generation (36.98 kB IIFE bundle)
  - [x] Run all automated tests (12/12 passing)
  - [x] Create `PHASE_5_1_IMPLEMENTATION_REPORT.md`
  - [x] Commit and push to `feature/semantic-core`

# Tasks - Phase 5.2: Accessible Dialog, Focus Management and Live Announcements

- [x] 1. Preflight & Architecture Inspection
  - [x] Verify branch (`feature/semantic-core`), HEAD commit (`fb808c4`), and clean working tree
  - [x] Evaluate native `<dialog>` vs custom ARIA dialog in Shadow DOM across browsers (custom ARIA dialog with Shadow backdrop chosen for full isolation and browser consistency)
- [x] 2. Dialog Semantics & Backdrop Architecture
  - [x] Ensure `aria-modal="true"` is dynamically set only when dialog is open and modal
  - [x] Ensure persistent naming via `aria-labelledby="raawi-panel-title"`
  - [x] Introduce accessible backdrop layer inside Shadow DOM for reliable dismissal
  - [x] Synchronize `aria-expanded` and `aria-controls` on launcher
- [x] 3. Opening, Initial Focus & Complete Keyboard Containment (Focus Trap)
  - [x] Implement initial focus placement to close button (`[data-testid="raawi-close"]`) or dialog heading (`tabindex="-1"`) upon open
  - [x] Implement robust bidirectional focus trap (Tab forward wrap, Shift+Tab reverse wrap)
  - [x] Filter out disabled, hidden, inert, or display:none elements from tab sequence
  - [x] Contain focus completely so it never escapes to host page while open (`focusin` capturing protection)
  - [x] Escape key closes dialog and safely restores focus to launcher (with disconnected check)
- [x] 4. Localized ARIA Live Announcer
  - [x] Create `LiveAnnouncerComponent` (`role="status"`, `aria-live="polite"`, `aria-atomic="true"`)
  - [x] Announce dialog open/close, language toggle, and reset events in active locale
  - [x] Ensure zero automatic TTS narration is triggered
- [x] 5. Testing & Verification
  - [x] Add unit tests in `apps/widget/test/phase5-2.test.ts` for semantics, trap logic, and announcer (12/12 passing)
  - [x] Create real-browser Playwright test in `tests/widget-e2e/dialog-focus.spec.ts` for actual tab traversal, wrap, containment, and restoration (10/10 passing)
  - [x] Run existing Phase 5.1 regression tests (12/12 passing)
- [x] 6. Production Build, Report & Push
  - [x] Build production widget bundle (40.93 kB IIFE, gzip: 9.89 kB) and sync to test sites
  - [x] Create `PHASE_5_2_IMPLEMENTATION_REPORT.md`
  - [x] Commit on `feature/semantic-core` and push

## Execution Review (Phase 5.2)
- Accessible dialog semantics resolved: `role="dialog"`, `aria-labelledby="raawi-panel-title"`, `aria-modal="true"` dynamically present only when panel is open and visible (`aria-modal="false"` + `hidden` when closed).
- Launcher `aria-expanded` ("false"/"true") and `aria-controls="raawi-accessibility-panel"` synchronized with panel state.
- Bidirectional Tab focus trap implemented in `shadow-container.ts` and `panel.ts`: Tab wraps from last visible control to first; Shift+Tab wraps from first control to last; elements residing in inactive tabs (`display: none`) are strictly filtered out.
- Host focus containment verified in real browser: external clicks or programmatic attempts to focus host page elements while modal is active are safely recaptured.
- Escape key cleanly dismisses dialog and restores focus to launcher; if launcher is disconnected, no error is thrown.
- Shadow DOM backdrop overlay (`.raawi-backdrop`) handles intentional outside clicks; inner clicks do not dismiss panel.
- Localized ARIA live announcer (`LiveAnnouncerComponent`) provides polite, non-intrusive status updates; zero automatic TTS synthesis triggered.
- Verification: 12/12 Phase 5.2 unit tests passed, 10/10 real-browser Playwright E2E tests passed, 12/12 Phase 5.1 regression tests passed. Production bundle compiled cleanly.

# Tasks - Phase 5.3: Non-Destructive Display and Reading Preferences

- [x] 1. Architecture & Preflight
  - [x] Preflight git inspection (clean working tree, branch `feature/semantic-core`, HEAD `7af3a6b`)
  - [x] Design and architect `DisplayManager` module (`apps/widget/src/core/display-manager.ts`)
- [x] 2. Implementation of Display & Reading Preferences
  - [x] Text scaling: Non-destructive proportional scaling preserving heading/body typography hierarchy (no `inherit !important`)
  - [x] Line spacing: Proportional line spacing for content without breaking buttons, badges, table cells, or compact controls
  - [x] High contrast: Curated dark high-contrast theme (21:1 ratio, yellow links, solid control borders) isolated from widget UI
  - [x] Reading ruler & mask: Shadow DOM encapsulated fixed overlays (`pointer-events: none`), RAF mouse/focus tracking, mask height selector
  - [x] Stop animations: Reversible CSS animation/transition suppression and video pause
  - [x] High-visibility cursor: Crisp, reversible dark and light SVG cursors
  - [x] Reversible lifecycle & cleanup: Clean reset and teardown with zero persistent host mutations
- [x] 3. Panel UI & Localization Integration
  - [x] Wire Reading Mask window height controls (`small`, `medium`, `large`) into panel UI
  - [x] Ensure all settings and announcer messages are localized in Arabic and English
  - [x] Maintain compliance disclaimer and ensure zero automatic TTS
- [x] 4. Automated Testing & Verification
  - [x] Create unit tests in `apps/widget/test/phase5-3.test.ts` for all preferences, calculations, and restoration (12/12 passing)
  - [x] Create real-browser Playwright test in `tests/widget-e2e/display-preferences.spec.ts` for visual rendering, typography hierarchy, ruler tracking, and cleanup (10/10 passing)
  - [x] Run Phase 5.1 and Phase 5.2 regression test suites (24/24 unit, 12/12 Playwright passing)
  - [x] Validate TypeScript type-check and build production bundle (55.47 kB IIFE bundle)
- [x] 5. Report & Git Delivery
  - [x] Create `PHASE_5_3_IMPLEMENTATION_REPORT.md`
  - [x] Commit on `feature/semantic-core`, push upstream, report commit SHA, and STOP

## Execution Review (Phase 5.3)
- Non-destructive display architecture established in `apps/widget/src/core/display-manager.ts` using a single managed `<style id="raawi-display-styles">` and discrete `data-raawi-*` attributes on `<html>`.
- Typographic hierarchy strictly preserved: Font scaling modifies heading levels proportionally (`h1` by 1.25x, `h2` by 1.2x, `h3` by 1.15x, `p` by 1.1x, etc.) without flattening (`* { font-size: inherit !important; }` eliminated).
- Content line-spacing targeting: Applied to readability blocks (`p`, `article`, `section`, `li`, `dd`) while preserving compact control heights (`button`, `input`, `badge`, `table` cells).
- High-contrast dark theme: Curated pure black (`#000000`) background, `#ffffff` text (21:1 contrast ratio), `#ffff00` links, and distinct focus indicators. Scoped via `:not(raawi-accessibility-widget *)` to ensure widget UI is completely unaffected.
- Reading ruler and reading mask: Rendered exclusively inside the widget's open Shadow Root with `pointer-events: none`, tracking mouse Y and keyboard focus position via `requestAnimationFrame`. Three aperture height choices (`small`, `medium`, `large`) integrated in Panel UI.
- Reduced motion / stop animations: Reversibly freezes CSS transitions, keyframe animations, and pauses active `<video>` media without altering host video volume or source.
- High-visibility cursors: Dark (black fill with white outline) and light (white fill with black outline) high-DPI inline SVG cursors applied reversibly to host body and interactive elements.
- Complete reversibility: `reset()` clears all `data-raawi-*` attributes, resets display manager state, and restores host state. `destroy()` disconnects observers, removes listeners, tears down Shadow DOM overlays, and removes the managed style sheet.
- Verification: 12/12 Phase 5.3 unit tests passing, 10/10 real-browser Playwright tests passing, 24/24 Phase 5.1 & 5.2 regression unit tests passing, 12/12 Phase 5.1 & 5.2 Playwright regression tests passing. Zero TypeScript errors. Production bundle: 55.47 kB (gzip: 12.65 kB).

# Tasks - Phase 5.3 Acceptance Remediation (Safe Host-State Restoration)

- [x] 1. Preflight & Defect Inspection
  - [x] Verify clean working tree on branch `feature/semantic-core` at commit `d1eb1eb`
  - [x] Audit `apps/widget/src/core/display-manager.ts` attribute management and video playback paths
- [x] 2. Fix A: Attribute Ownership & Collision-Aware Restoration
  - [x] Capture initial host baseline map for managed attributes (`data-raawi-*`) and custom properties (`--raawi-*`) at instantiation
  - [x] Track exact applied values in `lastAppliedAttributes`
  - [x] Implement ownership-aware restoration: restore to baseline only if current value matches applied value; preserve external host mutations without overwriting
  - [x] Exclude unmanaged attributes (e.g. `data-raawi-entity-code`, `data-raawi-version`) from mutation or removal
  - [x] Tag managed stylesheet with `data-raawi-owned="true"` and remove only the instance-owned element on destroy
- [x] 3. Fix B: Video Playback-State Preservation
  - [x] Distinguish between playing vs already paused `<video>` elements when stop-animations is enabled
  - [x] Maintain `pausedByWidgetVideos: Set<HTMLVideoElement>` storing only actively playing videos
  - [x] On deactivation, reset, or destroy, resume only tracked videos and clear tracking state
  - [x] Ensure videos already paused prior to activation remain paused
  - [x] Handle dynamically inserted videos cleanly via `MutationObserver` without stale accumulation
  - [x] Preserve media source, currentTime, volume, and muted attributes
- [x] 4. Automated Testing & Verification
  - [x] Expand unit tests in `apps/widget/test/phase5-3.test.ts` from 12 to 20 tests (all 20 passing)
  - [x] Expand Playwright tests in `tests/widget-e2e/display-preferences.spec.ts` from 10 to 14 tests (all 14 passing)
  - [x] Run full regression test suites (Phase 5.1, 5.2, 5.3: 44 unit, 26 Playwright passing)
  - [x] Validate TypeScript compilation (0 errors) and rebuild production bundle (58.51 kB IIFE)
- [x] 5. Documentation & Delivery
  - [x] Update `PHASE_5_3_IMPLEMENTATION_REPORT.md` with Section 8 Acceptance Remediation
  - [x] Create `PHASE_5_3_ACCEPTANCE_REMEDIATION_REPORT.md`
  - [x] Commit and push to `feature/semantic-core` and STOP

## Execution Review (Phase 5.3 Acceptance Remediation)
- Ownership-aware attribute restoration completely verified: `initialHostAttributes` captures pre-existing host values (`data-raawi-text-size="1.15"`); on reset/teardown, the pre-existing value is restored rather than deleted. Unmanaged integration attributes (`data-raawi-entity-code`, `data-raawi-version`) are untouched.
- External collision preservation verified: When an external host script mutates an attribute while a preference is active, the widget detects `currentVal !== lastApplied` and preserves the host modification without overwriting.
- Video playback preservation verified: Actively playing videos are paused and resumed; already-paused videos remain paused; zero stale references remain after repeated toggles; dynamically inserted videos are handled cleanly.
- Full verification: 44/44 unit tests passing, 26/26 Playwright real-browser tests passing (70/70 total suite, 100% pass rate). Production bundle: 58.51 kB minified (13.39 kB gzip). Zero TypeScript errors.

# Tasks - Phase 5.4: AssistiveMap Integration and Safe DOM Remediation

- [x] 1. Preflight & API Contract Establishment
  - [x] Verify branch (`feature/semantic-core`), HEAD (`49ef4ce`), clean working tree
  - [x] Audit scanner endpoints (`GET /api/widget/page-package` vs `GET /api/assistive-maps/:id`)
  - [x] Document endpoint selection rationale: `GET /api/widget/page-package` is the public, unauthenticated widget endpoint keyed by URL/entityCode; `/api/assistive-maps/:id` is an internal admin endpoint requiring JWT auth and database UUIDs
  - [x] Inspect AssistiveMap schema: `labelOverrides`, `imageDescriptions`, `actionIntents`, `forms`, `guidance`
- [x] 2. Dedicated API Client Module (`apps/widget/src/core/api-client.ts`)
  - [x] Implement `MapApiClient` with canonical URL resolution, entity code extraction, timeout support (5s), and in-flight deduplication
  - [x] Implement schema validation and match confidence check (accept 'high' / 'medium', reject 'low' or mismatched URL)
  - [x] Provide caching by URL+entityCode and AbortController cancellation on teardown/navigation
  - [x] Handle 404 (not scanned), 500/offline gracefully without uncaught exceptions
- [x] 3. Safe DOM Remediation Engine (`apps/widget/src/core/dom-remediator.ts`)
  - [x] Implement `DomRemediator` with explicit ownership tracking and opt-in activation
  - [x] Image alt remediation: high confidence only, unambiguous unique selector check (`matches.length === 1`), preserve meaningful authored alt and intentional decorative `alt=""`
  - [x] Control label remediation: high confidence only, unambiguous unique selector, accessible-name check (check `aria-label`, `aria-labelledby`, `<label>`, button text), never overwrite existing accessible names
  - [x] Selector safety: catch invalid selectors without throwing, reject ambiguous selectors
  - [x] Ownership-aware restoration: restore original missing/present state on opt-out/reset/teardown; preserve host modifications made during remediation
- [x] 4. Page Insights & Panel UI Integration
  - [x] Add `remediationEnabled` to `WidgetSettings` (opt-in toggle)
  - [x] Update `apps/widget/src/core/i18n.ts` with bilingual AR/EN strings for Page Insights, status messages, landmarks, and remediation toggle
  - [x] Render Page Insights view in Assist tab (`apps/widget/src/components/panel.ts`): match status, summary, landmarks list, available enhancements count, opt-in toggle
  - [x] Wire `MapApiClient` and `DomRemediator` into `RaawiAccessibilityWidget` (`apps/widget/src/core/shadow-container.ts`)
- [x] 5. Automated Testing & Verification
  - [x] Unit tests in `apps/widget/test/phase5-4.test.ts` (API client, schema validation, safe alt/aria-label remediation, selector safety, collision preservation, reversibility, offline fallback) - 13/13 passing
  - [x] Real-browser Playwright tests in `tests/widget-e2e/dom-remediation.spec.ts` (real host DOM remediation, preserved empty alt, preserved accessible name, opt-out restoration, Page Insights UI) - 5/5 passing
  - [x] Run full regression suite (5.1, 5.2, 5.3 unit + Playwright) - 57 unit tests + 31 Playwright tests passing (100%)
  - [x] TypeScript type-check (`tsc --noEmit`) and production build (`vite build` - 73.63 kB)
- [x] 6. Documentation & Delivery
  - [x] Create `PHASE_5_4_IMPLEMENTATION_REPORT.md`
  - [x] Commit and push to `feature/semantic-core` and STOP

## Phase 5.4 Review Summary
- **API Contract:** Confirmed and implemented `GET /api/widget/page-package` contract without backend mutations.
- **Client Resilience:** 5-second timeout, in-flight request deduplication, memory caching, URL canonicalization, and graceful offline fallback.
- **Remediation Safety:** Opt-in only (`remediationEnabled: false` default), strict 1:1 selector uniqueness enforcement, preservation of authored and decorative `alt=""` images, preservation of existing accessible names, and ownership-aware restoration.
- **Verification:** 100% test pass rate across Node unit tests (57/57) and Playwright real-browser tests (31/31). Zero regressions.

# Tasks - Phase 5.5: Freshness Engine, Fingerprint Validation and Advanced Navigation

- [x] 1. Preflight & Runtime Evidence Verification
  - [x] Verify branch `feature/semantic-core`, HEAD `b532ade`, clean working tree
  - [x] Verify exact scanner fingerprint schema (`PageFingerprint`: `title`, `firstHeading`, `mainTextHash` via SHA-256)
  - [x] Verify scanner landmark schema (`type`/`role`, `label`, `selector`, `description`) and form guidance schema
- [x] 2. Freshness Engine (`apps/widget/src/core/freshness-engine.ts`)
  - [x] Implement live DOM fingerprint extraction (`computeLivePageFingerprint`) with normalized title, first heading (`h1`/`h2`), and SHA-256 main content hash
  - [x] Implement `evaluateFreshness` with distinct signals: `ready` (matching), `outdated` (meaningful change), `unknown` (missing/incomplete fingerprint)
  - [x] Account for transient content resilience (truncate main content, strip scripts/styles/tags)
- [x] 3. Page Context & SPA Navigation Tracking
  - [x] Detect SPA URL transitions (`popstate`, `hashchange`, `pushState`, `replaceState`)
  - [x] Observe meaningful DOM mutations with debouncing (300ms)
  - [x] Request cancellation on navigation: abort prior in-flight requests to prevent race conditions
  - [x] Stale-map safety: immediately revert widget-owned remediation on `outdated` or `mismatch` while retaining display preferences
  - [x] Proper teardown: unbind event listeners, disconnect observers, cancel timers
- [x] 4. Accessible Landmark Navigation Drawer
  - [x] Extract landmarks from verified package guidance with bilingual role labels (AR/EN)
  - [x] Validate selector uniqueness (`matches.length === 1`) and connection
  - [x] Predictable focus transfer with temporary `tabindex="-1"` for non-focusable elements
  - [x] Smooth scrolling respecting `reduceMotion` preference
  - [x] Handle missing, ambiguous, or invalid selectors safely without throwing
- [x] 5. Offline Status & Manual Refresh Action
  - [x] Support diagnostic statuses: `loading`, `ready`, `not-scanned`, `offline`, `outdated`, `mismatch`, `invalid`, `unknown`
  - [x] Implement deliberate "Refresh" / "تحديث" button with duplicate-click protection and cache bypass
  - [x] Non-invasive, read-only form guidance hints where scanner provides `formSteps`
- [x] 6. Comprehensive Automated Testing & Verification
  - [x] Unit tests in `apps/widget/test/phase5-5.test.ts` (fingerprint extraction, SHA-256, freshness evaluation, SPA transitions, stale remediation cleanup, landmark navigation, manual refresh)
  - [x] Real-browser Playwright tests in `tests/widget-e2e/freshness-navigation.spec.ts` (all 13 real-browser scenarios passing)
  - [x] Full Phase 5 regression tests passing (89/89 unit tests, 42/42 Playwright E2E tests passing 100%)
  - [x] Clean TypeScript check (`tsc --noEmit`) and production widget build (`vite build` - 92.28 kB)
- [x] 7. Documentation & Delivery
  - [x] Produce `PHASE_5_5_IMPLEMENTATION_REPORT.md`
  - [x] Commit and push to `feature/semantic-core`
  - [x] Stop for coordinator review

## Execution Review (Phase 5.5)
- **Fingerprint Engine:** Bit-for-bit alignment with scanner `PageFingerprint` contract (`title`, `firstHeading`, `mainTextHash` via FIPS 180-2 SHA-256) with full exclusion of widget DOM elements and remediated attributes.
- **Freshness Invalidation:** Conservative policy flagging missing fingerprints as `'unknown'`, content drift as `'outdated'`, and URL/origin mismatches as `'mismatch'`.
- **Safe Remediation Rollback:** Stale detection immediately revokes widget-applied `alt` and `aria-label` attributes while maintaining independent visual display preferences (text size, line height, contrast, ruler, mask).
- **SPA & DOM Mutation Tracking:** Automatic capture of `pushState`, `replaceState`, `popstate`, `hashchange` and 300ms debounced DOM mutations; aborts in-flight fetch operations to eliminate race conditions.
- **Landmark Navigation:** Strictly verifies 1:1 selector uniqueness, injects temporary `tabindex="-1"` with blur cleanup, disables focus restoration to launcher upon landmark selection, and supports instant scroll under `reduceMotion`.
- **Diagnostic Badges & Refresh:** 8 discrete localized statuses in Arabic and English, plus a cache-bypassing `#raawi-btn-refresh` button with in-flight duplicate-click protection.
- **Verification:** 89/89 unit tests passing (Phases 5.1-5.5) and 42/42 real-browser Playwright tests passing across 4 suites. Bundle build: 92.28 kB IIFE (22.72 kB gzip). Exit code 0 on TypeScript check.

# Tasks - Phase 5.6: Full Widget Integration, Regression and Acceptance Verification

- [x] 1. Preflight and Environment Inspection
  - [x] Verify branch `feature/semantic-core`, HEAD commit `3efbafc`, clean working tree
  - [x] Audit existing test scripts and configurations across repo
  - [x] Inspect existing test fixtures (`portal-good` AR RTL and `gov-sim` EN LTR)
- [x] 2. Defect Investigation & History API Safeguard Remediation
  - [x] Audit History API monkey-patching in `apps/widget/src/core/page-tracker.ts`
  - [x] Implement cooperative wrapping pattern with shared listener registry
  - [x] Prevent overwriting third-party wrappers installed after widget
  - [x] Prevent accumulating duplicate wrappers across multiple init/destroy cycles
  - [x] Write unit tests for cooperative History API wrapping in `apps/widget/test/phase5-6.test.ts`
- [x] 3. Comprehensive Acceptance Testing Across All Matrix Areas (A-G)
  - [x] Area A: Build, initialization, embedding, duplicate script protection, CSS isolation, teardown/reinit
  - [x] Area B: Host-page isolation, visual & reading preferences on representative host fixtures, desktop & mobile viewports, non-destructive reset, collision preservation
  - [x] Area C: Dialog semantics, initial focus, bidirectional tab trap, Escape dismissal, focus restore, polite ARIA live region without automatic speech synthesis, full Arabic (RTL) and English (LTR) audit
  - [x] Area D: AssistiveMap consumption, match-confidence policy, safe alt & control labeling, selector uniqueness, preservation of `alt=""` and authored labels, ownership-aware cleanup
  - [x] Area E: Freshness engine, fingerprint contract verification against scanner algorithms, SPA navigation, debounced DOM mutation, race condition prevention via abort, manual refresh
  - [x] Area F: Landmark navigation, uniqueness verification, temporary tabindex injection and blur cleanup, motion-aware scrolling, read-only form guidance
  - [x] Area G: Offline handling, timeouts, 404, malformed payloads, and graceful degradation
- [x] 4. Automated Test Suites & Regression Verification
  - [x] Run full unit test suite (Phases 5.1–5.6: 99/99 passing, 0 failures)
  - [x] Run Playwright real-browser test suites across desktop and mobile (50/50 passing, 0 failures)
  - [x] Document automated accessibility and screen-reader limitations honestly
  - [x] Verify TypeScript check (`tsc --noEmit` exits 0) and production build (`vite build` 93.38 kB / gzip: 23.01 kB)
- [x] 5. Documentation, Reports & Delivery
  - [x] Produce `PHASE_5_6_ACCEPTANCE_REPORT.md`
  - [x] Produce `PHASE_5_6_REMEDIATION_REPORT.md` documenting History API safeguard
  - [x] Update `tasks/todo.md` with final execution review
  - [x] Commit and push to `feature/semantic-core`
  - [x] Final stop for coordinator review

## Execution Review (Phase 5.6)
- **Defect Correction:** Resolved History API monkey-patching defect in `apps/widget/src/core/page-tracker.ts` using cooperative listener registry. Teardown now strictly preserves host and third-party wrappers installed after the widget; multiple initializations do not accumulate redundant wrappers.
- **Verification:** 100% pass rate across 99 unit tests (Phases 5.1–5.6) and 50 Playwright real-browser tests across 6 test suites (`acceptance.spec.ts`, `dialog-focus.spec.ts`, `display-preferences.spec.ts`, `dom-remediation.spec.ts`, `freshness-navigation.spec.ts`, `smoke.spec.ts`).
- **Production Build:** Bundle compiled cleanly via Vite (`dist/widget.iife.js`: 93.38 kB / gzip: 23.01 kB, 198ms build time). Synchronized across test site public assets.
- **Acceptance Verdict:** ACCEPTED. Phase 5 widget milestone complete and verified. Awaiting coordinator review before Phase 6.

# Tasks - Phase 6: Complete the 20 DGA Requirements

- [x] 1. Preflight and Requirements Traceability
  - [x] Verify complete HEAD SHA (`4c9f8d60cf4beed30ffa17c7220c20fe7184b46a`), branch (`feature/semantic-core`), working tree clean, synced with origin
  - [x] Review authoritative 20 DGA specification (`docs/DGA_RAAWI_X_REQUIREMENTS.md`) and historical remediation reports
  - [x] Analyze all 20 requirements across classifications (Accessibility, Core Functional, Reporting, UI/UX)
  - [x] Build requirement-by-requirement traceability and evidence matrix
- [x] 2. Implementation & Code Inspection across all 20 DGA Requirements
  - [x] DGA-01 (Platform accessibility): Evaluated `report-ui` dark mode contrast and modal accessibility -> PARTIAL
  - [x] DGA-02 (Scan comparison): Evaluated backend diff API and UI comparison page -> BLOCKED / MISSING (Feature Gap)
  - [x] DGA-03 (Screenshots/evidence): Verified screenshot capture in `page-capture.ts`, link in `FindingsPage.tsx`, and crop modal in `ScanDetailPage.tsx` -> PASS
  - [x] DGA-04 (Homepage/logo presentation): Verified `OverviewPage.tsx` entity logo mapping from `domainToLogoMap` with `Globe` fallback -> PASS
  - [x] DGA-05 (WCAG rule names/descriptions): Verified localized human-readable rule titles and descriptions in `FindingsPage.tsx` and `packages/rules` -> PASS
  - [x] DGA-06 (Quick Actions): Verified `OverviewPage.tsx` Quick Actions grid and table actions -> PASS
  - [x] DGA-07 (Entities search/filter/sort): Verified live search across `nameEn`/`nameAr`, status/type filters, and sort headers in `EntitiesPage.tsx` -> PASS
  - [x] DGA-08 (Scan Name): Evaluated `Scan` model in `schema.prisma` (no name column; DB migrations prohibited by boundaries) -> BLOCKED (Requires DB Migration)
  - [x] DGA-09 (Websites search/filter/sort): Verified live domain search and sortable headers in `SitesPage.tsx` -> PASS
  - [x] DGA-10 (Multi-page crawling limits): Verified `BFSCrawler` `maxPages` and `maxDepth` boundaries in `bfs-crawler.ts` -> PASS
  - [x] DGA-11 (Authentication-aware scanning): Evaluated `ScanAuthProfile` in `schema.prisma` and `job-queue.ts`; runtime execution gated per operational boundaries -> PARTIAL
  - [x] DGA-12 (Classic vs Raawi Agent distinction): Verified separation of `Finding` vs `AgentFinding`, UI tabs in `ScanDetailPage.tsx`, and deterministic scoring in `compliance-scoring.ts` -> PASS
  - [x] DGA-13 (Duplicate PDF export options): Verified consolidated PDF and Excel export actions with loading spinner in `ScanDetailPage.tsx` and `EntityDetailPage.tsx` -> PASS
  - [x] DGA-14 (Arabic/English result inconsistency): Verified `@raawi-x/core` shared localization module and dynamic locale rendering -> PASS
  - [x] DGA-15 (Excel localization): Verified `excel-report-generator.ts` localized Arabic sheets, headers, and statuses with RTL layout -> PASS
  - [x] DGA-16 (Add Entity accessibility/responsiveness): Modal layout and Escape handler present in `EntitiesPage.tsx`; qualified due to static-only evidence without component runner -> PARTIAL
  - [x] DGA-17 (Direct Scan -> Results navigation): Verified direct deep link to `/findings?scanId=${scan.scanId}` in `ScansPage.tsx` and query consumption in `FindingsPage.tsx` -> PASS
  - [x] DGA-18 (Severity-first findings sorting): Verified default client-side severity sorting (Critical/A -> Important/AA -> Moderate/AAA -> Low -> Passed) in `FindingsPage.tsx` -> PASS
  - [x] DGA-19 (Trace failure inside scan): Verified React `ErrorBoundary` wrapper in `ScanDetailPage.tsx` and telemetry lifecycle mapping in `analysis-agent-summary.ts` -> PASS
  - [x] DGA-20 (Not Applicable logic): Verified `status: 'na'` across rules engine, compliance scoring, report generator, export, and UI -> PASS
- [x] 3. Verification & Testing
  - [x] Run scanner test suite (`vitest run`: 100/100 tests passing across 22 test files)
  - [x] Run widget test suites (Phases 5.1–5.6: 99/99 unit tests passing across 6 files)
  - [x] Rebuild widget bundle (`vite build`: 93.38 kB / gzip 23.01 kB)
  - [x] Document residual limitations and operational boundaries
- [x] 4. Deliverables & Closure
  - [x] Create authoritative `PHASE_6_DGA_REQUIREMENTS_COMPLETION_REPORT.md`
  - [x] Update `tasks/todo.md` with Phase 6 execution review
  - [x] Commit and push to `feature/semantic-core`
  - [x] Stop condition: Deliver report and stop for coordinator review (no deployment, no Phase 7, no Basir rollout)

## Execution Review (Phase 6 - Reconciled)
- **Status Summary:** All 20 DGA Requirements assigned exactly one primary status summing to 20: 15 requirements marked **PASS** (75.0%), 3 requirements marked **PARTIAL** (15.0%: DGA-01, DGA-11, DGA-16), and 2 requirements marked **BLOCKED** (10.0%: DGA-02, DGA-08). Zero double counting.
- **Evidentiary Integrity:** DGA-19 restored to the PASS list; DGA-11 represented under a single primary status (`PARTIAL`) with runtime execution limitation documented; DGA-16 reclassified to `PARTIAL` per verification rules prohibiting unverified runtime claims based solely on static code inspection.
- **Core Stability:** Scanner test suite (100/100 tests passing across 22 test files), widget test suite (99/99 unit tests passing across 6 files), and widget Vite production build (`dist/widget.iife.js` 93.38 kB) verified with zero regressions.
- **Strict Boundary Adherence:** Zero database mutations, zero remote deployments, zero new external scans, and zero synthetic findings generated. All documented limitations preserved.

# Tasks - Phase 7A: Architectural Alignment and Complete Scanning Validation Preflight

- [x] 1. Preflight and Baseline Verification
  - [x] Verify current HEAD commit SHA (`0bba5417029790d780e0455766b58572206976fe`), branch (`feature/semantic-core`), and origin synchronization
  - [x] Review Phase 2-6 reports and scan history (`scan_1792479482089_scvi6r1`)
  - [x] Inspect scanner request parsing, pipeline resolution, and config gates
- [x] 2. Four-Way Scanning Mode and Architecture Audit
  - [x] Mode A: `auditMode: 'classic'` (conventional DOM/WCAG scan, scoring, exports) -> Proven by end-to-end execution
  - [x] Mode B: `pipeline.analysisAgent` & process gate (`AGENT_ENABLED`) -> Attempted in live scan (0 steps), verified by unit tests
  - [x] Mode C: `auditMode: 'raawi-agent'` -> Branding/reporting flag; verified by report unit tests only (identical scanner execution)
  - [x] Mode D: Autonomous goal execution (`RAAWI_EXECUTION_AGENT_ENABLED` / `RaawiAgent.execute`) -> Disabled by configuration & not tested
- [x] 3. Controlled Acceptance Test Preflight Design
  - [x] Design multi-layer test sequence on local fixtures (`portal-good` & `gov-sim`) without launching scans
  - [x] Formulate bounded scan parameters, allowed/prohibited actions, expected findings, and artifacts
  - [x] Establish diagnostic classification for auth failure, 0-step traces, stale state, and redirects
- [x] 4. Phase 7 Architecture Specifications
  - [x] Draft Scan Comparison Specification (DGA-02) with matching identity, state transitions, API/UI, and product decisions
  - [x] Draft Scan Name Migration Plan (DGA-08) with nullable schema, API/UI flow, backfill, rollback, and test plan
  - [x] Draft DGA-01 and DGA-16 Dashboard Accessibility verification plan
  - [x] Draft DGA-11 Authenticated-Scan preflight
  - [x] Formulate Widget Enhancement Backlog with discovery structure and regression gates
- [x] 5. Deliverable and Closure
  - [x] Create comprehensive report: `PHASE_7A_ARCHITECTURE_AND_SCAN_PREFLIGHT_REPORT.md`
  - [x] Commit and push documentation to `feature/semantic-core`
  - [x] Stop for coordinator review (no scans, no migrations, no deployments)





