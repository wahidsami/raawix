# PHASE 4B: UI/UX IMPLEMENTATION PLAN (TRACK A)

## PRIORITY FOCUS: PHASE 4B SCOPE

The following items are designated for Phase 4B implementation:

### 1. FINDINGS EXPERIENCE

#### UI-006: Severity-First Findings Sorting
- **DGA ID:** DGA-18
- **Requirement:** Default table sort must be Critical -> High -> Medium -> Low.
- **Current State:** Sorts by sequence or ID by default in `FindingsPage.tsx`.
- **Root Cause:** Default React component state.
- **Root Cause Confidence:** CONFIRMED
- **UI/UX Classification:** UI-only
- **Functional Dependency:** None. Data contains severity.
- **Proposed Change:** Update `useState` or initial sort configuration in `FindingsPage.tsx` to default to `severity` descending.
- **Affected Components:** `apps/report-ui/src/pages/FindingsPage.tsx`
- **Affected Routes:** `/findings`
- **Affected APIs/Data:** None
- **Regression Risk:** Low (purely presentation sorting).
- **Acceptance Criteria:** On first load, findings table displays Critical issues at the top.
- **Verification Method:** Component unit tests, UI rendering verification.
- **Priority:** P2 (Scheduled for Phase 4B)

#### UI-012: WCAG Rule Names & Descriptions
- **DGA ID:** DGA-05
- **Requirement:** Display localized, human-readable titles instead of technical rule IDs.
- **Current State:** Rules display technical identifiers (e.g., "1.1.1").
- **Root Cause:** Backend rules engine does not provide full localized descriptions to the UI payload.
- **Root Cause Confidence:** CONFIRMED
- **UI/UX Classification:** UI change requiring backend data.
- **Functional Dependency:** TRACK B. The backend (`packages/rules` / API) must map and return human-readable `rule.name` and `rule.description`.
- **Proposed Change (Phase 4B):** Update `FindingsPage.tsx` and `ScanDetailPage.tsx` to render `finding.rule.name` if available, falling back to `finding.ruleId` to prepare for the Track B data addition.
- **Affected Components:** `FindingsPage.tsx`, `ScanDetailPage.tsx`
- **Affected Routes:** `/findings`, `/scan/:id`
- **Affected APIs/Data:** `Finding` data model extension (Track B dependency).
- **Regression Risk:** Low (graceful fallback).
- **Acceptance Criteria:** UI code reads human-readable fields without breaking.
- **Verification Method:** UI unit tests with mocked finding payloads.
- **Priority:** P1 (Scheduled for Phase 4B UI preparation)

### 2. CLASSIC AUDIT vs RAAWI AGENT

#### UI-004: Classic vs Agent Segregation
- **DGA ID:** DGA-12
- **Requirement:** Clear UI segregation; Agent findings do not artificially inflate WCAG compliance scores.
- **Current State:** Agent and Classic findings overlap in summary counts in `ScanDetailPage.tsx`.
- **Root Cause:** Raw aggregation logic blends arrays.
- **Root Cause Confidence:** CONFIRMED
- **UI/UX Classification:** UI change requiring backend API segregation.
- **Functional Dependency:** TRACK B. The backend summary endpoint must separate Classic vs Agent counts.
- **Proposed Change (Phase 4B):** Update the UI summary cards in `ScanDetailPage.tsx` to display distinct cards: "WCAG Compliance Issues" and "Agent Usability Issues". If the API payload still merges them, the UI will filter them client-side based on `finding.type` or `isAgentFinding` flag as a stopgap, clearly separating the visual presentation.
- **Affected Components:** `ScanDetailPage.tsx`
- **Affected Routes:** `/scan/:id`
- **Affected APIs/Data:** Summary aggregation logic (Track B).
- **Regression Risk:** Medium (modifying high-level dashboard metrics).
- **Acceptance Criteria:** Users can instantly distinguish deterministic compliance scores from AI behavioral issues in the summary cards.
- **Verification Method:** UI rendering verification.
- **Priority:** P1 (Scheduled for Phase 4B)

### 3. SCAN → RESULTS / FINDINGS NAVIGATION

#### UI-010: Direct Scan-to-Findings Link
- **DGA ID:** DGA-17
- **Requirement:** Scans list must link directly to the detailed results/findings view.
- **Current State:** Clicking a scan goes to the scan detail overview only.
- **Root Cause:** Missing deep link in table row actions.
- **Root Cause Confidence:** CONFIRMED
- **UI/UX Classification:** UI-only
- **Functional Dependency:** None.
- **Proposed Change:** Add a "View Findings" action button/link in the `ScansPage.tsx` table that routes directly to `/scan/:id?tab=findings` or `/findings?scanId=:id`.
- **Affected Components:** `ScansPage.tsx`
- **Affected Routes:** `/scans`
- **Affected APIs/Data:** None
- **Regression Risk:** Low.
- **Acceptance Criteria:** Users can navigate from All Scans directly to the findings list in one click.
- **Verification Method:** UI click/routing test.
- **Priority:** P3 (Scheduled for Phase 4B due to high workflow value)

### 4. TRACE EXPERIENCE

#### UI-005: Trace JSON Parsing Error Handling
- **DGA ID:** DGA-19
- **Requirement:** Traces must fail gracefully if JSON is imperfect.
- **Current State:** Trace playback component crashes/fails to render on malformed agent traces.
- **Root Cause:** Brittle frontend parsing of LLM outputs.
- **Root Cause Confidence:** LIKELY
- **UI/UX Classification:** UI-only (resilience).
- **Functional Dependency:** TRACK B for fixing the actual Agent trace generation reliability.
- **Proposed Change:** Implement error boundaries and `try/catch` wrappers around the JSON parsing in the Trace UI. Render a clear "Trace Data Unavailable/Corrupted" state instead of crashing the page.
- **Affected Components:** `ScanDetailPage.tsx` (Agent Trace tab components).
- **Affected Routes:** `/scan/:id`
- **Affected APIs/Data:** None
- **Regression Risk:** Low.
- **Acceptance Criteria:** Trace failure has a documented root cause and appropriate UI behavior without crashing the parent application.
- **Verification Method:** Component test with invalid JSON trace fixture.
- **Priority:** P1 (Scheduled for Phase 4B)

### 5. EVIDENCE / SCREENSHOTS

#### UI-003: Findings Screenshot Linkage
- **DGA ID:** DGA-03
- **Requirement:** Findings in the UI must display or directly link to the relevant screenshot.
- **Current State:** UI has partial screenshot code in `ScanDetailPage.tsx` but lacks clear discoverability in `FindingsPage.tsx`. Bounding box data is often missing.
- **Root Cause:** Incomplete UI integration and missing API data.
- **Root Cause Confidence:** CONFIRMED
- **UI/UX Classification:** UI change requiring backend data.
- **Functional Dependency:** TRACK B. Crawler must consistently capture and API must return `screenshotPath` and bounding boxes for all relevant nodes.
- **Proposed Change (Phase 4B):** Ensure `FindingsPage.tsx` includes an "Evidence" column or expandable row that displays the `screenshotPath` if available, gracefully hiding it if missing.
- **Affected Components:** `FindingsPage.tsx`
- **Affected Routes:** `/findings`
- **Affected APIs/Data:** None (UI only consumes existing optional field).
- **Regression Risk:** Low.
- **Acceptance Criteria:** Evidence can be reached directly from its finding where data support exists.
- **Verification Method:** UI rendering test with mock finding containing screenshot.
- **Priority:** P1 (Scheduled for Phase 4B)

---

## DEPENDENCY MATRIX

| Feature Category | UI-Only Changes (Phase 4B Ready) | UI Changes Requiring Backend (Phase 4B Stopgap) | Functional Work (Track B Required First) |
|------------------|--------------------------------|-------------------------------------------------|------------------------------------------|
| **Findings** | UI-006: Default sorting by severity | UI-012: Prepare UI to read `rule.name` | Map localized rule descriptions in Engine |
| **Classic/Agent**| | UI-004: Segregate visual summary cards | Separate API aggregation counts |
| **Navigation** | UI-010: Add "View Findings" button | | |
| **Trace** | UI-005: Add JSON error boundaries | | Fix Agent JSON schema generation |
| **Evidence** | | UI-003: Expose existing screenshot link | Crawler must save bounding box data |

---

## DGA REQUIREMENT CLASSIFICATION STATUS

Total DGA UI Requirements Classified: 12/12

### Phase 4B Items
1. **UI-006 (DGA-18):** Severity-first sorting
2. **UI-012 (DGA-05):** WCAG Rule Names (UI prep)
3. **UI-004 (DGA-12):** Classic vs Agent Segregation (UI separation)
4. **UI-010 (DGA-17):** Direct Scan -> Results Navigation
5. **UI-005 (DGA-19):** Trace JSON Parsing Error Handling
6. **UI-003 (DGA-03):** Findings Screenshot Linkage (UI exposure)

### Phase 4C Items
7. **UI-009 (DGA-13):** Consolidate PDF export options

### Phase 4D Items
8. **UI-007 (DGA-07, DGA-09):** Entities/Sites search/filter/sort
9. **UI-008 (DGA-06):** Quick Actions on tables

### Phase 4E Items
10. **UI-011 (DGA-04):** Homepage logo fallback

### Track B Items (Functional Dependencies)
11. **DGA-14 (UI-013):** Arabic/English localization inconsistency (Backend report generator issue).
*Plus backend dependencies for UI-012, UI-004, UI-005, UI-003.*

### Deferred Items
12. None currently deferred indefinitely; all mapped to future tracks/phases.

---

## TESTING PLAN FOR PHASE 4B

- **UI-006 (Sorting):** Component test (default state validation); UI test (verify DOM node order).
- **UI-012 (Rule Names):** Component test (fallback logic to `ruleId`); UI test.
- **UI-004 (Classic/Agent):** Component test (card separation logic).
- **UI-010 (Navigation):** Component test (Link `href` validation).
- **UI-005 (Trace Errors):** Component test (render with malformed JSON fixture); Integration test.
- **UI-003 (Screenshots):** Component test (conditional rendering of Evidence block).
- **Runtime Verification:** NOT TESTED - ENVIRONMENT UNAVAILABLE.
- **Accessibility Verification:** Static markup validation of new components (buttons, cards) to ensure they retain ARIA and keyboard navigability.
