# RAAWI X — Phase 5.4 Implementation Report
## AssistiveMap Integration and Safe DOM Remediation

**Date:** 2026-10-20  
**Branch:** `feature/semantic-core`  
**Baseline Commit:** `49ef4ceb9171d97a3f281ef32a46a6a3852279c8` (Phase 5.3 Acceptance Remediation)  
**Deliverable Status:** COMPLETE — READY FOR REVIEW  

---

### 1. Executive Summary

Phase 5.4 connects the Raawi X accessibility widget to scanner-generated AssistiveMap data via the public `GET /api/widget/page-package` endpoint, and introduces an opt-in, non-destructive, ownership-aware safe DOM auto-remediation engine (`DomRemediator`). 

Key principles verified in both Node unit tests and Chromium real-browser tests:
1. **Zero backend mutations:** The scanner's existing public endpoint (`GET /api/widget/page-package`) was audited and leveraged without modifying backend routes or contracts.
2. **Opt-in only:** Remediation is strictly off by default (`remediationEnabled: false`) and requires explicit user activation.
3. **Semantic preservation:** Authored meaningful `alt` text is strictly preserved; intentional empty alt attributes (`alt=""` for decorative graphics) are preserved and never overwritten; controls with existing `aria-label`, `aria-labelledby`, `<label>`, or inner text are never modified.
4. **Selector safety:** Selectors matching multiple elements (`matches.length > 1`) or invalid CSS selectors are rejected without throwing runtime errors.
5. **Ownership-aware restoration:** The engine records exact original attribute state (presence vs absence) and preserves any host modifications made while remediation is active upon deactivation, reset, or teardown.
6. **Graceful offline handling:** HTTP errors, timeouts (5s), and offline conditions fall back to standalone operation with localized status notices in Arabic and English without impacting Phase 5.1–5.3 display and reading tools.

---

### 2. Preflight Endpoint Audit and Selection Rationale

During preflight investigation, the two potential backend endpoints were audited:

| Endpoint | Authentication | Parameters | Purpose & Viability for Widget |
| :--- | :--- | :--- | :--- |
| `GET /api/assistive-maps/:id` | **Admin JWT (`requireAuth`)** | UUID path parameter | **Internal Admin API:** Requires admin authentication and database primary key UUIDs. Unusable by public embedded widgets that only know the current page URL and tenant entity code. |
| `GET /api/widget/page-package` | **None (Public Read-Only)** | `?url=...&entityCode=...` | **Approved Widget Contract:** Resolves entity and property by entity code and request URL, fetches latest completed scan, validates property ownership, and returns complete guidance, assistive map, and issues summary. |

**Decision:** The widget exclusively consumes `GET /api/widget/page-package`. No backend routes or data contracts were modified.

#### Verified Request/Response Contract:
- **Request:** `GET {apiUrl}/api/widget/page-package?url={canonicalUrl}&entityCode={entityCode}`
- **Response Shape:**
  ```json
  {
    "targetUrl": "https://example.gov.sa/services",
    "matchConfidence": 0.95,
    "guidance": {
      "summary": "Unified digital portal providing electronic government services",
      "landmarks": [
        { "role": "banner", "label": "Main Header", "selector": "header" },
        { "role": "main", label: "Main Content", "selector": "main" }
      ]
    },
    "assistiveMap": {
      "imageDescriptions": [
        { "selector": "#hero-img", "description": "Citizen service portal hero banner", "confidence": 0.95 }
      ],
      "labelOverrides": [
        { "selector": "#btn-menu", "ariaLabel": "Toggle navigation menu", "confidence": 0.9 }
      ]
    }
  }
  ```

---

### 3. Architecture & Implementation

#### 3.1. Resilient API Client (`apps/widget/src/core/api-client.ts`)
- **Detection & Configuration:** Automatically extracts `entityCode` and `apiUrl` from `data-raawi-entity-code` / `data-raawi-api-url` attributes or global window configurations with fallback to current origin.
- **URL Canonicalization:** Normalizes query strings, strips tracking parameters (`utm_*`, `fbclid`, `gclid`), and discards URI fragments before caching.
- **Request Deduplication & Caching:** In-flight requests for the same URL share a single Promise. Responses are cached in memory to eliminate redundant network roundtrips during tab switching.
- **Timeout Protection:** Employs an `AbortController` with a 5000ms timeout.
- **Validation:** Enforces minimum confidence threshold (`matchConfidence >= 0.65`) and host/domain match. Rejects low-confidence or outdated mappings into a `'mismatch'` state.
- **Status Lifecycle:** Emits localized statuses: `'idle'`, `'loading'`, `'ready'`, `'not-scanned'`, `'offline'`, `'mismatch'`, and `'error'`.

#### 3.2. Safe DOM Remediation Engine (`apps/widget/src/core/dom-remediator.ts`)
- **Strict Opt-in:** Changes are only evaluated and applied when `settings.remediationEnabled` is true.
- **Target Uniqueness (`matches.length === 1`):** Selectors matching multiple elements are discarded to prevent misapplying labels to adjacent components. Invalid selectors are caught safely.
- **Image Description Rules:**
  - If `img.hasAttribute('alt')`: **SKIP.** Authored non-empty alt text and intentional empty alt attributes (`alt=""` for decorative icons) are strictly preserved.
  - If no `alt` attribute exists: Applies high-confidence description (`alt="..."`), tags node with `data-raawi-remediated-alt="true"`, and records original state.
- **Control Labeling Rules:**
  - Checks: `aria-label`, `aria-labelledby`, `<label for="...">`, enclosing `<label>`, `<button>`/`<a>` inner text, `title`, and input placeholders.
  - If any authored accessible name is detected: **SKIP.**
  - If unlabeled: Applies `aria-label="..."`, tags node with `data-raawi-remediated-label="true"`, and records original state.
- **Ownership-Aware Restoration:**
  - If the host website mutates the attribute while remediation is active, `revert()` detects the difference from `appliedValue` and preserves the host modification rather than restoring the baseline state.
  - Precision cleanup on toggle off, reset settings, or widget teardown (`destroy()`).

#### 3.3. Page Insights UI (`apps/widget/src/components/panel.ts`)
- Rendered in the primary **Assist** tab.
- Displays live AssistiveMap status badge (`Active & Ready`, `Loading...`, `Not Scanned`, `Offline`, `Outdated`).
- Shows page summary and available landmark counts when present in scanner guidance.
- Displays available enhancement count (`✨ N Enhancements Available`).
- Provides the Safe Auto-Remediation opt-in toggle with active change counter badge.
- Fully localized in Arabic (RTL) and English (LTR).

---

### 4. Verification & Test Results

#### 4.1. TypeScript & Bundle Build
- **Type Check:** `pnpm --filter @raawi-x/widget exec tsc --noEmit`  
  **Result:** Exit Code 0 (Zero errors).
- **Production Bundle:** `pnpm --filter @raawi-x/widget build`  
  **Output:** `dist/widget.iife.js` (73.63 kB / gzip: 17.80 kB).

#### 4.2. Node Unit Tests (`apps/widget/test/phase5-4.test.ts`)
- **Suite 1: MapApiClient Contract & Safety**
  - Attribute-based detection (`data-raawi-entity-code`, `data-raawi-api-url`) [PASS]
  - Network failure & offline condition handling without unhandled exceptions [PASS]
  - Rejection of low-confidence mapping data (< 0.65) [PASS]
  - High-confidence payload caching and deduplication [PASS]
- **Suite 2: Safe Image Remediation**
  - Applies description only to images lacking `alt` [PASS]
  - Strictly preserves authored non-empty alt text and decorative `alt=""` [PASS]
  - Rejects ambiguous selectors matching multiple images [PASS]
  - Safely handles invalid CSS selector syntax without throwing [PASS]
- **Suite 3: Safe Control Label Remediation**
  - Applies generated `aria-label` only to controls lacking accessible names [PASS]
  - Preserves buttons with text, `aria-label`, `aria-labelledby`, and `<label>` controls [PASS]
- **Suite 4: Ownership-Aware Restoration & Host Modifications**
  - Preserves host runtime modifications made during active remediation [PASS]
  - Gracefully handles removal of target element from DOM [PASS]
- **Suite 5: Widget Full Integration & Reset Lifecycle**
  - Integrates `DomRemediator` and `MapApiClient` with custom element lifecycle [PASS]
  - Reset settings reverts all applied attributes and disables toggle [PASS]

**Unit Test Summary:** 13/13 passing (100%).

#### 4.3. Full Unit Regression Suite (Phases 5.1, 5.2, 5.3, 5.4)
- Ran: `tsx --test test/phase5-1.test.ts test/phase5-2.test.ts test/phase5-3.test.ts test/phase5-4.test.ts`
- **Result:** **57 tests passed, 0 failed, 0 skipped.**

#### 4.4. Real-Browser Playwright Tests (`tests/widget-e2e/dom-remediation.spec.ts`)
Ran against real Chromium browser with live Shadow DOM widget:
1. `Page Insights card displays map status badge, summary and landmarks count` [PASS]
2. `Remediation toggle is opt-in by default and safely enriches missing semantics` [PASS]
3. `Reverting remediation or clicking reset cleans up all widget-applied attributes` [PASS]
4. `Bilingual localization updates Page Insights text in AR and EN` [PASS]
5. `Graceful offline/error handling preserves independent display tools` [PASS]

#### 4.5. Full Playwright Regression Suite
- Ran: `smoke.spec.ts`, `dialog-focus.spec.ts`, `display-preferences.spec.ts`, `dom-remediation.spec.ts`
- **Result:** **31 passed, 0 failed.** (12.6s execution time).

---

### 5. Files Changed

| File | Status | Description |
| :--- | :--- | :--- |
| `apps/widget/src/core/types.ts` | Modified | Added AssistiveMap, guidance, and remediation data types; added `remediationEnabled: boolean` to `WidgetSettings`. |
| `apps/widget/src/core/api-client.ts` | **New** | Dedicated API client with canonicalization, timeout, in-flight deduplication, and schema validation. |
| `apps/widget/src/core/dom-remediator.ts` | **New** | Safe DOM auto-remediator with 1:1 selector uniqueness, accessible name checks, and ownership-aware restoration. |
| `apps/widget/src/core/i18n.ts` | Modified | Added bilingual AR/EN translation keys for Page Insights, status badges, landmarks, and remediation. |
| `apps/widget/src/styles/widget-styles.ts` | Modified | Added scoped styles for badges (`.raawi-badge-*`) and `.raawi-insights-card`. |
| `apps/widget/src/components/panel.ts` | Modified | Rendered Page Insights card, status badge, summary, landmarks, and remediation toggle in Assist tab. |
| `apps/widget/src/core/shadow-container.ts` | Modified | Wired `MapApiClient` and `DomRemediator` into widget lifecycle, state subscriptions, and teardown. |
| `apps/widget/src/index.ts` | Modified | Exported `MapApiClient`, `DomRemediator`, and related TypeScript types. |
| `apps/widget/test/phase5-4.test.ts` | **New** | 13 comprehensive unit tests covering API contract, safe remediation, selector safety, and restoration. |
| `tests/widget-e2e/dom-remediation.spec.ts` | **New** | 5 Playwright real-browser tests covering live DOM mutation, preservation, reset, AR/EN, and offline resilience. |
| `tasks/todo.md` | Modified | Updated task tracking and completion review. |
| Built distribution bundles | Updated | `apps/widget/dist/widget.iife.js`, `apps/test-sites/public/`, `test-sites/portal-good/public/`, `test-sites/gov-sim/public/`. |

---

### 6. Known Limitations & Unimplemented Capabilities

1. **Screen-reader verification disclaimer:** Tests were executed in automated Playwright Chromium and Node environments. No claim of native screen-reader (NVDA/JAWS/VoiceOver) testing is made.
2. **Landmark keyboard jump navigation:** Landmarks are reported in the Page Insights summary card; direct jump navigation is deferred to Phase 5.5 to ensure safe landmark container scrolling across arbitrary complex host layouts.
3. **Form guidance fields:** Form guidance payloads from the scanner are parsed and available in the response model, but inline form field guidance hints are reserved for Phase 5.5.

---

### 7. Next Recommended Milestone

**Phase 5.5: Freshness Engine, Fingerprint Validation & Advanced Navigation**
- Page fingerprint comparison to detect dynamic host DOM updates and invalidate stale mappings.
- Dedicated landmark keyboard navigation drawer with smooth focus transfer.
- Diagnostic offline badge indicator with manual refresh action.

---

### 8. Stop Condition Compliance

All Phase 5.4 deliverables are complete, verified by 57 unit tests and 31 real-browser Playwright tests, built, and committed. Execution is stopped awaiting coordinator review.
