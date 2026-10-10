# Raawi X — Phase 1: Baseline Verification and Migration Design

## 1. Verified Repository Baseline
* **Branch:** `feature/semantic-core`
* **Expected HEAD:** `44be598b2d6f415d344b62e14ebdbee526edfa7b`
* **Alignment:** The local repository successfully matches the expected remote deployment HEAD.
* **Working Tree:** Contains multiple generated untracked `.js`, `.d.ts`, and `.map` files (e.g., in `apps/scanner/src/api` and `test-sites`). No tracked files have been modified or deleted.
* **Build/Test Availability:** The monorepo utilizes standard `pnpm` workspace commands for linting, type-checking, and building components.

## 2. Existing Schema and API Contracts
* **Prisma Schema (`apps/scanner/prisma/schema.prisma`):** 
  * The `Scan` model uses `id` (UUID), `scanId` (e.g., `scan_1234`), `seedUrl`, `status`, `startedAt`, `completedAt`, `createdAt`, and `updatedAt`. 
  * It lacks a native `name` field and an explicit `canceledAt` timestamp field.
* **API Contracts:** 
  * `/api/scans/:scanId/init` and `/api/scans/start` currently do not accept a `name` payload.
  * `/api/scans/:scanId/cancel` currently mutates `completedAt = new Date()` (via `scanRepository.updateScanStatus(scanId, 'canceled', new Date())`).

## 3. Proposed Migration Designs
* **`Scan.name` Migration (Phase 3):**
  * **Design:** Add `name String?` to the `Scan` model.
  * **Behavior:** Backend API endpoints will accept an optional `name` string. If omitted, the frontend provides a generated default string (e.g., `domain - date`). 
  * **Backward Compatibility:** Nullable schema change ensures historical scans do not fail. For rendering, the UI will fall back to `scan.name || scan.scanId` or dynamically derive it for old records.
* **`Scan.canceledAt` Migration (Phase 2):**
  * **Design:** Add `canceledAt DateTime?` to the `Scan` model.
  * **Behavior:** The `/cancel` API endpoint will populate this field and leave `completedAt` as `null`.
  * **Backward Compatibility:** Historical canceled scans lacking `canceledAt` can be visually rendered using `updatedAt`, while analytics correctly exclude them from "completed" datasets.

## 4. Scan Lifecycle Architecture and Failure Modes
* **Discovery Detachment:** In `apps/scanner/src/index.ts` (`/api/scans/:scanId/discover`), the discovery process runs as `discovery.discover().catch(...)`. This is a detached background promise in Node.js, entirely bypassing the durable BullMQ worker queue system.
* **Failure Modes:** If the Node process restarts, crashes, or goes out of memory during discovery, the background promise is lost. Because BullMQ does not track this task, there are no retries, no stalled-job recoveries, and no state machine transitions, permanently orphaning the scan in the `discovering` status.
* **Cancellation Races:** A cancellation request executed simultaneously with the end of a stalled page-scan job can result in race conditions where a worker incorrectly overwrites a `canceled` status with `completed`.
* **Design Plan:** Refactor `/api/scans/:scanId/discover` to enqueue a `discovery` BullMQ job. The existing queue infrastructure supports this integration safely without structural refactoring.

## 5. Security Audit Findings: `VITE_API_KEY`
* **Observation:** The string `VITE_API_KEY` is referenced in `apps/report-ui/Dockerfile` (as an `ARG`/`ENV`), `vite-env.d.ts`, and `apps/report-ui/src/App.tsx` (line 66: `apiKey={import.meta.env.VITE_API_KEY || ...}`).
* **Exposure Risk:** Because the key is prefixed with `VITE_`, Vite inherently compiles it into the public JavaScript bundle shipped to the browser.
* **Permissions & Sensitivity:** The documentation (`COOLIFY_SETUP.md`) states this key is used for the legacy `ScanDashboard` route. However, the exact backend permissions associated with this specific API key and its ultimate sensitivity remain **unknown** until a full backend access-control audit is completed.
* **Remediation Plan:** Do not modify or rotate the key at this stage until the permissions scope is definitively verified.

## 6. Proposed Local/Test Database Validation
* **Validation Target:** A dedicated local PostgreSQL container configured strictly via a local `.env.test` file.
* **Procedure:** 
  1. Boot the test database container.
  2. Apply `prisma migrate dev` containing the nullable `name` and `canceledAt` fields.
  3. Seed the database with mock "legacy" scans lacking `name` and `canceledAt`.
  4. Run integration tests to ensure the API safely handles reading legacy records alongside newly named/canceled scans.

## 7. Required Tests
* **Unit Tests:** Name generation/validation logic; `compareNormalizedIssues` sorting functions.
* **Integration Tests:** BullMQ discovery job idempotency; API endpoints properly mutating `canceledAt` while preserving `completedAt`.
* **Regression Tests:** Evidence rendering on historical scans without breaking UI parsing; legacy scans rendering fallback names.
* **Runtime Acceptance:** Start a scan, intentionally kill the worker process during discovery, and confirm BullMQ recovers the stalled job upon restart.

## 8. Explicit Assumptions and Blockers
* **Blocker (Production validation):** Direct schema/migration application against the production database is strictly prohibited in this phase.
* **Assumption (Backend Version):** While the frontend deployment commit is verified, the backend deployment commit on the production VPS remains unverified.
* **Assumption (BullMQ Job Isolation):** Expanding BullMQ usage for discovery assumes that concurrent discovery jobs will not exhaust the concurrency limits assigned to core scanner rules.

## 9. Recommended Implementation Sequence
* **Phase 2 (Lifecycle & Queues):** Apply the `canceledAt` migration locally. Refactor the discovery endpoint to use BullMQ jobs. Fix the cancellation mutation logic. Implement and run integration tests for discovery crashes.
* **Phase 3 (Scan Name):** Apply the `Scan.name` migration locally. Implement backend validation, frontend name-generation UI fallbacks, and rendering updates across all lists and exports.
