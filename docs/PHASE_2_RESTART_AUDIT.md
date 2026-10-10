# Phase 2 Restart Audit: Scan Lifecycle Reliability

## A. Current Repository and Working-Tree Inventory
- **Branch:** `feature/semantic-core`
- **HEAD Commit:** `fc174f5` (Hotfix 3)
- **Staged Changes:** None.
- **Unstaged Modified Files (Phase 2):**
  - `apps/scanner/package.json` (Added `bullmq`, `ioredis`)
  - `apps/scanner/prisma/schema.prisma` (Added `canceledAt` to `Scan`)
  - `apps/scanner/src/api/scan-detail.ts` (Modified cancel endpoint to avoid overwriting terminal states)
  - `apps/scanner/src/db/scan-repository.ts` (Introduced race-safe `updateMany` for status changes)
  - `.gitignore`, `pnpm-lock.yaml`, `SEMANTIC_ENGINE_IMPLEMENTATION_PLAN.md`
- **Untracked Files:** Numerous `.js`, `.d.ts`, and `.map` artifacts, test configurations (`infra/docker-compose.test.yml`, `.env.test.example`).
- **Migrations:** No Prisma migration exists yet for the `canceledAt` field.

## B. Confirmed Implementation Behavior
A thorough inspection of `apps/scanner/src/job-queue.ts` and `apps/scanner/src/index.ts` reveals the following current behaviors:
- **In-Memory Volatility:** The system relies entirely on an in-memory queue (`this.queue: Job[]`, `this.running = new Set()`).
- **Crash Recovery (None):** If the Node.js scanner process crashes, restarts, or deploys, all jobs currently in memory are permanently lost. The database will show them as "queued" or "running", but no worker will ever pick them up.
- **Concurrency & Ownership:** Handled purely by a local Javascript `Set` size check (`this.running.size < config.maxConcurrentScans`). This prevents scaling beyond a single Node process.
- **Retries & Duplicates:** Idempotency exists for completed scans (`report.json`), but there is no mechanism for automatic retries of failed page captures or crashed discovery jobs.
- **Cancellation:** Works cleanly via `pageCapture.close()` and memory set deletion, but it relies on finding the job in the volatile `activePageCaptures` map.
- **Race Conditions:** Partially mitigated by the recent Phase 2 change to `ScanRepository.updateScanStatus`, which uses `updateMany` to prevent overwriting terminal states (`completed`, `failed`, `canceled`).

## C. Existing Phase 2 Changes Evaluation
- **Correct:** The race-safe `updateMany` approach in `scan-repository.ts` is robust and perfectly isolates the database from concurrent terminal transitions.
- **Incomplete/Risky:** 
  - `canceledAt` is in `schema.prisma`, but no migration has been generated. The application will crash if it attempts to write to this column.
  - `bullmq` and `ioredis` were added to `package.json`, but `job-queue.ts` was never rewritten to use them.

## D. Recommended Queue Architecture
**Is BullMQ justified? Yes, absolutely.**
Given the severe volatility of the current in-memory queue, BullMQ is the correct architectural choice.
- **Redis:** Provides the persistent memory layer for active jobs, preventing loss during deployments/crashes.
- **PostgreSQL:** Remains the source of truth for UI states and long-term storage.
- **BullMQ:** Handles the precise requirements out-of-the-box:
  - **Durable jobs:** Jobs survive Node crashes.
  - **Clear worker ownership:** Built-in lock mechanisms.
  - **Controlled concurrency:** Handled securely across potential multi-instance scaling.
  - **Retry semantics:** Native backoff and retry support.
  - **Cancellation propagation:** Native `job.remove()` and `job.cancel()`.
- **Proposed Architecture:** The `JobQueue` class should be refactored into a `BullMQWorker` (to process jobs) and a `BullMQQueue` (to add jobs). The API (`index.ts`) submits jobs to BullMQ. BullMQ controls the concurrency and safely executes the crawling functions.

## E. Safe Test-Environment Status & Blockers
**Status:** BLOCKED / UNAVAILABLE LOCALLY
- **Evidence of Isolation:** `infra/docker-compose.test.yml` and `.env.test.example` were established to run a disposable Postgres (`port 5433`) and Redis (`port 6380`) instance, ensuring complete isolation from production (`raawi_x` database).
- **Blocker:** Local Docker execution is currently unavailable in this environment.
- **Minimum Owner Action Required:** The project owner must either:
  1. Authorize provisioning of a remote disposable testing Postgres database and Redis instance (e.g., via Coolify or a cloud provider) and provide the credentials securely.
  2. Or, execute the integration tests locally on their own machine where Docker is available, before merging the implementation.
**I will not proceed with applying migrations or destructive tests until an isolated test connection is explicitly provided and validated.**

## F. Test Matrix and Execution Order
Before deploying the queue rewrite, the following tests must pass in the isolated environment:
1. **Queue Persistence:** Submit a scan. Terminate the Node process abruptly. Restart. Verify the worker automatically resumes or safely transitions the job.
2. **Cancellation (Queued):** Submit a scan, instantly call cancel. Verify BullMQ removes it and DB says `canceled`.
3. **Cancellation (Running):** Cancel a running scan. Verify Playwright closes immediately, DB says `canceled` with a valid `canceledAt`, and BullMQ reports the job as terminated.
4. **Race-Condition Protection:** Concurrently fire `completed` and `canceled` database updates. Verify only the first one wins and the terminal state is never overwritten.
5. **Concurrency Limit:** Submit 10 scans. Verify exactly `maxConcurrentScans` run simultaneously via BullMQ metrics.

## G. Minimal Dependency-Aware Implementation Sequence
1. **Migration (Pending Test Env):** Run `prisma migrate dev --name add_canceled_at` in the isolated environment.
2. **BullMQ Infrastructure:** Implement `src/queue/redis-client.ts`, `src/queue/scan-queue.ts`, and `src/queue/scan-worker.ts`.
3. **API Integration:** Refactor `index.ts` to submit jobs to the new BullMQ queue instead of the old `JobQueue`.
4. **Lifecycle Porting:** Move `runSequentialPages` logic into the BullMQ worker processor.
5. **Testing Phase:** Run the test matrix against the isolated environment.

## H. Explicit Risks Requiring Owner Approval
- **Test Environment:** I cannot safely execute tests without a validated isolated Redis and Postgres instance. If Docker remains unavailable, the owner must provide remote disposable test credentials.
- **Prisma Migration:** The `canceledAt` migration must be applied before any code interacts with it, meaning the testing database must be spun up first.
