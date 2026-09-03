# PHASE 4A IMPLEMENTATION PLAN
**Goal:** Address Phase 4A accessibility and foundational UI remediation without introducing new dependencies or altering data models.

## TARGET 1 — ADD ENTITY MODAL (Responsive/Reflow)
- **Current Implementation:** `apps/report-ui/src/pages/EntitiesPage.tsx` uses a fixed `w-full max-w-md` container for the Add Entity modal without max-height constraints, causing vertical and horizontal overflow on small viewports (e.g., 320px).
- **Proposed Minimal Change:** Update the modal container classes to include `max-w-[95%] sm:max-w-md max-h-[90vh] overflow-y-auto`.
- **Affected Behavior:** Layout and scrolling behavior of the Add Entity modal.
- **Regression Risk:** Low.
- **Tests Required:** Visual manual test at 320px to confirm no horizontal scrolling is forced.
- **Verification Method:** Inspect DOM at 320px viewport, ensure form is fully usable.

## TARGET 2 — DIALOG / MODAL ACCESSIBILITY
- **Current Implementation:** Modals in `EntitiesPage.tsx`, `ScansPage.tsx`, and `ScanMonitorModal.tsx` are generic `div`s with `fixed inset-0` styling. They lack `role="dialog"`, `aria-modal="true"`, and focus management.
- **Proposed Minimal Change:** 
  - Evaluate and implement: dialog semantics (`role="dialog"`, `aria-modal="true"`), accessible naming (unique `aria-labelledby` IDs tailored per dialog instance), initial focus (targeted based on actual dialog interaction, not globally `autoFocus`), keyboard Escape behavior, focus containment (only where required and safe within current architecture), and focus restoration to the invoking control.
  - If robust focus containment cannot be implemented safely without new UI libraries, this will be documented explicitly rather than simulated with brittle code. Escape-key handling is not equivalent to focus trapping.
- **Affected Behavior:** Screen reader modality, focus management, and keyboard closure.
- **Regression Risk:** Low. No new third-party UI libraries will be installed.
- **Tests Required:** Keyboard test (tab order, Escape key, focus restoration).
- **Verification Method:** Manual keyboard interaction and DOM lifecycle inspection.

## TARGET 3 — ACCESSIBLE NAMES
- **Current Implementation:** Certain interactive elements may lack accessible names.
- **Proposed Minimal Change:** 
  - Before changing any control (e.g., Edit/Delete in `EntitiesPage`, Close in `FindingsPage`, Export in `ScanDetailPage`), first confirm it genuinely lacks an accessible name by inspecting existing text, title, or ARIA properties.
  - Apply `aria-label` only to genuinely deficient controls, avoiding redundant labels.
  - Ensure translated accessible labels (e.g., `t('common.edit')`) resolve correctly in supported locales.
- **Affected Behavior:** Screen reader announcements for interactive controls.
- **Regression Risk:** None.
- **Tests Required:** Source inspection and rendered name verification.
- **Verification Method:** Verify rendered HTML output contains the ARIA attributes and translates properly.

## TARGET 4 — SEMANTIC STRUCTURE
- **Current Implementation:** Source inspection confirms that `EntitiesPage.tsx`, `ScansPage.tsx`, and `FindingsPage.tsx` *already* use semantic `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, and `<td>` elements for their primary data lists.
- **Proposed Minimal Change:** No structural rewrite from `div` to `table` is necessary as the primary views already utilize `table`. We will ensure standard table headers (`th`) have correct text alignment or scope if needed, but no invasive changes will be made.
- **Affected Behavior:** None.
- **Regression Risk:** None.
- **Tests Required:** N/A.
- **Verification Method:** Source inspection.

## TARGET 5 — DYNAMIC SCAN STATUS (Live Region)
- **Current Implementation:** `ScanMonitorModal.tsx` polls and updates state (e.g., `stats`, `currentActivity`) but does not expose these updates to assistive technologies.
- **Proposed Minimal Change:** Add an `aria-live="polite" role="status"` visually hidden container. 
  - This region must announce ONLY meaningful scan state transitions (e.g., queued, started, major processing stage, completed, failed).
  - It must strictly IGNORE high-frequency events (individual page activity, counters, repeated polling updates) to prevent excessive screen-reader announcements.
  - The scan state machine will be inspected to determine the safest transition points before implementation.
- **Affected Behavior:** Meaningful screen reader announcements during a scan.
- **Regression Risk:** Low.
- **Tests Required:** Source inspection and runtime rendering of the live region.
- **Verification Method:** Verify the live region updates only when major state changes occur.

## TARGET 6 — FINDINGS PRESENTATION SEMANTICS
- **Current Implementation:** `FindingsPage.tsx` uses a semantic table for the list and a side panel for details. The detail panel currently lacks a strong heading hierarchy (it uses basic `div`s for labels and values).
- **Proposed Minimal Change:** 
  - Inspect the existing document heading hierarchy before introducing new heading levels, choosing the semantically correct level for the structure (not blindly using `<h3>`).
  - Introduce `<dl>`, `<dt>`, and `<dd>` only where the content genuinely represents term/value relationships (e.g., Status, Confidence, Message).
  - Preserve the current visual presentation exactly.
- **Affected Behavior:** Screen reader traversal of finding details.
- **Regression Risk:** Low.
- **Tests Required:** DOM semantic check.
- **Verification Method:** Inspect element tree in browser developer tools.
