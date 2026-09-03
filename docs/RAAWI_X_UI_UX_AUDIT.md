# Raawi X — Phase 2: UI/UX Audit

## 1. Map the Current UI
The `report-ui` application is built as a React SPA using Vite, TailwindCSS, and i18n for routing and presentation.
- **Entry / Layout**: Handled by `App.tsx` and `layout` components (sidebar navigation, top bar).
- **Dashboard (`/`)**: Main entry. Renders `OverviewPage.tsx`. Shows high-level stats. Missing fallback entity logos when unavailable.
- **Entities (`/entities`)**: Renders `EntitiesPage.tsx`. Lists top-level organizations. Filtering/Search handlers are incomplete client-side. The "Add Entity" action opens a dialog/form that is not fully responsive.
- **Websites/Properties (`/sites`)**: Renders `SitesPage.tsx`. Lists domains. Again, incomplete client-side search.
- **Scans (`/scans`)**: Renders `ScansPage.tsx`. Lists past runs. Navigation to individual scans exists but lacks direct jump to "Findings".
- **Scan Detail (`/scan/:id`)**: Renders `ScanDetailPage.tsx`. A massive component (over 90KB) handling export buttons, Agent Trace, Classic Findings counts, and tabbed navigation. Loading states use basic spinners; error states catch API failures but sometimes fail to present actionable recovery.
- **Findings (`/findings`)**: Renders `FindingsPage.tsx`. Sorts findings (but not severity-first by default). Uses pagination.
- **Settings / Auth**: Basic forms (`SettingsPage.tsx`, `ForgotPasswordPage.tsx`).

## 2. DGA UI Requirements Audit
*Reference section 13 for prioritized backlog format.*

## 3. Raawi X Self-Accessibility Audit
*Note: Conformance is not claimed or disclaimed solely based on this source code inspection. Formal conformance requires runtime testing (Phase 3).*

**A. Keyboard Navigation**: 
- *CONFIRMED (Source Fact)*: Basic focus order works for top-level navigation via standard HTML routing components.
- *LIKELY (Inferred Issue)*: Modals (e.g., Add Entity) lack strict focus trapping logic in the component code, allowing keyboard focus to escape to the background. Requires runtime testing.
**B. Semantic Structure**: 
- *CONFIRMED (Source Fact)*: Uses standard HTML5 landmarks (nav, main). Table components often rely on `div` grids rather than semantic `table` tags in the component markup.
**C. Screen Reader Behavior**:
- *UNKNOWN (Requires Runtime Testing)*: Dynamic updates (like Scan completion in `ScanMonitorModal.tsx`) do not explicitly use `aria-live` regions in the source, meaning announcements may fail.
**D. Color & Visual**: 
- *CONFIRMED (Source Fact)*: Uses severity indicators via Tailwind color utility classes (e.g., text-red-500). Whether this information is conveyed non-visually in tight table cells requires runtime testing.
**E. Responsive Behavior**:
- *CONFIRMED (Source Fact)*: `EntitiesPage.tsx` Add modal utilizes fixed/inflexible styling that breaks on 320px viewports; forms require horizontal scrolling or zooming (DGA noted).
**F. Localization**:
- *CONFIRMED (Source Fact)*: Exported strings (e.g., PDF/Excel headers) remain hardcoded in English within the generator APIs, regardless of UI state.
**G. Interaction Accessibility**:
- *CONFIRMED (Source Fact)*: Multiple export buttons exist on `ScanDetailPage.tsx` with identical functional purpose, causing cognitive overload. Accessible name conflicts require runtime testing.

## 4. Information Architecture Audit
- **Workflow**: Entity -> Website -> Scan -> Scan Detail.
- **Dead Ends / Navigation**: Users looking at `ScansPage.tsx` cannot directly jump to the Findings list without first going through the Scan Detail overview. 
- **Duplicate Concepts**: "Analysis AI agent" vs "Findings". The architecture treats them as separate entities, causing cognitive friction for users expecting a unified accessibility report.

## 5. Findings Experience
- **Loading / Ordering**: Findings load via API. By default, they sort by sequence/ID rather than Critical severity.
- **Screenshots / Evidence**: Screenshots are captured and their paths stored, but the UI lacks clear, discoverable linkage to the exact finding nodes.
- **User questions**:
  - *"How serious is it?"* -> Requires sorting manually.
  - *"Where is it?"* -> Selector is provided, but visual evidence is weak.
  - *"Classic or Agent?"* -> Siloed into entirely different UI tabs.

## 6. Reporting UX
- **PDF/Excel Export**: Initiated via `ScanDetailPage.tsx` or `EntityDetailPage.tsx`.
- **Duplicate Options**: The UI presents separate buttons for "Export PDF (EN)" and "Export PDF (AR)" rather than a unified dropdown, cluttering the action bar.
- **Localization**: While PDF handles Arabic natively, Excel headers (via API `excel-export.ts`) are hardcoded.

## 7. Scan Management UX
- **Scan Status**: The UI shows 'queued', 'running', 'completed'. However, failed partial scans do not always explicitly show which pages failed, masking crawler issues.
- **Naming**: Scans are identified by `scanId` (e.g. `scan_1234_abc`). There is no user-editable `name` field in the UI or Database.

## 8. Entity / Website UX
- **Add Entity Modal**: The form uses fixed-width CSS classes or non-wrapping flex containers that force zooming on small screens.
- **Root Cause**: CONFIRMED. Frontend CSS structure (`report-ui/src/pages/EntitiesPage.tsx`).

## 9. Classic vs Agent Presentation
- **Terminology**: The UI uses "Findings" for Classic WCAG issues and "Analysis AI agent" or "Raawi trace" for Agent issues.
- **Visual Distinction**: They exist in completely separate tables on `ScanDetailPage.tsx`.
- **Confusion**: Because they are separated, users cannot easily determine if the Agent found the *same* issue the Classic engine found.

## 10. Trace UI
- **Path**: Agent -> `Page.agentPath` -> `scan-detail.ts` API -> `ScanDetailPage.tsx` UI.
- **Failure**: Traces occasionally fail to render or present empty states because the UI expects a strict JSON schema for `trace.pageProfile`, which the LLM agent sometimes fails to strictly generate. This is a platform dependency issue masking as a UI bug.

## 11. Error / Loading / Empty States
- **Loading**: Implemented via generic spinners.
- **Errors**: API failures in exports (`ScanDetailPage.tsx`) set an error state, but the UI often just dumps the raw `err.message`.

---

## 12. DGA → Phase 2 Traceability

| DGA ID | Observation | Traceability / Findings |
|--------|-------------|-------------------------|
| DGA-01 | Platform accessibility | UI-002 |
| DGA-02 | Scan comparison | Functional/platform finding — intentionally excluded from Phase 2 |
| DGA-03 | Screenshots/evidence availability | UI-003 |
| DGA-04 | Homepage/logo presentation | UI-011 |
| DGA-05 | WCAG rule names/descriptions | UI-012 |
| DGA-06 | Quick Actions | UI-008 |
| DGA-07 | Entities search/filter/sort | UI-007 |
| DGA-08 | Scan Name | Functional/platform finding — intentionally excluded from Phase 2 |
| DGA-09 | Websites search/filter/sort | UI-007 |
| DGA-10 | Multi-page crawling limits | Functional/platform finding — intentionally excluded from Phase 2 |
| DGA-11 | Authentication-aware scanning | Functional/platform finding — intentionally excluded from Phase 2 |
| DGA-12 | Classic vs Raawi Agent distinction | UI-004 |
| DGA-13 | Duplicate PDF export options | UI-009 |
| DGA-14 | Arabic/English result inconsistency | UI-013 |
| DGA-15 | Excel localization | Functional/platform finding — intentionally excluded from Phase 2 |
| DGA-16 | Add Entity accessibility/responsiveness | UI-001 |
| DGA-17 | Direct Scan → Results navigation | UI-010 |
| DGA-18 | Severity-first findings sorting | UI-006 |
| DGA-19 | Trace failure inside scan | UI-005 |
| DGA-20 | Auditor Findings Applicable Not / N/A | Functional/platform finding — intentionally excluded from Phase 2 |

---

## 13. Prioritized UI Backlog

### P0 - Critical
**UI-001**
- **Title**: Responsive Add Entity Modal
- **Category**: UI/UX
- **DGA Requirement**: DGA-16
- **Screen**: `/entities`
- **Current Behavior**: Modal overflows on small viewports, requiring zoom.
- **Expected Behavior**: Modal fits within 320px width, scrollable vertically.
- **Root Cause**: CONFIRMED (CSS fixed widths / lack of media queries).
- **Dependencies**: Frontend only.
- **Verification**: Responsive rendering test at 320px.

**UI-002**
- **Title**: Dashboard Keyboard Accessibility
- **Category**: Accessibility
- **DGA Requirement**: DGA-01
- **Screen**: Global
- **Current Behavior**: Focus traps potentially missing on modals, semantic elements missing.
- **Expected Behavior**: Raawi X's user-facing platform must satisfy the accessibility acceptance criteria established through the dedicated Phase 3 accessibility audit.
- **Root Cause**: LIKELY (Rapid UI prototyping lacking explicit a11y components).
- **Dependencies**: Frontend only.
- **Verification**: Runtime accessibility test (Phase 3).

### P1 - Major
**UI-003**
- **Title**: Findings Screenshot Linkage
- **Category**: UI + Backend
- **DGA Requirement**: DGA-03
- **Screen**: `/findings`, `/scan/:id`
- **Current Behavior**: Findings do not explicitly or intuitively link to or display the captured evidence/screenshot.
- **Expected Behavior**: Reliable screenshot/evidence discoverability for findings. *(Optional Enhancement/Deferred: Automatic visual crop/highlight of the offending element).*
- **Root Cause**: CONFIRMED (API/Frontend do not visually surface the captured `screenshot.png` inline with the finding row).
- **Dependencies**: Frontend -> API.
- **Verification**: Visual verification.

**UI-004**
- **Title**: Classic vs Agent Segregation
- **Category**: UI/UX
- **DGA Requirement**: DGA-12
- **Screen**: `/scan/:id`
- **Current Behavior**: Agent and Classic findings overlap in summary counts but are visually siloed in tabs, confusing users.
- **Expected Behavior**: Clear, unified presentation where Agent findings do not artificially inflate WCAG compliance scores.
- **Root Cause**: CONFIRMED (Raw aggregation logic in `scan-detail.ts` blending arrays).
- **Dependencies**: Backend API -> UI.
- **Verification**: UI review of summary cards.

**UI-005**
- **Title**: Trace JSON Parsing Error Handling
- **Category**: UI + Backend
- **DGA Requirement**: DGA-19
- **Screen**: `/scan/:id`
- **Current Behavior**: Traces fail to render if JSON schema from Agent is imperfect.
- **Expected Behavior**: Graceful degradation or partial rendering of trace steps.
- **Root Cause**: LIKELY (Brittle frontend parsing failing on LLM format variations).
- **Dependencies**: Agent -> API -> Frontend.
- **Verification**: E2E test with malformed trace.

**UI-012**
- **Title**: WCAG Rule Names & Descriptions
- **Category**: UI + Backend
- **DGA Requirement**: DGA-05
- **Screen**: `/findings`
- **Current Behavior**: Rules display technical identifiers (e.g., "1.1.1") without clear human-readable names.
- **Expected Behavior**: Findings display localized, human-readable titles.
- **Root Cause**: CONFIRMED (Rules engine lacks mapped descriptions).
- **Dependencies**: Rules Engine -> API -> Frontend.
- **Verification**: UI verification.

**UI-013**
- **Title**: Arabic/English Inconsistency
- **Category**: UI + Backend
- **DGA Requirement**: DGA-14
- **Screen**: PDF Export / Findings
- **Current Behavior**: Generated reports mix Arabic UI text with English finding descriptions.
- **Expected Behavior**: Reports strictly adhere to the selected localization language.
- **Root Cause**: CONFIRMED (Backend strings hardcoded in report generation).
- **Dependencies**: Report Generator -> Frontend.
- **Verification**: Visual/File verification.

### P2 - Important
**UI-006**
- **Title**: Severity-First Sorting
- **Category**: UI/UX
- **DGA Requirement**: DGA-18
- **Screen**: `/findings`
- **Current Behavior**: Sorts by ID/Sequence by default.
- **Expected Behavior**: Sorts Critical -> High -> Medium -> Low by default.
- **Root Cause**: CONFIRMED (Default component state in React).
- **Dependencies**: Frontend.
- **Verification**: UI test.

**UI-007**
- **Title**: Search/Filter on Entities/Sites
- **Category**: UI/UX
- **DGA Requirement**: DGA-07, DGA-09
- **Screen**: `/entities`, `/sites`
- **Current Behavior**: Filtering is visually present but functionally incomplete.
- **Expected Behavior**: Real-time or API-backed filtering by name/domain.
- **Root Cause**: CONFIRMED (Missing event handlers/API integration).
- **Dependencies**: API -> Frontend.
- **Verification**: UI test.

**UI-008**
- **Title**: Quick Actions on Tables
- **Category**: UI/UX
- **DGA Requirement**: DGA-06
- **Screen**: `/scans`, `/entities`
- **Current Behavior**: Export/Delete actions missing from list rows.
- **Expected Behavior**: Context menu (three dots) on each row for quick actions.
- **Root Cause**: CONFIRMED (Missing UI implementation).
- **Dependencies**: Frontend.
- **Verification**: Visual verification.

### P3 - Polish
**UI-009**
- **Title**: Consolidate PDF Export Buttons
- **Category**: UI/UX
- **DGA Requirement**: DGA-13
- **Screen**: `/scan/:id`, `/entities`
- **Current Behavior**: Separate buttons for EN/AR exports clutter the UI.
- **Expected Behavior**: A single "Export" dropdown menu.
- **Root Cause**: CONFIRMED (Redundant UI elements).
- **Dependencies**: Frontend.
- **Verification**: Visual verification.

**UI-010**
- **Title**: Direct Scan-to-Findings Link
- **Category**: UI/UX
- **DGA Requirement**: DGA-17
- **Screen**: `/scans`
- **Current Behavior**: Clicking a scan goes to overview.
- **Expected Behavior**: Add a direct "View Findings" deep link in the table.
- **Root Cause**: CONFIRMED (Missing route link).
- **Dependencies**: Frontend.
- **Verification**: UI test.

**UI-011**
- **Title**: Homepage Logo Fallback
- **Category**: UI/UX
- **DGA Requirement**: DGA-04
- **Screen**: `/` (Overview)
- **Current Behavior**: Broken image icon if logo is missing.
- **Expected Behavior**: Shows a graceful placeholder or initials.
- **Root Cause**: CONFIRMED (Missing `onError` handler).
- **Dependencies**: Frontend.
- **Verification**: Visual verification.

---

# PHASE 2 STATUS

READY FOR PHASE 3: YES
