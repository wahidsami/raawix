# Raawi X — Technical Teardown

Deep technical teardown of the Raawi X codebase: architecture, scanning scope/rules, pipeline, widget, data model, APIs, and AI usage. All claims reference exact files, functions, and routes.

---

## 1) High-level architecture

### Services / apps in the repo

| App | Purpose | Location |
|-----|---------|----------|
| **report-ui** | Dashboard (entities, scans, settings, reports) | `apps/report-ui/` |
| **scanner** | Backend API + scan worker (single process) | `apps/scanner/` |
| **widget** | In-page accessibility widget (IIFE bundle) | `apps/widget/` |
| **test-sites** | Test sites for scanning (React SPA) | `apps/test-sites/` |

Shared packages (pnpm workspace):

- **@raawi-x/core** — Shared types (`ScanRequest`, `ScanRun`, `Finding`, `RuleResult`, etc.). Entry: `packages/core/src/index.ts`.
- **@raawi-x/report** — Report utilities. Entry: `packages/report/`.
- **@raawi-x/rules** — WCAG rule engine + rule definitions. Entry: `packages/rules/src/` (`rule-engine.ts`, `wcag-rules.ts`, `index.ts`).

### Per-app details

**report-ui (Dashboard)**  
- **Stack:** React 18, Vite 5, React Router 6, Tailwind, i18next (en/ar), Recharts, Lucide.  
- **Entry:** `apps/report-ui/` → Vite entry (e.g. `src/main.tsx`).  
- **Run:** `pnpm dev` (root) or `pnpm --filter report-ui dev`.  
- **Port:** 5173 (`apps/report-ui/vite.config.ts`: `server.port: 5173`).  
- **Env:** Consumes `VITE_API_URL` (default `http://localhost:3001`) for API base.

**scanner (Backend + worker)**  
- **Stack:** Express 4, TypeScript, Prisma (PostgreSQL), Playwright, JSDOM, Helmet, CORS, express-rate-limit, bcryptjs, jsonwebtoken, multer, exceljs, pdf-lib, @google/generative-ai (Gemini).  
- **Entry:** `apps/scanner/src/index.ts`.  
- **Run:** `pnpm scanner:dev` → `tsx watch src/index.ts`.  
- **Port:** 3001 (`apps/scanner/src/config.ts`: `config.port` from `PORT` or 3001).  
- **Env (main):** See `apps/scanner/.env.example` and `config.ts`: `DATABASE_URL`, `PORT`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `API_KEY`, `REPORT_UI_ORIGIN`, `MAX_CONCURRENT_SCANS`, `OUTPUT_DIR`, `MAX_PAGES_HARD_LIMIT`, `MAX_DEPTH_HARD_LIMIT`, `MAX_RUNTIME_MS`, `VISION_ENABLED`, `VISION_OCR_ENABLED`, `GEMINI_ENABLED`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `WIDGET_ORIGINS`, `RATE_LIMIT_MAX`, `SCAN_RETENTION_*`, etc.

**widget**  
- **Stack:** TypeScript, Vite (library build).  
- **Entry:** `apps/widget/src/widget.ts`.  
- **Build:** `vite build` → IIFE `dist/widget.js` (name: `RaawiXAccessibility`).  
- **No dev server port** (build-only); consumed by host sites (e.g. test-sites).

**test-sites**  
- **Stack:** React, Vite, React Router.  
- **Entry:** `apps/test-sites/` (Vite).  
- **Run:** `pnpm test-sites:dev`.  
- **Port:** 4175 (`apps/test-sites/vite.config.ts`).

### Architecture diagram (text)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              User / Browser                                  │
└─────────────────────────────────────────────────────────────────────────────┘
    │                                    │
    │ Dashboard (React)                  │ Host site + Widget (IIFE)
    ▼                                    ▼
┌──────────────────┐              ┌──────────────────────────────────────────┐
│   report-ui      │              │  Host site (e.g. test-sites :4175)       │
│   :5173          │              │  + <script src=".../widget.js">         │
│   VITE_API_URL   │              │  Widget: page guidance, issues, config,   │
│   → scanner API  │              │  translate, page-package (Layer 3)       │
└────────┬─────────┘              └──────────────────┬───────────────────────┘
         │                                           │
         │ JWT (Bearer) / API_KEY                     │ No auth (widget read-only)
         ▼                                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Scanner API (Express) — :3001                            │
│  Auth │ Dashboard │ Entities │ Scans │ Reports │ Settings │ Upload │ Widget │
│  CORS: REPORT_UI_ORIGIN + WIDGET_ORIGINS                                      │
└────────┬────────────────────────────────────────────────────────────────────┘
         │
         │ In-process (no separate worker process)
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  JobQueue (in-memory, sequential cap MAX_CONCURRENT_SCANS)                  │
│  → BFSCrawler / PageCapture (Playwright) → output/{scanId}/                 │
│  → ReportGenerator (rules + vision + assistive map) → report.json + DB      │
└────────┬────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────────────────────────────────────┐
│  PostgreSQL      │     │  File system (config.outputDir, default ./output)  │
│  Prisma          │     │  {scanId}/report.json, pages/{n}/, uploads/      │
│  schema:         │     └───────────────────────────────────────────────────┘
│  Entity, Scan,   │
│  Page, Finding,  │
│  VisionFinding,  │
│  Site, PageVersion, AssistiveMap, AdminUser, WidgetEvent, ScannerSettings   │
└──────────────────┘
```

**Data flow (scan):**  
Dashboard creates/init scan → `POST /api/scans/start` or init+discover → JobQueue.addJob / addJobForExistingScan → processQueue → executeJob (PageCapture + BFSCrawler or sequential URLs) → ReportGenerator (rules + vision + assistive map) → saveReport + scanRepository.saveReportResults → DB + files.  
SSE: `GET /api/scans/:scanId/events` (scanEventEmitter).

---

## 2) What Raawi X scans (scope & rules)

### Scanners / rulesets in use

- **No axe-core, Lighthouse, or Pa11y.**  
- **Custom stack:**  
  - **Layer 1 (WCAG):** `@raawi-x/rules` RuleEngine + `packages/rules/src/wcag-rules.ts` (10 WCAG rules), plus **accessibility barriers** run in-browser during capture (`apps/scanner/src/rules/accessibility-barriers.ts`).  
  - **Layer 2 (Vision):** `apps/scanner/src/vision/analyzer.ts` (VisionAnalyzer) — heuristic checks on Playwright elements + optional Gemini Vision (OCR, describe element).  
  - **Layer 3 (Assistive map):** `apps/scanner/src/assistive/assistive-map-generator.ts` — label overrides, image descriptions, action intents, form assist; used for widget guidance, not pass/fail.

### Checks performed and mapping to WCAG/UN

**Fully automated rule checks (DOM/HTML, JSDOM):**  
Defined in `packages/rules/src/wcag-rules.ts`, evaluated in `apps/scanner/src/runner/report-generator.ts` via `RuleEngine` and `allWcagRules`:

| Rule ID | WCAG ID | Level | Title | Type |
|---------|---------|-------|--------|------|
| wcag-1.1.1 | 1.1.1 | A | Non-text Content — Alt Text | Automated |
| wcag-2.4.2 | 2.4.2 | A | Page Titled | Automated |
| wcag-3.1.1 | 3.1.1 | A | Language of Page | Automated |
| wcag-4.1.2 | 4.1.2 | A | Name, Role, Value — Form Controls | Automated |
| wcag-2.4.4 | 2.4.4 | A | Link Purpose (Basic) | Heuristic (generic link text → needs_review) |
| wcag-2.4.7 | 2.4.7 | A | Focus Visible | Heuristic (sample focusable elements, CSS outline/border/box-shadow) |
| wcag-2.1.1 | 2.1.1 | A | Keyboard Reachable | Heuristic (tabindex, focus sequence) |
| wcag-2.1.2 | 2.1.2 | A | No Keyboard Trap | Heuristic (modals/regions) |
| wcag-1.4.3 | 1.4.3 | AA | Contrast Minimum | Heuristic (inline styles, parseColor, getContrastRatio; 4.5:1) |
| wcag-1.4.10 | 1.4.10 | AA | Reflow | Heuristic (fixed width > 320px, overflow-x) |

Rule engine: `packages/rules/src/rule-engine.ts` — `RuleEngine.evaluatePage(page, ruleIds?)` runs each rule’s `evaluate(page: PageArtifact)` and returns `RuleResult[]` (status: pass | fail | needs_review | na; confidence: high | medium | low).

**Accessibility barriers (in-browser, Playwright):**  
`apps/scanner/src/rules/accessibility-barriers.ts` — `detectAccessibilityBarriers(page: Page)`:

- zoom-disabled (viewport user-scalable=no, maximum-scale=1) → WCAG 1.4.4  
- user-select-disabled (body/html/elements user-select: none) → 2.1.1  
- pointer-events-disabled on interactive elements → 2.1.1  
- context-menu-disabled → 2.1.1  
- keyboard-nav-blocked (tabindex=-1 on interactive) → 2.1.1  
- copy-paste-blocked (oncopy/oncut/onpaste) → 2.1.1  

Barriers are converted to findings and stored (e.g. via report/DB flow). Severities: critical, serious, moderate.

**Heuristic checks:**  
As above: 2.4.4, 2.4.7, 2.1.1, 2.1.2, 1.4.3, 1.4.10 use patterns/sampling; many return `needs_review` or `pass` with medium/low confidence.

**AI/LLM-based checks (Layer 2 — Vision):**  
- **VisionAnalyzer** (`apps/scanner/src/vision/analyzer.ts`): rule-like logic is **heuristic** (e.g. clickable without accessible name → `clickable_unlabeled`).  
- **Gemini Vision** (`apps/scanner/src/vision/gemini-provider.ts`): used only for **OCR** (`extractText`) and **element description** (`describeElement`) to enrich evidence and widget guidance. It does **not** decide WCAG pass/fail; outputs are tagged needs_review / low confidence and raw response stored in `evidenceJson`.

### Rule definitions: IDs, severities, remediation

- **IDs:** `wcag-1.1.1`, `wcag-2.4.2`, `wcag-3.1.1`, `wcag-4.1.2`, `wcag-2.4.4`, `wcag-2.4.7`, `wcag-2.1.1`, `wcag-2.1.2`, `wcag-1.4.3`, `wcag-1.4.10`.  
- **Severity:** In core types, findings use `severity: 'error' | 'warning' | 'info'`; rule results use `status` + `confidence`. Excel/PDF mapping uses level (A/AA) and status to derive severity (e.g. `apps/scanner/src/services/excel-report-generator.ts` mapSeverity).  
- **Remediation:** Each `RuleResult` has `howToVerify` and optional `message`; evidence in `evidence[]` with `description`. Stored in DB as `Finding.howToVerify`, `Finding.message`, `Finding.evidenceJson`.

Vision finding kinds (Layer 2): `clickable_unlabeled`, `icon_button_unlabeled`, `text_contrast_risk`, `looks_like_button_not_button`, `focus_indicator_missing_visual` — with `suggestedWcagIds` (e.g. 4.1.2). These are not part of the public WCAG-only report (PDF/Excel exclude Layer 2/3 per product requirement).

---

## 3) How scanning is executed (pipeline)

### End-to-end scan flow

1. **Creation / init**  
   - Dashboard: create scan → `POST /api/scans/start` (body: seedUrl, maxPages, maxDepth, entityId, propertyId, scanMode, selectedUrls, …) with **requireAuth** and **validateScanRequest** (`apps/scanner/src/index.ts`).  
   - Or two-phase: `POST /api/scans/:scanId/init` (requireAuth) → then `POST /api/scans/:scanId/discover` (requireAuth) → then `POST /api/scans/start` with same `scanId` and `selectedUrls`.  
   - External: `POST /api/scan` with **apiKeyAuth** and validateScanRequest.

2. **Job creation**  
   - `JobQueue.addJob(req.body)` or `addJobForExistingScan(scanId, req.body)` (`apps/scanner/src/job-queue.ts`).  
   - Validates URL (SSRF, url-policy), generates or reuses scanId, creates DB record via `scanRepository.createScan`, pushes job to in-memory `queue[]`.

3. **Worker**  
   - Same process: `processQueue()` runs when `running.size < MAX_CONCURRENT_SCANS`.  
   - No Redis/Bull/SQS: in-memory queue only.  
   - Picks next `queued` job, sets status `running`, calls `executeJob(job, logger)`.

4. **Browser automation**  
   - **PageCapture** (`apps/scanner/src/crawler/page-capture.ts`): Playwright chromium, one browser/context per scan; optional storage state for auth.  
   - For each URL: goto, stabilization (PageStabilizer), L1 barriers (`detectAccessibilityBarriers`), screenshot, HTML, a11y snapshot, VisionAnalyzer (candidates → vision findings + optional Gemini), page fingerprint; writes to `outputDir/pages/{pageNumber}/`.  
   - **Crawl:** Either **BFSCrawler** (`apps/scanner/src/crawler/bfs-crawler.ts`) — BFS over same-host links, respects scanMode (domain vs single), maxPages, maxDepth, include/exclude patterns — or **sequential** list from `selectedUrls` (no crawl), both using the same PageCapture.

5. **Results**  
   - **ReportGenerator** (`apps/scanner/src/runner/report-generator.ts`): loads artifacts from `output/{scanId}/pages/`, runs RuleEngine with allWcagRules, loads vision findings, generates assistive map per page, builds ScanRun (pages, results, summary).

6. **Storage**  
   - `report.json` and artifacts under `config.outputDir/{scanId}/`.  
   - `scanRepository.saveReportResults`, `scanRepository.updateScanStatus(scanId, 'completed')` — Prisma writes to Scan, Page, Finding, VisionFinding, AssistiveMap, etc.

7. **Report**  
   - PDF: `POST /api/reports/export` (requireAuth) → `apps/scanner/src/api/pdf-export.ts` + services (report-content, pdf-template-renderer, logo-loader).  
   - Excel: `POST /api/scans/:id/export/excel` (requireAuth) → `apps/scanner/src/api/excel-export.ts` + `services/excel-report-generator.ts` (WCAG-only findings).

### Job queue technology, retries, idempotency, timeouts, rate limiting

- **Queue:** In-memory array in `JobQueue` (`apps/scanner/src/job-queue.ts`). No external queue.  
- **Concurrency:** `config.maxConcurrentScans` (default 5).  
- **Retries:** No automatic retries for failed jobs; state moves to `failed` or `canceled`.  
- **Idempotency:** If `outputDir/{scanId}/report.json` exists, `addJob` and `executeJob` can short-circuit to completed and return existing scan (`readFile` report.json, set job completed). Partial artifact dir is cleared before re-run.  
- **Timeouts:** Job TTL = `Date.now() + maxRuntimeMs + 5min`; `executeJob` uses `Promise.race(crawlPromise, timeoutPromise)` with `timeoutMs` (sequential: max(selectedUrls.length * 60s, 10min); BFS: `config.quotas.maxRuntimeMs`). Stale jobs cleaned in `cleanupStaleJobs()`.  
- **Rate limiting:** Global API limiter (`config.rateLimit`, e.g. 200/15min) in `index.ts`; skipped for `/api/*/events` and `/api/auth*`. Translation: 50/15min for `POST /api/widget/translate`.

### Page discovery

- **Sources:**  
  - **User-provided:** seedUrl (required), optional `seedUrls[]`, optional `sitemapUrl` (BFS crawler can use sitemap parser).  
  - **Crawl:** BFS from seed on same hostname; link extraction from live DOM in both **PageDiscovery** (`apps/scanner/src/crawler/page-discovery.ts`) and **BFSCrawler** (`apps/scanner/src/crawler/bfs-crawler.ts`) via `extractLinks` / page.evaluate on `a[href]`.  
- **Discovery phase:** `POST /api/scans/:scanId/discover` starts PageDiscovery in background; it emits `crawl_discovered` and finally a `scan_done`-like event with `discoveredUrls`. No scan job runs until `POST /api/scans/start` with that scanId and optional `selectedUrls`.  
- **Scan mode:** `scanMode: 'domain' | 'single'`. In single mode, discovery and crawl only include links whose path is a child of the seed path (same in page-discovery and bfs-crawler).

---

## 4) Widget (in-page) behavior

### Location and embedding

- **Code:** `apps/widget/src/widget.ts` (main), `apps/widget/src/page-fingerprint.ts`; build produces IIFE `dist/widget.js` (RaawiXAccessibility).  
- **Embedding:** Host page includes script, e.g. `<script src="https://api.example.com/widget.js">` or copy to host’s public dir (e.g. test-sites). Widget is configured with `apiUrl` (from `GET /api/widget/config` or passed in).

### What the widget does

- **Measures/scans:** It does **not** run scanners. It fetches pre-computed data from the scanner API: guidance, issues, config, page-package (assistive map + guidance + issues summary).  
- **Sends to backend:** Optional analytics (e.g. WidgetEvent if implemented); translation sends text to `POST /api/widget/translate`.  
- **Displays:** Accessibility settings (text size, line spacing, contrast, focus highlight, reading mode, voice, translation, etc.), page guidance (summary, landmarks, form steps, key actions), known issues list, and Layer 3 assistive data (label overrides, image descriptions, action intents, form assist) when available.

### Security: auth, tenant isolation, allowed origins, CSP

- **Widget endpoints:** No auth for read-only: `GET /api/widget/guidance`, `GET /api/widget/issues`, `GET /api/widget/config`, `GET /api/widget/icon`, `GET /api/widget/page-package`.  
- **Translation:** `POST /api/widget/translate` is rate-limited (50/15min); no auth.  
- **Tenant isolation:** By `url` and optional `scanId` or `entityCode`/`siteId`/`domain`; page-package resolves entity/property by `entityCode` and request domain, then latest completed scan for that property.  
- **CORS:** Scanner allows origins from `WIDGET_ORIGINS` (env) or default list including report-ui and localhost test ports; credentials: true; methods GET, POST, PUT, DELETE; headers include Authorization, X-API-Key.  
- **CSP:** Not set by scanner; host site’s CSP may affect script/connect. Widget is IIFE, no eval in production build.

---

## 5) Data model & storage

### DB tables (Prisma) and key fields

Schema: `apps/scanner/prisma/schema.prisma`. Migrations: Prisma (e.g. `prisma migrate`); no separate SQL migration list in repo.

- **Entity:** id (uuid), code (unique), nameEn, nameAr, type, sector, status, notes, logoPath, createdAt, updatedAt. Relations: EntityContact[], Property[], Scan[].  
- **EntityContact:** id, entityId, name, email, phone, role, isPrimary.  
- **Property:** id, entityId, domain, displayNameEn, displayNameAr, isPrimary. Relations: Site[], Scan[], ScanAuthProfile?.  
- **ScanAuthProfile:** id, propertyId (unique), authType, loginUrl, successUrlPrefix, successSelector, usernameSelector, passwordSelector, submitSelector, usernameValue, passwordValue, postLoginSeedPaths (Json), extraHeaders, isActive, lastTestedAt, lastTestResult, lastTestError.  
- **Scan:** id, scanId (unique), seedUrl, status, startedAt, completedAt, maxPages, maxDepth, hostname, summaryJson, scoreA, scoreAA, scoreAAA, needsReviewRate, entityId, propertyId, reportSentAt. Relations: Page[], Finding[], VisionFinding[], Entity?, Property?.  
- **Page:** id, scanId, pageNumber, url, title, finalUrl, canonicalUrl, pageFingerprintJson, screenshotPath, htmlPath, a11yPath, visionPath, error. Relations: Finding[], VisionFinding[].  
- **Finding:** id, scanId, pageId, ruleId, wcagId, level, status, confidence, message, evidenceJson, howToVerify. (WCAG + barrier findings.)  
- **VisionFinding:** id, scanId, pageId, kind, bboxJson, detectedText, confidence, correlatedSelector, evidenceJson, suggestedWcagIdsJson.  
- **Site:** id, domain (unique), propertyId, entityId. Relations: PageVersion[], WidgetEvent[], WidgetDailyAggregate[].  
- **PageVersion:** id, siteId, canonicalUrl, finalUrl, fingerprintHash, scanId, generatedAt. Relation: AssistiveMap?.  
- **AssistiveMap:** id, pageVersionId (unique), json, confidenceSummary.  
- **AdminUser:** id, email (unique), passwordHash, role.  
- **WidgetEvent:** id, siteId, eventType, pageUrl, metadata, createdAt.  
- **WidgetDailyAggregate:** id, siteId, date, uniqueSessions, widgetOpens, voiceEnabled, commandUsed.  
- **ScannerSettings:** id, maxPages, maxDepth, maxRuntimeMs (mapped to table `scanner_settings`).

Screenshots/evidence: paths stored in Page (screenshotPath, htmlPath, a11yPath, visionPath) and in artifacts under `outputDir/{scanId}/pages/{n}/`. Served via `GET /api/scan/:id/artifact/*` (JWT or API key). Reports: report.json on disk; PDF/Excel generated on demand from DB + files.

---

## 6) APIs (backend)

Base: `apps/scanner/src/index.ts`. Auth: `requireAuth` (JWT Bearer), `apiKeyAuth` (X-API-Key or query), from `middleware/auth.js`.

### Auth

- **POST /api/auth/login** — Body: { email, password }. Returns JWT. Controller: `apps/scanner/src/api/auth.ts` (authRouter).  
- **GET /api/auth/me** — requireAuth. Returns current user.

### Scan creation / runs

- **POST /api/scans/start** — requireAuth, validateScanRequest. Body: seedUrl (or url), maxPages, maxDepth, entityId, propertyId, scanMode, selectedUrls, scanId (if starting after discovery). Creates or reuses scan, enqueues job. Response: 202 { scanId, status, message }.  
- **POST /api/scan** — apiKeyAuth, validateScanRequest. Same body (no scanId). Adds job, 202.  
- **POST /api/scans/:scanId/init** — requireAuth. Body: seedUrl, entityId, propertyId, maxPages, maxDepth. Creates Scan record (discovering/queued), no job.  
- **POST /api/scans/:scanId/discover** — requireAuth. Body: seedUrl, maxPages, maxDepth, includePatterns, excludePatterns, scanMode. Starts PageDiscovery in background; 202.  
- **POST /api/scans/:id/cancel** — requireAuth. Marks job canceled, DB status updated.  
- **POST /api/scan/:id/cancel** — apiKeyAuth. Same.

### Results retrieval

- **GET /api/scan/:id** — apiKeyAuth. Returns scan status/summary/pages/findings: from report.json if present, else from job queue (partial or minimal). Uses `scanRunToApiResponse` (`api/response-adapter.js`).  
- **GET /api/scan/:id/report** — apiKeyAuth. Raw report.json body.  
- **GET /api/scan/:id/artifact/*** — JWT or API key. Serves file under `outputDir/{scanId}/`.  
- **GET /api/scans/:scanId/detail** — requireAuth. Full scan from DB (entity, property, pages, findings, visionFindings), compliance scores; `dbScanToApiResponse` + `db-adapter.js`.  
- **GET /api/scans/:scanId/debug** — requireAuth. Debug info.  
- **GET /api/scans/:scanId/events** — SSE stream for scanId (auth in practice). `apps/scanner/src/api/scan-events.ts` — subscribes to scanEventEmitter.

### Report generation

- **POST /api/reports/export** — requireAuth. Body: scanId, language, etc. Returns PDF. Controller: `apps/scanner/src/api/pdf-export.ts`.  
- **POST /api/scans/:id/export/excel** — requireAuth. Query/body: locale. Returns .xlsx (WCAG-only). Controller: `apps/scanner/src/api/excel-export.ts`.

### Settings / configuration

- **GET /api/settings** — requireAuth. Returns maxPages, maxDepth, maxRuntimeMinutes from DB (ScannerSettings) or config fallback.  
- **PUT /api/settings** — requireAuth. Body: maxPages, maxDepth, maxRuntimeMinutes. Saves to DB.  
- **GET /api/scanner/config** — No auth. Safe config (e.g. quotas for UI). `apps/scanner/src/api/scanner-config.ts`.

### Entities / dashboard

- **GET /api/entities** — requireAuth. List entities (with relations).  
- **GET /api/entities/:id** — requireAuth. One entity.  
- **POST /api/entities** — requireAuth. Create entity.  
- **PUT /api/entities/:id** — requireAuth. Update entity.  
- **DELETE /api/entities/:id** — requireAuth.  
- **POST /api/entities/:id/contacts** — requireAuth.  
- **POST /api/entities/:id/properties** — requireAuth.  
- **GET /api/entities/properties/list** — requireAuth.  
- **GET /api/scans** — requireAuth. List scans (dashboard).  
- **GET /api/sites** — requireAuth.  
- **GET /api/findings** — requireAuth.  
- **GET /api/overview** — requireAuth.  
- **GET /api/analytics/widget** — requireAuth.  
- **GET /api/assistive-maps** — requireAuth.  
- **GET /api/compliance/scan/:scanId** — requireAuth.  
- **GET /api/compliance/property/:propertyId** — requireAuth.  
- **GET /api/compliance/entity/:entityId** — requireAuth.

### Upload

- **POST /api/upload/entity-logo** — requireAuth, multer single('logo'). Saves file, returns path. `apps/scanner/src/api/upload.ts`.

### Widget

- **GET /api/widget/guidance** — Query: url, scanId?, lang. Returns page guidance (widgetService.getPageGuidance).  
- **GET /api/widget/issues** — Query: url, scanId?, lang. Returns issues (widgetService.getPageIssues).  
- **GET /api/widget/config** — Query: scanId?, domain?, lang. Returns feature flags + apiUrl.  
- **POST /api/widget/translate** — translationLimiter. Body: { text, targetLang, sourceLang? }. Returns { translatedText }. Uses GeminiTranslator.  
- **GET /api/widget/icon** — Serves widget icon PNG.  
- **GET /api/widget/page-package** — Query: url, entityCode? (or siteId/domain). Returns assistive map + guidance + issues summary for Layer 3.

---

## 7) AI usage

### Where LLMs are used

- **Gemini Vision (Layer 2):** `apps/scanner/src/vision/gemini-provider.ts`  
  - **extractText(imagePath):** OCR. Prompt: `"Extract all visible text from this image. Return only the text content, no explanations."`  
  - **describeElement(imagePath, elementKind, context?):** One-sentence description. Prompt: `Describe this ${elementKind} in exactly one sentence. Be factual and specific. Do not guess identities, emotions, or make assumptions. If uncertain, prefix with "Appears to show". [Context: ...]. Return only the description, no explanations.`  
  - Model/endpoint: `config.gemini.model` (e.g. GEMINI_MODEL), v1beta `generateContent`. No JSON schema; free-form text parsed from response (extractTextFromResponse).  
- **Gemini Translation (widget):** `apps/scanner/src/api/gemini-translator.ts`  
  - **translate(text, targetLang, sourceLang?):** Prompt: `Translate the following text from ${sourceLanguage} to ${targetLanguage}. Requirements: ... Return only the translated text.`  
  - Same model/endpoint pattern; no structured output schema.

### Provider integration and model selection

- **Config:** `apps/scanner/src/config.ts` — gemini.enabled (GEMINI_ENABLED), gemini.apiKey (GEMINI_API_KEY), gemini.model (GEMINI_MODEL, default gemini-1.5-flash), gemini.maxChars, gemini.maxImageBytes, gemini.maxImagesPerScan.  
- **Vision:** GeminiVisionProvider.isEnabled() gates all vision API calls. Used only for OCR and description; pass/fail is from heuristic VisionAnalyzer.  
- **Translation:** GeminiTranslator.isEnabled(); used in widget translate endpoint and optionally for PDF/UI language.

### Failure modes

- **Vision:** API errors (4xx/5xx) logged; extractText/describeElement return null and optional rawResponse; vision findings still created with heuristic data. Rate limits (e.g. 429) can cause many null Gemini results.  
- **Translation:** Errors thrown and returned 500 to client; translation cache (`api/translation-cache.ts`) avoids repeat calls for same text/lang.  
- **No retries** for Gemini calls in the code paths reviewed.

---

## Fix applied

- **Discovery error handler:** `apps/scanner/src/index.ts` previously used `scanEventEmitter` in the `discover().catch()` callback without importing it. Added: `import { scanEventEmitter } from './events/scan-events.js';` so discovery failures correctly emit an error event to the UI.

---

*Document generated from codebase inspection. All paths and line references are to the current tree.*
