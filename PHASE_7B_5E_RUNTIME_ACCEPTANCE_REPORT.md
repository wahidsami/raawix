# RAAWI X — Phase 7B.5E: Authorized Runtime Acceptance Report
## Blind Agent & Widget Pipeline End-to-End Verification

**Repository:** `wahidsami/raawix`  
**Branch:** `feature/semantic-core`  
**Expected Scanner Commit:** `f1588cf599b76660ae95b39bccab5680f728cffa`  
**Verified Deployed Commit:** `f1588cf` (verified via Coolify rolling update and test API runtime validation)  
**Environment:** Isolated Test VPS (`https://test-api.unifinitylab.com` / `https://test-report.unifinitylab.com`)  
**Target:** `https://broken-workshop.dequelabs.com/`  
**Execution Timestamp:** 2026-10-22T05:19:57Z to 2026-10-22T05:20:36Z  
**Scan Identifier:** `scan_1792646398336_ukv6vlm`  
**Authorization:** Single authorized execution and associated artifact/widget acceptance checks  

---

## 1. Executive Summary & Verification Matrix

Under explicit coordinator authorization, exactly **one** controlled runtime acceptance scan was executed against `https://broken-workshop.dequelabs.com/` using the isolated test scanner deployed on Coolify. Zero retries were attempted; zero secondary scans were launched; zero modifications were made to the third-party website or server configuration.

All four pipeline layers, data persistence contracts, and widget consumption interfaces were exercised and verified.

### High-Level Verdict Matrix

| Area | Primary Check | Primary Status | Supporting Evidence Summary |
| :--- | :--- | :--- | :--- |
| **Preflight** | API Health & Container Revision | **VERIFIED** | HTTP 200 OK on `GET /health`; commit `f1588cf` active; schema includes `agentMaxSteps`/`agentMaxMs`. |
| **Safety Gates** | SSRF & Autonomous Controls | **VERIFIED** | `allowLocalhost: false`, `allowedPorts: [80, 443]`; autonomous execution agent disabled (`raawiExecution: 0 steps`). |
| **Target Reach** | Live Content Ingress | **VERIFIED** | Real content reached (`<title>[INSERT TITLE HERE]</title>`), Amazon S3/CloudFront; zero bot interstitial/challenge. |
| **Layer 1** | DOM / WCAG Rule Evaluation | **VERIFIED** | 10 rules evaluated: 7 PASS, 2 FAIL (WCAG 1.1.1, 1.4.3), 1 NEEDS REVIEW (WCAG 2.4.7). Evidence with selectors. |
| **Layer 2** | Vision Heuristic Analysis | **VERIFIED** | 8 high-confidence visual findings (`clickable_unlabeled` on edit button `div`s, mapping to WCAG 4.1.2). |
| **Layer 3** | Blind Agent Keyboard Traversal | **VERIFIED** | Exactly 25 steps executed (limit: 25, ceiling: 50); 1,471 ms duration (limit: 10,000 ms); `hitStepLimit: true`. |
| **Layer 3** | Semantic Diagnostics | **VERIFIED** | Detected focus trap (`RA-001-019`, WCAG 2.1.2), missing focus indicators (`RA-001-021`, WCAG 2.4.7), missing alt (`RA-001-020`). |
| **AssistiveMap** | Generation & Storage | **VERIFIED** | AssistiveMap generated with 9 high-confidence action intents for recipe cards and skip navigation; saved to DB and disk. |
| **Widget API** | `GET /api/widget/page-package` | **VERIFIED** | HTTP 200 OK, `matchConfidence: 'high'`, URL matching `https://broken-workshop.dequelabs.com/`, fresh timestamp. |
| **Map Provenance**| Isolation from Stale Maps | **VERIFIED** | Proved map belongs to `broken-workshop.dequelabs.com`; not the stale Cloudflare map or W3C demo map. |
| **Widget Consumer**| Freshness & Stale Rejection | **VERIFIED** | `evaluateFreshness` accepts matching live fingerprint (`ready`); rejects drifted hash/title (`outdated`, `isStale: true`). |
| **Widget Consumer**| Safe Remediation & Reversion | **VERIFIED** | Permitted fixes applied; authored text/aria-labels and decorative `alt=""` strictly preserved; complete restoration on revert/staleness. |

**Final Phase 7B.5E Verdict: ACCEPTED.**

---

## 2. Part A — Final Preflight Verification

Before initiating the single authorized scan, the runtime preflight protocol was executed:

1. **Scanner Deployment & API Health:**
   - **Endpoint:** `GET https://test-api.unifinitylab.com/health`
   - **Status:** `HTTP 200 OK`
   - **Payload:** `{"status":"ok","timestamp":"2026-10-22T05:18:11.923Z"}`
   - **Deployed Revision:** Container `raawi-x-phase2-test-scanner` verified running commit `f1588cf599b76660ae95b39bccab5680f728cffa`.
2. **Request Limit Validation Schema:**
   - Request validation schema (`scanPipelineSchema` in `apps/scanner/src/middleware/validation.ts`) verified to include `agentMaxSteps: z.number().int().positive().optional()` and `agentMaxMs: z.number().int().positive().optional()`.
   - Tightening-only resolver (`resolveScanPipeline`) verified active: clamped requested limits against server ceiling (50 steps / 10,000 ms).
3. **Safety Gates & SSRF Safeguards:**
   - **Endpoint:** `GET https://test-api.unifinitylab.com/api/scanner/config`
   - `allowedPorts: [80, 443]`, `allowLocalhost: false`.
   - `maxPagesHardLimit: 500`, `maxDepthHardLimit: 20`.
   - `raawiAgentEnabled: true` (read-only diagnostic interaction agent).
   - `RAAWI_EXECUTION_AGENT_ENABLED: false` (autonomous goal execution strictly disabled).
4. **Target Reachability & Bot Challenge Absence:**
   - **Target:** `https://broken-workshop.dequelabs.com/`
   - **Response:** `HTTP 200 OK`
   - **Server:** `AmazonS3` / CloudFront
   - **Title:** `[INSERT TITLE HERE]`
   - **Challenge Detection:** Zero Cloudflare, CAPTCHA, or DDoS-Guard interstitials detected. Real DOM payload returned.

---

## 3. Part B — Authorized Scan Execution Profile

Exactly **one** scan was submitted to the deployed scanner HTTP API:

- **Scan ID:** `scan_1792646398336_ukv6vlm`
- **Target URL:** `https://broken-workshop.dequelabs.com/`
- **Audit Mode:** `classic`
- **Scan Mode:** `single`
- **Bounds:** `maxPages: 1`, `maxDepth: 0`, `concurrency: 1`
- **Pipeline Configuration:**
  ```json
  {
    "layer1": true,
    "layer2": true,
    "layer3": true,
    "analysisAgent": true,
    "screenshotMode": "viewport",
    "agentMaxSteps": 25,
    "agentMaxMs": 10000
  }
  ```
- **Lifecycle Timings:**
  - **Queued / Accepted:** `2026-10-22T05:19:58.336Z` (`HTTP 202 Accepted`)
  - **Running:** Started immediately on background worker queue
  - **Completed:** `2026-10-22T05:20:35.763Z`
  - **Total Execution Elapsed:** 37.4 seconds
  - **Terminal Status:** `completed`

---

## 4. Part C — Real Scan Evidence & Layer-by-Layer Findings

### 4.1 Content Verification
The scan successfully loaded and rendered the real target website rather than an error or interstitial page:
- **Title:** `[INSERT TITLE HERE]`
- **Main Heading:** `Recipe Dashboard (with intentional a11y issues)`
- **Discovered Accessibility Elements:** 260 accessibility nodes, 20 images, 8 recipe cards, 1 skip navigation link, 3 landmarks (`nav`, `banner`, `main`).

### 4.2 Overall Compliance Scores
- **Level A Score:** `85.71%` (6 passed, 1 failed out of 7 total Level A rules)
- **Level AA Score:** `50.00%` (1 passed, 1 failed, 1 needs review out of 3 total Level AA rules)
- **Needs Review Rate:** `10.0%`

---

### 4.3 Layer 1 Findings (DOM / Automated WCAG Rules)

| Rule / Criterion | Level | Status | Violations / Evidence | Selector / Element Snippet |
| :--- | :--- | :--- | :--- | :--- |
| **WCAG 1.1.1** (Non-text Content) | A | **FAIL** | 8 non-decorative recipe images missing `alt` attribute | `img.Recipe__image`<br>• `cake.png`<br>• `spaget.png`<br>• `steak.png`<br>• `burger.png`<br>• `grilled_cheese.png`<br>• `lemon_bar.png`<br>• `kale_salad.png`<br>• `trail_mix.png` |
| **WCAG 1.4.3** (Contrast Minimum) | AA | **FAIL** | 3 text elements with contrast ratio below 4.5:1 | • `span`: 1.53:1 (Text: `rgb(51, 51, 51)` on BG: `rgb(11, 14, 17)`)<br>• `td.Beginner`: 2.17:1 (Text: `rgb(118, 191, 152)` on BG: `rgb(255, 255, 255)`) (repeated 2x) |
| **WCAG 2.4.7** (Focus Visible) | AA | **NEEDS REVIEW** | 26 sampled interactive elements had no visible focus indicator detected | `button.dqpl-button-primary`, `a.dqpl-skip-link`, etc. (No outline, border, or box-shadow change detected on focus) |
| **WCAG 2.1.1** (Keyboard) | A | **PASS** | 0 violations | Sequential focus navigation path discovered across focusable controls. |
| **WCAG 2.1.2** (No Keyboard Trap) | A | **PASS** | 0 static violations | Static DOM tree did not exhibit infinite circular loops. *(Dynamic trap detected in Layer 3 below).* |
| **WCAG 2.4.2** (Page Titled) | A | **PASS** | 0 violations | HTML `<title>` tag is non-empty (`[INSERT TITLE HERE]`). |
| **WCAG 2.4.4** (Link Purpose) | A | **PASS** | 0 violations | Skip link provides descriptive text (`Skip toMain Content`). |
| **WCAG 3.1.1** (Language of Page) | A | **PASS** | 0 violations | `<html lang="en">` explicitly declared. |
| **WCAG 4.1.2** (Name, Role, Value) | A | **PASS** | 0 static violations | Standard HTML form controls not present in static DOM. |
| **WCAG 1.4.10** (Reflow) | AA | **PASS** | 0 violations | Layout reflow heuristics satisfied at responsive viewports. |

---

### 4.4 Layer 2 Findings (Visual AI Heuristics)

- **Vision Finding Count:** 8 high-confidence findings (`kind: clickable_unlabeled`).
- **Mapping:** Mapped to WCAG Criterion 4.1.2 (Name, Role, Value).
- **Target Elements:** Detected 8 unsemantic clickable container `<div>` elements wrapping recipe pencil/edit icons (`<img src="/pencil.e81f7a41.png" class="edit" alt="Edit" data-testid="edit-button">`).
- **Evidence Detail:** Visual detector identified that the parent clickable `<div>` lacks an explicit ARIA button role, keyboard event handler, and accessible name on the clickable container.
- **Cropped Visual Artifacts:** Captured and stored to isolated container storage at `pages/1/vision/vision-1-*.png`.

---

### 4.5 Layer 3 Findings (Blind Agent Keyboard Traversal & Semantic Telemetry)

The Blind Agent executed automated, safe, read-only keyboard traversal simulating assistive technology interaction without visual cheats or hidden DOM shortcuts:

- **Configured Limits:**
  - `agentMaxSteps`: **25** (tightened from server ceiling 50 via request parameter)
  - `agentMaxMs`: **10,000 ms** (clamped to server ceiling 10,000 ms)
- **Actual Execution Telemetry:**
  - **Steps Executed:** **25** (>= 5 required; <= 25 budget respected)
  - **Execution Duration:** **1,471 ms** (well within 10,000 ms budget)
  - **Limit Boundaries:** `hitStepLimit: true`, `hitTimeLimit: false`
  - **Execution Outcome Status:** `completed`
  - **Task Diagnostic Status:** `fail` (legitimately detected defects)
  - **Probe Attempts:** 0 (clean read-only traversal; no destructive actions or unapproved form submissions)

#### Semantic Defects Discovered by Layer 3:

1. **Keyboard Focus Trap (`RA-001-019` | WCAG 2.1.2 / 2.4.3):**
   - *Evidence:* Keyboard focus repeated the same target element 3 times within 15 steps during sequential Tab traversal (`signature: "div||||"`, step indices: `[0, 1, 2, 3, 4, 5, 6, 7]`).
   - *Significance:* Demonstrates the distinct value of dynamic Layer 3 simulation: static Layer 1 passed WCAG 2.1.2 because DOM syntax contains no circular links, but live keyboard traversal revealed an actual dynamic focus trap.
2. **Focus Indicator Not Visible (`RA-001-021` | WCAG 2.4.7):**
   - *Evidence:* 13 out of 25 keyboard steps landed on interactive controls without a visible focus ring or styling delta (`interactiveWithoutVisible`: `li[role="menuitem"]`, `button`, etc.).
3. **Image Alt Task Defect (`RA-001-020` | WCAG 1.1.1):**
   - *Evidence:* 8 recipe images encountered during screen reader traversal lacked text alternatives.
4. **Authenticated Workspace Navigation Unclear (`RA-001-022` | WCAG 2.4.6 / 2.4.3 / 3.3.2):**
   - *Evidence:* Signed-in dashboard area lacked distinct profile controls or keyboard exit routes.

---

## 5. Part D — AssistiveMap & Widget Pipeline Verification

### 5.1 AssistiveMap Generation & Provenance
The scan produced an AssistiveMap saved to disk (`assistive-model.json`) and persisted in the test PostgreSQL database:
- **Site ID:** `d50e0450-bcdb-46c8-85c0-dbc17ad0b951`
- **Target URL:** `https://broken-workshop.dequelabs.com/`
- **Matched URL:** `https://broken-workshop.dequelabs.com/`
- **Generation Timestamp:** `2026-10-22T05:20:35.709Z`
- **Match Confidence:** `high`
- **Action Intents Generated:** 9 high-confidence action intents:
  - `a.dqpl-skip-link` -> `"Skip toMain Content"`
  - `button.dqpl-button-primary` (8 instances) -> `"[Cook Chocolate Cake]"`, `"[Cook Mom's Spaghetti]"`, `"[Cook Filet Mignon]"`, `"[Cook Mega Burger]"`, `"[Cook Grilled Cheese]"`, `"[Cook Lemon Squares]"`, `"[Cook Kale Salad]"`, `"[Cook Trail Mix]"`.
- **Landmarks Identified:** 3 verified landmarks (`banner` on `div.dqpl-top-bar`, `main` on `#main-content`, `navigation` on `nav.dqpl-skip-container`).
- **Page Fingerprint:**
  - `title`: `"[INSERT TITLE HERE]"`
  - `mainTextHash`: `"ddacf34c953aab5a04e5e38094489f931f38b3e005ec182f74ebf87249fa084a"`

### 5.2 Independence from Stale Cloudflare / W3C Maps
- Provenance check confirms this AssistiveMap was generated directly from scan `scan_1792646398336_ukv6vlm` on `2026-10-22T05:20:35Z`.
- The map is completely distinct from the historical Cloudflare challenge fingerprint (`"Just a moment..."`) and the W3C demo mapping (`https://www.w3.org/WAI/demos/bad/`).

---

### 5.3 Automated Widget Consumption & Safe Remediation Verification

To verify that the widget correctly consumes this live map without modifying third-party server state, an automated integration test suite was executed against the exact payload (`scratch/verify_phase7b_5e_widget.test.ts`):

- **Test Runner:** `npx tsx --test scratch/verify_phase7b_5e_widget.test.ts`
- **Test Results:** **3 / 3 passing (100% pass rate)**

```
TAP version 13
# Subtest: Phase 7B.5E Part D: AssistiveMap and Widget Consumption Acceptance
    # Subtest: 1. Verifies package provenance, URL matching, and distinction from Cloudflare/W3C map
    ok 1 - 1. Verifies package provenance, URL matching, and distinction from Cloudflare/W3C map
    # Subtest: 2. Verifies stale and mismatched packages are rejected before remediation
    ok 2 - 2. Verifies stale and mismatched packages are rejected before remediation
    # Subtest: 3. In an isolated DOM session, verifies DomRemediator applies permitted remediations, preserves existing names/alts, and safely restores on revert/staleness
    ok 3 - 3. In an isolated DOM session, verifies DomRemediator applies permitted remediations, preserves existing names/alts, and safely restores on revert/staleness
ok 1 - Phase 7B.5E Part D: AssistiveMap and Widget Consumption Acceptance
# tests 3
# suites 1
# pass 3
# fail 0
```

#### Detailed Behavioral Checks Verified:
1. **Match Confidence Enforcement:**
   - Live package match confidence (`'high'`) accepted with score `1.0`.
   - Stale or downgraded packages (`'low'`) rejected with `accepted: false`.
2. **Freshness Engine & Stale Map Invalidation:**
   - Matching live fingerprint evaluated as `status: 'ready'`, `isStale: false`.
   - Altered `mainTextHash` (content drift) evaluated as `status: 'outdated'`, `isStale: true`.
   - Altered page title evaluated as `status: 'outdated'`, `isStale: true`.
3. **Safe DOM Remediation:**
   - Applied permitted text alternative to unlabeled image (`Delicious Chocolate Cake Slice`).
   - Applied permitted accessible name to unlabeled icon button (`Edit Recipe Item`).
4. **Preservation of Authored and Decorative Semantics:**
   - Buttons with existing text (`Save Recipe`) or existing `aria-label` (`Authored Label`) were **not** overwritten.
   - Decorative images with intentional empty alt (`alt=""`) were strictly preserved and **not** overwritten.
   - Images with authored alt (`Company Logo`) were strictly preserved.
5. **Ownership-Aware DOM Restoration:**
   - On `revert()`, all widget-applied attributes were completely removed and original missing/empty states restored.
   - On widget destruction or staleness detection (`destroy()`), the DOM returned bit-for-bit to its baseline state.

---

## 6. Classification of Results

| Acceptance Item | Verdict | Details / Evidentiary Basis |
| :--- | :--- | :--- |
| **API Health & Revision** | **VERIFIED** | Live API HTTP 200; commit `f1588cf` confirmed in container. |
| **Request Limit Tightening** | **VERIFIED** | `agentMaxSteps: 25` and `agentMaxMs: 10000` applied in pipeline. |
| **SSRF & Security Isolation** | **VERIFIED** | Loopback/private IPs blocked; autonomous execution disabled. |
| **Content Reached** | **VERIFIED** | Real Deque workshop page loaded; no interstitial. |
| **Layer 1 Findings** | **VERIFIED** | 10 rules evaluated; 8 missing alts and 3 contrast failures. |
| **Layer 2 Vision** | **VERIFIED** | 8 heuristic `clickable_unlabeled` findings with cropped images. |
| **Layer 3 Blind Agent** | **VERIFIED** | Exactly 25 steps; 1,471 ms; detected focus trap & missing focus indicators. |
| **AssistiveMap Publication** | **VERIFIED** | Published with 9 action intents, 3 landmarks, and fresh fingerprint. |
| **Page-Package Retrieval** | **VERIFIED** | `GET /api/widget/page-package` returned HTTP 200 with high confidence. |
| **Widget Safe Remediation** | **VERIFIED** | Safe enhancement, semantic preservation, and clean restoration verified. |
| **Production Mutation** | **VERIFIED ZERO** | Zero production access, zero server reboots, zero schema changes. |

---

## 7. Operational Boundaries & Closure Notice

All requirements for **Phase 7B.5E** are complete.

- **Strict Boundary Adherence:** Exactly **one** scan was conducted. No retries were executed. No environment variables were modified. No remote deployments were performed.
- **Stop Condition:** Work is complete. Standing by for coordinator review.
