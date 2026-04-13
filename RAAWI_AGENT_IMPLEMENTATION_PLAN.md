# Raawi Agent Implementation Plan

## Progress Snapshot

Status as of 2026-04-13.

- Overall progress: about `82%`
- Phase 0: `done`
- Phase 1: `done`
- Phase 2: `largely done`
- Phase 3: `partially done`
- Phase 4: `largely done`
- Phase 5: `largely done`
- Phase 6: `not started`
- Phase 7: `partially done`

Implemented highlights:

- Added `auditMode` with `classic` and `raawi-agent` scan flows.
- Added unified auditor finding schema, taxonomy mapping, issue codes, and Raawi-first report structure.
- Added Raawi page understanding, task intents, task assessments, and journey runs.
- Added Raawi probes and journey coverage for:
  - page structure
  - skip links
  - menus
  - dialogs
  - forms
  - verification checkpoints
  - search
  - media
  - authenticated workspace cues
  - dynamic update announcement readiness
- Added authenticated scanning with reusable login profiles, auto-detect login setup, storage-state reuse, manual verification pause/resume, and continuation trail.
- Added auth coverage and continuation metadata to dashboard, PDF, and Excel reports.

Still open at a high level:

- deeper multi-step authenticated journeys after login
- stronger AI planning and assistive-tech reasoning
- encrypted secrets at rest
- benchmark calibration and regression datasets
- rollout feature flags and final production hardening

## Purpose

Build a two-mode accessibility scanning system that keeps the current technical audit path intact while adding a deeper Raawi agent path that simulates assistive-tech driven navigation, task completion, and UX judgment.

## Goals

- Keep the current `DOM + Vision + Assistive Map` workflow as the classic scan mode.
- Add a new `Raawi agent` scan mode that evaluates page experience using keyboard navigation, accessibility-tree reading, form and modal probes, image and content interpretation, and guided task flows.
- Produce a single, powerful report model that combines technical findings and assistive-tech experience findings.
- Preserve strong evidence and traceability without relying on video capture.
- Support authenticated portals through reusable login profiles, human verification checkpoints, and authenticated session reuse.

## Mode Definition

### Classic Mode

Current production behavior.

- DOM/WCAG rules
- Vision/screenshot analysis
- Assistive map generation
- Existing PDF/Excel/report UI

### Raawi Agent Mode

New mode focused on how a screen reader-style auditor experiences the page.

- Keyboard navigation
- Accessibility tree reading
- Landmark and heading exploration
- Forms, dialogs, menus, and dynamic update probes
- Image meaning and alt-text judgment
- Task-based flows for common page types
- AI-assisted trace interpretation and UX judgment

## Authenticated Scanning Model

Authenticated scanning should be a shared foundation used by both classic mode and Raawi agent mode.

Authentication belongs primarily to the website/property settings, not only to the scan popup.

Recommended product model:

- Website/property owns reusable authentication profiles.
- Scan popup lets the user choose public access or a saved authentication profile.
- Scanner logs in before discovery.
- Discovery and selected-page scanning reuse the same authenticated browser session.
- Reports show safe authentication metadata without exposing credentials.

Initial authentication methods:

- Public access
- Saved login form
- Manual verification checkpoint
- Manual login session capture

Future authentication methods:

- Cookie/session import
- Basic auth/header auth
- Step-based scripted login builder
- Multiple role profiles per website

Required auth profile fields:

- profile name
- login URL
- username selector
- encrypted username
- password selector
- encrypted password
- submit selector
- success URL prefix
- success selector
- extra headers
- active/inactive state
- session reuse enabled

Optional verification fields:

- verification required
- verification type: `code`, `external_approval`, or `manual_step`
- verification code selector
- verification submit selector
- verification success selector
- verification prompt hint
- verification timeout

Human-in-the-loop verification flow:

1. Scanner opens login page.
2. Scanner fills saved credentials.
3. Scanner submits login form.
4. If a verification challenge appears, scan status becomes `waiting_for_verification`.
5. UI asks the user for the code or external approval.
6. User submits the code or confirms approval.
7. Scanner completes login and verifies success.
8. Scanner saves Playwright storage state.
9. Discovery and scanning continue with the authenticated session.

Verification principles:

- OTP/check codes are never stored.
- OTP/check codes are never logged.
- OTP/check codes are never included in reports.
- The waiting state must expire automatically.
- Users can cancel the scan during verification.

Suggested auth events:

- `auth_started`
- `auth_verification_required`
- `auth_verification_submitted`
- `auth_succeeded`
- `auth_failed`

Suggested auth scan statuses:

- `authenticating`
- `waiting_for_verification`
- `auth_failed`

Suggested environment variables:

- `AUTH_CREDENTIAL_ENCRYPTION_KEY`
- `AUTH_VERIFICATION_TIMEOUT_MS`

Security requirements:

- Disable stored credential profiles if encryption key is missing.
- Encrypt credentials at rest.
- Never return stored secrets to the frontend.
- Redact auth values from logs and exports.
- Audit auth profile creation, update, use, success, and failure.
- Scope auth profiles to a property/website and authorized users.

Report metadata should include:

- authenticated scan: yes/no
- auth profile name
- login result
- verification used: yes/no
- credentials included: never

## Reporting Taxonomy

Use `categories-and-subcategories.md` as the reporting source of truth.

Report categories:

- Images
- Content
- Color & Contrast
- Keyboard & Navigation
- Forms & Inputs
- Multimedia
- Touch & Mobile
- Structure & Semantics
- Timing & Interaction
- Assistive Technology
- Authentication & Security

Mapping principles:

- DOM findings should remain rule-first.
- Vision findings should remain image-first.
- Raawi agent findings should be categorized by user impact and task failure.
- Every finding should map into one category and one subcategory.

## Shared Issue Schema

All scan modes should write findings using one normalized issue model.

Required fields:

- `issueCode`
- `issueTitle`
- `result`
- `severity`
- `category`
- `subcategory`
- `pageUrl`
- `pageNumber`
- `mode`
- `layer`
- `comments`
- `traceStep`
- `actionTaken`
- `observedState`
- `accessibleName`
- `role`
- `selectorHint`
- `artifactPath`

Recommended fields:

- `wcagId`
- `source`
- `confidence`
- `evidenceSummary`
- `recommendedFix`
- `taskName`
- `pageType`

## Evidence Strategy

No media capture is required.

Evidence should be text-first and reproducible:

- issue code
- page URL
- page number
- action taken
- observed state
- focus state
- role and accessible name
- selector hint
- trace step number
- artifact path
- comments

Suggested artifact layout:

- `output/<scanId>/pages/<pageNumber>/dom-summary.json`
- `output/<scanId>/pages/<pageNumber>/vision-summary.json`
- `output/<scanId>/pages/<pageNumber>/assistive-map.json`
- `output/<scanId>/pages/<pageNumber>/raawi-agent/trace.json`
- `output/<scanId>/pages/<pageNumber>/raawi-agent/issues.json`
- `output/<scanId>/pages/<pageNumber>/raawi-agent/page-summary.json`

## Report Shape

Every report should present:

- scan mode
- page summary
- category/subcategory breakdown
- issue table
- per-page trace
- evidence references
- comments
- final summary

Recommended report views:

1. Executive summary
2. Category summary
3. Page-by-page results
4. Evidence and trace details
5. Recommendation summary

## Naming Decision

The current codebase already uses `scanMode` for crawl scope, with values like `domain` and `single`.

Use `auditMode` for the new scan type:

- `classic`
- `raawi-agent`

This avoids mixing crawl scope with audit methodology.

## Phase 0 - Planning and Schema

Status: done

### Work

- Define `auditMode: classic | raawi-agent`.
- Define normalized issue schema.
- Add taxonomy mapping for categories and subcategories.
- Define evidence field conventions.
- Define artifact path conventions.

### Exit Criteria

- A single schema exists for findings from all layers.
- A scan can be tagged with a mode.
- The taxonomy mapping is documented and agreed.

## Phase 1 - Audit Mode Plumbing

Status: done

### Work

- Add mode selection to the scan UI.
- Pass audit mode through the API and job queue.
- Persist audit mode on the scan record.
- Keep classic mode as the default.
- Ensure exports and dashboards show the active mode.

### Exit Criteria

- Users can choose classic mode or Raawi agent mode.
- The selected mode persists across the scan lifecycle.

## Phase 2 - Raawi Agent v1

Status: largely done

### Work

- Extend the current interaction agent instead of replacing it.
- Collect accessibility-tree snapshots.
- Read headings, landmarks, controls, ARIA state, and focus order.
- Add task playbooks for:
  - navigation
  - forms
  - dialogs
  - menus
  - dynamic updates
  - images
  - authentication
- Produce structured traces per page.
- Generate page-level comments that explain the UX impact.

### Exit Criteria

- Raawi agent can explain what it tried to do on a page.
- Raawi agent can produce trace artifacts and structured findings.

## Phase 3 - AI Planning and Interpretation

Status: partially done

### Work

- Use AI to interpret the trace and propose the next action.
- Keep browser actions bounded and deterministic where possible.
- Use AI for:
  - page-type inference
  - flow selection
  - trace interpretation
  - UX judgment
  - report summarization
- Keep the current OpenAI analyst style, but expand it from enrichment into a stronger reasoning layer.

### Exit Criteria

- Raawi agent can reason about page flow, not just tab order.
- Findings include comments that describe why the experience helps or blocks task completion.

## Phase 4 - Authenticated Scanning Foundation

Status: largely done

### Work

- Add authentication profiles to website/property settings.
- Store credentials securely with encrypted fields.
- Add a login test action.
- Add auth profile selection to the scan popup.
- Perform login before discovery.
- Reuse authenticated browser storage state during discovery and scan capture.
- Add OTP/manual verification checkpoints.
- Add manual login session capture for complex portals.
- Add safe auth metadata to reports.

### Exit Criteria

- Classic scans can discover and scan authenticated pages.
- Raawi agent scans can use the same authenticated session.
- OTP/check-code flows pause the scan and resume after user input.
- Reports identify authenticated scans without exposing secrets.

## Phase 5 - Unified Reporting

Status: largely done

### Work

- Merge classic and Raawi agent findings into one report model.
- Add issue code, category, subcategory, and artifact path to reports.
- Update dashboard tables and page detail panels.
- Update PDF and Excel exports.
- Add a comparison section so users can see:
  - DOM findings
  - vision findings
  - Raawi agent findings
  - assistive map output

### Exit Criteria

- PDF and Excel reports contain the Raawi agent section and evidence references.
- The dashboard clearly separates technical findings and Raawi agent findings.

## Phase 6 - Validation and Calibration

Status: not started

### Work

- Build a benchmark set of pages:
  - content pages
  - forms
  - menus
  - modals
  - media pages
  - authentication pages
  - dynamic content pages
- Compare Raawi agent results with known outcomes.
- Tune thresholds and task playbooks.
- Reduce noise and duplicate findings.

### Exit Criteria

- Raawi agent produces stable, useful findings on the benchmark set.
- False positives and missed issues are documented and reduced.

## Phase 7 - Release and Rollout

Status: partially done

### Work

- Release Raawi agent behind a feature flag.
- Keep classic mode stable and unchanged.
- Update admin UI wording and help text.
- Update exports, summaries, and documentation.
- Add rollout checks and regression validation.

### Exit Criteria

- Both modes can run independently.
- Reports are clear, consistent, and production-ready.

## Recommended Report Columns

For the unified issue table, use:

- Service Name
- Issue Code
- Issue Title
- Result
- Severity
- Category
- Subcategory
- Page URL
- Comments
- Evidence / Artifact Path

## Recommended Quality Rules

- Never hide the layer or mode that produced the issue.
- Never merge different issue types into one row.
- Prefer short, direct evidence references over long narrative text.
- Keep comments human-readable and auditor-friendly.
- Treat the Raawi agent as a complement to the classic audit, not a replacement.

## Open Questions

- Should Raawi agent be a separate scan mode or an optional layer inside classic mode?
- Should issue codes be global across the system or generated per scan mode?
- Should the report prioritize category grouping or page grouping first?
- Which task playbooks should ship in the first Raawi agent release?
- Should OTP handling ship before manual login session capture, or should both ship together?
- Should auth profiles support multiple roles per website in the first release?

## Suggested First Delivery

1. Scan mode plumbing.
2. Shared issue schema and taxonomy mapping.
3. Raawi agent trace artifacts.
4. Authenticated scanning foundation.
5. Unified dashboard and export reporting.
6. Validation against benchmark pages.

## Sprint-By-Sprint Checklist

### Sprint 1 - Foundation and Audit Mode Selection

Priority: highest

Owner focus:

- Scanner backend
- Report UI

Deliverables:

- Add `auditMode` to scan start payloads and persistence.
- Surface mode selection in the scanner popup and scan detail views.
- Keep classic mode as the default.
- Introduce a shared issue schema in the scanner contracts.
- Add the taxonomy map derived from `categories-and-subcategories.md`.

Checklist:

- [x] Add `auditMode` to API requests and database records.
- [x] Add mode selector in the scan popup.
- [x] Persist scan mode in summary and detail responses.
- [x] Normalize issue fields for all report layers.
- [x] Add issue code format and artifact path conventions.

### Sprint 2 - Raawi Agent Trace Engine

Priority: highest

Owner focus:

- Scanner agent layer
- Crawler/page capture

Deliverables:

- Extend the interaction agent with accessibility-tree reading.
- Add task playbooks for common page types.
- Capture trace artifacts per page.
- Emit structured comments and evidence summaries.

Checklist:

- [x] Read headings, landmarks, roles, and accessible names.
- [x] Capture focus order and page context.
- [x] Add modal, menu, form, and navigation playbooks.
- [x] Store trace JSON and issue JSON per page.
- [x] Add page-type inference for task selection.

### Sprint 3 - AI Planning and Interpretation

Priority: high

Owner focus:

- Agent reasoning
- OpenAI integration

Deliverables:

- Use AI to choose the next meaningful test step.
- Use AI to interpret traces into audit-ready findings.
- Keep browser actions bounded and safe.

Checklist:

- [ ] Add planning prompts for page-type-based exploration.
- [x] Add trace interpretation prompts.
- [x] Keep deterministic fallback behavior when AI is unavailable.
- [x] Expand current OpenAI analyst flow for Raawi agent reasoning.
- [ ] Log AI decisions separately from raw trace events.

### Sprint 4 - Authenticated Scanning Foundation

Priority: high

Owner focus:

- Scanner backend
- Report UI
- Database/security

Deliverables:

- Add reusable authentication profiles to website/property settings.
- Add encrypted credential storage.
- Add auth profile selection to the scanner popup.
- Login before discovery and reuse the authenticated session for capture.
- Add human-in-the-loop verification for OTP/check-code flows.

Checklist:

- [~] Add auth profile schema and encrypted secret fields.
- [x] Add backend auth profile CRUD and test-login endpoint.
- [x] Add website settings UI for auth profiles.
- [x] Add scan popup auth selection: public scan or saved profile.
- [x] Save and reuse Playwright storage state for authenticated sessions.
- [~] Add `waiting_for_verification` scan status.
- [x] Add OTP/check-code submission endpoint.
- [ ] Add external approval/manual-step checkpoint.
- [x] Ensure OTP/check-code values are never logged or stored.
- [x] Add safe auth metadata to PDF/Excel/dashboard reports.

### Sprint 5 - Unified Reporting

Priority: high

Owner focus:

- Report UI
- PDF export
- Excel export

Deliverables:

- Merge classic and Raawi agent outputs into one report model.
- Add category/subcategory grouping.
- Add comments and evidence links.
- Make reports easy to compare and audit.

Checklist:

- [x] Add unified issue tables in dashboard pages.
- [x] Add Raawi agent sections to PDF and Excel exports.
- [~] Show `issueCode`, `category`, `subcategory`, `comments`, and `artifactPath`.
- [x] Add mode comparison summaries.
- [x] Keep classic findings and Raawi findings separate but comparable.

### Sprint 6 - Calibration and Benchmarking

Priority: medium-high

Owner focus:

- QA / validation
- Scanner backend

Deliverables:

- Benchmark a representative page set.
- Measure missed issues and noisy results.
- Tune task playbooks and AI prompts.

Checklist:

- [ ] Build benchmark pages for forms, menus, dialogs, content, and media.
- [ ] Compare results across classic and Raawi modes.
- [ ] Reduce duplicate or low-value findings.
- [ ] Add regression checks for known tricky pages.
- [ ] Document gap cases and follow-up work.

### Sprint 7 - Rollout and Hardening

Priority: medium

Owner focus:

- Release and documentation
- Operations

Deliverables:

- Ship Raawi agent behind a feature flag.
- Update documentation and user-facing help.
- Add rollout checks and fallback behavior.

Checklist:

- [ ] Add feature flag controls for Raawi mode.
- [~] Update docs and report descriptions.
- [~] Add operational logs and failure fallbacks.
- [~] Verify both scan modes can run independently.
- [~] Prepare Coolify deployment notes and regression checklist.

## Component Ownership Map

- `apps/scanner/src/agent/*` - Raawi agent trace engine and AI planning.
- `apps/scanner/src/api/*` - scan mode plumbing and report data APIs.
- `apps/scanner/src/crawler/auth-helper.ts` - authenticated login and session capture.
- `apps/scanner/src/db/*` - persistence for mode, traces, and normalized issues.
- `apps/scanner/src/services/*` - PDF and Excel reporting.
- `apps/report-ui/src/pages/*` - dashboard and scan detail presentation.
- `apps/report-ui/src/components/*` - scan popup, auth profile management, and verification prompts.
- `categories-and-subcategories.md` - taxonomy mapping source.

## Dependency Order

1. Data contract and taxonomy.
2. Scan mode plumbing.
3. Raawi trace engine.
4. AI planning and interpretation.
5. Authenticated scanning foundation.
6. Unified reporting.
7. Validation.
8. Rollout.

## Definition Of Done

A phase is complete when:

- its new data is persisted end to end,
- the dashboard renders it correctly,
- PDF and Excel exports include it,
- and the behavior is covered by type checks or validation tests.

## Sprint 1 Detailed Execution Backlog

Sprint 1 should create the foundation without changing the behavior of classic scans.

### 1. Data Contract

Files:

- `packages/core/src/index.ts`
- `apps/scanner/src/scan-pipeline.ts`
- `apps/scanner/src/index.ts`
- `apps/scanner/src/job-queue.ts`

Work:

- Add `AuditMode = 'classic' | 'raawi-agent'`.
- Add `auditMode?: AuditMode` to scan start request types.
- Default missing audit mode to `classic`.
- Keep existing crawl `scanMode: 'domain' | 'single'` untouched.
- Add validation so unknown values fail fast with a clear API error.

Acceptance:

- Existing scan requests without `auditMode` still run as classic.
- New requests with `auditMode: 'raawi-agent'` are accepted and passed through the job.

### 2. Database Persistence

Files:

- `apps/scanner/prisma/schema.prisma`
- `apps/scanner/src/db/scan-repository.ts`
- `apps/scanner/src/api/scan-detail.ts`
- `apps/scanner/src/api/pdf-export.ts`
- `apps/scanner/src/services/excel-report-generator.ts`

Work:

- Add `auditMode String @default("classic")` to `Scan`.
- Add an index if scan filtering by mode is needed later.
- Persist `auditMode` during scan creation and update paths.
- Return `auditMode` in scan detail responses.
- Include audit mode in PDF/Excel metadata.

Acceptance:

- Every new scan row has `auditMode`.
- Existing scans migrate cleanly to `classic`.
- Scan detail API exposes the mode.

### 3. UI Mode Selection

Files:

- `apps/report-ui/src/components/ScanMonitorModal.tsx`
- `apps/report-ui/src/pages/ScanDetailPage.tsx`
- `apps/report-ui/src/i18n/locales/en.json`
- `apps/report-ui/src/i18n/locales/ar.json`

Work:

- Add a small audit mode selector near scan options.
- Label options:
  - `Classic audit`
  - `Raawi agent`
- Classic mode keeps current layer toggles.
- Raawi agent mode enables analysis agent by default.
- Show selected audit mode in the scan details header or summary area.

Acceptance:

- User can start either mode from the UI.
- Existing layer toggles still behave as expected.
- The scan detail page clearly shows which audit mode produced the report.

### 4. Normalized Issue Schema

Files:

- `apps/scanner/src/utils/report-taxonomy.ts`
- `apps/scanner/src/utils/normalized-issue.ts`
- `apps/scanner/src/api/scan-detail.ts`
- `apps/scanner/src/api/pdf-export.ts`
- `apps/scanner/src/services/excel-report-generator.ts`

Work:

- Add taxonomy constants from `categories-and-subcategories.md`.
- Add `NormalizedIssue` interface.
- Add helper functions:
  - `createIssueCode`
  - `mapWcagFindingToTaxonomy`
  - `mapAgentFindingToTaxonomy`
  - `mapVisionFindingToTaxonomy`
- Start with mappings for current known WCAG IDs and agent issue kinds.

Acceptance:

- Existing findings can be transformed into normalized issues.
- Unmapped findings fall back to a sensible category with a warning-friendly code.

### 5. Report Output Foundation

Files:

- `apps/report-ui/src/pages/ScanDetailPage.tsx`
- `apps/scanner/src/templates/report-template.html`
- `apps/scanner/src/api/pdf-export.ts`
- `apps/scanner/src/services/excel-report-generator.ts`

Work:

- Add placeholders for unified issue rows.
- Include `Issue Code`, `Category`, `Subcategory`, `Comments`, and `Evidence / Artifact Path`.
- Keep existing report sections until the unified view is fully validated.

Acceptance:

- PDF and Excel can include normalized issue metadata without breaking existing exports.
- Dashboard can display normalized issue rows behind a feature flag or quiet initial section.

### 6. Verification

Commands:

- `pnpm --filter @raawi-x/scanner build`
- `pnpm --filter @raawi-x/report-ui build`

Note:

- The current `type-check` scripts use `tsc -b --noEmit`, which conflicts with referenced package configs that already control emit behavior. Use package builds for Sprint 1 verification unless the project-reference configs are adjusted.

Manual checks:

- Start a classic scan.
- Start a Raawi agent scan.
- Confirm both scans persist `auditMode`.
- Confirm scan detail displays audit mode.
- Export PDF and Excel for both modes.

### Sprint 1 Commit Scope

Recommended commit:

- `Add audit mode foundation`

Include:

- schema change
- request/API plumbing
- UI selector
- basic normalized issue utilities
- report metadata fields

Do not include:

- full Raawi agent behavior
- AI planning
- new task playbooks
- report redesign beyond required fields
