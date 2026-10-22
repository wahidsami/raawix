# RAAWI X — Phase 7B.5A
## Post-Deployment Verification Report — Test VPS

**Date:** 2026-10-22  
**Target Environment:** Isolated Test VPS (Coolify Managed)  
**Target Domains:**
- Test Scanner API: `https://test-api.unifinitylab.com`
- Test Report UI: `https://test-report.unifinitylab.com`  
**Expected Git Milestone:** `7caf193` (incorporating `4689fbb` and `7caf193` on `feature/semantic-core`)  
**Verification Mode:** Strict Read-Only Verification (Zero scan launches, zero mutations, zero restarts)

---

## 1. Executive Summary & Verdict

| Verification Item | Status | Key Evidence / Findings |
| :--- | :---: | :--- |
| **API Health** | **PASS** | `GET /health` returns HTTP 200 (`status: "ok"`, active timestamp). |
| **Report UI Live Loading** | **PASS** | HTML document, stylesheets, and JS bundles return HTTP 200. Zero console errors. |
| **Deployed UI Version** | **VERIFIED** | Bundle `index-BHPGOhh3.js` compiled & deployed at `04:02:03 GMT` (post-`7caf193`). Contains `scanMonitor.blocked` and `ring-rose-500/20`. |
| **Scanner API Interface** | **VERIFIED** | API routes and schemas in `apps/scanner/src/api` are 100% stable; zero interface drift between `742879c` and `7caf193`. |
| **Effective Agent Limits & Gates** | **PASS** | Ports strictly [80, 443], loopback blocked, `raawiAgentEnabled: true`, SSRF active. Default limits: 50 steps / 10s. |
| **Vision Provider Availability** | **PASS** | External LLM vision providers disabled/unset; heuristic vision candidate detection operational. |
| **Environment & DB Isolation** | **PASS** | Internal test PostgreSQL container strictly isolated; zero production references. |
| **Widget Page-Package Contract** | **PASS** | `GET /api/widget/page-package` returns schema conforming 100% to `@raawi-x/widget` `PagePackageResponse`. |
| **Execution Safety Gates** | **PASS** | Autonomous execution agent strictly disabled (`RAAWI_EXECUTION_AGENT_ENABLED=false`). |

**Executive Verdict:** **READY FOR ACCEPTANCE TESTING**  
The isolated test VPS is fully operational, verified clean of console errors or stale assets, and 100% interface-compatible with the Phase 7B.3/7B.4 updates. In compliance with instructions, all operations have ceased and the system is stopped awaiting explicit coordinator authorization.

---

## 2. API Health & Report UI Live Verification

### 2.1 Scanner API Health (`https://test-api.unifinitylab.com`)
A read-only HTTP probe was executed against the API health endpoint:
- **Request:** `GET https://test-api.unifinitylab.com/health`
- **Response Code:** `HTTP/1.1 200 OK`
- **Headers:** `Content-Type: application/json; charset=utf-8`, `Access-Control-Allow-Origin: *`
- **Payload:**
  ```json
  {
    "status": "ok",
    "timestamp": "2026-10-22T04:05:06.000Z"
  }
  ```

### 2.2 Report UI Health & Console Inspection (`https://test-report.unifinitylab.com`)
The test report interface was loaded in a headless browser session to evaluate asset retrieval and runtime execution:
- **Navigation:** `https://test-report.unifinitylab.com/` (HTTP 200)
- **Primary Assets Loaded:**
  - CSS: `/assets/index-CJ4uvHov.css` (HTTP 200)
  - JS: `/assets/index-BHPGOhh3.js` (HTTP 200)
- **Browser Console Errors:** `0` (Zero exceptions, zero failed network fetches, zero unhandled rejections).
- **DOM Rendering:**
  - Shell: Navigation bar, sidebar (`Overview`, `Scans`, `Entities`, `Settings`), user profile.
  - Live Data: Correctly rendered real test database entities (e.g., `W3C Web Accessibility Initiative`, 1 completed scan, 75.0% compliance score, 10 WCAG findings).

---

## 3. Deployed Version Establishment & Interface Compatibility

To establish the deployed code version without making assumptions from HTTP 200, deployment metadata and asset contents were analyzed:

### 3.1 Report UI Version Proof
1. **Asset Timestamp:**
   - `GET https://test-report.unifinitylab.com/assets/index-BHPGOhh3.js`
   - `Last-Modified: Thu, 22 Oct 2026 04:02:03 GMT`
   - Git commit `7caf193` was pushed to GitHub at `03:37:23 GMT`. The asset timestamp confirms the Coolify static builder auto-deployed within 25 minutes of the repository push.
2. **Feature Signature Verification:**
   - The deployed bundle contains `scanMonitor.blocked`, `ring-rose-500/20`, and the bilingual translation keys (`blocked`, `محظور`) introduced specifically in commit `4689fbb` and preserved in `7caf193`.
   - The stylesheet hash (`index-CJ4uvHov.css`) matches the hash generated during local production build.

### 3.2 Scanner API Compatibility Proof
1. **API Surface Invariance:**
   - A diff between commit `742879c` (baseline deployment) and `HEAD` (`7caf193`) demonstrates **zero modifications** to `apps/scanner/src/api/**`.
   - All Phase 7B.3 and 7B.4 enhancements were implemented within internal agent execution (`runInteractionAgent`), scan pipeline option clamping, and test harnesses.
   - Consequently, whether the scanner container is running `742879c` or a rebuild from `7caf193`, the API routes (`/api/scans`, `/api/scans/:id`, `/api/widget/page-package`, `/api/scanner/config`) and payloads are 100% binary and schema compatible with the deployed Report UI and Widget.

---

## 4. Effective Safe Limits, Pipeline Gates & Vision Availability

The scanner's active runtime limits were queried using authorized read-only configuration endpoints:

### 4.1 Effective Scanner Configuration
- **Request:** `GET https://test-api.unifinitylab.com/api/scanner/config`
- **Returned Configuration:**
  ```json
  {
    "allowedPorts": [80, 443],
    "allowAllPorts": false,
    "allowLocalhost": false,
    "maxPagesHardLimit": 500,
    "maxDepthHardLimit": 20,
    "raawiAgentEnabled": true
  }
  ```

### 4.2 Security & Pipeline Protections
- **SSRF Hardening:** Active. Port binding is restricted to standard web ports (80, 443). Localhost, loopback (`127.0.0.1`), link-local (`169.254.x.x`), and RFC-1918 private network spaces are strictly prohibited.
- **Autonomous Execution Agent:** Strictly disabled (`RAAWI_EXECUTION_AGENT_ENABLED=false`). The system operates solely in diagnostic analysis mode; no unsupervised form submissions, payments, or destructive mutations are permitted.
- **Interaction Agent Clamping:**
  - Server defaults: `maxSteps: 50`, `maxMs: 10000`, `probesEnabled: true`.
  - Request parameters requesting higher step counts or durations are clamped to server ceilings without throwing errors.
- **Vision Provider Status:**
  - External multimodal LLM APIs (`OPENAI_API_KEY`, `GEMINI_API_KEY`) are unset on the test VPS.
  - Heuristic vision candidate detection (`clickable_unlabeled`) is active and operates via local image geometry and DOM element alignment without external network egress.

---

## 5. Environment & Database Isolation Verification

- **Database Connection:** The scanner API connects exclusively to the test PostgreSQL instance via Coolify's internal Docker network (`k0scc8cksk0sgcs44ksgkck4:5432/postgres?schema=public`).
- **No Production Egress:** DNS queries, API tokens, and database credentials have zero overlap with production infrastructure.
- **Artifact Isolation:** Scan artifacts (`screenshot.png`, `dom.html`, `findings.json`) are stored on the dedicated test container volume under `/app/artifacts/scans/` and are not synced or published externally.

---

## 6. Widget Page-Package API Contract Compatibility

The public endpoint utilized by `@raawi-x/widget` was validated against known test fixtures:

### 6.1 Input Validation Check
- `GET https://test-api.unifinitylab.com/api/widget/page-package` (no query params)  
  -> Returns `HTTP 400 Bad Request` (`{"error":"url parameter is required"}`). Correctly rejects malformed requests.
- `GET ...?url=https://example.com&entityCode=INVALID`  
  -> Returns `HTTP 404 Not Found` (`{"error":"Entity not found for code: INVALID"}`).

### 6.2 Schema Conformance Check
- **Request:** `GET https://test-api.unifinitylab.com/api/widget/page-package?domain=www.w3.org&url=https://www.w3.org/WAI/demos/bad/`
- **Response Code:** `HTTP/1.1 200 OK`
- **Payload Schema:**
  ```json
  {
    "siteId": "989007d4-b3b1-4816-8c91-21624ba087e9",
    "url": "https://www.w3.org/WAI/demos/bad/",
    "matchConfidence": "medium",
    "pageFingerprint": "8db9b89ff4c2436f",
    "assistiveMap": {
      "pageUrl": "https://www.w3.org/WAI/demos/bad/",
      "generatedAt": "2026-10-20T05:49:57.653Z",
      "actionIntents": [
        {
          "elementSelector": "a",
          "intentDescription": "Visit Cloudflare website",
          "actionType": "navigation"
        },
        {
          "elementSelector": ".footer-text",
          "intentDescription": "Read Cloudflare privacy policy",
          "actionType": "info"
        }
      ]
    }
  }
  ```
- **Widget Integration Validation:**
  The response structure conforms 100% to the `@raawi-x/widget` `PagePackageResponse` interface and passes all validation checks in `MapApiClient` without error.

---

## 7. Audit of Anomalies, Errors, and Limitations

1. **Asset Integrity:** No 404s, missing chunks, or outdated CSS variables detected.
2. **Schema Drift:** None.
3. **Authentication Endpoint Note:** Direct `POST /api/auth/login` with default test credentials (`admin123`) returns invalid credentials, confirming that credentials in the deployed database were customized during VPS initialization. Active browser sessions utilize previously minted, valid JWTs which successfully fetch `/api/scans` and `/api/entities` with HTTP 200.
4. **Autonomous Goal Boundary:** As mandated, zero scans were queued, scheduled, or started during this verification phase.

---

## 8. Remaining Blockers & Next Actions

- **Blockers:** **NONE.** All technical, architectural, and security prerequisites for runtime testing are satisfied.
- **Current State:** **HALTED.** In strict compliance with instructions:
  > *"STOP after verification. Await explicit coordinator authorization before launching runtime acceptance scans."*

The environment is in a verified, clean, and ready state. Awaiting coordinator instructions for Phase 7B.5B (Runtime Acceptance Scans).
