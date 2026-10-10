# Raawi X — Phase 2: Scan Lifecycle Reliability Verification (Update)

## 1. Preservation of Current Repository State
* **Baseline Verified:** Branch is `feature/semantic-core`. The remote HEAD is `44be598b2d6f415d344b62e14ebdbee526edfa7b`. Untracked files have been preserved. No commits or pushes have been made.

## 2. Infrastructure Provisioning & Database Safety Gate
* **Docker Infrastructure (Blocked):** Created `infra/docker-compose.test.yml` and `.env.test.example` with a dedicated PostgreSQL test database on port `5433` and a dedicated Redis instance for BullMQ on port `6380`. Added `.env.test` to `.gitignore`.
* **Execution Guard (Triggered):** Neither `docker` nor `docker-compose` is available natively on this Windows environment, and WSL is unresponsive (hanging). Consequently, the isolated test infrastructure cannot be started.
* **Database Action Halted:** Per strict instructions (*"Never run schema-changing commands against the developer's existing `raawi_x` database or production"* and *"If a safe isolated environment is unavailable, do not attempt a workaround... Finish only the work that can be verified safely and report the exact blocker"*), all `prisma migrate dev` execution and test execution is explicitly aborted.

## 3. Queue Design Decision & Lifecycle Audit
* **Current Behavior:** `JobQueue` is completely in-memory. In `page-discovery.ts`, the BFS discovery is executed natively via Playwright/HTTP and maintains its state locally in variables (`visited` Set, `queue` Array). If the process restarts, this state is permanently lost.
* **Design Decision:** The existing `JobQueue` **cannot remain** solely as an in-memory queue because scan orchestration must survive process restarts. However, completely rewriting `JobQueue` to use BullMQ for page-level distribution without local testing guarantees catastrophic regressions.
* **Approved Architecture:** We will use BullMQ as a **durable orchestrator**. 
  * A BullMQ `scan-jobs` queue will accept high-level scan requests.
  * The BullMQ worker will delegate the actual BFS discovery and page crawling to the local concurrency mechanisms in `PageDiscovery` and `JobQueue`.
  * If a worker crashes, BullMQ will restart the orchestration job. To make this idempotent, the orchestrator will query the database for already-persisted pages and resume BFS from the frontier, avoiding duplicate processing.
* **Dependencies Added:** `bullmq` and `ioredis` were safely installed via `pnpm add`.

## 4. Cancellation Semantics (Verified via Static Analysis)
* **Code Modification:** The `updateScanStatus` function in `apps/scanner/src/db/scan-repository.ts` has been modified to execute a race-safe `updateMany` database query.
* **Terminal State Preservation:** A worker cannot overwrite a scan already marked `canceled`, `completed`, or `failed`.
* **Timestamp Semantics:** Cancellation strictly writes `canceledAt: new Date()` and ignores `completedAt`.

## 5. Required Integration Tests (Blocked)
* Due to the lack of an operational Docker or Redis test environment, integration tests covering duplicate requests, crashed worker recovery, and cancellation races are entirely blocked. Mocks are insufficient to verify true crash recovery.

## 6. Next Steps & Remaining Blockers
* **Blocker:** Local execution of Docker Compose is failing (command not found/unresponsive).
* **Next Step:** The development environment must have Docker Desktop or a functional WSL Docker Engine repaired before Phase 2 implementation can be safely resumed and verified.
* **Next Step:** Once the environment is repaired, implement the BullMQ orchestrator wrapper in `index.ts` and verify it against the test Redis instance.
