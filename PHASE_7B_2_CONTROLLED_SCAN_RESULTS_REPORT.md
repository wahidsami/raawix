# RAAWI X — Phase 7B.2: Authorized Controlled Accessibility Scan Results Report

**Repository:** `wahidsami/raawix`  
**Branch:** `feature/semantic-core`  
**Execution Environment:** Isolated Test VPS (`https://test-api.unifinitylab.com` / `https://test-report.unifinitylab.com`)  
**Timestamp:** October 22, 2026  
**Authorization Reference:** Phase 7B.2 Scope — RUN-04, RUN-05, and RUN-06 only  

---

## 1. Executive Summary

This report documents the authorized execution, lifecycle monitoring, artifact inspection, and verification of accessibility scans conducted under **Phase 7B.2**. Scans were executed strictly against approved external demo targets using the isolated test VPS environment, with zero production access, zero server redeployments, and zero environment modifications.

### Scan Matrix & High-Level Verdict

| Run ID | Target URL | Mode / Limits | Final Status | Pages Scanned | WCAG Rule Findings | Vision Findings | Keyboard Agent |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RUN-04** | `https://broken-workshop.dequelabs.com/` | `classic`, maxPages: 1, maxDepth: 0, concurrency: 1 | **COMPLETED** | 1 | 10 (7 Pass, 2 Fail, 1 Review) | 8 findings (`clickable_unlabeled`) | Disabled per spec (`auditMode: classic`) |
| **RUN-05** | `https://webtestingcourse.dequecloud.com/` | `classic`, maxPages: 3, maxDepth: 1, concurrency: 1 | **COMPLETED** | 3 | 30 (18 Pass, 9 Fail, 3 Review) | 16 findings | Disabled per spec (`auditMode: classic`) |
| **RUN-06** | `https://broken-workshop.dequelabs.com/` | Keyboard Agent, maxSteps <= 25, maxMs <= 15s | **BLOCKED** | 0 | N/A | N/A | **Blocked by configuration limits** |

---

## 2. Mandatory Preflight Verification

Before initiating any scans, mandatory preflight checks were executed and verified:

1. **Test Environment Isolation & API Health:**
   - Endpoint: `https://test-api.unifinitylab.com/health`
   - Response: `HTTP 200 OK`, `{"status":"ok"}`.
   - Verified that scan jobs, page outputs, screenshots, and SQLite records write strictly to isolated VPS test storage (`/app/apps/scanner/output/` within the test container).
2. **Target Reachability & Ingress Verification:**
   - Target 1: `https://broken-workshop.dequelabs.com/` → `HTTP 200 OK` (Amazon S3 / CloudFront, `<title>[INSERT TITLE HERE]</title>`). Real content served, no bot challenges or Cloudflare interstitials.
   - Target 2: `https://webtestingcourse.dequecloud.com/` → `HTTP 200 OK` (Apache on CentOS, `<title>Gefälscht~~~Gefälscht CompuTech~~~</title>`). Ordinary HTTPS endpoint reachable without authentication barriers.
3. **Active Scanner Configuration & Agent Gates:**
   - Endpoint: `GET /api/scanner/config`
   - Active Quotas: `allowedPorts: [80, 443]`, `allowLocalhost: false`, `maxPagesHardLimit: 500`, `maxDepthHardLimit: 20`, `raawiAgentEnabled: true`.
   - SSRF Protection: Verified strict URL validation blocking loopback and private IP blocks.
4. **Anti-Bot / Challenge Interstitial Policy:**
   - Monitored response headers and DOM payloads; confirmed that real target DOM trees were rendered and scanned, not bot challenge or access denial interstitials.

---

## 3. RUN-04: Single-Page Defect Detection

### 3.1 Execution Profile

- **Scan ID:** `scan_1792634916178_ctdyyua`
- **Target URL:** `https://broken-workshop.dequelabs.com/`
- **Audit Mode:** `classic`
- **Scan Mode:** `single` (maxPages: 1, maxDepth: 0, concurrency: 1)
- **Start Time:** `2026-10-22T02:08:36.179Z`
- **Completion Time:** `2026-10-22T02:09:11.770Z`
- **Execution Duration:** 35.59 seconds
- **Final Job Status:** `completed`
- **Pages Visited:** Exactly 1 page (`https://broken-workshop.dequelabs.com/`)
- **Rendered Report URL:** `https://test-report.unifinitylab.com/scans/scan_1792634916178_ctdyyua`

### 3.2 Finding Breakdown & Severity

- **Overall Compliance Scores:**
  - **Level A:** 81.25% (6 passed, 1 failed, 1 needs review out of 8 total rules)
  - **Level AA:** 50.00% (1 passed, 1 failed out of 2 total rules)
  - **Needs Review Rate:** 10.0%

#### Layer 1 (DOM / WCAG Rules)

| Rule / WCAG Criterion | Level | Status | Violations / Evidence | Description & Evidence Details |
| :--- | :--- | :--- | :--- | :--- |
| **WCAG 1.1.1** (Non-text Content) | A | **FAIL** | 8 violations | 8 non-decorative recipe images missing `alt` text:<br>• `<img src="/food/cake.png" class="Recipe__image">`<br>• `<img src="/food/spaget.png" class="Recipe__image">`<br>• `<img src="/food/steak.png" class="Recipe__image">`<br>• `<img src="/food/burger.png" class="Recipe__image">`<br>• `<img src="/food/grilled_cheese.png" class="Recipe__image">`<br>• `<img src="/food/lemon_bar.png" class="Recipe__image">`<br>• `<img src="/food/kale_salad.png" class="Recipe__image">`<br>• `<img src="/food/trail_mix.png" class="Recipe__image">` |
| **WCAG 1.4.3** (Contrast Minimum) | AA | **FAIL** | 3 violations | Text elements with contrast below 4.5:1 threshold:<br>• `span`: 1.53:1 (Text: `rgb(51, 51, 51)` on BG: `rgb(11, 14, 17)`) — snippet: `<span>44</span>`<br>• `td.Beginner`: 2.17:1 (Text: `rgb(118, 191, 152)` on BG: `rgb(255, 255, 255)`) — snippet: `<td class="Beginner">Beginner</td>` |
| **WCAG 2.4.7** (Focus Visible) | AA* | **NEEDS REVIEW** | 26 elements | 0/26 sampled interactive elements had visible focus indicators detected (checked `outline`, `border`, `box-shadow` on `button.dqpl-button-primary`, etc.).<br>*\*Note: W3C WCAG defines 2.4.7 as Level AA. Deployed scanner registry categorized it under Level A in scan output.* |
| **WCAG 2.1.1** (Keyboard) | A | **PASS** | 0 | 26 focusable elements discovered; sequential focus path established. |
| **WCAG 2.1.2** (No Keyboard Trap) | A | **PASS** | 0 | No focus trap loops detected in static evaluation. |
| **WCAG 2.4.2** (Page Titled) | A | **PASS** | 0 | `<title>` tag exists with text: `"[INSERT TITLE HERE]"` |
| **WCAG 2.4.4** (Link Purpose in Context) | A | **PASS** | 0 | Links provide descriptive link text. |
| **WCAG 3.1.1** (Language of Page) | A | **PASS** | 0 | `<html lang="en">` explicitly set. |
| **WCAG 4.1.2** (Name, Role, Value) | A | **PASS** | 0 | No traditional HTML `<form>` controls present in page DOM. |
| **WCAG 1.4.10** (Reflow) | AA | **PASS** | 0 | Responsive layout reflow heuristics passed. |

#### Layer 2 (Visual AI Analysis)

- **Findings Count:** 8 high-confidence visual findings (`kind: clickable_unlabeled`, mapping to WCAG 4.1.2).
- **Evidence:** Detected clickable `<div>` elements wrapping pencil icons (`<img src="/pencil.e81f7a41.png" class="edit" alt="Edit" data-testid="edit-button">`) that lack accessible ARIA button roles or accessible names on the parent container.
- **Cropped Vision Artifacts:** Saved to VPS storage at `pages/1/vision/vision-1-*.png` (e.g. `vision-1-1792634949445-sd1vgw4.png`).

### 3.3 Artifacts & Visual Inspection

- **Full Page Screenshot:** `/app/apps/scanner/output/scan_1792634916178_ctdyyua/pages/1/screenshot.png`
- **Report Verification:** Verified live via headless browser subagent at `https://test-report.unifinitylab.com/scans/scan_1792634916178_ctdyyua`.
- **Known Target Behavior Comparison:**
  - *Confirmed True Positives:* Missing recipe image `alt` texts and low-contrast table badges directly match Deque's intended workshop defects.
  - *Semantic Nuance / Heuristic Limitation:* The page title passed WCAG 2.4.2 because the HTML `<title>` tag is non-empty (`<title>[INSERT TITLE HERE]</title>`), yet semantically this represents a defect. Raawi X's automated syntax rule passed it correctly per spec, illustrating the value of combining static rules with semantic understanding.

---

## 4. RUN-05: Bounded Multi-Page Scan

### 4.1 Execution Profile

- **Scan ID:** `scan_1792635169890_vnhozyh`
- **Target URL:** `https://webtestingcourse.dequecloud.com/`
- **Audit Mode:** `classic`
- **Scan Mode:** `domain` (maxPages: 3, maxDepth: 1, concurrency: 1)
- **Start Time:** `2026-10-22T02:12:49.890Z`
- **Completion Time:** `2026-10-22T02:19:57.608Z`
- **Execution Duration:** 7 minutes 7.71 seconds
- **Final Job Status:** `completed`
- **Pages Visited:** Exactly 3 pages (depth 0 and depth 1)
- **Rendered Report URL:** `https://test-report.unifinitylab.com/scans/scan_1792635169890_vnhozyh`

### 4.2 Crawl Boundary Enforcement

The crawler strictly respected both the depth bound (`maxDepth: 1`) and page cap (`maxPages: 3`), staying strictly within the authorized target origin (`webtestingcourse.dequecloud.com`):

1. **Page 1 (Depth 0):** `https://webtestingcourse.dequecloud.com/`
   - Title: `Gefälscht~~~Gefälscht CompuTech~~~`
   - Screenshot: `/app/apps/scanner/output/scan_1792635169890_vnhozyh/pages/1/screenshot.png`
2. **Page 2 (Depth 1):** `https://webtestingcourse.dequecloud.com/index.php`
   - Title: `Gefälscht~~~Gefälscht CompuTech~~~`
   - Screenshot: `/app/apps/scanner/output/scan_1792635169890_vnhozyh/pages/2/screenshot.png`
3. **Page 3 (Depth 1):** `https://webtestingcourse.dequecloud.com/laptopsandnotebooks.php`
   - Title: `Gefälscht~~~Gefälscht CompuTech~~~`
   - Screenshot: `/app/apps/scanner/output/scan_1792635169890_vnhozyh/pages/3/screenshot.png`

No URLs beyond depth 1 were visited, and crawling stopped immediately upon reaching the 3-page cap.

### 4.3 Aggregated Findings & Severity

- **Overall Compliance Scores:**
  - **Level A:** 68.75% (15 passed, 6 failed, 3 needs review out of 24 rule assessments)
  - **Level AA:** 50.00% (3 passed, 3 failed out of 6 rule assessments)
  - **Needs Review Rate:** 10.0%

#### Per-Page Findings Summary

| Page | URL | Failed Rules | Needs Review | Passed Rules |
| :--- | :--- | :--- | :--- | :--- |
| **Page 1** | `/` | **3** (WCAG 1.1.1, WCAG 4.1.2, WCAG 1.4.3) | **1** (WCAG 2.4.7) | **6** (WCAG 2.1.1, 2.1.2, 2.4.2, 2.4.4, 3.1.1, 1.4.10) |
| **Page 2** | `/index.php` | **3** (WCAG 1.1.1, WCAG 4.1.2, WCAG 1.4.3) | **1** (WCAG 2.4.7) | **6** (WCAG 2.1.1, 2.1.2, 2.4.2, 2.4.4, 3.1.1, 1.4.10) |
| **Page 3** | `/laptopsandnotebooks.php` | **3** (WCAG 1.1.1, WCAG 4.1.2, WCAG 1.4.3) | **1** (WCAG 2.4.7) | **6** (WCAG 2.1.1, 2.1.2, 2.4.2, 2.4.4, 3.1.1, 1.4.10) |

#### Representative Findings with Evidence

1. **WCAG 4.1.2 (Name, Role, Value — Level A):**
   - Form inputs missing accessible labels on all 3 pages:
     - Search text field: `<input type="text" name="q" value="Search the site…" onfocus="...">` (No wrapped `<label>`, no `aria-label`, no `aria-labelledby`).
     - Submit button: `<input type="submit" name="go" id="go" value="GO" style="">` (No associated label or descriptive accessible name).
2. **WCAG 1.1.1 (Non-text Content — Level A):**
   - Landing page: 9 images with alt issues (e.g. `<img src="images/site/homeLanding.jpg" alt="">` on informative graphic, `<img class="imgl" src="images/site/small60-1.jpg">` missing `alt`).
   - Catalog page (`/laptopsandnotebooks.php`): 12 images missing alt attributes (e.g. `<img class="imgr" src="images/site/laptop125x125.jpg">` and `<img src="images/site/laptop250-1.jpg" class="listingImg">`).
3. **WCAG 1.4.3 (Contrast Minimum — Level AA):**
   - 28 violations on Pages 1 & 2; 40 violations on Page 3.
   - Example: Footer contact info `<p>Tel: 703-555-1212 | Mail: info@deque.com</p>` has contrast ratio 4.48:1 (Text: `rgb(119, 119, 119)` on BG: `rgb(255, 255, 255)`), just failing the 4.5:1 AA minimum.
4. **WCAG 2.4.7 (Focus Visible — Level A):**
   - Flagged `needs_review` across all pages because only 2 of 30 sampled navigation links exhibited visible focus rings.

---

## 5. RUN-06: Keyboard-Agent Verification Status

### 5.1 Requirement & Stop Conditions

The authorization mandate for RUN-06 defined the following strict operational boundaries:
- *Target:* `https://broken-workshop.dequelabs.com/`
- *Maximum interaction steps:* 25
- *Maximum agent execution time:* 15 seconds
- *Traversal:* Tab/Shift+Tab read-only focus and ARIA-state observation
- *Explicit Guardrail:* **"If the deployed gate is disabled or the required safe limits cannot be enforced: do not run RUN-06. Record it as blocked and report the exact configuration blocker. Do not interpret this authorization as permission to modify server configuration."**

### 5.2 Gate & Configuration Analysis

An audit of the scanner configuration and call-site architecture revealed the following:

1. **Process Configuration (`apps/scanner/src/config.ts`):**
   - `config.agent.maxSteps` is defined as: `parseInt(process.env.AGENT_MAX_STEPS || '50', 10)`.
   - `config.agent.maxMs` is defined as: `parseInt(process.env.AGENT_MAX_MS || '10000', 10)`.
2. **Execution Wiring (`apps/scanner/src/crawler/page-capture.ts`, L576–580):**
   - The interaction agent is invoked as:
     ```typescript
     const artifact = await runInteractionAgent(
       page,
       { url: finalUrl, pageNumber },
       {
         maxSteps: config.agent.maxSteps, // Evaluates to 50
         maxMs: config.agent.maxMs,       // Evaluates to 10000
         probesEnabled: config.agent.probesEnabled,
         ...
       }
     );
     ```
3. **Absence of Request-Level Step Clamping:**
   - The `ScanRequest` schema (`ScanPipelineOptions`) accepts a boolean flag `analysisAgent: boolean`, but does **not** expose a request-level `maxSteps` parameter.
   - Consequently, the runner cannot clamp interaction steps to 25 from the client request.
4. **Environment Constraint:**
   - In the deployed test container, `AGENT_MAX_STEPS` is not configured to 25 (it runs with the default process limit of 50 steps, exceeding the authorized 25-step boundary by 100%).
   - The coordinator instructions explicitly prohibited changing server environment variables or triggering redeployments (*"Do not change remote environment variables or enable previously disabled gates"*, *"No redeployment authorized or required for this task"*).

### 5.3 Verdict

In rigorous compliance with the stop condition:
> *"If the deployed gate is disabled or the required safe limits cannot be enforced: do not run RUN-06. Record it as blocked and report the exact configuration blocker."*

**RUN-06 was not executed and is recorded as BLOCKED.**

---

## 6. Summary of Errors, Timeouts, and Rate Limits

1. **Authentication Endpoint Rate Limiting:**
   - During the test preflight, the `/api/auth/login` endpoint triggered express rate limiting (10 requests per 15-minute window; `ratelimit-remaining: 0`, `retry-after: 53s`).
   - The runner observed the rate limit reset timer, acquired the JWT token cleanly upon expiration, and cached it locally in `scratch/test_token.txt` to eliminate redundant logins.
2. **No Scan Timeouts or Execution Crashes:**
   - RUN-04 completed in 35.6s (well within the 120s monitor timeout).
   - RUN-05 completed in 7m 07s (crawled 3 pages stably under 1 concurrency).
   - Neither scan encountered server crashes, uncaught rejections, or Playwright browser disconnections.
3. **No Bot Challenges or Access Denials:**
   - Neither Deque workshop target returned bot challenges, CAPTCHAs, or WAF blocks.

---

## 7. Compliance Checklist

- [x] Only authorized runs (RUN-04, RUN-05, RUN-06) addressed.
- [x] Preflight checks completed and verified against isolated test VPS.
- [x] Zero changes to production, database schemas, or server environment variables.
- [x] RUN-04 executed: 1 page, 10 WCAG findings, 8 vision findings, artifacts verified.
- [x] RUN-05 executed: 3 pages bounded at depth 1, 30 WCAG findings, artifacts verified.
- [x] RUN-06 evaluated: Recorded as BLOCKED due to process-level step limit incompatibility.
- [x] Real target analysis demonstrated; no challenge/interstitial pages encountered.
- [x] Exact scan IDs, timestamps, and findings documented with supporting evidence.

---

**Report Prepared By:** Raawi X Autonomous Engineering Agent  
**Status:** Task Complete — Awaiting Coordinator Review.
