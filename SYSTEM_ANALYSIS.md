# Raawi X System Analysis

## 1. Executive Summary

This document audits the Raawi X repository and describes how the system works today, including:
- the overall architecture and repo structure
- the scan pipeline and layered analysis model
- how scan data and page artifacts are persisted
- the widget integration approach and current widget behavior
- the current gaps and practical integration requirements for embedding in a website

The current system is a layered accessibility scanner with a web-based dashboard, API backend, embeddable widget, and a planned Raawi agent mode. The widget combines live DOM reading with scan-derived guidance, but the deeper `a11y.json` snapshot is stored and exposed without being fully consumed.

## 2. Repository Structure

### Root layout
- `package.json` – PNPM workspace root, scripts for dev, build, scanner, widget, and reporting
- `README.md` – high-level project overview and development startup instructions
- `apps/` – application packages
- `packages/` – shared core, rules, and report logic
- `infra/` and `docs/` – environment and deployment support

### Main apps
- `apps/scanner/` – Node.js TypeScript scanner API and scan engine
- `apps/report-ui/` – React/Vite admin dashboard and scan result UI
- `apps/widget/` – embeddable JavaScript accessibility widget

### Shared packages
- `packages/core/` – shared types and artifact contracts
- `packages/rules/` – WCAG rule engine and rule definitions
- `packages/report/` – JSON to HTML report generation

## 3. High-Level System Flow

### 3.1 Scan orchestration

The scanner backend receives scan requests via API, queues them, crawls pages, captures artifacts, runs rule checks, and writes reports.

Key roles:
- `apps/scanner/src/api/*` – API endpoints for starting scans and fetching results
- `apps/scanner/src/job-queue.ts` – scan job execution management
- `apps/scanner/src/scan-pipeline.ts` – orchestrates discovery, capture, analysis
- `apps/scanner/src/crawler/*` – page capture, BFS crawl, authenticated login flows
- `apps/scanner/src/runner/report-generator.ts` – loads artifacts and builds final report JSON

### 3.2 Report UI

The dashboard consumes the API and displays scan summaries, details, and assistive maps.
- `apps/report-ui/src/pages/ScanDetailPage.tsx` – scan results and layer breakdown
- `apps/report-ui/src/pages/AssistiveMapsPage.tsx` – assistive map listings
- `apps/report-ui/src/components/ScanMonitorModal.tsx` – scan progress and layer state

### 3.3 Widget

The embeddable widget is a browser-side script that:
- injects a floating accessibility button and panel
- reads live DOM for content and page structure
- optionally fetches scan-derived guidance, issues, and a page package
- provides voice narration, translation, reading mode, and assistive features

The widget is built from `apps/widget/src/widget.ts` and packaged by Vite.

## 4. Layered Scan Model

The system uses a layered audit model with at least three analysis layers plus an optional agent interaction layer.

### Layer 1 – DOM and WCAG rules

Source:
- `apps/scanner/src/crawler/page-capture.ts`
- `packages/rules/`
- `apps/scanner/src/assistive/form-assist-extractor.ts`

What it captures:
- HTML content (`page.html`)
- page metadata such as title, URL, canonical URL
- DOM structure and element properties
- WCAG rule results using JSDOM and core rule engine

Persistence:
- writes `page.json` metadata per page
- `htmlPath` pointing to captured HTML
- `screenshotPath` pointing to page screenshot
- `pageFingerprintJson` for fingerprint comparisons

### Layer 2 – Vision and screenshot analysis

Source:
- `apps/scanner/src/vision/analyzer.ts`
- `apps/scanner/src/assistive/assistive-map-generator.ts`

What it captures:
- screenshots of the page
- vision findings and image candidates
- image crops and enrichments for assistive maps
- optional Gemini-based text/image interpretation

Persistence:
- `visionPath` and `vision-summary.json`
- image artifacts stored under `output/<scanId>/pages/<pageNumber>/vision/`

### Layer 3 – Assistive Map

Source:
- `apps/scanner/src/assistive/assistive-map-generator.ts`
- `apps/scanner/src/api/widget-service.ts`

What it captures:
- third-layer assistive metadata for page elements
- accessibility label overrides, image descriptions, action intents
- data used by widget guidance and page package endpoints

Persistence:
- `output/<scanId>/pages/<pageNumber>/assistive-map.json`
- `AssistiveMap` database entries
- `PageVersion` and `Scan` relations for page/package metadata

### Raawi Agent / Interaction Trace

Planned/partial support documented in `RAAWI_AGENT_IMPLEMENTATION_PLAN.md`.
- `raawi-agent` scan mode
- trace files such as `output/<scanId>/pages/<pageNumber>/raawi-agent/trace.json`
- structured issues in `raawi-agent/issues.json`
- page summaries in `raawi-agent/page-summary.json`

This mode is designed to complement classic DOM/vision/assistive analysis with task-driven, user-impact findings.

## 5. Persistence and Data Storage

### 5.1 Output directory layout

Scan artifacts are stored under `output/<scanId>/pages/<pageNumber>/`.
Common files include:
- `page.json` – page metadata and artifact paths
- `html.html` or `htmlPath` – captured page HTML
- `screenshot.png` – page screenshot
- `a11y.json` – accessibility snapshot
- `vision-summary.json` – vision analysis summary
- `assistive-map.json` – Layer 3 assistive map
- `raawi-agent/*` – Raawi agent trace and issues

### 5.2 Database persistence

The scanner writes page metadata and scan metadata into database tables.
Relevant models documented in `CREATE_RAAWIX_DATABASE.md` and `docs/LOCAL_POSTGRES_SETUP.md` include:
- `Scan` – scan execution row, state, seed URL, audit mode
- `Page` – page-level artifact paths and metadata (`htmlPath`, `screenshotPath`, `a11yPath`, `visionPath`)
- `PageVersion` – versioned page fingerprint tracking
- `AssistiveMap` – assistive map records used by widget and dashboard

`apps/scanner/src/db/scan-repository.ts` is responsible for upserting pages and scan metadata.

### 5.3 `page.json` and metadata flow

`page.json` is the canonical per-page metadata file produced during capture. It contains:
- `pageNumber`
- `url`, `finalUrl`, `canonicalUrl`
- `title`
- `pageFingerprint`
- `capturedAt`
- artifact path fields: `screenshotPath`, `htmlPath`, `a11yPath`, `visionPath`

`ReportGenerator.loadPageArtifact()` reads `page.json`, then resolves these artifact paths into `PageArtifact`.

### 5.4 Accessibility snapshot (`a11y.json`)

The system writes `a11y.json` during page capture from the browser DOM.

Source:
- `apps/scanner/src/crawler/page-capture.ts`

Generated shape:
- array of element snapshots
- each item contains `tag`, `id`, `class`, `role`, `ariaLabel`, `ariaLabelledBy`, `text`
- only visible elements are included (`display !== 'none'` and `visibility !== 'hidden'`)
- `text` is truncated to 100 characters

Persistence:
- file stored at `output/<scanId>/pages/<pageNumber>/a11y.json`
- `result.a11yPath` is persisted into `Page.a11yPath`

Current actual use:
- only `ReportGenerator.loadPageArtifact()` reads and parses the file
- assigns parsed JSON to `artifact.a11y` in `PageArtifact`
- no WCAG rule, assistive map, form-assist, or widget logic appears to consume `artifact.a11y`

This means the `a11y.json` content is currently stored and exposed, but effectively unused by the analysis and reporting pipeline.

### 5.5 Persistent data contracts

`packages/core/` defines shared contract types such as `PageArtifact` and `PageScanResult`.
The current snapshot contract is loose:
- `artifact.a11y` is typed as `unknown`
- the in-page snapshot is typed as `any[]`

## 6. Widget Integration Today

### 6.1 Widget package

The widget is packaged from `apps/widget/src/widget.ts`.
- build output is `apps/widget/dist/widget.js`
- `apps/widget/example.html` demonstrates a simple embed
- `apps/widget/package.json` defines `build`, `dev`, `type-check`

### 6.2 How the widget initializes

The widget auto-initializes on page load and reads configuration from global variables:
- `window.RAWI_API_URL` – API base URL for scan guidance and issues
- `window.RAWI_SCAN_ID` – optional scan ID (`latest` default)
- `window.VOICE_ENABLED` – optional feature flag for voice/assistant mode

Initialization steps:
- inject widget CSS and fonts
- create floating accessibility button and panel
- detect forms and auth-like flows on the page
- observe SPA route changes
- apply saved user settings
- if voice mode is enabled and API is configured, fetch scan data asynchronously

### 6.3 Scan data endpoints used by the widget

The widget calls backend endpoints to enrich live DOM interaction:
- `/api/widget/page-package?domain=<domain>&url=<url>`
  - preferred single payload
  - returns `guidance`, `matchedUrl`, `scanTimestamp`, `fingerprint`, and other page package data
- `/api/widget/guidance?url=<url>&scanId=<scanId>`
  - fallback endpoint for guidance only
- `/api/widget/issues?url=<url>&scanId=<scanId>`
  - fetches issue listings for the active page
- `/api/widget/translate`
  - server-side translation endpoint used by voice narration

### 6.4 Current widget behavior with scan data

The widget uses scan data in a supporting role. It does NOT replace live page content.

The current contract is:
- Live DOM is always used for content reading and interaction
- Scan data is used for:
  - page structure hints
  - landmarks and navigation hints
  - guidance summaries and key actions
  - issue listings for the current URL
  - assistive map label overrides and image descriptions if available
- If the scan data is stale or a URL mismatch is detected, the widget warns users and continues with live DOM only

This behavior is implemented in `fetchPagePackageAsync()` and related fingerprint comparison logic.

### 6.5 Stale scan detection

The widget computes a lightweight fingerprint from the live page:
- `document.title`
- first `h1` or `h2` text
- truncated `main` text hash

It compares that against scan fingerprint data from the backend.
If similarity is low or match confidence is not high, it displays a stale scan warning.

### 6.6 Assistive map integration in the widget

The widget already contains assistive map-aware logic in `apps/widget/src/widget.ts`:
- uses assistive map-based label overrides
- uses assistive map descriptions for images
- detects element intent from assistive map data
- integrates assistive map metadata into narration / reading guidance

This confirms the architecture expects Layer 3 assistive map data to be consumed by the widget.

### 6.7 Current widget embed requirements

A website can integrate the widget by:
1. adding a page container or allowing the widget to inject its own UI
2. including the built widget script
3. optionally setting globals before the script loads
4. ensuring the API backend is accessible from the page origin

Minimal embed example from `apps/widget/example.html`:
```html
<script src="./dist/widget.iife.js"></script>
```

For scan integration:
```html
<script>
  window.RAWI_API_URL = 'https://scanner.example.com';
  window.RAWI_SCAN_ID = 'latest';
  window.VOICE_ENABLED = true;
</script>
<script src="./dist/widget.iife.js"></script>
```

### 6.8 Widget usage without scan data

The widget can still initialize without `RAWI_API_URL`. In that mode:
- it loads its UI
- it does not perform page-package or guidance fetches
- it remains useful for generic accessibility controls

However, full integration requires the API endpoints and scan artifacts to be available.

## 7. Current System Gaps and Risks

### 7.1 Unused accessibility snapshot

`a11y.json` is generated and stored, but its content is not effectively used by the analysis or reporting stack.
- `apps/scanner/src/runner/report-generator.ts` loads it into `artifact.a11y`
- no downstream rule or widget logic consumes that parsed content
- this means a potentially valuable DOM accessibility snapshot is currently wasted

### 7.2 Loose type and contract enforcement

The accessible snapshot is not strongly typed:
- in-page snapshot uses `any[]`
- `PageArtifact.a11y` is `unknown`
- no shared schema exists for `a11y.json`

This increases risk when consuming it later in widget or agent flows.

### 7.3 Widget scan-data coupling

The widget relies on scan-derived guidance, but its fallback behavior is undocumented in repo-level docs.
- websites must provide `RAWI_API_URL` for full widget intelligence
- if the scan backend is unreachable, the widget continues with reduced capability
- stale page detection is handled client-side, but may still provide misleading guidance for dynamic sites

### 7.4 Authentication and protected page support

Authenticated scanning and widget fallback for protected flows are described in `AUTHENTICATED_SCANNING_IMPLEMENTATION.md`, but the current website embed model does not natively handle auth flows.
- widget can detect auth-like forms
- actual authenticated scan session reuse is handled in the scanner backend, not the widget
- protected pages require backend scan support and scan package access

### 7.5 Raawi agent mode is not yet fully primary

The `RAAWI_AGENT_IMPLEMENTATION_PLAN.md` shows a roadmap for a new audit mode. Current state appears to preserve classic mode and layer support, with Raawi agent planned as a complementary experience.

## 8. Practical Integration Path for Websites

To integrate the widget into a website so it can use scan data and created layers:

1. Build the widget package:
   - `pnpm --filter @raawi-x/widget build`
2. Host `dist/widget.js` (or `widget.iife.js`) on the website or CDN
3. Set global configuration before the widget loads:
   - `window.RAWI_API_URL`
   - `window.RAWI_SCAN_ID` (optional, `latest` default)
   - `window.VOICE_ENABLED` (optional)
4. Add the widget script to the page:
   ```html
   <script src="/path/to/widget.js"></script>
   ```
5. Ensure the scanner API backend has CORS and API routing configured to accept widget requests
6. If using authenticated pages, ensure scan results are available and the widget `page-package` endpoint can resolve the current URL

### Recommended integration items
- expose scan package metadata via API for the current URL
- derive `scanId` from the most recent successful scan for the website
- use `latest` if you want the widget to automatically match current scan data
- preserve page structure in scan artifacts so the widget can map guidance to live DOM
- do not allow scan data to replace live page text; the widget intentionally keeps live DOM authoritative

## 9. Key Files and Components

### Widget-related
- `apps/widget/src/widget.ts`
- `apps/widget/example.html`
- `apps/widget/vite.config.ts`
- `apps/widget/package.json`
- `apps/widget/VOICE_NARRATION.md`
- `apps/widget/README_ICON.md`

### Scanner and persistence
- `apps/scanner/src/crawler/page-capture.ts`
- `apps/scanner/src/runner/report-generator.ts`
- `apps/scanner/src/db/scan-repository.ts`
- `apps/scanner/src/api/widget-service.ts`
- `apps/scanner/src/api/response-adapter.ts`
- `apps/scanner/src/assistive/assistive-map-generator.ts`
- `apps/scanner/src/vision/analyzer.ts`
- `apps/scanner/prisma/schema.prisma` (schema reference)

### Documentation and planning
- `RAAWI_AGENT_IMPLEMENTATION_PLAN.md`
- `AUTHENTICATED_SCANNING_IMPLEMENTATION.md`
- `A11Y_SNAPSHOT_EXPLANATION.md`
- `PAGE_METADATA_AGENT_PATH_TRACE.md`
- `API_UNIFICATION.md`
- `DASHBOARD_DOCUMENTATION.md`

## 10. Recommendation Summary

The repository already supports a multilayer audit workflow and a widget designed to consume that data. The main engineering focus should be:
- ensure Layer 3 assistive map data is consistently produced and made available via the widget API
- bring `a11y.json` into use or drop it from active contract if not needed
- stabilize the widget embed contract with documented global variables and endpoint expectations
- preserve the widget’s live DOM reading contract while using scan data only for guidance
- complete Raawi agent persistence and report integration as a complementary layer, not a replacement

By aligning the widget data contract with the scan backend and tightening the page artifact schema, this system can deliver robust assistive guidance on real websites without breaking the live-page experience.
