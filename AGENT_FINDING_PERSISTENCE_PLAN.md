# AgentFinding Persistence Pipeline — Trace and Minimal Changes Plan

End-to-end trace of how scan results and findings are persisted, plus minimal changes to add **AgentFinding**.

---

## 1) Where WCAG findings are created and saved

### Call site of saveReportResults

**Single call site:** `apps/scanner/src/job-queue.ts` (inside `executeJob`), after report generation and before status update:

```ts
// Step 4: Persist final ScanRun
// ...
await scanRepository.saveReportResults(scanId, finalScanRun);
await scanRepository.updateScanStatus(scanId, 'completed', new Date());
```

So: **JobQueue.executeJob** → **ReportGenerator.generateReport** produces `finalScanRun` → **scanRepository.saveReportResults(scanId, finalScanRun)**.

### Where rule engine results become DB records

1. **ReportGenerator.generateReport** (`apps/scanner/src/runner/report-generator.ts`):
   - Loads page artifacts from disk (`loadPageArtifacts(scanId)`).
   - For each page: `ruleEngine.evaluatePage(page)` → WCAG **RuleResult[]**; `loadVisionFindings(page, scanId)` → vision **RuleResult[]** (from vision.json).
   - Pushes `ruleResults: [...ruleResults, ...visionRuleResults]` into `results` (PageRuleResults).
   - Builds **ScanRun** = { scanId, seedUrl, startedAt, completedAt, pages, results, summary } and returns it.

2. **scanRepository.saveReportResults** (`apps/scanner/src/db/scan-repository.ts`):
   - Resolves scan DB id and page number → page id map.
   - **WCAG findings:** Iterates `scanRun.results` and each `pageResult.ruleResults`; **skips** entries with `ruleResult.ruleId.startsWith('vision-')`. For the rest, pushes into `findingsData` (scanId, pageId, ruleId, wcagId, level, status, confidence, message, evidenceJson, howToVerify).
   - **Bulk insert:** `prisma.finding.createMany({ data: findingsData, skipDuplicates: true })`.

So **rule engine results become DB records** only inside **saveReportResults**, when iterating **scanRun.results[].ruleResults** and inserting into **Finding** (WCAG only; vision-* are skipped and handled via VisionFinding).

---

## 2) Where VisionFinding is created/saved and how it links to Page/Scan

### Creation (in memory + file)

- **VisionAnalyzer.analyzePage** (`apps/scanner/src/vision/analyzer.ts`) returns **VisionFinding[]** (in memory).
- **VisionAnalyzer.saveFindings** writes that array to **`{outputDir}/pages/{pageNumber}/vision/vision.json`**.
- **PageCapture.capturePage** (`apps/scanner/src/crawler/page-capture.ts`) calls `visionAnalyzer.analyzePage(...)` then `visionAnalyzer.saveFindings(...)` and sets **result.visionPath** to that path. So **vision findings are created during capture** and path is on the page result.

### Persistence to DB

- **saveReportResults** does not use `scanRun.results` for vision; it uses **scanRun.pages** and **page.visionPath**:
  - For each `page` in `scanRun.pages`, if `page.visionPath` exists, **readFile(page.visionPath)** → parse **VisionFinding[]**.
  - For each finding, push into **visionFindingsData** (scanId, pageId, kind, bboxJson, detectedText, confidence, correlatedSelector, evidenceJson, suggestedWcagIdsJson).
  - **prisma.visionFinding.createMany({ data: visionFindingsData, skipDuplicates: true })**.

### Link to Page/Scan

- **VisionFinding** (Prisma): **scanId** → Scan, **pageId** (optional) → Page. **Page** has **visionPath** (string, path to vision.json). So: **Scan 1–N VisionFinding**; **Page 0–N VisionFinding**; vision rows are linked by **scanId** and **pageId** (from pageIdMap keyed by pageNumber).

---

## 3) Prisma schema (Finding and VisionFinding)

**File:** `apps/scanner/prisma/schema.prisma`

```prisma
model Scan {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  scanId     String   @unique
  // ... other fields ...
  pages      Page[]
  findings   Finding[]
  visionFindings VisionFinding[]
  // ...
}

model Page {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  scanId       String   @db.Uuid
  scan         Scan     @relation(...)
  pageNumber   Int
  url          String
  // ...
  screenshotPath String?
  htmlPath     String?
  a11yPath     String?
  visionPath  String?
  findings     Finding[]
  visionFindings VisionFinding[]
  // ...
}

model Finding {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  scanId       String   @db.Uuid
  scan         Scan     @relation(fields: [scanId], references: [id], onDelete: Cascade)
  pageId       String?  @db.Uuid
  page         Page?    @relation(fields: [pageId], references: [id], onDelete: Cascade)
  ruleId       String
  wcagId       String?
  level        String?  // A, AA, AAA, vision
  status       String   // pass, fail, needs_review, na
  confidence   String   // high, medium, low
  message      String?
  evidenceJson Json     // EvidenceItem[] as JSON
  howToVerify  String
  createdAt    DateTime @default(now())
  @@index([scanId])
  @@index([pageId])
  @@index([ruleId])
  @@index([wcagId])
  @@index([status])
}

model VisionFinding {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  scanId            String   @db.Uuid
  scan              Scan     @relation(fields: [scanId], references: [id], onDelete: Cascade)
  pageId            String?  @db.Uuid
  page              Page?    @relation(fields: [pageId], references: [id], onDelete: Cascade)
  kind              String   // clickable_unlabeled, icon_button_unlabeled, etc.
  bboxJson          Json     // {x, y, width, height}
  detectedText      String?
  confidence        String   // high, medium, low
  correlatedSelector String?
  evidenceJson      Json     // EvidenceItem[] as JSON
  suggestedWcagIdsJson Json  // string[] as JSON
  createdAt         DateTime @default(now())
  @@index([scanId])
  @@index([pageId])
  @@index([kind])
}
```

---

## 4) Response adapter / API layer that returns findings to report-ui

- **Scan detail API:** **GET /api/scans/:scanId/detail** is implemented in **`apps/scanner/src/api/scan-detail.ts`** (handler around lines 33–221).
  - Loads scan with **Prisma** `include: { pages: { include: { findings: {...}, visionFindings: {...} } }, _count: { findings, visionFindings } }`.
  - Builds **layer1Findings** from **page.findings** (WCAG).
  - Builds **layer2Findings** from **page.visionFindings** (Vision).
  - Returns JSON with **pages[].layer1** (findings, counts) and **pages[].layer2** (findings, counts).

- **db-adapter** (`apps/scanner/src/api/db-adapter.ts`): **dbScanToApiResponse** builds a **ScanRun**-shaped object for other consumers; it maps **dbScan.findings** to rule results and **dbScan.visionFindings** to rule results (vision-* ruleId, etc.). Used when the API returns scan run format (e.g. from DB) rather than the scan-detail shape.

- **report-ui** fetches scan detail via **apiClient.getScanDetail(scanId)** (e.g. in **apps/report-ui/src/pages/ScanDetailPage.tsx**), which calls **GET /api/scans/:scanId/detail**. The UI displays **scanDetail.pages[].layer1.findings** and **scanDetail.pages[].layer2.findings** (e.g. “Layer 2: Vision Findings”, list of findings with kind/confidence/evidence).

---

## 5) Recommended approach: Option A — New Prisma model AgentFinding

**Recommendation: Option A (new AgentFinding model).**

**Reasoning:**

- **VisionFinding** is tightly shaped for vision: **kind** (clickable_unlabeled, icon_button_unlabeled, …), **bboxJson**, **detectedText**, **suggestedWcagIdsJson**. Agent findings are different: e.g. keyboard trap, focus order issue, unreachable-by-tab, missing-escape — different semantics and no bbox/detectedText in the same way.
- Reusing VisionFinding with **source='agent'** would require overloading **kind** (or adding a discriminator), making **bboxJson**/detectedText optional, and branching everywhere (scan-detail, db-adapter, report-generator, Excel/PDF). That spreads conditionals and increases risk of regressions for existing vision flows.
- A **separate AgentFinding** table keeps vision and agent concerns separate, mirrors the existing **Finding** vs **VisionFinding** split, and allows a clear **agentPath** (or similar) on Page for the agent JSON file, analogous to **visionPath**. Schema and repository changes are localized and easy to follow.

---

## Code snippets of the save functions

### saveReportResults (WCAG + Vision only)

**File:** `apps/scanner/src/db/scan-repository.ts` (excerpts)

```ts
async saveReportResults(scanId: string, scanRun: ScanRun): Promise<void> {
  // ... get scan id, build pageIdMap from prisma.page.findMany ...

  // Prepare findings (WCAG)
  const findingsData: Array<{ scanId, pageId, ruleId, wcagId, level, status, confidence, message, evidenceJson, howToVerify }> = [];
  for (const pageResult of scanRun.results) {
    const pageId = pageIdMap.get(pageResult.pageNumber) || null;
    for (const ruleResult of pageResult.ruleResults) {
      if (ruleResult.ruleId.startsWith('vision-')) continue;
      findingsData.push({
        scanId: scan.id,
        pageId,
        ruleId: ruleResult.ruleId,
        wcagId: ruleResult.wcagId || null,
        level: level || null,
        status: ruleResult.status,
        confidence: ruleResult.confidence,
        message: ruleResult.message || null,
        evidenceJson: ruleResult.evidence,
        howToVerify: ruleResult.howToVerify,
      });
    }
  }
  if (findingsData.length > 0) {
    await prisma.finding.createMany({ data: findingsData, skipDuplicates: true });
  }

  // Prepare vision findings (from files)
  const visionFindingsData: Array<{ scanId, pageId, kind, bboxJson, detectedText, confidence, correlatedSelector, evidenceJson, suggestedWcagIdsJson }> = [];
  for (const page of scanRun.pages) {
    if (!page.visionPath) continue;
    const visionContent = await readFile(page.visionPath!, 'utf-8');
    const visionFindings: VisionFinding[] = JSON.parse(visionContent);
    for (const finding of visionFindings) {
      visionFindingsData.push({
        scanId: scan.id,
        pageId: pageIdMap.get(page.pageNumber) || null,
        kind: finding.kind,
        bboxJson: finding.bbox,
        detectedText: finding.detectedText || null,
        confidence: finding.confidence,
        correlatedSelector: finding.correlatedSelector || null,
        evidenceJson: evidenceJsonData,
        suggestedWcagIdsJson: finding.suggestedWcagIds,
      });
    }
  }
  if (visionFindingsData.length > 0) {
    await prisma.visionFinding.createMany({ data: visionFindingsData, skipDuplicates: true });
  }

  // Update scan summary + compliance scores (from findingsData only), status completed
}
```

---

## End-to-end findings persistence flow (functions/files in order)

1. **Capture:** **PageCapture.capturePage** → writes **vision/vision.json** per page, sets **result.visionPath** (and other artifact paths). No DB write here.
2. **Upsert pages:** **JobQueue.executeJob** (sequential) or **BFSCrawler** (BFS) calls **scanRepository.upsertPage(scanId, pageResult)** so **Page** rows exist (including **visionPath**).
3. **Report:** **ReportGenerator.generateReport(scanId, ...)** loads artifacts from disk, runs **RuleEngine** (WCAG) and **loadVisionFindings** (vision file → RuleResult[]), builds **ScanRun** (results = WCAG + vision rule results; pages include visionPath).
4. **Persist:** **scanRepository.saveReportResults(scanId, finalScanRun)**:
   - WCAG: **scanRun.results[].ruleResults** (excluding vision-*) → **findingsData** → **prisma.finding.createMany**.
   - Vision: **scanRun.pages[].visionPath** → read **vision.json** → **visionFindingsData** → **prisma.visionFinding.createMany**.
   - Scan summary/scores/status updated from **findingsData** (WCAG only).
5. **API:** **GET /api/scans/:scanId/detail** (scan-detail.ts) loads Scan with **pages.findings** and **pages.visionFindings** and returns **layer1** (findings) and **layer2** (visionFindings).
6. **report-ui:** **ScanDetailPage** uses **getScanDetail(scanId)** and renders **scanDetail.pages[].layer1.findings** and **scanDetail.pages[].layer2.findings**.

---

## Concrete checklist of code changes by file path (Option A)

### Schema

- **`apps/scanner/prisma/schema.prisma`**
  - Add **Page.agentPath** (String?, optional), and **Page.agentFindings** relation.
  - Add model **AgentFinding** with: id, scanId, pageId (optional), **kind** (e.g. string: keyboard_trap, focus_order, unreachable_by_tab, missing_escape, etc.), **message** (String?), **confidence** (String), **evidenceJson** (Json), **howToVerify** (String?), **suggestedWcagIdsJson** (Json?), **createdAt**; relations to Scan and Page; indexes on scanId, pageId, kind.
  - Add **Scan.agentFindings** relation.
  - Run **prisma migrate** (new migration).

### Repository

- **`apps/scanner/src/db/scan-repository.ts`**
  - In **saveReportResults**, after vision findings block: for each **scanRun.pages** with **page.agentPath** (or equivalent: e.g. `agentPath` on PageArtifact), **readFile(page.agentPath)** → parse **AgentFinding[]** (from core type), build **agentFindingsData**, then **prisma.agentFinding.createMany({ data: agentFindingsData, skipDuplicates: true })**.
  - In **upsertPage** (or wherever page artifact is written), accept and persist **agentPath** on Page if present (and add **agentPath** to the create/update payload for Page).

### Report generator (where agent data is loaded)

- **`apps/scanner/src/runner/report-generator.ts`**
  - Add **loadAgentFindings(page, scanId)** that, if **page.agentPath** exists, reads and parses agent JSON, returns **AgentFinding[]** (or **RuleResult[]** if you want to merge into results; otherwise keep as separate list for summary only).
  - Optionally: convert agent findings to **RuleResult[]** (e.g. ruleId `agent-{kind}`) and append to **pageResult.ruleResults** so they appear in the same results array but are **not** included in WCAG compliance scores (same as vision-* today). Alternatively expose them only via a separate **scanRun.agentFindingsByPage** (or similar) and do not push into **results**; then API/layer can add a dedicated “Layer: Agent” section.
  - Ensure **loadPageArtifact** (or metadata) sets **artifact.agentPath** from **page.json** / metadata if you store agent path there (like visionPath).

### Capture / artifact path

- **`apps/scanner/src/crawler/page-capture.ts`**
  - After the InteractionAgent runs (in the hook you chose), if the agent returns findings and writes **agent.json** under the page dir, set **result.agentPath** to that path (e.g. `join(pageDir, 'agent.json')`). Ensure **page.json** metadata includes **agentPath** so **loadPageArtifact** can set it on the artifact.

### API

- **`apps/scanner/src/api/scan-detail.ts`**
  - In the Prisma **include** for pages, add **agentFindings: true** (or select needed fields).
  - In **pagesDetail** mapping, build **layerAgent** (or **layer2b** / “Agent”): **findings: page.agentFindings.map(...)**, **count**, confidence counts, etc.
  - Add to response **pages[].layerAgent** (or **layerAgent** per page) and **summary.totalAgentFindings** (e.g. from **_count.agentFindings** if you add it to include).

- **`apps/scanner/src/api/db-adapter.ts`** (if scan run format is used elsewhere)
  - If you merge agent into **ruleResults** in report-generator, no change. If you keep agent separate in DB only, add a loop over **dbScan.agentFindings** and append to **pageFindingsMap** with ruleId like **agent-{kind}** so legacy consumers that iterate “all findings” still see them.

### report-ui

- **`apps/report-ui/src/pages/ScanDetailPage.tsx`**
  - Extend page type to include **layerAgent: { findings: any[]; count: number; ... }** (or reuse same shape as layer2).
  - In the UI, add a section “Layer: Agent” (or “Keyboard / Interaction”) that lists **selectedPageData.layerAgent.findings** (and counts), similar to Layer 2 (Vision). Use existing patterns (confidence, message, howToVerify, evidence) for display.

### Core types

- **`packages/core/src/index.ts`**
  - Add **AgentFinding** interface (e.g. id?, pageNumber?, url?, kind, message?, confidence, evidence?, howToVerify?, suggestedWcagIds?).
  - Add **agentPath?: string** to **PageArtifact** if not already present.

### Excel / PDF (optional)

- **`apps/scanner/src/services/excel-report-generator.ts`** and **apps/scanner/src/api/pdf-export.ts** (or report content generator): decide whether agent findings are included in exports. If yes: add a sheet or section “Agent findings” and source from **AgentFinding** (or from scan run if you embedded them there); exclude from WCAG compliance scores same as vision.

### Delete scan

- **`apps/scanner/src/api/scan-detail.ts`** (or wherever scan delete lives): ensure **AgentFinding** is deleted when Scan is deleted (e.g. **onDelete: Cascade** on the relation), or add **prisma.agentFinding.deleteMany({ where: { scanId: scan.id } })** before deleting the scan if you don’t use cascade.

---

## Report-back summary (what was done per step)

| Step | What was done |
|------|----------------|
| 1 | Located **scanRepository.saveReportResults** in **apps/scanner/src/db/scan-repository.ts** and its single call site in **apps/scanner/src/job-queue.ts** (executeJob). Traced rule engine → **ReportGenerator.generateReport** building **scanRun.results[].ruleResults** (WCAG + vision as RuleResult); **saveReportResults** turns WCAG rule results into **Finding** rows and vision file contents into **VisionFinding** rows. |
| 2 | Traced **VisionFinding** creation to **VisionAnalyzer.analyzePage** + **saveFindings** (vision.json) and **PageCapture.capturePage** setting **result.visionPath**; persistence in **saveReportResults** by reading **page.visionPath** and **prisma.visionFinding.createMany**; linked via **scanId** and **pageId** (from pageIdMap). |
| 3 | Pasted Prisma **Scan**, **Page**, **Finding**, and **VisionFinding** models and relations from **apps/scanner/prisma/schema.prisma**. |
| 4 | Identified **GET /api/scans/:scanId/detail** in **apps/scanner/src/api/scan-detail.ts** as the API that returns findings to report-ui; it builds **layer1** from **page.findings** and **layer2** from **page.visionFindings**. **db-adapter.ts** **dbScanToApiResponse** also maps findings and visionFindings to a ScanRun-shaped response. **report-ui** uses **ScanDetailPage** and **getScanDetail** to show **layer1** and **layer2** findings. |
| 5 | Recommended **Option A (new AgentFinding model)** with reasoning; listed schema, repository, report-generator, page-capture/artifact, API (scan-detail + db-adapter), report-ui, core types, Excel/PDF, and delete-scan changes as a concrete checklist by file path. |

All references use exact file paths and function names from the codebase.
