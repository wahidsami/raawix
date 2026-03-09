# Agent Feature Flags and Runtime Caps — Pattern and Implementation

Where existing flags/limits live and exactly where to add **AGENT_ENABLED**, **AGENT_MAX_STEPS**, **AGENT_MAX_MS**, **AGENT_PROBES_ENABLED**, plus call-site wiring and Phase 0 safety.

---

## Step 1 — Existing feature flags / config toggles

### Where they are defined

**File:** `apps/scanner/src/config.ts`

All toggles and numeric limits are read from **process.env** in this single config object. No separate config/* for env; **config/scanner-settings.ts** holds **scanner** defaults (maxPages, maxDepth, maxRuntimeMs) with DB fallback, not feature flags.

**Snippet (feature flags and vision/gemini):**

```ts
  audit: {
    enabled: process.env.AUDIT_LOGGING !== 'false',
    logDir: process.env.AUDIT_LOG_DIR || './logs',
  },
  retention: {
    enabled: process.env.SCAN_RETENTION_ENABLED !== 'false',
    days: parseInt(process.env.SCAN_RETENTION_DAYS || '7', 10),
  },
  vision: {
    enabled: process.env.VISION_ENABLED !== 'false', // Default enabled
    ocrEnabled: process.env.VISION_OCR_ENABLED === 'true', // Default disabled
  },
  gemini: {
    enabled: process.env.GEMINI_ENABLED === 'true', // Default disabled
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    maxChars: parseInt(process.env.GEMINI_MAX_CHARS || '4000', 10),
    maxImageBytes: parseInt(process.env.GEMINI_MAX_IMAGE_BYTES || '10485760', 10),
    maxImagesPerScan: parseInt(process.env.GEMINI_MAX_IMAGES_PER_SCAN || '50', 10),
  },
  database: {
    url: process.env.DATABASE_URL || '',
    enabled: !!process.env.DATABASE_URL,
  },
```

### Where they are read

| Flag / config | Defined in | Read in (files) |
|---------------|------------|------------------|
| **vision.enabled** | config.ts | **page-capture.ts** (`if (config.vision.enabled)` before VisionAnalyzer), **vision/analyzer.ts** (`if (!config.vision.enabled) return []`) |
| **vision.ocrEnabled** | config.ts | **vision/analyzer.ts** (OCR branch) |
| **gemini.enabled** | config.ts | **vision/gemini-provider.ts** (`GeminiVisionProvider.isEnabled()`), **api/gemini-translator.ts** (`GeminiTranslator.isEnabled()`), **services/report-content-generator.ts**, **assistive/*.ts** |
| **retention.enabled** | config.ts | **utils/retention.ts** |
| **audit.enabled** | config.ts | **audit/logger.ts** |
| **database.enabled** | config.ts | **db/client.ts**, **index.ts** (startup log) |

**Pattern:** One place to define (**config.ts**); consumers import **config** and use **config.vision.enabled**, **config.gemini.enabled**, etc.

---

## Step 2 — Scan runtime limits / timeouts

### Central definitions

**File:** `apps/scanner/src/config.ts`

```ts
  quotas: {
    maxPagesHardLimit: parseInt(process.env.MAX_PAGES_HARD_LIMIT || '500', 10),
    maxDepthHardLimit: parseInt(process.env.MAX_DEPTH_HARD_LIMIT || '20', 10),
    maxRuntimeMs: parseInt(process.env.MAX_RUNTIME_MS || '10800000', 10), // 3 hours
  },
```

**File:** `apps/scanner/src/config/scanner-settings.ts`  
- **DEFAULT_SCANNER_SETTINGS**: maxPages (500), maxDepth (10), maxRuntimeMs (10800000). Used when DB settings are unavailable.  
- **getScannerSettings()** returns DB or these defaults.

**File:** `apps/scanner/src/job-queue.ts`  
- **Job TTL:** `ttl: Date.now() + config.quotas.maxRuntimeMs + 5 * 60 * 1000` (lines 109, 230).  
- **Per-scan timeout:** `timeoutMs = isSequentialScan ? max(selectedUrls.length * 60000, 600000) : config.quotas.maxRuntimeMs`; **Promise.race(crawlPromise, timeoutPromise)** (lines 465–475, 479–481, 763).  
- **cleanupStaleJobs()** uses job.ttl vs Date.now().

### Page-level / navigation timeouts

**File:** `apps/scanner/src/crawler/page-capture.ts`  
- **CaptureOptions.timeout:** `options.timeout || 20000` (line 56); used for **page.goto(url, { timeout })** (line 88).  
- No separate env for page timeout; it comes from the caller (e.g. job-queue passes 20000 in sequential capture).

**File:** `apps/scanner/src/crawler/page-stabilizer.ts`  
- **maxWaitMs** (e.g. 15000), **networkIdleMs**, **stableDomMs** from stabilization config; timeouts inside **waitForStable**.

**File:** `apps/scanner/src/crawler/bfs-crawler.ts`  
- **page.goto**: `timeout: 20000` (line 301 in discovery), **capturePage** options `timeout: 20000` (line 473).  
- **maxPages** / **maxDepth** from request, capped by **config.quotas.maxPagesHardLimit** / **maxDepthHardLimit** (lines 53–56, 382–388, 561–569).

**File:** `apps/scanner/src/crawler/page-discovery.ts`  
- **page.goto**: `timeout: 10000` (line 91).  
- **maxPages** / **maxDepth** from constructor (from API).

**File:** `apps/scanner/src/crawler/auth-helper.ts`  
- Login **page.goto**: `timeout: 30000`; **waitForURL** / **waitForSelector**: 10000 or 15000.

**File:** `apps/scanner/src/middleware/validation.ts`  
- **maxPages** / **maxDepth** validated against **config.quotas.maxPagesHardLimit** / **maxDepthHardLimit**.

**Summary:**  
- **Global scan cap:** config.quotas.maxRuntimeMs (+ job TTL) and config.quotas.maxPagesHardLimit / maxDepthHardLimit.  
- **Per-page navigation:** 20s default in page-capture and crawl; discovery 10s; auth 30s.  
- **Numeric caps:** Env in **config.ts** (and optionally DB in scanner-settings); validation in **validation.ts** and **job-queue** (Math.min with hard limits).

---

## Step 3 — Where scanner reads env and config

- **Env loading:** **`apps/scanner/src/index.ts`** line 2: **`import 'dotenv/config';`** — loads `.env` before any config use.  
- **Config object:** **`apps/scanner/src/config.ts`** — single export **config**; all env reads are **process.env.VAR** with defaults. No other file under **apps/scanner/src** defines a top-level config object; **config/scanner-settings.ts** is for scanner quotas (maxPages, maxDepth, maxRuntimeMs) with DB fallback, not env parsing.  
- **Usage:** Anywhere that needs a flag or limit does **import { config } from './config.js'** (or relative path) and uses **config.vision.enabled**, **config.quotas.maxRuntimeMs**, etc.

---

## Step 4 — Where to add AGENT_* (exact files)

Follow the same pattern: **define in config.ts**, use at call-sites.

### 1) config.ts — agent block

**File:** `apps/scanner/src/config.ts`

Add a new **agent** block after **gemini** (e.g. after line 62), same shape as **vision** / **gemini**:

```ts
  agent: {
    enabled: process.env.AGENT_ENABLED === 'true', // Default disabled (Phase 0)
    maxSteps: parseInt(process.env.AGENT_MAX_STEPS || '50', 10),
    maxMs: parseInt(process.env.AGENT_MAX_MS || '10000', 10), // 10 seconds per page
    probesEnabled: process.env.AGENT_PROBES_ENABLED === 'true', // Default disabled (Phase 2)
  },
```

- **AGENT_ENABLED**: opt-in; default off.  
- **AGENT_MAX_STEPS**: cap on agent steps per page (e.g. Tab/Enter cycles).  
- **AGENT_MAX_MS**: cap on agent runtime per page (ms).  
- **AGENT_PROBES_ENABLED**: reserved for Phase 2; read here, used later when probes exist.

### 2) .env.example (repo root)

**File:** `.env.example` (root; or `apps/scanner/.env.example` if you add one)

Under a new section, e.g. “Interaction Agent (keyboard)”:

```env
# ============================================
# Interaction Agent (keyboard / focus)
# ============================================
AGENT_ENABLED=false
AGENT_MAX_STEPS=50
AGENT_MAX_MS=10000
AGENT_PROBES_ENABLED=false
```

### 3) No DB or scanner-settings for agent

Agent limits are **env-only** (like vision/gemini toggles and numeric caps). **config/scanner-settings.ts** and the DB **ScannerSettings** table are for scan-wide quotas (maxPages, maxDepth, maxRuntimeMs); agent is per-page and optional, so keeping it in **config.ts** only is consistent and minimal.

---

## Step 5 — Call-site wiring: capturePage and failure safety

### Where to check the flag and run the agent

**File:** `apps/scanner/src/crawler/page-capture.ts`  
**Function:** `PageCapture.capturePage`  
**Place:** After the **accessibility barriers** block, before **“SECURITY: Ensure output directory path safety”** / **mkdir(pageDir)** — i.e. the hook identified in INTERACTION_AGENT_HOOK_ANALYSIS (after line 161, before line 163).

**Pattern to follow:** Same as **Vision** (lines 314–338): **if (config.vision.enabled)** then **try { ... } catch { console.warn(...); }** so a failure does not break the rest of capture.

**Minimal wiring:**

```ts
      // LAYER 1: Detect Accessibility Barriers ...
      const { detectAccessibilityBarriers } = await import(...);
      const accessibilityBarriers = await detectAccessibilityBarriers(page);
      // ...

      // AGENT (keyboard / interaction): optional, bounded
      if (config.agent.enabled) {
        try {
          const { runInteractionAgent } = await import('../agent/interaction-agent.js');
          const agentResult = await runInteractionAgent(page, {
            maxSteps: config.agent.maxSteps,
            timeoutMs: config.agent.maxMs,
          });
          if (agentResult?.findings?.length) {
            // Write agent.json, set result.agentPath (see persistence plan)
          }
        } catch (error) {
          console.warn(`[AGENT] Interaction agent failed for page ${pageNumber}:`, error);
        }
      }

      // SECURITY: Ensure output directory path safety (no traversal)
```

- **Check:** **config.agent.enabled** — only run when enabled.  
- **Bounds:** Pass **config.agent.maxSteps** and **config.agent.maxMs** into the agent so it can enforce a step limit and a timeout (implementation inside the agent).  
- **Failure:** **try/catch**; log and continue; do not throw. No change to **result.status** on agent failure (same as vision).  
- **result.agentPath:** Set only when agent runs and writes a file (and optionally only when there are findings); metadata and persistence follow PAGE_METADATA_AGENT_PATH_TRACE and AGENT_FINDING_PERSISTENCE_PLAN.

**config** is already imported in page-capture.ts (line 7: `import { config } from '../config.js';`).

### AGENT_PROBES_ENABLED (Phase 2)

- **Defined in:** **config.ts** as above.  
- **Use:** When you add “probes” (e.g. extra checks or instrumentation), gate them with **config.agent.probesEnabled** inside the agent or in a separate probe step; no change to the capturePage call-site until then.

---

## Phase 0 safety checklist

- **Timeout:** Agent run is bounded by **AGENT_MAX_MS** (e.g. 10s per page). Implement **runInteractionAgent** with **Promise.race(agentWork, timeoutPromise)** or an internal timer so it cannot hang the page.  
- **Max steps:** Agent is bounded by **AGENT_MAX_STEPS** (e.g. 50). Cap Tab/Enter/Space cycles (or similar) so the loop cannot run forever.  
- **Try/catch:** **capturePage** wraps the agent call in **try/catch**; on error log with **console.warn** and continue; do not throw.  
- **No navigation:** Agent must not trigger full-page navigation (e.g. avoid Enter on links that load a new URL, or block navigation in the page context). If it does, subsequent screenshot/HTML/vision would be for a different URL; document and/or prevent (e.g. intercept **page.goto** or restrict actions).  
- **Default off:** **AGENT_ENABLED** defaults to **false** so existing deployments are unchanged.  
- **Optional output:** If the agent writes **agent.json** only when there are findings, old scans and pages without agent runs do not need a file; **metadata.agentPath** and **result.agentPath** only set when the file exists (backward compatible).

---

## Report-back summary (what was done per step)

| Step | What was done |
|------|----------------|
| 1 | Searched for **VISION_ENABLED**, **GEMINI_ENABLED**, **enabled** usages. Listed definition in **config.ts** (vision, gemini, audit, retention, database) and all read sites (page-capture, vision/analyzer, gemini-provider, gemini-translator, report-content-generator, assistive, retention, audit/logger, db/client). |
| 2 | Found scan limits in **config.ts** (quotas.maxPagesHardLimit, maxDepthHardLimit, maxRuntimeMs), **config/scanner-settings.ts** (DEFAULT_SCANNER_SETTINGS, getScannerSettings), **job-queue.ts** (TTL, timeoutPromise, timeoutMs), **page-capture.ts** (timeout option 20000), **bfs-crawler.ts** (maxPages, maxDepth, goto timeout 20000), **page-discovery.ts** (maxPages, maxDepth, goto 10000), **auth-helper.ts** (30s/10s/15s), **validation.ts** (maxPages/maxDepth validation). |
| 3 | Confirmed env loading: **index.ts** `import 'dotenv/config'**; config read: **config.ts** only for the main config object; **config/scanner-settings.ts** for scanner numeric settings with DB fallback. |
| 4 | Recommended adding **config.agent** in **config.ts** with **enabled**, **maxSteps**, **maxMs**, **probesEnabled**; documented exact snippet and **.env.example** section; stated no DB/scanner-settings for agent. |
| 5 | Identified **page-capture.ts** as the call-site; showed the exact insertion point (after barriers, before path safety), the **if (config.agent.enabled)** + **try/catch** + **console.warn** pattern (same as vision), and that **config** is already imported. Added Phase 0 safety checklist (timeout, max steps, try/catch, no navigation, default off, optional output). |

All references use exact file paths and code evidence from the repo.
