# Raawi X — Scan Identity, Report Consistency and Findings UX Audit

## Baseline
* Branch: feature/semantic-core
* HEAD Commit: 1649fdf
* Status: Clean working tree

## A. Scan Identity
* **Observation**: The `Scan` model (`apps/scanner/prisma/schema.prisma`) uses a system-generated `scanId` (e.g., `scan_1728505500_xyz123`) for identification. There is no `name` or `displayName` field in the database schema or the API payload.
* **Impact**: The UI can only display the raw ID or the seed URL, making it difficult for users to distinguish between multiple scans of the same property, especially over time.
* **Recommendation**: While we cannot add a `name` column, the frontend can derive a human-readable "virtual" name based on the `Property` domain, the date/time (`startedAt`), and the scan mode (e.g., `example.com - 2026-10-09 - Raawi agent`).

## B. Scan List and Lifecycle
* **"Discovering" Status Bug**: When a scan is initialized, the API (`/api/scans/:scanId/init`) explicitly sets the status to `'discovering'`. The discovery process (`/api/scans/:scanId/discover`) runs as a detached background promise (`discovery.discover().catch(...)`), bypassing the persisted BullMQ job queue. If the node process restarts or crashes during discovery, the background promise is lost, leaving the scan permanently orphaned in the `'discovering'` state with zero pages.
* **Canceled Timestamp Bug**: The `/api/scans/:scanId/cancel` endpoint explicitly sets the `completedAt` timestamp to `new Date()` when updating the status to `canceled` (`scanRepository.updateScanStatus(scanId, 'canceled', new Date())`). The frontend (`ScansPage.tsx`) renders the `completedAt` column strictly if the field is populated, resulting in a canceled scan incorrectly displaying a completion date.

## C. Summary Metrics and Report Lineage
The metrics displayed in the report overview are generated as follows:
* **"27 pages with Raawi trace"**: Maps to `analysisAgentTraceSummary.pagesWithTrace`. This increments when a page successfully executed the Raawi agent trace, generating an artifact.
* **"Zero Raawi findings"**: Maps to `raawiIssueCount` (`analysisAgentTraceSummary.totalIssues` / `layerAgentFindings.length`). This reflects the total number of distinct accessibility issues raised specifically by the interactive agent.
* **"27 passes, zero not-pass"**: Maps to `analysisAgentTraceSummary.passPages` and `failPages`. A "pass" means the agent trace was executed on the page and found *zero issues*. It does not mean the page passed all WCAG DOM rules, only that the agent interaction was issue-free.
* **"348 auditor findings"**: Maps to `auditorFindings.length`. The API backend (`apps/scanner/src/api/scan-detail.ts`) aggregates `layer1Findings` + `layer2Findings` + `layerAgentFindings` into a single `auditorFindings` array. 
* **Conclusion**: The numbers are consistent but semantically overlapping. "Raawi findings" are a subset of the total "auditor findings". The "pass" count evaluates the interaction layer, not the static accessibility rules.

## D. Findings Details Presentation
* **Layout Issue**: In `FindingsPage.tsx`, the layout is built using a CSS grid (`grid-cols-1 lg:grid-cols-3`). When a finding is selected, the list container is dynamically constrained to a single column (`lg:col-span-1`), while the new details pane occupies the remaining two columns (`lg:col-span-2`).
* **Root Cause**: The findings list is rendered as a standard `<table>` with 5 columns. Compressing this wide table into one-third of the screen width causes text wrapping, layout breakage, and horizontal scrolling.
* **Recommendation**: Replace the split grid layout with an overlay UI pattern. On desktop, open a non-resizing side sheet (drawer). On mobile, push a full-screen view. This preserves the table's width in the background while dedicating space for details.

## E. Localization
* **Missing Keys**: A review of the `src/i18n/locales/en.json` and `ar.json` files confirms that the following requested keys are entirely absent:
  * `overview.quickActions`
  * `overview.newScan`
  * `common.from`
  * `common.details`
* **Status Keys**: The frontend explicitly attempts to resolve `{t('scans.discovering')}` and `{t('scans.canceled')}`. However, these keys do not exist under the `scans` namespace (they only exist under `scanMonitor` or are missing entirely), resulting in the UI falling back to the raw, untranslated English database strings (`discovering`, `canceled`).

## F. Severity, Evidence, and Applicability
* **Severity Model vs. WCAG**: The system distinguishes between standard WCAG Conformance Levels (A, AA) and the severity/confidence of the finding. Findings are ordered via `compareNormalizedIssues` or Prisma `orderBy`, prioritizing WCAG Level (A -> AA), then Status (Fail -> Needs Review), then Confidence.
* **Evidence Persistence**: Evidence is serialized as `evidenceJson` in the Prisma database schema and parsed back into an object in the `scan-detail.ts` API endpoint.
