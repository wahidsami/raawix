# InteractionAgent Hook Point Analysis — Page Capture Flow

**File inspected:** `apps/scanner/src/crawler/page-capture.ts`  
**Main function:** `PageCapture.capturePage(url, outputDir, pageNumber, options)`

---

## 1) Execution order (real order in `capturePage`)

1. **Initialize browser/context** if needed (`initialize()`).
2. **Create a new Playwright page** from context or browser (`context.newPage()` or `browser.newPage()`).
3. **Build result object** `PageScanResult` with `pageNumber`, `url`, `status: 'success'`.
4. **Security: validate URL** (`validateUrl`, protocol check, no file/ftp/gopher).
5. **Navigate:** `page.goto(url, { waitUntil, timeout })`.
6. **Resolve final URL** and validate redirect (`checkRedirectSafety(finalUrl)`).
7. **Stabilize page** (if not disabled): `PageStabilizer.waitForStable(page, stabilizationConfig)` — network idle, stable DOM, optional ready marker, maxWaitMs.
8. **Read page metadata:** `page.title()`, set `result.finalUrl`, `result.canonicalUrl`.
9. **First HTML read:** `page.content()` → `result.pageFingerprint` (initial).
10. **Layer 1 — Accessibility barriers:** `detectAccessibilityBarriers(page)` (in-browser checks); store on `result.accessibilityBarriers`.
11. **Path safety:** sanitize `pageNumber`, resolve `pageDir` = `outputDir/pages/{pageNumber}`, validate no path traversal, `mkdir(pageDir)`.
12. **Emit L2 running** (SSE).
13. **Screenshot:** `page.screenshot({ path: pageDir/screenshot.png, fullPage: true })` → `result.screenshotPath`.
14. **Emit L1 running** (SSE).
15. **Second HTML read:** `page.content()` as `finalHtml` → write `pageDir/page.html` → `result.htmlPath`; refresh `result.pageFingerprint`.
16. **Link extraction:** `page.evaluate(...)` to collect `a[href]` links → `result.extractedLinks`.
17. **Emit L1 done** (SSE).
18. **A11y snapshot:** `page.evaluate(...)` (visibility + tag, id, class, role, aria-*, text) → write `pageDir/a11y.json` → `result.a11yPath`.
19. **Vision (Layer 2):** if `config.vision.enabled`, `VisionAnalyzer.analyzePage(page, pageNumber, finalUrl, outputDir)` (uses same `page`, takes screenshots/crops), then `saveFindings` → `pageDir/vision/vision.json` → `result.visionPath`.
20. **Emit L2 done** (SSE).
21. **Metadata:** build object with all paths + fingerprint, write `pageDir/page.json` → `result.metadataPath`.
22. **finally:** `page.close()`.
23. Return `result`.

On error: set `result.status = 'failed'`, `result.error`, optionally write minimal `page.json` with error, then `page.close()` and return.

---

## 2) Recommended hook point for InteractionAgent

**Insert after: stabilization and metadata/fingerprint, before any artifact writes (screenshot/HTML/a11y/vision).**

**Exact location:** **After the block that ends with “Compute page fingerprint” (first HTML read) and “LAYER 1: Detect Accessibility Barriers”, and before “SECURITY: Ensure output directory path safety” and `mkdir(pageDir)`.**

Rationale:

- **Live Page:** You have a stable, loaded page; no navigation or DOM reset has happened yet.
- **Before screenshot/HTML/a11y/vision:** So keyboard interactions (Tab/Enter/Space/Escape) do not change what gets captured. If you ran the agent *after* screenshot/HTML, the DOM or focus state could differ from the screenshot.
- **After barriers:** Barriers are read-only checks; running them first keeps L1 semantics. Then you can run the agent and still capture a consistent “initial load” state for screenshot/HTML/a11y/vision by doing those captures immediately after the agent (see “Risks” below for alternative).
- **Before `mkdir`:** The agent doesn’t need the page dir; it only needs the `page` instance. So the cleanest is: barriers → **InteractionAgent.run(page)** → then path safety + mkdir + screenshot + HTML + links + a11y + vision. That way all artifact collection sees the same post-agent state (or you can move agent after screenshot if you want “pre-interaction” screenshot — see risks).

**Concrete insertion point (line range):** After **line 159** (end of accessibility barriers block), before **line 162** (path safety comment).

**Smallest relevant code snippets**

**File:** `apps/scanner/src/crawler/page-capture.ts`

**Snippet 1 — End of barriers block (immediately before hook):**
```ts
      // LAYER 1: Detect Accessibility Barriers (disabled tools, blocked features)
      console.log('[L1] Checking for accessibility barriers (disabled tools)...');
      const { detectAccessibilityBarriers } = await import('../rules/accessibility-barriers.js');
      const accessibilityBarriers = await detectAccessibilityBarriers(page);
      if (accessibilityBarriers.length > 0) {
        console.log(`[L1] Found ${accessibilityBarriers.length} accessibility barriers`);
        (result as any).accessibilityBarriers = accessibilityBarriers;
      }

      // <--- INSERT INTERACTION AGENT HERE (bounded keyboard: Tab/Enter/Space/Escape)
      // Optional: await interactionAgent.run(page, { timeoutMs: 10000, maxSteps: 50 });

      // SECURITY: Ensure output directory path safety (no traversal)
```

**Snippet 2 — Call signature you have available:**
- `page`: Playwright `Page` (live).
- `url` / `finalUrl`: from `page.url()` already set.
- `timeout`: from `options.timeout` (default 20000). You can pass a smaller bound (e.g. 10s) and max steps so the agent is bounded.

**Why not other places:**
- **After screenshot:** Focus/DOM might have changed during agent; screenshot would not match post-agent state. Use this only if you explicitly want “screenshot before any interaction”.
- **After vision:** Vision uses the same page and takes its own crops; running the agent before vision avoids focus/element changes during vision’s queries.
- **After HTML write:** Same as above; HTML would be post-interaction; current design assumes HTML/screenshot/a11y/vision are from the same stable point.

---

## 3) Artifacts written today (per page)

| Artifact        | Path (relative to scan output)     | Filename      | Where path is stored |
|----------------|------------------------------------|---------------|----------------------|
| Screenshot     | `pages/{pageNumber}/screenshot.png`| `screenshot.png` | `result.screenshotPath` → `Page.screenshotPath` (DB), `page.json` |
| HTML           | `pages/{pageNumber}/page.html`    | `page.html`   | `result.htmlPath` → `Page.htmlPath` (DB), `page.json` |
| A11y snapshot  | `pages/{pageNumber}/a11y.json`     | `a11y.json`   | `result.a11yPath` → `Page.a11yPath` (DB), `page.json` |
| Vision findings| `pages/{pageNumber}/vision/vision.json` | `vision.json` | `result.visionPath` → `Page.visionPath` (DB), `page.json` |
| Page metadata  | `pages/{pageNumber}/page.json`     | `page.json`   | `result.metadataPath` (not in DB); contents include all of the above paths |

**DB model:** `apps/scanner/prisma/schema.prisma` — `Page` has `screenshotPath`, `htmlPath`, `a11yPath`, `visionPath` (all optional). No `metadataPath` column; metadata is only on disk and in `PageScanResult` / report artifact.

**Who consumes paths:**
- **scanRepository.upsertPage** (`apps/scanner/src/db/scan-repository.ts`): writes `screenshotPath`, `htmlPath`, `a11yPath`, `visionPath` to `Page` (create/update).
- **ReportGenerator.loadPageArtifact** (`apps/scanner/src/runner/report-generator.ts`): reads `page.json` then `htmlPath`, `screenshotPath`, `a11yPath`, `visionPath` (with fallbacks to default filenames under `pageDir`).
- **BFS crawler / job-queue:** pass `pageResult.screenshotPath`, `htmlPath`, `a11yPath`, `visionPath` into `scanRepository.upsertPage`.

---

## 4) Risks

- **Timeouts:** `capturePage` uses a single `timeout` (default 20s) for `goto` only. Stabilization has its own `maxWaitMs` (15s). The InteractionAgent should use a **bounded timeout** (e.g. 5–10s) and **max steps** so it cannot hang the capture; otherwise a long Tab chain or modal trap could exceed the overall scan budget.
- **Navigation:** If the agent triggers navigation (e.g. Enter on a link), `page.url()` and DOM will change; later screenshot/HTML/a11y/vision would be for a different URL. **Mitigation:** Agent should avoid committing navigation (e.g. prefer Space for buttons, or intercept/block navigation), or run in a way that restores the original URL (e.g. goto back) before continuing — which may change DOM again.
- **Page reset / focus:** The agent will move focus and possibly open modals, dropdowns, or expandables. That is the state when screenshot/HTML/a11y/vision run. If the product requirement is “capture initial load only”, then the agent must run **after** screenshot/HTML (and optionally a11y), accepting that vision and any post-agent steps see an “interacted” state; then document that clearly.
- **Stabilization:** Page is considered stable after `PageStabilizer.waitForStable`. Running the agent before screenshot is consistent with “one stable state” for all artifacts; just ensure the agent does not trigger long animations or new network requests that would make the page “unstable” again (or add a short wait after the agent if needed).
- **VisionAnalyzer:** It uses `page.$$()`, `page.evaluate()`, and takes screenshots of elements. If the agent has changed focus or opened overlays, vision will analyze that state. So either: (a) run agent before all captures (recommended), or (b) run agent after vision and document that vision is “pre-interaction” and agent results are “post-interaction”.

---

## Summary

- **Execution order:** Listed in section 1 as a strict sequence from browser init through metadata write and `page.close()`.
- **Recommended hook:** In `apps/scanner/src/crawler/page-capture.ts`, in `capturePage`, **after the accessibility barriers block (after line 159), before the “SECURITY: Ensure output directory path safety” block**. Call e.g. `await interactionAgent.run(page, { timeoutMs: 10000, maxSteps: 50 })` with a bounded timeout and step limit.
- **Artifacts:** `screenshot.png`, `page.html`, `a11y.json`, `vision/vision.json`, `page.json` under `outputDir/pages/{pageNumber}/`; paths stored on `result` and (except metadataPath) on `Page` in the DB.
- **Risks:** Timeouts, navigation, focus/overlay changes, and ordering vs. “initial load” semantics; mitigate with bounded agent run and clear ordering (agent before all artifact writes unless you explicitly want pre-interaction screenshot only).
