# RaawiX Scan Methodology

## Overview
The RaawiX scanner uses a **3-layer architecture** to comprehensively analyze web pages for accessibility compliance and generate assistive maps.

---

## Scan Execution Flow

### 1. Scan Initiation
- User starts scan via dashboard (Entity → Property → Start Scan)
- Scanner receives request with: `entityId`, `propertyId`, `seedUrl`, `maxPages`, `maxDepth`
- Scan job is queued with status: `queued` → `running` → `completed`

### 2. Crawling Phase
- **Crawler** (`crawler/crawler.ts`) discovers pages starting from `seedUrl`
- Respects `maxPages` and `maxDepth` limits
- For each discovered URL:
  - **PageCapture** (`crawler/page-capture.ts`) captures the page

---

## The 3-Layer Architecture

### **Layer 1: DOM/HTML Analysis (Code-Based)**
**When:** During page capture  
**What happens:**
1. Page HTML is captured and saved to disk: `output/{scanId}/pages/{pageNumber}/page.html`
2. DOM is parsed and analyzed
3. **WCAG Rules Engine** evaluates the page against all registered WCAG rules
4. Findings are saved to database as `Finding` records
5. **Log marker:** `[L1] Captured DOM/HTML for page {pageNumber}`

**Output:**
- HTML snapshot on disk
- `Finding` records in database (with `wcagId`, `ruleId`, `status`, `level`, `message`, `evidence`)

---

### **Layer 2: Vision Analysis (Screenshot-Based)**
**When:** After Layer 1 completes for each page  
**What happens:**
1. Screenshot is captured: `output/{scanId}/pages/{pageNumber}/screenshot.png`
2. **Vision Analyzer** (`vision/analyzer.ts`) analyzes the screenshot
3. Detects visual accessibility issues:
   - Unlabeled clickable elements
   - Icon-only buttons
   - Text contrast issues
   - Missing focus indicators
   - Elements styled like buttons but not semantic buttons
4. Optional: **Gemini Vision API** can enhance findings (if enabled)
5. Findings are saved to database as `VisionFinding` records
6. **Log marker:** `[L2] Vision analysis complete for page {pageNumber}`

**Output:**
- Screenshot on disk
- `VisionFinding` records in database (with `kind`, `confidence`, `status`, `detectedText`, `description`)

---

### **Layer 3: Assistive Map Generation (Synthesis)**
**When:** After both Layer 1 and Layer 2 complete for a page  
**What happens:**
1. **AssistiveMapGenerator** (`assistive/assistive-map-generator.ts`) combines:
   - Layer 1: DOM structure and WCAG findings
   - Layer 2: Vision findings and screenshots
2. Generates three types of enhancements:
   - **Label Overrides:** Better accessible names for unlabeled controls
   - **Image Descriptions:** Alt text for images missing descriptions
   - **Action Intents:** Contextual descriptions for buttons/links
3. Map is saved to:
   - **Disk:** `output/{scanId}/pages/{pageNumber}/assistive-model.json`
   - **Database:** `Site` → `PageVersion` → `AssistiveMap`
4. **Log marker:** `[L3] Assistive map generated and persisted`

**Output:**
- `assistive-model.json` artifact on disk
- `AssistiveMap` record in database (linked to `PageVersion`)

---

## Database Schema for Assistive Maps

```
Site (domain: "example.com")
  └── PageVersion (canonicalUrl, fingerprintHash)
        └── AssistiveMap (json, confidenceSummary)
```

**Key relationships:**
- `Site.domain` = hostname extracted from `seedUrl`
- `PageVersion.canonicalUrl` = normalized page URL
- `PageVersion.fingerprintHash` = hash of page content (for deduplication)
- `AssistiveMap.json` = full assistive map data (labelOverrides, imageDescriptions, actionIntents)

---

## Storage Locations

### Disk Artifacts
```
output/{scanId}/
  ├── report.json                    # Full scan report
  └── pages/
      └── {pageNumber}/
          ├── page.html              # Layer 1: HTML snapshot
          ├── screenshot.png         # Layer 2: Screenshot
          └── assistive-model.json   # Layer 3: Assistive map
```

### Database Records
- `Scan` table: Scan metadata (scanId, status, seedUrl, entityId, propertyId)
- `Page` table: Page metadata (pageNumber, url, canonicalUrl, finalUrl)
- `Finding` table: Layer 1 WCAG findings
- `VisionFinding` table: Layer 2 vision findings
- `Site` table: Domain registry
- `PageVersion` table: Page version tracking (for deduplication)
- `AssistiveMap` table: Layer 3 assistive maps

---

## Why Assistive Maps Might Not Appear

### Common Issues:

1. **Site Not Created**
   - **Check:** Does `Site` record exist for the domain?
   - **Fix:** `assistiveMapRepository.getOrCreateSite(domain)` should create it automatically

2. **PageVersion Not Created**
   - **Check:** Does `PageVersion` exist for the canonicalUrl + fingerprintHash?
   - **Fix:** Requires `page.canonicalUrl` and `page.pageFingerprint` to be set

3. **AssistiveMap Not Saved**
   - **Check:** Database errors during `upsertAssistiveMap`
   - **Fix:** Check scanner logs for `[L3]` messages

4. **API Query Issue**
   - **Check:** `/api/assistive-maps` endpoint queries `AssistiveMap` with `PageVersion` and `Site` relations
   - **Fix:** Ensure joins are correct

### Diagnostic Steps:

1. **Check scanner logs** for `[L3]` messages:
   ```
   [L3] Assistive map generated for page 1: X images, Y labels, Z actions
   [L3] Assistive map saved: DB pageVersionId {id}, artifact: {path}
   ```

2. **Check database:**
   ```sql
   SELECT COUNT(*) FROM "AssistiveMap";
   SELECT * FROM "Site" WHERE domain = 'your-domain';
   SELECT * FROM "PageVersion" WHERE "siteId" = 'site-id';
   ```

3. **Check disk artifacts:**
   ```
   output/{scanId}/pages/{pageNumber}/assistive-model.json
   ```

4. **Use Pipeline Inspector:**
   - Go to Scan Detail page → Pipeline Inspector
   - Check Layer 3 status for each page

---

## Scan Status Flow

```
queued → running → completed
                ↓
         (if error)
                ↓
              failed
```

**During `running`:**
- Pages are crawled and captured (Layer 1)
- Vision analysis runs (Layer 2)
- Assistive maps are generated (Layer 3)
- Findings are saved to database
- Report is generated and saved

---

## Key Files

- **Scan Execution:** `apps/scanner/src/index.ts` (scan runner)
- **Crawler:** `apps/scanner/src/crawler/crawler.ts`
- **Page Capture:** `apps/scanner/src/crawler/page-capture.ts`
- **Vision Analysis:** `apps/scanner/src/vision/analyzer.ts`
- **Report Generation:** `apps/scanner/src/runner/report-generator.ts`
- **Assistive Map Generation:** `apps/scanner/src/assistive/assistive-map-generator.ts`
- **Assistive Map Repository:** `apps/scanner/src/db/assistive-map-repository.ts`

---

## API Endpoints

- `GET /api/scans/:scanId/detail` - Full scan detail with Layer 1/2/3 breakdown
- `GET /api/scans/:scanId/debug` - Pipeline inspector data
- `GET /api/assistive-maps` - List all assistive maps
- `GET /api/findings` - List findings (Layer 1 + Layer 2)

