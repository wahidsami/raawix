# RAAWI X — Phase 7B.0
## Controlled Test Environment Readiness Report

**Repository:** `wahidsami/raawix`  
**Branch:** `feature/semantic-core`  
**Baseline HEAD SHA:** `3404336431d1ec4ef42df85407e7cfce0a7b30bd`  
**Working Tree Status:** Clean, fully synchronized with `origin/feature/semantic-core`  
**Evaluation Timestamp:** `2026-10-22T04:28:00+03:00`  
**Overall Readiness Verdict:** **NOT READY FOR EXECUTION (BLOCKED)**

---

## Executive Summary

Pursuant to the **Phase 7B.0 authorization**, a comprehensive, non-destructive, read-only preflight readiness check was conducted across the local execution environment, network boundaries, SSRF security restrictions, fixture source code, request schemas, and verification pipelines for the proposed controlled tests (**RUN-01**, **RUN-02**, **RUN-03**).

### Verdict Summary

| Check Item | Description | Status | Evidence / Observation |
| :--- | :--- | :---: | :--- |
| **1. Baseline & Git Integrity** | Branch, commit, tree cleanliness, origin sync | **PASS** | HEAD `3404336431d1ec4ef42df85407e7cfce0a7b30bd`, clean working tree, up to date with origin. |
| **2. Fixture Route Verification** | Expected routes in `portal-good` & `gov-sim` | **PASS** | All expected routes exist (`/`, `/about`, `/news`, `/services`, `/contact`, `/login`, `/auth/verify`, `/dashboard`, `/apply`). |
| **3. Test Fixture Startability** | Startup of `portal-good:4173` & `gov-sim:4174` | **FAIL (BLOCKER 1)** | Esbuild crashes on start due to stale transpiled `.js` build files committed in `src/` shadowing `.tsx`. |
| **4. Execution Topology** | Scanner execution location & isolation | **PASS** | Local Node.js process with local PostgreSQL on `localhost:5432`; no containerization required. |
| **5. Read-Only Fixture Reachability** | Network path from scanner to fixtures | **PASS (CONDITIONAL)** | Loopback TCP routing exists, but application-level SSRF rules strictly reject fixture ports. |
| **6. SSRF Security & Network Policy** | Port & host validation against security rules | **FAIL (BLOCKER 2)** | `validateUrl()` enforces `config.allowedPorts` (default `[80, 443]`). Ports `4173` and `4174` are rejected with HTTP 400. |
| **7. Persistence & Isolation** | DB, artifacts, and UI isolation from production | **PASS** | Local DB `raawi_x` on port 5432, local artifacts in `apps/scanner/output`, local UI on port 5173. Zero production resource access. |
| **8. Configuration Compatibility** | Request schema & process gates for RUN-01/02/03 | **PASS** | All payload properties supported by `scanRequestSchema`; gates mapped to process environment. |
| **9. Fixture Behavioral Fidelity** | Known defects, non-sensitive mock credentials | **PASS** | Well-documented in `EXPECTED_SCANNER_FINDINGS.md`; mock credentials only; zero PII. |
| **10. Verification Methodology** | Step-by-step verification plan for findings/traces | **PASS** | Direct inspection of SSE, DB tables (`Finding`, `AgentFinding`), `interaction.json`, and UI drawers defined. |

**Final Recommendation:** **STOP — DO NOT EXECUTE SCANS.** The test environment is **NOT READY** until coordinator authorizes:
1. Removal or cleanup of stale transpiled `.js` files from `test-sites/portal-good/src` and `test-sites/gov-sim/src`.
2. Explicit isolated test configuration allowing ports `4173` and `4174` in development (`ALLOWED_PORTS=80,443,4173,4174`).
3. Local daemon startup of the test fixtures and scanner API.

---

## 1. Baseline and Working-Tree Status

- **Repository:** `wahidsami/raawix`
- **Active Branch:** `feature/semantic-core`
- **Expected Baseline SHA:** `3404336431d1ec4ef42df85407e7cfce0a7b30bd`
- **Current HEAD SHA:** `3404336431d1ec4ef42df85407e7cfce0a7b30bd`
- **Upstream Sync:** `Your branch is up to date with 'origin/feature/semantic-core'`
- **Working Tree:** Clean (no untracked, modified, or uncommitted files).

---

## 2. Test Fixture Analysis and Route Audit

Both test fixtures were statically inspected to verify the existence of all expected routes, form fields, and behavioral characteristics.

### 2.1 `test-sites/portal-good` (Target Port: 4173, Entity: `TEST-GOOD`)

- **Design Intent:** Highly compliant Arabic/English portal (target compliance 95–100%) serving as clean baseline for **RUN-01**.
- **Verified Route Tree (`src/App.tsx`):**
  - `/`: [HomePage.tsx](file:///d:/Waheed/RaawiX/test-sites/portal-good/src/pages/HomePage.tsx) (Hero, accessible feature cards, clean contrast)
  - `/about`: [AboutPage.tsx](file:///d:/Waheed/RaawiX/test-sites/portal-good/src/pages/AboutPage.tsx) (Semantic article structure)
  - `/news`: [NewsPage.tsx](file:///d:/Waheed/RaawiX/test-sites/portal-good/src/pages/NewsPage.tsx) (Listing with properly labeled links and alt text)
  - `/news/:slug`: [NewsDetailPage.tsx](file:///d:/Waheed/RaawiX/test-sites/portal-good/src/pages/NewsDetailPage.tsx) (Article detail)
  - `/services`: [ServicesPage.tsx](file:///d:/Waheed/RaawiX/test-sites/portal-good/src/pages/ServicesPage.tsx) (Card grid with accessible button names)
  - `/services/:serviceId`: [ServiceDetailPage.tsx](file:///d:/Waheed/RaawiX/test-sites/portal-good/src/pages/ServiceDetailPage.tsx)
  - `/resources`: [ResourcesPage.tsx](file:///d:/Waheed/RaawiX/test-sites/portal-good/src/pages/ResourcesPage.tsx)
  - `/resources/accessibility`: [AccessibilityPage.tsx](file:///d:/Waheed/RaawiX/test-sites/portal-good/src/pages/AccessibilityPage.tsx) (Compliance statement)
  - `/contact`: [ContactPage.tsx](file:///d:/Waheed/RaawiX/test-sites/portal-good/src/pages/ContactPage.tsx) (Accessible form with explicit `<label htmlFor="...">`)
  - `/sitemap`: [SitemapPage.tsx](file:///d:/Waheed/RaawiX/test-sites/portal-good/src/pages/SitemapPage.tsx) (Hierarchical link tree)

### 2.2 `test-sites/gov-sim` (Target Port: 4174, Entity: `TEST-GOV`)

- **Design Intent:** Government service portal with intentional WCAG violations and interactive flows for **RUN-02** and **RUN-03**.
- **Verified Route Tree (`src/App.tsx`):**
  - `/`: [LandingPage.tsx](file:///d:/Waheed/RaawiX/test-sites/gov-sim/src/pages/LandingPage.tsx) (Intentional missing alt text on hero and cards; unlabeled "المزيد" button)
  - `/login`: [LoginPage.tsx](file:///d:/Waheed/RaawiX/test-sites/gov-sim/src/pages/LoginPage.tsx) (Intentional unlabeled input with placeholder only; mock 10-digit ID form)
  - `/auth/verify`: [VerifyPage.tsx](file:///d:/Waheed/RaawiX/test-sites/gov-sim/src/pages/VerifyPage.tsx) (Mock OTP verification returning `mock-token-{timestamp}`)
  - `/dashboard`: [DashboardPage.tsx](file:///d:/Waheed/RaawiX/test-sites/gov-sim/src/pages/DashboardPage.tsx) (`ProtectedRoute` requiring mock session)
  - `/services`: [ServicesPage.tsx](file:///d:/Waheed/RaawiX/test-sites/gov-sim/src/pages/ServicesPage.tsx) (Interactive service list with multi-step interactive elements for **RUN-03**)
  - `/services/:id`: [ServiceDetailPage.tsx](file:///d:/Waheed/RaawiX/test-sites/gov-sim/src/pages/ServiceDetailPage.tsx)
  - `/apply/:id/step-1` to `step-3`: Multi-step application wizard
  - `/apply/:id/review`: Application review page
  - `/apply/:id/success`: Success confirmation page (intentional missing alt text on icon)

### 2.3 Fixture Credential and Privacy Isolation

- Both fixtures use completely client-side, synthetic state (`useAuth` hook storing `mock-token-${Date.now()}` in `sessionStorage`/React state).
- The login form accepts any 10-digit numeric ID.
- The verification form accepts any 6-digit OTP.
- **Zero real personal data, zero production APIs, and zero secret credentials exist in the fixtures.**

---

## 3. Execution Topology and Runtime Environment

### 3.1 Architecture Overview

```mermaid
flowchart LR
    subgraph Host Workstation [Developer Workstation (Windows)]
        subgraph Test Fixtures
            PG[Portal Good<br/>http://localhost:4173]
            GS[Gov Sim<br/>http://localhost:4174]
        end

        subgraph Local Scanner Service
            API[Scanner Express API<br/>http://localhost:3001]
            Worker[In-Process JobQueue<br/>Playwright Chromium]
        end

        subgraph Storage & Reporting
            PGSQL[(Local PostgreSQL<br/>localhost:5432/raawi_x)]
            Artifacts[Local Disk<br/>apps/scanner/output/]
            UI[Report UI Vite App<br/>http://localhost:5173]
        end

        API --> PGSQL
        API --> Artifacts
        Worker --> PGSQL
        Worker --> Artifacts
        UI --> API
        Worker -.->|Playwright HTTP| PG
        Worker -.->|Playwright HTTP| GS
    end

    subgraph Remote Cloud [Isolated / Unused for Phase 7B]
        Coolify[Coolify VPS<br/>test-api.unifinitylab.com]
        Prod[Production Services]
    end

    Host Workstation -.-x|PROHIBITED / BLOCKED| Remote Cloud
```

### 3.2 Execution Locus Determination

1. **Docker Status:** Docker is **not installed** / not present in PATH on the host machine.
2. **Remote Test Service Status:** `test-api.unifinitylab.com` and `test-report.unifinitylab.com` run on an external Coolify VPS. They cannot resolve or connect to developer laptop ports `4173` or `4174` over the internet, and remote `ALLOW_LOCALHOST` is set to `false`.
3. **Determined Execution Locus:** The scanner API and worker **must execute as a local Node.js process** on the Windows developer workstation (`pnpm scanner:dev` or `start-all.ps1`). In this locus, `localhost` has a consistent meaning across the scanner worker, browser automation instance, and test fixture daemons.

---

## 4. SSRF Security and Network Boundary Audit

### 4.1 SSRF Policy Implementation in `apps/scanner/src/security/ssrf.ts`

The scanner enforces strict SSRF protections in `validateUrl(url, allowedPorts)`:

```typescript
// Port enforcement
if (allowedPorts && allowedPorts.length > 0) {
  const port = parsed.port ? parseInt(parsed.port, 10) : parsed.protocol === 'https:' ? 443 : 80;
  if (!allowedPorts.includes(port)) {
    throw new Error(`Port ${port} is not allowed. Only ports ${allowedPorts.join(', ')} are permitted.`);
  }
}

// Localhost and loopback enforcement
const allowLocalhost = config.allowLocalhost;
const hostname = parsed.hostname.toLowerCase();
const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || ...;

if (isPrivateIPv4(hostname) || isPrivateIPv6(hostname)) {
  throw new Error(`Private IP address ${hostname} is not allowed`);
}

if (!allowLocalhost) {
  if (isLocalhost || hostname.startsWith('0.0.0.0')) {
    throw new Error('localhost and loopback addresses are not allowed');
  }
}
```

### 4.2 Incompatibility Analysis

In `apps/scanner/src/config.ts`:
```typescript
allowedPorts: process.env.ALLOWED_PORTS
  ? process.env.ALLOWED_PORTS.split(',').map((p) => parseInt(p.trim(), 10))
  : [80, 443], // Default to web-safe ports only
allowLocalhost: process.env.ALLOW_LOCALHOST === 'true',
```

In `apps/scanner/.env`:
```env
PORT=3001
ALLOW_LOCALHOST=true
# ALLOWED_PORTS is unset!
```

Because `ALLOWED_PORTS` is unset in `apps/scanner/.env`, `config.allowedPorts` defaults strictly to `[80, 443]`.

When the scanner attempts to queue or validate a scan targeting:
- `http://localhost:4173/` (RUN-01) -> Port is `4173` -> **REJECTED**: `Error: Port 4173 is not allowed. Only ports 80, 443 are permitted.`
- `http://localhost:4174/` (RUN-02) -> Port is `4174` -> **REJECTED**: `Error: Port 4174 is not allowed. Only ports 80, 443 are permitted.`
- `http://localhost:4174/services` (RUN-03) -> Port is `4174` -> **REJECTED**: `Error: Port 4174 is not allowed. Only ports 80, 443 are permitted.`

### 4.3 Proposed Safe Isolated Networking Arrangement

In accordance with strict boundary rule: *"Do not broaden host, port, or external-network permissions to make the tests work. If the proposed topology is incompatible with the security rules, document a safer isolated networking arrangement and stop."*

The following isolated networking arrangements are documented for coordinator selection:

1. **Option 1 (Explicit Development Port Whitelisting — Recommended):**
   - Authorize setting `ALLOWED_PORTS=80,443,4173,4174` strictly within the local development environment (`apps/scanner/.env` or runtime launch script).
   - In `apps/scanner/src/security/ssrf.ts`, ports `4173` and `4174` will only be permissible when `config.allowLocalhost === true` and the target hostname resolves to loopback (`127.0.0.1` / `localhost`). External requests to arbitrary high ports remain strictly blocked.
2. **Option 2 (Local Reverse Proxy on Standard Port 80):**
   - Place a lightweight local reverse proxy (such as Caddy or Nginx) listening on `127.0.0.1:80` mapping:
     - `http://portal-good.local/` -> `localhost:4173`
     - `http://gov-sim.local/` -> `localhost:4174`
   - Keeps `ALLOWED_PORTS=[80, 443]` completely untouched.
   - Requires adding local hosts file entries (`127.0.0.1 portal-good.local gov-sim.local`).

Execution cannot proceed until the coordinator selects and authorizes an arrangement.

---

## 5. Configuration Compatibility for RUN-01, RUN-02, and RUN-03

The proposed test parameters from the Phase 7A specification were cross-referenced against the active scanner request validation schema (`apps/scanner/src/middleware/validation.ts`) and process-level configuration gates (`apps/scanner/src/config.ts`).

### 5.1 Parameter Compatibility Matrix

| Parameter / Field | RUN-01 Spec | RUN-02 Spec | RUN-03 Spec | Schema / Gate Support | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `seedUrl` | `http://localhost:4173/` | `http://localhost:4174/` | `http://localhost:4174/services` | Supported (`z.string().url()`) | **COMPATIBLE** |
| `auditMode` | `classic` | `classic` | `classic` | Supported (`z.enum(['classic', 'raawi-agent'])`) | **COMPATIBLE** |
| `scanPipeline.layer1` | `true` | `true` | `true` | Supported in `scanPipelineSchema` | **COMPATIBLE** |
| `scanPipeline.layer2` | `true` | `true` | `false` | Supported in `scanPipelineSchema` | **COMPATIBLE** |
| `scanPipeline.layer3` | `false` | `false` | `true` | Supported in `scanPipelineSchema` | **COMPATIBLE** |
| `scanPipeline.analysisAgent` | `false` (implicit) | `false` (implicit) | `true` | Supported in `scanPipelineSchema` | **COMPATIBLE** |
| `scanPipeline.screenshotMode` | `'viewport'` / default | `'viewport'` / default | `'none'` | Supported (`z.enum(['none', 'viewport', 'full'])`) | **COMPATIBLE** |
| `maxPages` | `1` | `1` | `1` | Supported (`z.number().int().positive()`) | **COMPATIBLE** |
| `maxDepth` | `0` | `0` | `0` | Supported (`z.number().int().nonnegative()`) | **COMPATIBLE** |

### 5.2 Per-Scan Pipeline Flags vs Process-Level Environment Gates

| Verification Layer | Per-Scan Request Payload Flag | Process-Level Environment Gate | Active Default in Local Env |
| :--- | :--- | :--- | :---: |
| **Layer 1: DOM / WCAG** | `scanPipeline.layer1: true` | Always active in scanner engine | Active |
| **Layer 2: Vision** | `scanPipeline.layer2: true` | `OPENAI_ENABLED`, `GEMINI_ENABLED` | Heuristic fallback active; external vision off (`GEMINI_ENABLED=false`) |
| **Layer 3A: Keyboard Agent** | `scanPipeline.analysisAgent: true` | `AGENT_ENABLED !== 'false'` | Active (`config.agent.enabled = true`) |
| **Agent Max Steps** | Bound by process config | `AGENT_MAX_STEPS` (default: 50) | 50 (RUN-03 targets <= 25 steps) |
| **Agent Timeout** | Bound by process config | `AGENT_MAX_MS` (default: 10000ms) | 10000ms (RUN-03 targets 15000ms) |
| **Agent Probes** | Bound by process config | `AGENT_PROBES_ENABLED !== 'false'` | Active (`config.agent.probesEnabled = true`) |
| **Autonomous Execution** | Prohibited for RUN-01..03 | `RAAWI_EXECUTION_AGENT_ENABLED === 'true'` | Inactive (`false` by default; safe) |

**Conclusion:** The request schema in `apps/scanner/src/middleware/validation.ts` completely supports all planned payload options for RUN-01, RUN-02, and RUN-03. For RUN-03's targeted timeout of 15000ms, the process-level environment variable `AGENT_MAX_MS=15000` should be supplied in the local test environment when authorized.

---

## 6. Detailed Inspection and Verification Protocol

When execution authorization is granted, each run will be verified across five observable evidence layers:

### 6.1 RUN-01 (Clean Portal Baseline Scan)

1. **Scan Lifecycle:** Monitor SSE stream (`/api/scans/:id/events`) through `scan_start` -> `page_start` -> `layer1` -> `layer2` -> `completed`.
2. **Database Record:** Query `prisma.scan.findUnique({ where: { scanId } })`:
   - `status` === `'completed'`
   - `auditMode` === `'classic'`
   - `complianceScore` >= 95%
3. **WCAG Findings:** Query `prisma.finding.findMany({ where: { scanId } })`:
   - Zero `fail` findings for Level A and Level AA core rules (1.1.1, 3.3.2, 4.1.2, 2.4.7, 1.4.3, 2.1.1, 2.4.3, 2.4.4).
   - Any `needs_review` or informational items documented and cross-referenced with `EXPECTED_SCANNER_FINDINGS.md`.
4. **Disk Artifacts:** Verify existence in `apps/scanner/output/{scanId}/`:
   - `page.html` (DOM snapshot)
   - `page.json` (page metadata)
   - `screenshot.png` (viewport capture)
   - `summary.json`
5. **Report UI & Exports:** Inspect `http://localhost:5173/scans/{scanId}`; verify English and Arabic Excel downloads (`GET /api/scans/{scanId}/export?locale=en` and `locale=ar`) produce valid `.xlsx` workbooks with localized sheet titles.

### 6.2 RUN-02 (Defect Detection on Intentional Failure Portal)

1. **Scan Lifecycle:** Full cycle to `completed` in < 30 seconds.
2. **Database Record:** Query `prisma.scan.findUnique({ where: { scanId } })`:
   - `status` === `'completed'`
   - `complianceScore` visibly reduced due to intentional fails.
3. **WCAG Findings:** Confirm exact presence of intentional defects from `EXPECTED_SCANNER_FINDINGS.md`:
   - Rule `1.1.1` (Fail): Missing alt text on hero image `img[src="/assets/images/gov_hero.png"]`.
   - Rule `1.1.1` (Fail): Missing alt text on service card image `img[src="/assets/images/service_card_1.png"]`.
   - Rule `4.1.2` (Fail / Review): Unlabeled generic button "المزيد".
4. **False Positive / Negative Check:** Confirm no unexpected failures on correctly implemented components.

### 6.3 RUN-03 (Active Keyboard Interaction Traversal)

1. **SSE Lifecycle:** Observe SSE event stream for `agent_progress` events with sequential `stepIndex` values (`1, 2, 3, ... >= 5`).
2. **Keyboard Traversal Trace:** Inspect `apps/scanner/output/{scanId}/interaction/interaction.json`:
   - `steps` array has length >= 5.
   - Each step records active `Tab` navigation events, active element selectors, and focus indicator computed styles.
3. **Probes:** Verify focus visibility and aria-expanded state evaluations were attempted during keyboard traversal.
4. **Agent Findings:** Query `prisma.agentFinding.findMany({ where: { scanId } })`:
   - `kind` includes `unnamed_task_control` or keyboard accessibility issues discovered during traversal.
5. **Telemetry Integrity:** Verify `interaction.json` lifecycle status is `'completed'` (prohibiting false `incomplete` or synthetic 0-step traces, confirming Phase 4 telemetry remediation).
6. **Report UI:** Verify the Agent Trace drawer in `http://localhost:5173/scans/{scanId}` cleanly renders the step-by-step keyboard sequence without React errors.

---

## 7. Outstanding Blockers Preventing Immediate Execution

The readiness check has identified three specific conditions that must be addressed prior to execution:

### Blocker 1: Test Site Fixture Build/Runtime Failure
- **Root Cause:** Stale transpiled JavaScript files (`src/App.js`, `src/components/*.js`, `src/pages/*.js`, and accompanying `.d.ts` / `.map` files) were previously committed to the repository in `test-sites/portal-good/src` and `test-sites/gov-sim/src`.
- **Symptom:** When Vite attempts to start the dev server, esbuild encounters the `.js` files (which shadow `.tsx`) and throws:
  ```
  [ERROR] The JSX syntax extension is not currently enabled for src/App.js
  The esbuild loader for this file is currently set to "js" but it must be set to "jsx" to be able to parse JSX syntax.
  ```
- **Remediation Required:** Remove the generated `.js`, `.d.ts`, and `.js.map` build artifacts from `test-sites/portal-good/src` and `test-sites/gov-sim/src`, leaving only the original `.tsx` and `.ts` source files.
- **Status:** **BLOCKED** awaiting coordinator authorization (source change boundary).

### Blocker 2: SSRF Port Policy Rejection of Fixture Ports 4173 & 4174
- **Root Cause:** `validateUrl()` strictly permits only ports configured in `config.allowedPorts` (defaulting to `[80, 443]`). High development ports `4173` and `4174` are unconditionally rejected by the SSRF validator.
- **Symptom:** Any scan request for `http://localhost:4173` or `http://localhost:4174` will fail validation with HTTP 400 (`Port 4173 is not allowed. Only ports 80, 443 are permitted.`).
- **Remediation Required:** Coordinator must approve one of the safe isolated networking arrangements documented in Section 4.3 (e.g. setting `ALLOWED_PORTS=80,443,4173,4174` restricted to local development).
- **Status:** **BLOCKED** awaiting coordinator networking selection.

### Blocker 3: Daemon Inactivity
- **Root Cause:** Neither the scanner API (port 3001), the report UI (port 5173), nor the test fixtures (ports 4173, 4174) are currently active background processes.
- **Remediation Required:** Once Blockers 1 and 2 are resolved and execution is authorized, launch the local service stack via `start-all.ps1` or dedicated background tasks.
- **Status:** Inactive by design under Phase 7B.0 boundaries.

---

## 8. Final Recommendation and Next Actions

### Recommendation
**NOT READY FOR EXECUTION.**

Scanning execution must remain halted until the coordinator reviews this report and grants explicit authorization to:
1. Clean the committed transpiled `.js` build artifacts from `test-sites/portal-good/src` and `test-sites/gov-sim/src`.
2. Apply the isolated test port configuration (`ALLOWED_PORTS=80,443,4173,4174`) for local development.
3. Start the local daemons and proceed with controlled execution of **RUN-01**, **RUN-02**, and **RUN-03**.

---
*Report prepared in accordance with Phase 7B.0 instructions. Zero scans launched. Zero production resources accessed. Standing by for coordinator directive.*
