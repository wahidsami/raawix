# Raawi X — Phase 1: DGA Requirements Decomposition

## 1. DGA Observation Inventory & Classification

| ID | DGA Observation | Primary Classification | Secondary Dependency |
|----|-----------------|------------------------|----------------------|
| DGA-01 | Platform accessibility | Accessibility of Raawi X itself | UI/UX |
| DGA-02 | Scan comparison | Functional/Core | UI + Backend |
| DGA-03 | Screenshots/evidence availability | UI + Backend | Artifact storage |
| DGA-04 | Homepage/logo presentation | UI/UX | Frontend |
| DGA-05 | WCAG rule names/descriptions | UI + Backend | Rules engine / DB |
| DGA-06 | Quick Actions | UI/UX | Backend API |
| DGA-07 | Entities search/filter/sort | UI/UX | Backend API |
| DGA-08 | Scan Name | UI + Backend | Database |
| DGA-09 | Websites search/filter/sort | UI/UX | Backend API |
| DGA-10 | Multi-page crawling limits | Functional/Core | Crawler |
| DGA-11 | Authentication-aware scanning | Functional/Core | Scanner / Crawler |
| DGA-12 | Classic vs Raawi Agent distinction | UI + Backend | Agent runtime / DB |
| DGA-13 | Duplicate PDF export options | UI/UX | Frontend |
| DGA-14 | Arabic/English result inconsistency | UI + Backend | Localization / Widget |
| DGA-15 | Excel localization | Functional/Core | Report generator |
| DGA-16 | Add Entity accessibility/responsiveness | Accessibility of Raawi X itself | UI/UX |
| DGA-17 | Direct Scan → Results navigation | UI/UX | Frontend |
| DGA-18 | Severity-first findings sorting | UI/UX | Frontend |
| DGA-19 | Trace failure inside scan | UI + Backend | Agent runtime |
| DGA-20 | Auditor Findings Applicable Not / Not Applicable | UI + Backend | Classic audit / DB |

---

## 2. Requirements Decomposition Matrix

### DGA-01: Platform Accessibility
- **Observation:** The Raawi X dashboard itself lacks proper accessibility (contrast, keyboard focus).
- **Requirement:** Ensure all interactive elements in the dashboard meet WCAG 2.1 AA accessibility standards.
- **Classification:** Accessibility of Raawi X itself.
- **Current State:** PARTIAL (`apps/report-ui/src/index.css` has basic styles, but modals/focus are incomplete).
- **Root Cause:** CONFIRMED. Rapid prototyping of `report-ui` bypassed a11y checks.
- **Dependencies:** Frontend (`report-ui`).
- **Acceptance Criteria:**
  1. All modals trap focus correctly.
  2. Contrast ratios for text meet 4.5:1.
  3. Keyboard navigation works for all menus/tables.
- **Verification:** Accessibility test (manual/automated on `report-ui`).
- **Implementation Phase:** ACCESSIBILITY REMEDIATION.
- **Priority:** P0 (Blocks accessibility compliance for an accessibility tool).

### DGA-02: Scan Comparison
- **Observation:** Users cannot compare a before/after scan.
- **Requirement:** Users must be able to select two scans and view a differential report of findings.
- **Classification:** Functional/Core.
- **Current State:** MISSING.
- **Root Cause:** CONFIRMED. DB schema tracks scans, but no differential logic or UI exists.
- **Dependencies:** Database -> Backend API -> Frontend UI.
- **Acceptance Criteria:**
  1. Users can select two scans for the same property.
  2. UI displays resolved issues, new issues, and persistent issues.
- **Verification:** Integration test + UI verification.
- **Implementation Phase:** BACKEND / PLATFORM REMEDIATION.
- **Priority:** P1 (Major functional gap).

### DGA-03: Screenshots/Evidence
- **Observation:** Screenshots and evidence for findings are not easily discoverable or linked in the UI.
- **Requirement:** Findings in the UI must display or directly link to the relevant screenshot crop/evidence.
- **Classification:** UI + Backend.
- **Current State:** PARTIAL (Screenshots captured by `page-capture.ts`, paths stored, but UI linking to specific finding nodes is weak).
- **Root Cause:** LIKELY. UI does not map finding DOM paths to visual bounding boxes.
- **Dependencies:** Crawler -> Artifact storage -> Backend API -> Frontend.
- **Acceptance Criteria:**
  1. Finding detail view shows the page screenshot.
  2. Finding highlights the affected element.
- **Verification:** Visual/UI verification.
- **Implementation Phase:** UI/UX REMEDIATION.
- **Priority:** P1.

### DGA-04: Homepage/Logo Presentation
- **Observation:** Homepage/logo presentation is misaligned or missing styling.
- **Requirement:** The dashboard homepage must correctly render the application and entity logos.
- **Classification:** UI/UX.
- **Current State:** EXISTS BUT DEFECTIVE (`apps/report-ui/src/pages/OverviewPage.tsx`).
- **Root Cause:** CONFIRMED. Missing CSS fallback for missing entity logos.
- **Dependencies:** Frontend.
- **Acceptance Criteria:** Logos render with correct aspect ratios and fallbacks.
- **Verification:** Visual/UI verification.
- **Implementation Phase:** UI/UX REMEDIATION.
- **Priority:** P3.

### DGA-05: WCAG Rule Names/Descriptions
- **Observation:** WCAG rules in reports lack descriptive, human-readable names.
- **Requirement:** Findings must display localized, human-readable titles and descriptions for WCAG rules.
- **Classification:** UI + Backend.
- **Current State:** EXISTS BUT DEFECTIVE (Rules exist in `packages/rules`, but descriptions are either technical or English-only).
- **Root Cause:** CONFIRMED. `packages/rules` does not map to full i18n descriptions for all violations.
- **Dependencies:** Rules engine -> Backend API -> Localization -> Frontend.
- **Acceptance Criteria:** Every finding displays a clear title (e.g., "Missing Alt Text") instead of just "1.1.1".
- **Verification:** UI verification.
- **Implementation Phase:** REPORTING REMEDIATION.
- **Priority:** P1.

### DGA-06: Quick Actions
- **Observation:** Quick actions (re-scan, delete, export) are hard to access.
- **Requirement:** Scans and Entities must have accessible quick action menus in their respective list views.
- **Classification:** UI/UX.
- **Current State:** PARTIAL (`ScanDetailPage.tsx` has buttons, but lists lack context menus).
- **Root Cause:** CONFIRMED. UI table components lack action columns.
- **Dependencies:** Frontend -> Backend API (for actions).
- **Acceptance Criteria:** Table rows for entities/scans feature a dropdown or action bar.
- **Verification:** Visual/UI verification.
- **Implementation Phase:** UI/UX REMEDIATION.
- **Priority:** P2.

### DGA-07: Entities Search/Filter/Sort
- **Observation:** The Entities page lacks search, filtering, and sorting.
- **Requirement:** Users must be able to search entities by name and sort by creation date or status.
- **Classification:** UI/UX.
- **Current State:** EXISTS BUT DEFECTIVE (`EntitiesPage.tsx` lists them, but client-side filtering is incomplete).
- **Root Cause:** CONFIRMED. UI state does not implement search handlers.
- **Dependencies:** Backend API -> Frontend.
- **Acceptance Criteria:** Search bar filters entity list instantly or via API query.
- **Verification:** UI/UX verification.
- **Implementation Phase:** UI/UX REMEDIATION.
- **Priority:** P2.

### DGA-08: Scan Name
- **Observation:** Scans cannot be named, making them hard to identify.
- **Requirement:** Users must be able to assign, persist, display, edit, and use a human-readable name for a scan.
- **Classification:** UI + Backend.
- **Current State:** MISSING (`schema.prisma` lacks a user-defined name field for `Scan`).
- **Root Cause:** CONFIRMED. Missing database column `name` on `Scan` model.
- **Dependencies:** Database -> Backend API -> Frontend.
- **Acceptance Criteria:**
  1. `Scan` model has a `name` string field.
  2. UI allows naming during creation and editing post-creation.
  3. Lists display the name instead of just the UUID/timestamp.
- **Verification:** Database persistence test + UI verification.
- **Implementation Phase:** BACKEND / PLATFORM REMEDIATION.
- **Priority:** P1.

### DGA-09: Websites Search/Filter/Sort
- **Observation:** Similar to Entities, Websites (Properties) lack sorting/filtering.
- **Requirement:** Users must be able to filter/sort properties by domain and entity.
- **Classification:** UI/UX.
- **Current State:** EXISTS BUT DEFECTIVE (`SitesPage.tsx`).
- **Root Cause:** CONFIRMED. Missing UI implementation.
- **Dependencies:** Backend API -> Frontend.
- **Acceptance Criteria:** Property tables are sortable and searchable.
- **Verification:** UI verification.
- **Implementation Phase:** UI/UX REMEDIATION.
- **Priority:** P2.

### DGA-10: Multi-page Crawling
- **Observation:** Multi-page crawling logic fails to respect limits or misses pages.
- **Requirement:** The crawler must accurately traverse up to `maxPages` and `maxDepth` without dropping valid same-domain links.
- **Classification:** Functional/Core.
- **Current State:** EXISTS BUT DEFECTIVE (`bfs-crawler.ts`).
- **Root Cause:** LIKELY. Crawler queue deduplication or SPA link extraction misses dynamic routes.
- **Dependencies:** Crawler.
- **Acceptance Criteria:** Crawler visits exactly `maxPages` if available, traversing SPA links correctly.
- **Verification:** Scan against controlled website.
- **Implementation Phase:** CRAWLER REMEDIATION.
- **Priority:** P0.

### DGA-11: Authentication-aware Scanning
- **Observation:** Authenticated scans fail to maintain sessions.
- **Requirement:** Crawler must execute `ScanAuthProfile` scripts/cookies successfully before capturing pages.
- **Classification:** Functional/Core.
- **Current State:** PARTIAL (`schema.prisma` has profile, but Playwright context injection is flaky).
- **Root Cause:** UNKNOWN (Requires debugging `page-capture.ts` auth state).
- **Dependencies:** Scanner / Crawler -> Database.
- **Acceptance Criteria:** Secure pages return 200 OK and render authorized content in screenshots.
- **Verification:** Integration test with mocked auth portal.
- **Implementation Phase:** CRAWLER REMEDIATION.
- **Priority:** P0.

### DGA-12: Classic vs Raawi Agent Distinction
- **Observation:** Users cannot distinguish between deterministic findings and AI behavioral findings.
- **Requirement:** The UI must clearly segregate and label Classic Findings vs Agent Findings, and scores must reflect only deterministic WCAG rules.
- **Classification:** UI + Backend.
- **Current State:** PARTIAL (`Finding` vs `AgentFinding` exist in DB, UI has tabs, but summary counts overlap confusingly).
- **Root Cause:** CONFIRMED. `scan-detail.ts` aggregates counts poorly.
- **Dependencies:** Backend API -> Frontend.
- **Acceptance Criteria:** Agent findings do not impact WCAG scores. UI strictly separates them visually.
- **Verification:** UI verification + API test.
- **Implementation Phase:** UI/UX REMEDIATION.
- **Priority:** P1.

### DGA-13: Duplicate PDF Export Options
- **Observation:** There are multiple buttons/options for exporting PDFs causing confusion.
- **Requirement:** Provide a single, clear export dropdown for PDF/Excel.
- **Classification:** UI/UX.
- **Current State:** EXISTS BUT DEFECTIVE (`ScanDetailPage.tsx`).
- **Root Cause:** CONFIRMED. UI layout contains redundant buttons.
- **Dependencies:** Frontend.
- **Acceptance Criteria:** Only one "Export" action group exists.
- **Verification:** Visual/UI verification.
- **Implementation Phase:** UI/UX REMEDIATION.
- **Priority:** P3.

### DGA-14: Arabic/English Result Inconsistency
- **Observation:** Translations in reports mix English and Arabic.
- **Requirement:** Generated reports and UI must strictly adhere to the selected localization language.
- **Classification:** UI + Backend.
- **Current State:** PARTIAL (`i18n` in UI, but backend strings are hardcoded in `report-generator.ts`).
- **Root Cause:** CONFIRMED. Backend generates English finding messages regardless of UI locale.
- **Dependencies:** Report generator -> Localization -> Frontend.
- **Acceptance Criteria:** Exported PDFs and UI views are 100% Arabic when Arabic is selected.
- **Verification:** Visual/UI verification.
- **Implementation Phase:** REPORTING REMEDIATION.
- **Priority:** P1.

### DGA-15: Excel Localization
- **Observation:** Excel exports are not localized.
- **Requirement:** Excel generator must use localized headers and data.
- **Classification:** Functional/Core.
- **Current State:** EXISTS BUT DEFECTIVE (`apps/scanner/src/api/excel-export.ts`).
- **Root Cause:** CONFIRMED. Headers in `exceljs` are hardcoded English.
- **Dependencies:** Report generator.
- **Acceptance Criteria:** Excel output matches requested locale.
- **Verification:** Unit test / file verification.
- **Implementation Phase:** REPORTING REMEDIATION.
- **Priority:** P2.

### DGA-16: Add Entity Accessibility/Responsiveness
- **Observation:** The "Add Entity" modal is unusable on small screens or via keyboard.
- **Requirement:** Modal must be responsive and keyboard-navigable.
- **Classification:** Accessibility of Raawi X itself.
- **Current State:** EXISTS BUT DEFECTIVE.
- **Root Cause:** CONFIRMED. CSS media queries and focus traps are missing.
- **Dependencies:** Frontend.
- **Acceptance Criteria:** Modal fits on 320px screens and can be closed via ESC key.
- **Verification:** UI / Accessibility test.
- **Implementation Phase:** ACCESSIBILITY REMEDIATION.
- **Priority:** P1.

### DGA-17: Direct Scan → Results Navigation
- **Observation:** Users cannot jump directly from the Scans list to the Findings view.
- **Requirement:** Scans list must link directly to the detailed results view.
- **Classification:** UI/UX.
- **Current State:** EXISTS BUT DEFECTIVE.
- **Root Cause:** CONFIRMED. Link routing only goes to overview.
- **Dependencies:** Frontend.
- **Acceptance Criteria:** Scans table includes a "View Findings" deep link.
- **Verification:** UI verification.
- **Implementation Phase:** UI/UX REMEDIATION.
- **Priority:** P3.

### DGA-18: Severity-first Findings Sorting
- **Observation:** Findings are not sorted by critical severity by default.
- **Requirement:** The findings table must default to sorting Critical -> High -> Medium -> Low.
- **Classification:** UI/UX.
- **Current State:** PARTIAL.
- **Root Cause:** CONFIRMED. Frontend sorts by sequence or ID by default.
- **Dependencies:** Frontend.
- **Acceptance Criteria:** Default sort order applies severity mapping.
- **Verification:** UI verification.
- **Implementation Phase:** UI/UX REMEDIATION.
- **Priority:** P2.

### DGA-19: Trace Failure Inside Scan
- **Observation:** Agent trace playback fails or does not load.
- **Requirement:** Agent traces must reliably load and replay the agent's interaction steps.
- **Classification:** UI + Backend.
- **Current State:** EXISTS BUT DEFECTIVE (`interaction-agent.ts` generates traces, UI fails to parse them sometimes).
- **Root Cause:** LIKELY. Trace JSON schema mismatch between what the Agent writes and what the UI expects.
- **Dependencies:** Agent runtime -> Artifact storage -> Frontend.
- **Acceptance Criteria:** Traces load without console errors and render steps.
- **Verification:** E2E test with Agent behavioral test.
- **Implementation Phase:** AGENT REMEDIATION.
- **Priority:** P1.

### DGA-20: Applicable Not / Not Applicable Logic
- **Observation:** Findings don't clearly state when a rule is "Not Applicable" vs "Passed".
- **Requirement:** The audit engine must distinguish and record "Not Applicable" for rules.
- **Classification:** UI + Backend.
- **Current State:** MISSING (`report-generator.ts` only logs violations or passed).
- **Root Cause:** CONFIRMED. Rules engine interface lacks an `N/A` return state.
- **Dependencies:** Classic audit -> Backend API -> Frontend.
- **Acceptance Criteria:** Rule executions resulting in N/A are tallied and displayed separately from Passes.
- **Verification:** Unit test on rules engine.
- **Implementation Phase:** CLASSIC AUDIT REMEDIATION.
- **Priority:** P1.

---

## 3. Special Analysis: Classic vs Raawi Agent

Based on Phase 0 evidence, here is the distinct breakdown between the two audit mechanisms currently present in the codebase.

| Aspect | Classic Audit | Raawi Agent |
|--------|--------------|-------------|
| **What it does** | Executes deterministic WCAG rules (axe-core/custom). | AI-driven behavioral interaction and observation. |
| **Inputs** | Serialized `page.html` artifact (via JSDOM). | Live browser context, vision, and semantic models. |
| **Execution** | Synchronous DOM parsing after capture. | Async step-by-step reasoning via `interaction-agent.ts`. |
| **Outputs** | `Finding` records (WCAG strict). | `AgentFinding` records + Traces. |
| **User Value** | Verifiable legal compliance. | Identifies functional/UX barriers for assistive tech users. |
| **UI Presentation** | Merged into summary scores, creating confusion. | Displayed in parallel, sometimes inflating issue counts. |
| **Unknowns** | How many custom rules are actively firing. | Real-world reliability of the agent's actions on complex SPAs. |

**Product Implication:** The current UI merges these distinct systems into generic "Findings counts", causing confusion. They provide different user value (Compliance vs UX) and must be structurally separated in reporting.

---

## 4. Special Analysis: DGA UI/UX Backlog

Consolidated list of presentation/usability requirements:

1. **DGA-03:** Findings to Screenshot linkage (P1)
2. **DGA-04:** Homepage/Logo fallback styles (P3)
3. **DGA-06:** Quick Actions on tables (P2)
4. **DGA-07:** Entities search/filter/sort (P2)
5. **DGA-09:** Websites search/filter/sort (P2)
6. **DGA-13:** Consolidate PDF export buttons (P3)
7. **DGA-16:** Add Entity modal responsiveness (P1)
8. **DGA-17:** Direct scan-to-results link (P3)
9. **DGA-18:** Sort findings by severity default (P2)

---

## 5. Special Analysis: Functional Backlog

Consolidated list of core backend/product requirements:

1. **DGA-02:** Scan Comparison (Differential analysis logic)
2. **DGA-05:** WCAG localized rule descriptions mapping
3. **DGA-08:** Scan Name (DB migration required)
4. **DGA-10:** Crawler SPA link extraction / limits fix
5. **DGA-11:** Authentication context injection fix
6. **DGA-14 & DGA-15:** Report/Excel localization via backend i18n
7. **DGA-19:** Agent Trace JSON schema synchronization
8. **DGA-20:** Rule Engine "Not Applicable" state tracking

---

## 6. Phase 0 Architectural Risks Relevant to Remediation

- **Monolithic Widget:** `widget.ts` is large; any UI changes to the widget must account for its size.
- **Dead `a11y.json` Artifact:** Crawler writes it, but it provides no value. Can be deprecated to improve scan speed.
- **Semantic Engine Incompleteness:** Linting/Type-checking failures currently block relying on it for robust Agent actions.
- **Classic/Agent Fragmentation:** As analyzed, DB tables are separate, causing downstream aggregation errors.

---

## 7. Final Requirements Matrix

| ID | DGA Observation | Classification | Current State | Root Cause | Requirement | Priority | Dependencies | Acceptance Criteria | Verification | Future Phase |
|----|-----------------|----------------|---------------|------------|-------------|----------|--------------|---------------------|--------------|--------------|
| DGA-01 | Platform a11y | A11y | PARTIAL | CONFIRMED | Ensure dashboard meets WCAG AA. | P0 | Frontend | Focus traps, contrast 4.5:1, keyboard nav. | A11y test | ACCESSIBILITY |
| DGA-02 | Scan comparison | Functional | MISSING | CONFIRMED | Diff report for 2 scans. | P1 | DB -> API -> UI | Shows new/resolved/persistent issues. | Integration | BACKEND |
| DGA-03 | Screenshots | UI+Backend | PARTIAL | LIKELY | Link findings to screenshots. | P1 | Crawler->API->UI | UI highlights affected element visually. | Visual | UI/UX |
| DGA-04 | Logos | UI/UX | DEFECTIVE | CONFIRMED | Fallback styling for logos. | P3 | Frontend | Logos render cleanly. | Visual | UI/UX |
| DGA-05 | WCAG names | UI+Backend | DEFECTIVE | CONFIRMED | Localized human-readable rules. | P1 | Rules->API->UI | "Missing Alt Text" instead of "1.1.1". | UI test | REPORTING |
| DGA-06 | Quick Actions | UI/UX | PARTIAL | CONFIRMED | Action menus on tables. | P2 | Frontend->API | Delete/export available on rows. | Visual | UI/UX |
| DGA-07 | Entities sort | UI/UX | DEFECTIVE | CONFIRMED | Search/sort entity lists. | P2 | API->Frontend | Lists update dynamically. | UI test | UI/UX |
| DGA-08 | Scan Name | UI+Backend | MISSING | CONFIRMED | Add user-defined scan name. | P1 | DB->API->UI | Name persists and displays. | DB/UI test | BACKEND |
| DGA-09 | Websites sort | UI/UX | DEFECTIVE | CONFIRMED | Search/sort property lists. | P2 | API->Frontend | Lists update dynamically. | UI test | UI/UX |
| DGA-10 | Multi-page crawl | Functional | DEFECTIVE | LIKELY | Respect maxDepth/SPAs. | P0 | Crawler | Captures all valid links exactly. | Scan test | CRAWLER |
| DGA-11 | Auth scanning | Functional | PARTIAL | UNKNOWN | Maintain auth sessions. | P0 | Crawler->DB | Secure pages render 200 OK. | E2E | CRAWLER |
| DGA-12 | Classic vs Agent | UI+Backend | PARTIAL | CONFIRMED | Segregate UI/Scores. | P1 | API->Frontend | Agent does not alter WCAG score. | UI/API test | UI/UX |
| DGA-13 | Duplicate PDF | UI/UX | DEFECTIVE | CONFIRMED | Single export dropdown. | P3 | Frontend | Only one PDF button exists. | Visual | UI/UX |
| DGA-14 | Ar/En reports | UI+Backend | PARTIAL | CONFIRMED | Strictly respect chosen locale. | P1 | Report->UI | PDFs output purely in Arabic. | Visual | REPORTING |
| DGA-15 | Excel locale | Functional | DEFECTIVE | CONFIRMED | Localize Excel headers. | P2 | Report gen | Headers match requested language. | File check | REPORTING |
| DGA-16 | Add Entity a11y | A11y | DEFECTIVE | CONFIRMED | Responsive/navigable modal. | P1 | Frontend | Fits 320px, keyboard navigable. | A11y test | ACCESSIBILITY |
| DGA-17 | Direct Nav | UI/UX | DEFECTIVE | CONFIRMED | Scans list links to findings. | P3 | Frontend | "View Findings" button exists. | UI test | UI/UX |
| DGA-18 | Severity sort | UI/UX | PARTIAL | CONFIRMED | Default table sort is severity. | P2 | Frontend | Critical appears first. | UI test | UI/UX |
| DGA-19 | Trace failure | UI+Backend | DEFECTIVE | LIKELY | Fix Trace JSON parsing. | P1 | Agent->UI | Traces load and play. | E2E | AGENT |
| DGA-20 | N/A tracking | UI+Backend | MISSING | CONFIRMED | Engine tracks Not Applicable. | P1 | Rules->API->UI | N/A is tallied distinctly. | Unit test | CLASSIC AUDIT |

---

# PHASE 1 STATUS

READY FOR PHASE 2: YES
