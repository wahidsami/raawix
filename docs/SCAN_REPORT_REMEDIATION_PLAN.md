# Raawi X — Final Remediation Plan

## 1. Established Source Baseline
* **Local Branch:** `feature/semantic-core`
* **Local HEAD:** `44be598b2d6f415d344b62e14ebdbee526edfa7b`
* **Upstream:** `origin/feature/semantic-core`
* **Working Tree:** Contains untracked `.js` and `.d.ts` build artifacts; no tracked modifications.
* **Deployment Context:** Frontend deployed at `44be598`. Backend deployment commit remains unverified and must be independently confirmed before production rollout.

## 2. Canonical DGA Traceability Matrix

| DGA ID | Requirement | Previously implemented work | Remaining work | Current confidence/status | Dependencies | Acceptance criteria | Required test evidence | Planned phase |
|---|---|---|---|---|---|---|---|---|
| 1 | Platform accessibility | Initial WCAG testing on primary screens. | Keyboard nav review, ARIA labels on new UI. | Partial (Locally tested) | None | Automated checks, manual keyboard/focus, responsive reflow, and screen-reader verification. Explicitly record untested areas. | Axe-core test reports, keyboard walkthrough log. | 5 |
| 2 | Compare two scans | None. | Implement scan comparison view/API. | Not Started | DGA-8 | User can select two scans and view a diff. | Unit tests for diff logic, UI integration tests. | 6 |
| 3 | Screenshot/evidence availability | Metadata captured in DB (`evidenceJson`); artifact storage unverified. | Distinguish metadata from artifacts. Verify artifact storage location, persistence reference, API access, and frontend retrieval. | Needs improvement | Unverified | End-to-end tests for evidence retrieval post-refresh/navigation. Test missing/inaccessible artifacts with honest fallback. Validate real screenshot linkage (not just JSON parsing). | Fixtures with valid/invalid evidence payloads. E2E logs. | 4 |
| 4 | Homepage organization logos | Logo storage setup. | Verify rendering and fallback behavior. | Partial | None | Logos display correctly; alt text present. | Visual checks across locales. | 5 |
| 5 | WCAG rule names and descriptions | Extracted into `@raawi-x/core`. | Validate rule completeness. | High (Locally tested) | None | Rules resolve names/descriptions correctly in UI. | Unit tests for WCAG helper functions. | 4 |
| 6 | Dashboard Quick Actions | Initial UI structure. | Fix missing translation keys; wire actions. | Partial | DGA-13 | Quick actions perform expected navigation/API calls. | UI integration tests. | 5 |
| 7 | Entity search/filter/sort | Basic filtering implemented. | Refine sort UX and edge cases. | Partial (Locally tested) | None | Search, filter, and sort behave predictably. | API/UI test logs. | 6 |
| 8 | Scan Name | None (system ID only). | Add `name` column, API validation, generated default. | Not Started | None | User can name scans; backend generates fallback. | Migration logs, DB unit tests. | 3 |
| 9 | Website search/filter/sort | Basic filtering implemented. | Synchronize behavior with Entities. | Partial | None | Same criteria as DGA-7 for Websites. | API/UI test logs. | 6 |
| 10 | Full page crawling coverage | Basic crawler integration. | Verify limits, depths, and auth bounds. | Partial | Lifecycle | Representative multi-page crawling tests, page-limit handling, partial failures, and authorized auth scenarios. | Crawler unit tests with mocked endpoints. | 6 |
| 11 | Clear distinction between Classic and Agent | UI splits sections. | Rename "Pass" to "Interaction Trace Success"; clarify aggregated findings. | Partial | None | No ambiguity between interaction success and WCAG pass. | UI review, PDF export checks. | 4 |
| 12 | Duplicate PDF export options | English/Arabic options added. | Remove redundant/duplicate UX flows. | Partial | None | Single clear path to generate PDF by locale. | UI integration tests. | 5 |
| 13 | Arabic/English result localization | Basic i18n setup. | Add missing keys (`overview.quickActions`, `scans.canceled`, etc.). | Needs improvement | None | No raw translation keys appear in the UI. | String checks in UI tests. | 4 |
| 14 | Excel report localization | Excel generator translates some strings. | Complete translation of all headers/data in export. | Partial | None | Generated Excel file is fully localized. | Excel output fixtures. | 4 |
| 15 | Add Entity responsiveness/accessibility | Form built. | Mobile scaling, touch targets, screen reader cues. | Partial | None | Modal is usable on mobile and by keyboard. | Mobile layout tests, screen reader audit. | 5 |
| 16 | Open scan results directly from All Scans | Link exists. | Maintain filter state; handle direct navigation. | High | None | Clicking scan opens details correctly. | E2E navigation tests. | 5 |
| 17 | Failures first, ordered by actual severity | Ordered by WCAG level currently. | Implement real severity model (Severity > Status > Confidence). | Needs improvement | None | Highest severity issues sort to top regardless of WCAG level. | Unit tests for sorting algorithm. | 4 |
| 18 | Trace reliability | Basic execution. | Ensure persistence, linkage, recovery, and valid rendering. | Partial | Lifecycle | Agent traces never silently drop or break the UI. | Stress tests on trace execution and rendering. | 2 |
| 19 | Auditor Findings applicability correctness | Aggregation logic. | Enforce typed evidence; no blanket N/A rules. | Needs improvement | None | Only genuinely unapplicable rules return N/A. | Fixtures for pass, fail, N/A, exec error. | 4 |
| 20 | Evaluation of core product value and real user tasks | MVP built. | End-to-end task completion evaluation. | Not Started | All | Concrete end-to-end user tasks and objective completion criteria. | UAT sign-off logs. | 6 |

## 3. Cross-Cutting Engineering and UX Defects (Not DGA-Bound)
* **Scan Lifecycle & Discovery (Engineering):** Discovery background promises are detached. Must be wrapped in BullMQ queue for crash recovery, stalled job handling, and idempotency.
* **Findings Overlay (UX):** CSS grid shrinks table layout. Must implement desktop non-resizing side drawer and mobile full-screen modal, maintaining focus management and Escape-to-close behavior.
* **Production Security Audit (Engineering Hardening):** Inspect the `VITE_API_KEY` warning observed in Docker deployment logs. Evaluate client-bundle exposure and permission scope without printing the value. No key rotation or config changes will be applied during this planning phase.

## 4. Refined Scan Name Design (DGA 8)
* **Architecture:** Add `name String?` to the `Scan` model. The `scanId` remains strictly immutable for diagnostics.
* **Backend Ownership:** The backend owns canonical fallback-generation behavior to ensure API clients without UI get consistent defaults.
* **Validation:** API will trim whitespace, enforce a max length (e.g., 100 chars), reject control characters, and preserve legitimate Unicode/Arabic.
* **UI/Persistence:** Create scan forms will preview the backend default, allowing users to override. Name edits persist back to the API. Historical scans display derived names if `name` is null. Deep links, entity/site lists, dropdowns, and exports must use this new structure.

## 5. Cancellation Timestamp Semantics
* **Architecture:** Add a nullable `canceledAt DateTime?` column. Discontinue setting `completedAt` upon cancellation, preventing skewed analytics. Do not use `updatedAt` as the authoritative cancellation timestamp for new records.
* **Races:** Ensure strict DB-level state machine checks (e.g., a cancelled job cannot transition to completed if a stale worker finishes).
* **UI Fallback:** For historical records lacking a reliable cancellation timestamp, the UI will display status only or derive cautiously.

## 6. Metric and Severity Contracts (DGA 11, DGA 17)
* **Metrics Source of Truth:** `auditorFindings` sums DOM, Vision, and Agent findings. We do *not* promise deduplication across these engines unless explicit deduplication rules are implemented and justified. The UI must clarify that counts may overlap if multiple engines detect the same flaw.
* **Severity Model:** Severity must be decoupled from WCAG Level. Provenance must be explicitly defined using verified issue-level metadata (e.g., Critical/High/Medium/Low based on defect impact).
* **Fallback:** Missing severity data defaults to "Unknown" but sorts deterministically below explicitly defined severities. Keep severity, status, confidence, and WCAG conformance level independent.

## 7. Applicability Semantics Correctness (DGA 19)
* **Execution Outcomes:** Missing candidate elements must *not* automatically equal `Not Applicable`. Rule-specific justification is required. Conflation of missing elements, successful checks, insufficient evidence, and execution errors is prohibited.
* **Testing:** Require dedicated regression fixtures verifying Pass, Fail, Genuine N/A, Needs Review, Insufficient Evidence, and Execution Error states.

## 8. Implementation Phases and Verification Requirements

### Phase 1: Verify Baseline & Migrations Design
* **Scope:** Repository validation and API payload validation. Finalize migration designs without applying any migrations during this baseline verification step.
* **Verification:** Historical data read tests, local DB validation.

### Phase 2: Scan Lifecycle Reliability (Discovery, Crashes, Cancellation)
* **Scope:** Apply `canceledAt` schema migration. BullMQ integration for discovery, state-machine race condition prevention, cancellation semantic enforcement.
* **Verification:** Integration tests simulating worker crashes during discovery, unit tests for stalled jobs, cancellation race condition simulations. Historical-record tests for schemas.

### Phase 3: Persistent Scan Name (End-to-End)
* **Scope:** Apply `Scan.name` schema migration. Backend fallback generation, UI creation flows, deep links, entity/site lists, Excel/PDF exports.
* **Verification:** Migration tests. API tests for control-character rejection, UI layout checks, integration tests for export artifacts.

### Phase 4: Metrics, Localization, Severity, and Applicability
* **Scope:** Implement exact severity sorting, decouple Agent "Pass", add missing i18n keys, and strictly type applicability/evidence rules.
* **Verification:** Sorting algorithm unit tests, rule outcome fixtures (Pass/Fail/NA/Error), UI string checks across locales.

### Phase 5: Findings Overlay and Remaining UI UX
* **Scope:** Desktop side drawer, mobile full-screen modal, a11y focus management, Add Entity modal responsiveness, PDF/Quick Action UX fixes.
* **Verification:** Keyboard navigation logs, screen reader tests, mobile layout screenshots.

### Phase 6: Final DGA Requirements (Scan Comparison, Crawler Limits, Core UAT)
* **Scope:** Implement scan comparison (DGA-02), crawler authentication testing, and core product evaluation (DGA-20).
* **Verification:** Comparison logic unit tests, crawler bounds testing with mocked auth targets, UAT sign-off.

### Phase 7: Production Release Gates
* **Scope:** Final environment verification.
* **Verification:** Production-only deployment checks, confirming backend version alignment, and end-to-end smoke testing on the VPS.

## Outstanding Assumptions
* The backend deployment commit matches the frontend state, which must be verified before Phase 7.
* Extending BullMQ for discovery is feasible without creating deadlocks in the crawler job isolation limits.
* The `VITE_API_KEY` warning is observed in deployment logs; its sensitivity, client-bundle exposure, and effective permissions remain unknown until the security audit is complete.
