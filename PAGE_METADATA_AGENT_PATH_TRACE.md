# Page Metadata (page.json) Trace — Adding agentPath

Trace of how page metadata is written during capture and loaded into PageArtifact, plus minimal changes to add **agentPath** end-to-end.

---

## Step 1 — Where page.json is written in page-capture.ts

**File:** `apps/scanner/src/crawler/page-capture.ts`  
**Function:** `PageCapture.capturePage`  
**Location:** Success path around lines 357–373; error path around lines 383–403.

Metadata is written in two places:

1. **Success path:** After vision, L2 done SSE, and before the closing `} catch` — a **metadata** object is built and written to **`join(pageDir, 'page.json')`**; **result.metadataPath** is set to that path.
2. **Error path:** In the `catch` block, after path safety and mkdir, a **reduced metadata** object (no artifact paths) is written to the same **page.json** path so that failed captures still have a record.

---

## Step 2 — Code that constructs the metadata object and writes it

**File:** `apps/scanner/src/crawler/page-capture.ts`

### Success path (lines 357–373)

```ts
      // Save metadata
      const metadata = {
        pageNumber,
        url,
        finalUrl: result.finalUrl,
        canonicalUrl: result.canonicalUrl,
        title: result.title,
        pageFingerprint: result.pageFingerprint,
        capturedAt: new Date().toISOString(),
        screenshotPath: result.screenshotPath,
        htmlPath: result.htmlPath,
        a11yPath: result.a11yPath,
        visionPath: result.visionPath,
      };
      const metadataPath = join(pageDir, 'page.json');
      await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
      result.metadataPath = metadataPath;
```

### Error path (lines 393–403)

```ts
        const metadata = {
          pageNumber,
          url,
          status: 'failed',
          error: result.error,
          capturedAt: new Date().toISOString(),
        };
        const metadataPath = join(pageDir, 'page.json');
        await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
        result.metadataPath = metadataPath;
```

### Fields in page.json (success path)

| Key | Source |
|-----|--------|
| **pageNumber** | argument |
| **url** | argument (requested URL) |
| **finalUrl** | result.finalUrl |
| **canonicalUrl** | result.canonicalUrl |
| **title** | result.title |
| **pageFingerprint** | result.pageFingerprint |
| **capturedAt** | ISO timestamp |
| **screenshotPath** | result.screenshotPath |
| **htmlPath** | result.htmlPath |
| **a11yPath** | result.a11yPath |
| **visionPath** | result.visionPath |

Error-path page.json has only: **pageNumber**, **url**, **status** (`'failed'`), **error**, **capturedAt** (no artifact paths).

---

## Step 3 & 4 — Where page.json is read and how it maps into PageArtifact

**File:** `apps/scanner/src/runner/report-generator.ts`  
**Function:** `ReportGenerator.loadPageArtifact` (private)  
**Called from:** `ReportGenerator.loadPageArtifacts(scanId)`, which iterates `output/{scanId}/pages/*` and calls `loadPageArtifact(pagePath, pageNumber)` for each directory.

### Metadata reader snippet (lines 71–88 and 119–121)

```ts
      // Load metadata
      const metadataPath = join(pageDir, 'page.json');
      const metadata = JSON.parse(await readFile(metadataPath, 'utf-8'));

      const artifact: PageArtifact = {
        pageNumber,
        url: metadata.url || '',
        title: metadata.title,
        finalUrl: metadata.finalUrl || metadata.url,
        accessibilityBarriers: metadata.accessibilityBarriers || [],
        canonicalUrl: metadata.canonicalUrl,
        pageFingerprint: metadata.pageFingerprint,
        htmlPath: metadata.htmlPath || join(pageDir, 'page.html'),
        screenshotPath: metadata.screenshotPath || join(pageDir, 'screenshot.png'),
        a11yPath: metadata.a11yPath || join(pageDir, 'a11y.json'),
        metadataPath,
        error: metadata.error,
      };

      // ... load html, a11y from paths ...

      // Set visionPath from metadata if available
      if (metadata.visionPath) {
        artifact.visionPath = metadata.visionPath;
      }

      return artifact;
```

### How existing paths are pulled from page.json into PageArtifact

- **htmlPath:** `metadata.htmlPath || join(pageDir, 'page.html')` — default path if missing.
- **screenshotPath:** `metadata.screenshotPath || join(pageDir, 'screenshot.png')` — default if missing.
- **a11yPath:** `metadata.a11yPath || join(pageDir, 'a11y.json')` — default if missing.
- **visionPath:** Not set in the initial artifact object. It is set only in the follow-up block: `if (metadata.visionPath) { artifact.visionPath = metadata.visionPath; }` — no default path (vision is optional).

So **visionPath** is optional and has no fallback; **agentPath** should follow the same pattern (optional, no default path).

---

## Step 5 — Minimal changes to support agentPath end-to-end

### 1. Metadata writer (page-capture.ts)

**File:** `apps/scanner/src/crawler/page-capture.ts`  
**Function:** `PageCapture.capturePage`

- In the **success-path** metadata object (around line 368), add:
  - **agentPath: result.agentPath** (or `result.agentPath ?? undefined` so it’s omitted when absent).
- When the InteractionAgent runs and writes its file, set **result.agentPath** to that path (e.g. `join(pageDir, 'agent.json')`) **before** the metadata block so it is included in the object.

No change to the error-path metadata (it intentionally omits artifact paths).

### 2. Metadata reader (report-generator.ts)

**File:** `apps/scanner/src/runner/report-generator.ts`  
**Function:** `ReportGenerator.loadPageArtifact` (private)

- After the block that sets **artifact.visionPath** from **metadata.visionPath**, add:
  - **if (metadata.agentPath) { artifact.agentPath = metadata.agentPath; }**

Alternatively, include it in the initial artifact literal: **agentPath: metadata.agentPath || undefined**. Both are minimal; the follow-up block matches the existing visionPath pattern.

### 3. Core types (PageArtifact and PageScanResult)

**File:** `packages/core/src/index.ts`

- On **PageScanResult** (around line 58): add **agentPath?: string;** (with other path fields).
- On **PageArtifact** (around line 114): add **agentPath?: string;** (e.g. after visionPath).

### 4. DB Page model and repository

**File:** `apps/scanner/prisma/schema.prisma`  
**Model:** `Page`

- Add **agentPath String?** (optional), same as visionPath.

**File:** `apps/scanner/src/db/scan-repository.ts`  
**Function:** `ScanRepository.upsertPage`

- In **create** and **update** data objects, add **agentPath: page.agentPath** (or **agentPath: page.agentPath ?? undefined** if you want to clear it when absent).

### 5. Callers that pass page into upsertPage

**Files:** `apps/scanner/src/job-queue.ts`, `apps/scanner/src/crawler/bfs-crawler.ts`

- They pass an object built from the capture **result** (PageScanResult). Once **result.agentPath** is set in page-capture and **PageScanResult** has **agentPath**, the same object passed to **upsertPage** will include **agentPath**; no extra mapping needed unless they explicitly list fields (then add **agentPath** to that list).

---

## Summary table: minimal changes by file

| Step | File | Function / location | Change |
|------|------|---------------------|--------|
| Writer | `apps/scanner/src/crawler/page-capture.ts` | `capturePage`, success metadata object | Add **agentPath: result.agentPath** to the metadata object. Set **result.agentPath** when the agent writes its file (before this block). |
| Reader | `apps/scanner/src/runner/report-generator.ts` | `loadPageArtifact` | Add **if (metadata.agentPath) { artifact.agentPath = metadata.agentPath; }** (or **artifact.agentPath = metadata.agentPath ?? undefined** in initial object). |
| Types | `packages/core/src/index.ts` | `PageScanResult`, `PageArtifact` | Add **agentPath?: string**. |
| Schema | `apps/scanner/prisma/schema.prisma` | `Page` model | Add **agentPath String?**. Run migration. |
| Repository | `apps/scanner/src/db/scan-repository.ts` | `upsertPage` (create + update) | Add **agentPath: page.agentPath** (or with undefined). |
| Capture | `apps/scanner/src/crawler/page-capture.ts` | After InteractionAgent writes file | Set **result.agentPath = join(pageDir, 'agent.json')** (or actual path) so it flows into metadata and into upsertPage payload. |

---

## Pitfalls (backward compatibility, missing fields)

1. **Old scans (page.json without agentPath)**  
   - **Reader:** Use **metadata.agentPath** only when present (e.g. `if (metadata.agentPath)` or `metadata.agentPath ?? undefined`). Do **not** use a default path like `join(pageDir, 'agent.json')` for missing keys, or old scans would point at a non-existent file.  
   - **DB:** **Page.agentPath** is optional; existing rows stay null. **upsertPage** should set **agentPath: page.agentPath ?? undefined** (or equivalent) so updates don’t require agentPath.

2. **Error-path metadata**  
   - The catch block writes a minimal page.json (no paths). So failed captures will never have **agentPath** in metadata; that’s consistent with no artifact. No change needed there.

3. **Missing page.json**  
   - **loadPageArtifact** already fails if page.json is missing (readFile throws, returns null). No change for agentPath.

4. **Consumers of PageArtifact / Page**  
   - Any code that builds API responses or report data from **artifact** or **page** and needs to expose or use agent results should read **artifact.agentPath** / **page.agentPath** only when present (same as visionPath). Downstream (saveReportResults agent findings, scan-detail layerAgent, etc.) is already covered in the AgentFinding persistence plan; this trace only ensures the path is written in metadata, loaded into PageArtifact, and persisted on Page.

5. **Order in capture**  
   - Set **result.agentPath** **before** building the metadata object so the success-path page.json includes it. If the agent runs later in the pipeline, ensure its write happens before the “Save metadata” block.

---

## Report-back summary (what was done per step)

| Step | What was done |
|------|----------------|
| 1 | Located in **page-capture.ts** the two places where page.json is written: success path (lines 357–373) and error path (lines 393–403); identified the metadata object and **metadataPath** assignment. |
| 2 | Copied the exact code that builds the metadata object and writes it (success and error); listed all keys in the success-path metadata (pageNumber, url, finalUrl, canonicalUrl, title, pageFingerprint, capturedAt, screenshotPath, htmlPath, a11yPath, visionPath). |
| 3 | Found the reader in **report-generator.ts** in **loadPageArtifact**: reads **page.json** via **join(pageDir, 'page.json')**, parses JSON into **metadata**, then builds **artifact**. |
| 4 | Showed how **htmlPath**, **screenshotPath**, **a11yPath** get defaults from metadata or fallback paths; **visionPath** is set only in a follow-up block from **metadata.visionPath** with no default. |
| 5 | Listed minimal changes: page-capture (add agentPath to metadata + set result.agentPath), report-generator (set artifact.agentPath from metadata.agentPath), core (agentPath on PageScanResult and PageArtifact), Prisma Page (agentPath column), scan-repository upsertPage (agentPath in create/update), and noted callers of upsertPage. Documented pitfalls: old scans (no default path), error path (no change), missing page.json, and order of setting result.agentPath before writing metadata. |

All references use exact file paths and function names from the codebase.
