# Phase 4 Discovery: Authenticated Scanning Hooks & Journey Runner Integration

## 1) ScanAuthProfile usage

### Where it’s defined (Prisma)

- **File:** `apps/scanner/prisma/schema.prisma`
- **Model:** `ScanAuthProfile` (lines 76–101)
  - `propertyId` (unique, relation to Property)
  - `authType`: `"none" | "cookie" | "scripted_login"`
  - `loginUrl`, `successUrlPrefix`, `successSelector`
  - `usernameSelector`, `passwordSelector`, `submitSelector`
  - `usernameValue`, `passwordValue` (stored; TODO encrypt)
  - `postLoginSeedPaths` (Json, string[])
  - `extraHeaders` (Json), `isActive`, `lastTestedAt`, `lastTestResult`, `lastTestError`

### Where it’s read from DB

- **File:** `apps/scanner/src/db/auth-profile-repository.ts`
  - `getByPropertyId(propertyId)`: `prisma.scanAuthProfile.findUnique({ where: { propertyId } })` (lines 44–72)
  - Returns `AuthProfileData`; credentials returned as-is (decrypt TODO).
- **File:** `apps/scanner/src/job-queue.ts`
  - In `executeJob` (lines 514–554): reads `(job.request as any).propertyId || (job.request as any).authProfileId`
  - If `propertyId` present: `authProfileRepository.getByPropertyId(propertyId)` (line 520)
  - If profile exists, `authType === 'scripted_login'` and `isActive`: calls `performLoginAndSaveState(authProfile, outputDir, scanId)` (line 525)
  - Later (lines 562–573): loads auth profile again and attaches to `crawlerRequest.authProfile` for the crawler.

### Where it’s applied in crawling / page navigation

- **Login and storage state (before any page capture):**
  - **File:** `apps/scanner/src/crawler/auth-helper.ts`
    - `performLoginAndSaveState(profile, outputDir, scanId)` (lines 103–201): launches Chromium, creates context, sets `profile.extraHeaders` via `context.setExtraHTTPHeaders`, goes to `profile.loginUrl`, fills username/password, clicks submit, waits for success (URL prefix or selector), then `context.storageState()` and writes to `join(outputDir, scanId, 'auth-storage-state.json')`.
    - `loadStorageState(storageStatePath, browser)` (lines 206–224): reads JSON, `browser.newContext({ storageState })`.
- **PageCapture uses storage state:**
  - **File:** `apps/scanner/src/crawler/page-capture.ts`
    - Constructor (lines 25–28): `constructor(scanId?: string, storageStatePath?: string)`.
    - `initialize()` (lines 38–47): if `this.storageStatePath` and no context, calls `loadStorageState(this.storageStatePath, this.browser)` and uses that context; else `browser.newContext()`. All subsequent pages use this context (line 64: `this.context.newPage()`).
- **BFS crawler uses auth profile only for seeding:**
  - **File:** `apps/scanner/src/crawler/bfs-crawler.ts` (lines 122–154)
    - Reads `(request as any).authProfile`. If `authProfile?.postLoginSeedPaths` is an array, resolves each path against seed origin and **unshifts** those URLs onto the queue with `source: 'post_login_seed'`. No cookie injection or custom scripts here.

**Summary:** Auth is applied by (1) running scripted login once in `executeJob` and saving storage state, (2) passing `storageStatePath` into `PageCapture`, which loads that state in `initialize()` and uses it for every `capturePage`. Cookie auth (`authType === 'cookie'`) is **not** implemented anywhere; only `scripted_login` is.

---

## 2) Scan execution entry points and call chain

### Entry points

- **New scan:** `POST /api/scans` (or similar) → `jobQueue.addJob(req.body)` → job pushed to queue; `processQueue()` eventually runs `executeJob(job, logger)`.
- **Existing scan (e.g. after discovery):** `jobQueue.addJobForExistingScan(scanId, req.body)` → job with same `scanId` and optional `selectedUrls` pushed; `processQueue()` → `executeJob`.
- **External:** `POST /api/scan` (API key) → `jobQueue.addJob(req.body)`.

### Call chain: “scan requested” → “page captured”

1. **apps/scanner/src/index.ts**  
   - `POST /api/scans` or `POST /api/scan` → `jobQueue.addJob(req.body)` or `addJobForExistingScan(scanId, req.body)`.

2. **apps/scanner/src/job-queue.ts**
   - `processQueue()` (e.g. line 371): takes next job, calls `executeJob(pendingJob, logger)`.
   - **executeJob** (starts ~404):
     - Validates output dir, idempotency (report.json), cleans partial pages.
     - **Auth (513–554):** If `job.request.propertyId` (or `authProfileId`): loads `ScanAuthProfile` by `propertyId`; if `scripted_login` and active, calls `performLoginAndSaveState(...)` → sets `storageStatePath`.
     - **PageCapture (556):** `pageCapture = new PageCapture(scanId, storageStatePath)`; stored in `this.activePageCaptures.set(scanId, pageCapture)`.
     - **Crawler request (561–574):** Optionally loads auth profile again and sets `(crawlerRequest as any).authProfile = authProfile`.
     - **Branch A – Sequential (579–764):** If `(job.request as any).selectedUrls` has length:
       - For each URL: `pageCapture.capturePage(url, outputDir, pageNumber, options)` (e.g. 651).
     - **Branch B – BFS (757–763):** Else:
       - `crawler = new BFSCrawler(crawlerRequest, outputDir, pageCapture, scanId)` (760)
       - `crawlResult = await Promise.race([crawler.crawl(), timeoutPromise])` (762).
     - After crawl: `reportGenerator.generateReport(...)`, `saveReport`, `scanRepository.saveReportResults`, etc.

3. **apps/scanner/src/crawler/bfs-crawler.ts**
   - Constructor (42–157): Receives `request`, `outputDir`, `pageCapture`, `scanId`. Builds queue with seed URL, optional `seedUrls`, and **postLoginSeedPaths** from `request.authProfile`. Does **not** start browser yet.
   - **crawl()** (159–324): `await this.pageCapture.initialize()` (so storage state is loaded here); optional sitemap parse and enqueue; then while loop: dequeue batch, `processPage(url, depth, source)` for each.
   - **processPage** (383–482+): URL validation and policy checks; then **`this.pageCapture.capturePage(url, this.outputDir, pageNumber, options)`** (468). On success, extracts links and enqueues them.

4. **apps/scanner/src/crawler/page-capture.ts**
   - **initialize()** (30–48): Launches Chromium if needed; if `storageStatePath`, loads context from `loadStorageState(...)`; otherwise `browser.newContext()`.
   - **capturePage(url, outputDir, pageNumber, options)** (50+): Creates page from `this.context` (or browser), `page.goto(url, ...)`, stabilization, then HTML/screenshot/a11y/vision/agent capture and writes to `outputDir/pages/<pageNumber>/`.

**Exact order:**  
`index (addJob)` → `job-queue (processQueue → executeJob)` → [auth: `performLoginAndSaveState`] → `new PageCapture(scanId, storageStatePath)` → [BFS: `new BFSCrawler(..., pageCapture)` → `crawler.crawl()` → `pageCapture.initialize()` → loop `processPage` → `pageCapture.capturePage(...)` ] **or** [sequential: loop `pageCapture.capturePage(...)` ].

---

## 3) Existing code for storageState, cookies, auth, custom scripts

| Feature | Where | Evidence |
|--------|--------|----------|
| **storageState** | auth-helper.ts, page-capture.ts | `performLoginAndSaveState` writes `auth-storage-state.json`; `loadStorageState` reads it and creates context with `browser.newContext({ storageState })`. PageCapture constructor accepts `storageStatePath` and uses it in `initialize()`. |
| **Cookie injection** | Not implemented | `authType === 'cookie'` is in schema and API validation (`auth-profiles.ts` 102–103) but there is no code that injects cookies into a context or uses a cookie-based profile. |
| **Authenticated sessions** | Yes, via scripted_login + storage state | Login runs once in `executeJob`; same storage state is used for every page in that scan. |
| **Custom scripts before scanning** | None | No “preScan” or “beforeScan” or custom script execution before BFS or before each page. |
| **extraHeaders** | auth-helper.ts | Only in login context: `if (profile.extraHeaders) await context.setExtraHTTPHeaders(profile.extraHeaders)` (134–136) before navigating to login. Not applied to the PageCapture context used for crawling. |

---

## 4) Recommended integration point(s) for JourneyRunner

**Goals:** BFS unchanged; journeys can run **before** BFS (e.g. establish auth) and/or **after** BFS (e.g. test key flows).

### Option A – Before BFS (replace or complement scripted_login)

- **Where:** In `executeJob`, **after** the current auth block (after line ~554) and **before** `new PageCapture` (556).
- **Reasoning:** You already have a single “setup” phase (scripted login) that produces a `storageStatePath`. A “journey” that ends with “save storage state” could replace or run in addition to that. Same `PageCapture(scanId, storageStatePath)` then uses the resulting state; BFS and sequential scan unchanged.
- **Mechanism:** Run a new **JourneyRunner** with a browser/context; at the end, persist storage state to the same path (`join(outputDir, scanId, 'auth-storage-state.json')`) and pass that path into `PageCapture`. Optionally allow journey to be the only auth (no scripted_login) when a journey is configured.

### Option B – After BFS (post-crawl flows)

- **Where:** In `executeJob`, **after** `crawlResult` is obtained and **before** `reportGenerator.generateReport` (e.g. after ~789, before ~792).
- **Reasoning:** All pages are already captured; you have a single `pageCapture` (and its context) still open. Run a “post” journey (e.g. “go to /dashboard, click Orders, assertVisible table”) and optionally capture those pages or record results into the report/DB without changing how BFS or report generation works.
- **Mechanism:** Call `JourneyRunner.run(journeyConfig, pageCapture)` reusing the same browser/context; journey uses existing session (including auth from before BFS). Results can be written to a separate artifact (e.g. `journey-results.json`) or appended to scan metadata.

### Option C – Single hook “run journey” (flexible before/after)

- **Where:** Same two call sites as above, controlled by journey config (e.g. `when: 'before_crawl' | 'after_crawl'`).
- **Reasoning:** One implementation (JourneyRunner), two integration points; BFS and report generation stay as-is. Clean separation: journey is a separate step that can establish or use session and optionally produce storage state or extra artifacts.

**Recommendation:** Implement **Option C** with two hooks: (1) **before BFS:** if a “before” journey is configured for the property/site, run it and use its output storage state (if any) for `PageCapture` instead of (or in addition to) scripted_login; (2) **after BFS:** if an “after” journey is configured, run it using the same `pageCapture` (same browser/context) and save results. This keeps BFS and report generation unchanged and makes journeys deterministic and configurable per property/site.

---

## 5) Minimal Journey definition format (deterministic, no LLM)

Proposed **JSON** schema (storable per Property/Site, e.g. in DB or config):

```json
{
  "id": "optional-id",
  "name": "Login and open dashboard",
  "when": "before_crawl",
  "steps": [
    { "action": "goto", "url": "https://example.com/login" },
    { "action": "type", "selector": "#username", "text": "${env:TEST_USER}" },
    { "action": "type", "selector": "#password", "text": "${env:TEST_PASS}" },
    { "action": "click", "selector": "button[type=submit]" },
    { "action": "waitFor", "selector": "[data-dashboard]", "timeout": 5000 },
    { "action": "assertUrl", "pattern": "^https://example\\.com/dashboard" },
    { "action": "saveStorageState" }
  ]
}
```

**Step actions (minimal set):**

| action | Parameters | Notes |
|--------|------------|--------|
| `goto` | `url` | `page.goto(url, { waitUntil, timeout })`. |
| `click` | `selector` | Optional `button: "left"|"right"`. |
| `press` | `key` | e.g. `Enter`, `Tab`. |
| `type` | `selector`, `text` | Optional `clear: true`. Env substitution e.g. `${env:VAR}`. |
| `waitFor` | `selector` or `url` or `ms` | `waitForSelector` / `waitForURL` / `waitForTimeout`. `timeout` optional. |
| `assertVisible` | `selector` | Throws if not visible; optional `message`. |
| `assertUrl` | `pattern` (regex string) | Throws if current URL doesn’t match. |
| `saveStorageState` | — | Persist context storage state to path (for before_crawl). |
| `runAgentCapture` | `url?` | Optional URL; run interaction agent on current page (or given URL) and attach result to journey output. |

- **Deterministic:** No LLM; fixed sequence of Playwright actions and assertions.
- **Credentials:** Use placeholders like `${env:TEST_USER}` so real creds stay in env, not in stored journey.
- **when:** `"before_crawl"` | `"after_crawl"` to choose which hook runs the journey.

**YAML variant:** Same structure; steps as list of objects with `action` and action-specific keys.

---

## 6) Risks and mitigations

| Risk | Mitigation |
|------|------------|
| **Credentials in stored journey** | Forbid raw secrets in steps; only allow `${env:VAR}` (or similar) for type steps; validate at save time. |
| **Flakiness (selectors, timing)** | Use explicit `waitFor` and timeouts; keep assertions (assertVisible, assertUrl) so failures are fast and clear; document selector best practices. |
| **Timeouts** | Per-step timeout (e.g. 15–30s) and optional max total journey time; on timeout, fail the journey and optionally continue scan without auth (or without post-journey results). |
| **Navigation away from target host** | In JourneyRunner, enforce same-hostname (or allowlist) for `goto` URLs; reject or block redirects to other origins. |
| **Session leakage** | Storage state file under `outputDir/<scanId>/`, same permissions as rest of scan output; optional cleanup after report generation. |
| **BFS behavior change** | Do not change BFSCrawler or PageCapture internals; only add optional before/after steps in executeJob that call JourneyRunner and use its output (storage state path or result artifact). |

---

## 7) File reference summary

| Purpose | File path |
|--------|-----------|
| ScanAuthProfile model | `apps/scanner/prisma/schema.prisma` (76–101) |
| Auth profile read/write | `apps/scanner/src/db/auth-profile-repository.ts` |
| Login + storage state | `apps/scanner/src/crawler/auth-helper.ts` |
| PageCapture (storage state) | `apps/scanner/src/crawler/page-capture.ts` (constructor, initialize) |
| executeJob (auth + PageCapture + BFS) | `apps/scanner/src/job-queue.ts` (404–764) |
| BFS crawler (postLoginSeedPaths, processPage) | `apps/scanner/src/crawler/bfs-crawler.ts` |
| Scan API (addJob) | `apps/scanner/src/index.ts` (e.g. 213, 216, 236) |
| Auth profiles API | `apps/scanner/src/api/auth-profiles.ts` |

**Note:** `job.request` in executeJob is the normalized request. `propertyId` / `authProfileId` are read from `(job.request as any)`. When jobs are created via `addJob(req.body)`, the normalized request does **not** currently copy `propertyId` from `req.body`; if the dashboard sends `propertyId` only in the body, it may need to be explicitly passed through in `addJob` so authenticated scans receive it.
