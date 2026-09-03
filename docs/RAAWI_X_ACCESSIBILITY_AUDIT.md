# Raawi X — Phase 3: Self-Accessibility Audit

## 1. Accessibility Scope
This audit evaluates the Report UI (`apps/report-ui`) as an accessibility product itself, examining major workflows: Login → Dashboard → Entity → Website → Scan → Scan Results → Finding → Evidence → Report.

## 2. Automated Accessibility Testing
**Status**: MISSING
Inspection of `apps/report-ui/package.json` confirms that standard accessibility tooling (e.g., `axe-core`, `jest-axe`, `eslint-plugin-jsx-a11y`) is entirely absent. No automated accessibility checks run during the build or test lifecycle.
- **Tool**: None
- **Scope**: None
- **Result**: NOT TESTABLE IN CURRENT ENVIRONMENT.

## 3. Keyboard & Focus Audit
*All findings require runtime testing for WCAG conformance.*
- **Tab Order & Visible Focus**: *UNKNOWN / RUNTIME TEST REQUIRED*. Standard HTML elements (a, button, input) are used, but custom CSS may obscure focus rings.
- **Dialog Focus**: *LIKELY DEFECTIVE* (Source Audit). `EntitiesPage.tsx` and `ScanMonitorModal.tsx` open dialogs/modals but do not utilize established accessible modal primitives (like Radix UI or Headless UI, which are absent from `package.json`). Focus trapping and ESC key handlers are not robustly implemented.
- **Dropdowns & Menus**: *LIKELY DEFECTIVE* (Source Audit). Custom `dropdown-menu.tsx` has `aria-expanded` and `aria-haspopup`, but keyboard arrow-key navigation logic within the menu is missing from the source.

## 4. Semantic HTML & Accessible Name Audit
- **Landmarks**: *CONFIRMED* (Source Audit). Basic landmarks like `<nav>` and `<main>` exist.
- **Buttons vs Links**: *CONFIRMED* (Source Audit). `Link` from `react-router-dom` is used for navigation, `<button>` for actions.
- **Accessible Names**: *PARTIAL* (Source Audit). Some icon buttons (ThemeToggle, LanguageSwitcher, Pagination) use `aria-label` correctly. However, complex controls and data tables lack accessible names (`aria-labelledby`).
- **Tables**: *LIKELY DEFECTIVE* (Source Audit). Many data-dense views (like the Findings list) use CSS grid/flex `div` layouts without `role="table"` or `role="grid"`, stripping semantic row/col relationships for screen readers.

## 5. Dynamic Content / Status Messages
- **Scan Monitor (`ScanMonitorModal.tsx`)**: *LIKELY DEFECTIVE* (Source Audit). The UI polls and updates scan status dynamically, but there are zero instances of `aria-live`, `role="status"`, or `role="alert"` in the component. Screen reader users will not be notified of scan completion or failure unless they manually re-read the DOM.
- **API Errors**: *UNKNOWN / RUNTIME TEST REQUIRED*. Error states exist in React state but are not injected into assertive live regions.

## 6. Color / Contrast
- **Severity Colors**: *CONFIRMED* (Source Audit). Tailwind classes (e.g., `text-red-500` for Critical) are used.
- **Color-only Meaning**: *LIKELY DEFECTIVE* (Source Audit). Tables often indicate status via colored badges without hidden text equivalents.
- **Contrast Ratios**: *UNKNOWN / VISUAL TEST REQUIRED*. Exact contrast of Tailwind colors against the current theme background cannot be computed statically.

## 7. Responsive / Reflow / Zoom
- **Add Entity Modal**: *CONFIRMED* (Source Audit). The layout uses fixed CSS dimensions that break and overflow at 320px viewports, requiring 2D scrolling (WCAG 1.4.10 Reflow failure).
- **Dense Tables**: *UNKNOWN / RUNTIME TEST REQUIRED*. Horizontal scrolling behavior on small screens for findings tables requires visual testing.

## 8. RTL / Arabic Accessibility
- **RTL Layout**: *CONFIRMED* (Source Audit). Directionality is flipped based on i18n locale.
- **Content Localization**: *CONFIRMED* (Source Audit). While the UI flips, the backend report generator (`report-generator.ts`, `excel-export.ts`) still injects hardcoded English strings into the UI and exports, resulting in mixed-language barriers.

## 9. Forms & Modals
- **Labels**: *UNKNOWN / RUNTIME TEST REQUIRED*. Forms in Settings/Auth use custom inputs; programmatic association (`htmlFor` / `id`) needs runtime validation.
- **Modals (`ScanMonitorModal.tsx`)**: *LIKELY DEFECTIVE* (Source Audit). Missing `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` attributes.

## 10. Findings & Trace Accessibility
- **Findings Screen**: *CONFIRMED* (Source Audit). WCAG identifiers (e.g., "1.1.1") are displayed instead of human-readable names, making comprehension difficult. Screenshots are not directly linked to the finding node, making visual verification inaccessible.
- **Trace Screen**: *LIKELY DEFECTIVE* (Source Audit). Agent traces dump heavily technical JSON-like data or complex LLM text into the UI without clear semantic headings, overwhelming assistive technology.

---

## 11. Accessibility Findings (A11Y-XXX)

**A11Y-001**
- **Title**: Missing aria-live for Scan Monitor
- **WCAG**: 4.1.3 Status Messages
- **Level**: A
- **Method**: SOURCE-CODE AUDIT
- **Confidence**: LIKELY
- **Screen/Route**: `ScanMonitorModal.tsx`
- **Component**: ScanMonitorModal
- **Current Behavior**: Dynamic scan updates do not use live regions.
- **Expected Behavior**: Screen readers announce status changes (e.g., "Scan completed").
- **Evidence**: No `aria-live` or `role="status"` found in source.
- **User Impact**: Blind users must manually hunt for status updates.
- **Root Cause**: Missing ARIA implementation for dynamic states.
- **Dependencies**: Frontend.
- **Verification**: Runtime screen reader test.
- **Priority**: P1

**A11Y-002**
- **Title**: Non-responsive Add Entity Modal
- **WCAG**: 1.4.10 Reflow
- **Level**: AA
- **Method**: SOURCE-CODE AUDIT
- **Confidence**: CONFIRMED
- **Screen/Route**: `/entities`
- **Component**: Add Entity Modal
- **Current Behavior**: Fixed dimensions cause horizontal overflow at 320px.
- **Expected Behavior**: Content reflows without requiring horizontal scrolling.
- **Evidence**: Source CSS structure (from Phase 2 UI-001).
- **User Impact**: Low-vision users zooming to 400% cannot use the form.
- **Root Cause**: Hardcoded dimensions.
- **Dependencies**: Frontend.
- **Verification**: Visual test at 320px.
- **Priority**: P0

**A11Y-003**
- **Title**: Div-based Data Tables
- **WCAG**: 1.3.1 Info and Relationships
- **Level**: A
- **Method**: SOURCE-CODE AUDIT
- **Confidence**: LIKELY
- **Screen/Route**: `/findings`, `/scans`
- **Component**: Table lists
- **Current Behavior**: Data lists use CSS grid without table semantics.
- **Expected Behavior**: Data tables use `<table>` or `role="table"`.
- **Evidence**: Source code uses `div`s for rows/cells.
- **User Impact**: Screen reader users lose row/col contextual navigation.
- **Root Cause**: UI framework choice.
- **Dependencies**: Frontend.
- **Verification**: Runtime screen reader test.
- **Priority**: P1

**A11Y-004**
- **Title**: Automated Accessibility Tooling Absent
- **WCAG**: N/A
- **Level**: N/A
- **Method**: SOURCE-CODE AUDIT
- **Confidence**: CONFIRMED
- **Screen/Route**: Global
- **Component**: Repository
- **Current Behavior**: No linting or automated a11y testing exists.
- **Expected Behavior**: CI/CD pipeline enforces baseline accessibility (e.g., `eslint-plugin-jsx-a11y`).
- **Evidence**: Missing from `package.json`.
- **User Impact**: Not an end-user blocker directly, but regressions are silently introduced without it.
- **Root Cause**: Tooling never configured.
- **Dependencies**: Build pipeline.
- **Verification**: Inspect `package.json`.
- **Priority**: P1 — Accessibility Engineering / Regression Prevention

---

## 12. Final Accessibility Capability Matrix

| Capability | Source Audit | Runtime Tested | Automated Tested | Status | Major Blockers | Required Follow-up |
|---|---|---|---|---|---|---|
| Keyboard Operation | PARTIAL | NO | NO | UNKNOWN | Modals trapping | Runtime Test |
| Focus Management | UNKNOWN | NO | NO | UNKNOWN | Custom menus | Runtime Test |
| Semantics | PARTIAL | NO | NO | LIKELY DEFECTIVE | Div tables | Runtime Test |
| Screen Reader | PARTIAL | NO | NO | LIKELY DEFECTIVE | Accessible names missing | Runtime Test |
| Forms | UNKNOWN | NO | NO | UNKNOWN | Label association | Runtime Test |
| Dialogs | LIKELY DEFECT | NO | NO | LIKELY DEFECTIVE | Missing ARIA dialog roles | Runtime Test |
| Tables | LIKELY DEFECT | NO | NO | LIKELY DEFECTIVE | Missing table semantics | Runtime Test |
| Findings | CONFIRMED | NO | NO | DEFECTIVE | Complex unreadable rules | Findings presentation/data-contract investigation |
| Dynamic States | LIKELY DEFECT | NO | NO | LIKELY DEFECTIVE | Missing aria-live | Runtime Test |
| Color/Contrast | UNKNOWN | NO | NO | UNKNOWN | Badges without text | Visual Test |
| Zoom/Reflow | CONFIRMED | NO | NO | DEFECTIVE | Fixed modal widths | UI Refactor |
| Arabic/RTL | CONFIRMED | NO | NO | DEFECTIVE | Hardcoded English backend | Backend i18n |
| Error Recovery | UNKNOWN | NO | NO | UNKNOWN | API error presentation | Runtime Test |
| Reports | CONFIRMED | NO | NO | DEFECTIVE | Missing locale matching | Backend i18n |

*(Note: Actual implementation approaches for data, APIs, or components must be determined after tracing the codebase. The matrix describes the symptom, not the mandatory solution).*

---

## 13. Final Remediation Map

- **Frontend / Components**: Modal Reflow (A11Y-002), Table Semantics (A11Y-003), Live Regions (A11Y-001). *Dependencies: Existing UI/component architecture; evaluate whether current components can provide the required semantics and focus behavior. Introduce a dependency only if later implementation analysis proves it necessary.*
- **Testing Infrastructure**: Add tooling for a11y regression prevention (A11Y-004). *Dependencies: Build pipeline.*
- **API / Reporting**: Localized strings and rule names. *Dependencies: Rules Engine, Report Generator.*

---

# PHASE 3 STATUS

READY FOR PHASE 4: YES

Phase 3 establishes the accessibility baseline and identified runtime-validation gaps. Implementation decisions are deferred to Phase 4.
