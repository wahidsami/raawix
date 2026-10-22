# RAAWI X — Phase 7B.5B
## Final Runtime Acceptance Readiness Gate Report

**Date:** 2026-10-22  
**Target Environment:** Isolated Test VPS (`https://test-api.unifinitylab.com` / `https://test-report.unifinitylab.com`)  
**Git Baseline:** `bdec0b6` on `feature/semantic-core`  
**Execution Mode:** Strict Read-Only Verification (Zero scan launches, zero database mutations, zero restarts)

---

## 1. Executive Summary & Readiness Gate Status

| Readiness Gate | Status | Finding & Primary Evidence | Remaining Risk | Required Correction |
| :--- | :---: | :--- | :--- | :--- |
| **Check 1: Deployed Scanner Revision & Limit Support** | **FAIL (Defect Found)** | 1. Deployed scanner container runs baseline `742879c`.<br>2. Critical defect in `apps/scanner/src/middleware/validation.ts`: `scanPipelineSchema` omits `agentMaxSteps`/`agentMaxMs`. Zod strips these fields from `req.body` before `resolveScanPipeline` is reached. | Request-level step/time limits are silently dropped by validation, falling back to server defaults (50 steps / 10s). | Add `agentMaxSteps` and `agentMaxMs` to `scanPipelineSchema` in `validation.ts` and deploy scanner. |
| **Check 2: AssistiveMap Matching & Freshness Safety** | **PASS (Safe by Architecture)** | Cloudflare action intents originate from Phase 2 scan `scan_1792479482089_scvi6r1` (edge challenge page). Server matches via Strategy 3 (queryless prefix). Widget freshness engine strictly locks out remediation (`remediator.setAssistiveMap(null)`) on non-ready status. | Zero risk of invalid DOM mutation: `imageDescriptions` and `labelOverrides` are empty; `actionIntents` are never applied to DOM. | None blocking. Recommend running acceptance scan on target fixture to populate fresh non-challenge map. |

**Final Readiness Gate Verdict:** **HOLD FOR VALIDATION SCHEMA REPAIR & DEPLOYMENT**  
A scan cannot be launched with custom request-level step/time limits until `apps/scanner/src/middleware/validation.ts` is patched and the scanner container is redeployed. However, the AssistiveMap and Widget remediation safety contracts are verified architecturally robust and fail-safe.

---

## 2. Check 1 — Deployed Scanner Revision & Interaction Limit Verification

### 2.1 Actual Deployed Scanner Image & Revision
1. **Report UI vs Scanner API Deployment Lifecycle:**
   - As established in Phase 7B.5A, `test-report.unifinitylab.com` is an automated Vite static site that re-compiled at `04:02:03 GMT` (post-`7caf193`).
   - The scanner backend (`test-api.unifinitylab.com`) is a long-running Docker container built via Coolify.
   - Historical records from Phase 7B.1 (`PHASE_7B_1_FIXTURE_REPAIR_AND_SCANNER_READINESS_REPORT.md` Section 2.1) and Phase 4 (`PHASE_4_POST_DEPLOYMENT_VERIFICATION_REPORT.md`) confirm the scanner container image was built at commit `742879c6f86a591056abffca45df522c33dae862`.
   - The intervening commits between `742879c` and `4689fbb` contained only widget and report code; commit `4689fbb` introduced the Phase 7B.3 Blind Agent contract.

### 2.2 Trace of `agentMaxSteps` and `agentMaxMs` Through the HTTP Request Pipeline
Tracing an incoming `POST /api/scans/start` request reveals the complete processing chain:
1. `apps/scanner/src/index.ts` (line 216):
   ```typescript
   app.post('/api/scans/start', requireAuth, validateScanRequest, async (req, res) => {
     // ... passes req.body to jobQueue.addJob(req.body)
   ```
2. `apps/scanner/src/middleware/validation.ts` (lines 68-105):
   ```typescript
   export function validateScanRequest(req: Request, res: Response, next: NextFunction): void {
     const validated = scanRequestSchema.parse(req.body);
     // ...
     req.body = validated;
     next();
   }
   ```
3. Inside `scanRequestSchema`, the nested pipeline parser is defined as:
   ```typescript
   const scanPipelineSchema = z
     .object({
       layer1: z.boolean().optional(),
       layer2: z.boolean().optional(),
       layer3: z.boolean().optional(),
       analysisAgent: z.boolean().optional(),
       screenshotMode: z.enum(['none', 'viewport', 'full']).optional(),
       scanPreset: z.enum(['full', 'fast']).optional(),
     })
     .optional();
   ```

### 2.3 Discovery of Zod Stripping Defect
- **Root Cause:** In Zod, `z.object({...})` operates in `strip` mode by default. Any property present in `req.body.scanPipeline` that is not declared in `scanPipelineSchema` is automatically discarded during `.parse()`.
- **Impact:** When a caller submits:
  ```json
  {
    "scanPipeline": {
      "layer1": true,
      "layer3": true,
      "agentMaxSteps": 15,
      "agentMaxMs": 3000
    }
  }
  ```
  `validateScanRequest` strips `agentMaxSteps` and `agentMaxMs`.
- **Result at Runtime:** When `resolveScanPipeline(request)` runs inside the scan job queue (`apps/scanner/src/scan-pipeline.ts`), `request.scanPipeline.agentMaxSteps` is `undefined`.
- The system unconditionally falls back to server defaults (`config.agent.maxSteps = 50`, `config.agent.maxMs = 10000`).
- **Conclusion:** Custom request-level limits **do not reach `resolveScanPipeline` or the interaction agent** when submitted over HTTP in either `742879c` or `7caf193`.

### 2.4 Tightening vs Server Ceiling Clamping Evaluation
In `apps/scanner/src/scan-pipeline.ts` (lines 70-86), the clamping logic is implemented as follows:
```typescript
const serverMaxSteps = serverLimits?.maxSteps ?? config.agent.maxSteps;
const serverMaxMs = serverLimits?.maxMs ?? config.agent.maxMs;

let agentMaxSteps: number | undefined;
if (typeof p?.agentMaxSteps === 'number' && Number.isFinite(p.agentMaxSteps)) {
  agentMaxSteps = Math.max(1, Math.min(Math.floor(p.agentMaxSteps), serverMaxSteps));
} else {
  agentMaxSteps = serverMaxSteps;
}

let agentMaxMs: number | undefined;
if (typeof p?.agentMaxMs === 'number' && Number.isFinite(p.agentMaxMs)) {
  agentMaxMs = Math.max(100, Math.min(Math.floor(p.agentMaxMs), serverMaxMs));
} else {
  agentMaxMs = serverMaxMs;
}
```
- **Clamping Correctness:** If `p.agentMaxSteps` reaches this function, it correctly enforces the ceiling: requesting 200 steps clamps to 50; requesting 15 steps tightens to 15; negative/zero values floor to 1.
- However, because of the middleware defect in Section 2.3, `p?.agentMaxSteps` is always `undefined` when invoked via the HTTP API.

### 2.5 Effective Server Limits
Querying `GET https://test-api.unifinitylab.com/api/scanner/config` returns:
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
- Server Ceilings: `maxSteps: 50`, `maxMs: 10000` (10 seconds), `probesEnabled: true`.
- Autonomous Execution: Disabled (`RAAWI_EXECUTION_AGENT_ENABLED=false`).
- SSRF Filtering: Localhost and private IPv4/IPv6 ranges strictly blocked.

### 2.6 Check 1 Verdict & Required Correction
- **Verdict:** **FAIL (BLOCKING DEFECT)**
- **Required Correction:**
  1. In `apps/scanner/src/middleware/validation.ts`, extend `scanPipelineSchema`:
     ```typescript
     agentMaxSteps: z.number().int().positive().optional(),
     agentMaxMs: z.number().int().positive().optional(),
     ```
  2. Redeploy the scanner container on Coolify so that `apps/scanner` contains both commit `4689fbb` (the safe execution loop) and the validation fix.

---

## 3. Check 2 — AssistiveMap Page Matching, Cloudflare Origin & Freshness Gate

### 3.1 Live Page-Package Response Inspection
A read-only query was executed against the live test endpoint:
`GET https://test-api.unifinitylab.com/api/widget/page-package?domain=www.w3.org&url=https://www.w3.org/WAI/demos/bad/`

**Returned Payload:**
```json
{
  "siteId": "989007d4-b3b1-4816-8c91-21624ba087e9",
  "entityId": null,
  "entityCode": null,
  "propertyId": null,
  "propertyDomain": null,
  "url": "https://www.w3.org/WAI/demos/bad/",
  "matchedUrl": "https://www.w3.org/WAI/demos/bad?__cf_chl_rt_tk=hjzqrOrO53fZ56AXWMkS3Gr6dTg_1uGxMydaDTtuT1s-1792479483-1.0.1.1-lIPl1RW27iHDuWyMFLd1HmT4uZNJzXJK4KKTsLgy61U",
  "matchConfidence": "medium",
  "generatedAt": "2026-10-20T06:58:34.862Z",
  "fingerprint": null,
  "assistiveMap": {
    "actionIntents": {
      "a": {
        "intent": "Cloudflare, opens in a new tab",
        "source": "dom",
        "selector": "a",
        "confidence": "high",
        "description": "Cloudflare, opens in a new tab: Cloudflare, opens in a new tab"
      },
      ".footer-text": {
        "intent": "Privacy, opens in a new tab",
        "source": "dom",
        "selector": ".footer-text",
        "confidence": "high",
        "description": "Privacy, opens in a new tab: Privacy, opens in a new tab"
      }
    },
    "labelOverrides": {},
    "imageDescriptions": {}
  },
  "confidenceSummary": {
    "actionIntents": { "low": 0, "high": 2, "medium": 0 },
    "labelOverrides": { "low": 0, "high": 0, "medium": 0 },
    "imageDescriptions": { "low": 0, "high": 0, "medium": 0 }
  },
  "semanticModel": null,
  "guidance": null,
  "issuesSummary": { "total": 0, "critical": 0, "important": 0 },
  "scanTimestamp": null
}
```

### 3.2 Root Cause of the Cloudflare Action Intents
1. **Origin Identification:**
   - Note the `matchedUrl`:
     `https://www.w3.org/WAI/demos/bad?__cf_chl_rt_tk=hjzqrOrO...`
   - Note the timestamp:
     `generatedAt: "2026-10-20T06:58:34.862Z"`
2. **Scan Provenance:**
   - During Phase 2 on 2026-10-20, exactly one controlled scan was executed (`scan_1792479482089_scvi6r1`) targeting `https://www.w3.org/WAI/demos/bad/`.
   - The target edge returned a Cloudflare Turnstile bot challenge (`<title>Just a moment...</title>`).
   - The scanner audited the challenge page as delivered by the target server and synthesized action intents for the two links present on that challenge page (`a` -> Cloudflare homepage, `.footer-text` -> Cloudflare Privacy policy).
   - This `PageVersion` was persisted in PostgreSQL linked to site `989007d4-b3b1-4816-8c91-21624ba087e9`.

### 3.3 Server Association Trace (`findPageVersionByUrl`)
In `apps/scanner/src/db/assistive-map-repository.ts` (lines 167-251), the server executes three progressive lookup strategies:
1. **Strategy 1 (Exact Canonical Match):** Fails because `https://www.w3.org/WAI/demos/bad/` does not match the tokenized query string `?__cf_chl_rt_tk=...`.
2. **Strategy 2 (Final URL Match):** Fails for the same reason.
3. **Strategy 3 (Queryless Match, lines 225-249):**
   ```typescript
   const requestUrlObj = new URL(requestUrl);
   requestUrlObj.search = '';
   const querylessUrl = requestUrlObj.toString(); // "https://www.w3.org/WAI/demos/bad"

   pageVersion = await prisma.pageVersion.findFirst({
     where: {
       siteId: site.id,
       OR: [
         { canonicalUrl: { startsWith: querylessUrl.split('?')[0] } },
         { finalUrl: { startsWith: querylessUrl.split('?')[0] } },
       ],
     },
     orderBy: { generatedAt: 'desc' },
   });
   ```
   Because `canonicalUrl` in the database begins with `https://www.w3.org/WAI/demos/bad`, Strategy 3 matches the record, marks `matchConfidence: 'medium'`, and returns the challenge page version.

### 3.4 Live Widget Freshness Evaluation Trace
When the widget (`@raawi-x/widget`) receives this package:
1. `MapApiClient.fetchPagePackage` (`apps/widget/src/core/api-client.ts`, line 328):
   - Computes live page fingerprint via `computeLivePageFingerprint()`.
   - Calls `evaluateFreshness(validated.fingerprint, liveFp)` (`apps/widget/src/core/freshness-engine.ts`, line 201).
2. **Case A: Missing Fingerprint (`fingerprint: null`):**
   - Lines 205-213: If package lacks fingerprint data, `evaluateFreshness` returns `{ status: 'unknown', isStale: false, reason: 'Package lacks fingerprint data...' }`.
   - `apiClient` notifies status `'unknown'`.
3. **Case B: Stale Fingerprint Present:**
   - If the package had the challenge page title (`"Just a moment..."`) and the live page is the real W3C demo (`"Before and After Demonstration..."`), lines 259-268 trigger:
     ```typescript
     if (mismatchedFields.includes('title')) {
       return {
         status: 'outdated',
         isStale: true,
         reason: 'Page title changed (package: "Just a moment...", current: "Before and After Demonstration...")'
       };
     }
     ```
   - `apiClient` notifies status `'outdated'`.

### 3.5 Remediation Safety Gate & Lockout Proof
In `apps/widget/src/core/shadow-container.ts` (lines 95-104), the map is wired to the DOM remediator:
```typescript
this.apiClient.subscribe((status, data) => {
  if (status === 'ready' && data?.assistiveMap) {
    this.remediator.setAssistiveMap(data.assistiveMap);
    if (this.state.getSettings().remediationEnabled) {
      this.remediator.apply();
    }
  } else {
    this.remediator.setAssistiveMap(null);
  }
});
```
- **Gating Proof:**
  - `remediator.setAssistiveMap` is executed **ONLY** if `status === 'ready'`.
  - For status `'unknown'`, `'outdated'`, `'mismatch'`, or `'not-scanned'`, the `else` branch executes `this.remediator.setAssistiveMap(null)`.
  - In `apps/widget/src/core/dom-remediator.ts` (line 49), `setAssistiveMap(null)` unconditionally invokes `this.revert()`, restoring all original DOM nodes and clearing all records.
- **Payload Safety Proof:**
  - Even if an attacker or misconfigured client forced `DomRemediator.apply()`, lines 97-114 show that `DomRemediator` **only acts on `imageDescriptions` and `labelOverrides`**.
  - In the Cloudflare package, `imageDescriptions: {}` and `labelOverrides: {}` are completely empty.
  - `DomRemediator` does **not** consume `actionIntents` (which belong strictly to screen-reader and speech shortcut guidance).
- **Result:** Zero DOM elements can be altered or injected with Cloudflare data.

### 3.6 Check 2 Verdict & Risk Assessment
- **Verdict:** **PASS (ZERO MUTATION RISK)**
- **Remaining Risk:** None for runtime DOM integrity. The only cosmetic anomaly is that an API consumer querying `/api/widget/page-package` without entity filtering receives the historical challenge map until a fresh scan of the real W3C fixture is conducted.

---

## 4. Summary Matrix: Readiness, Risks, and Corrections

| Component | Target State | Current Deployed State | Blocking? | Corrective Action |
| :--- | :--- | :--- | :---: | :--- |
| **`validation.ts` schema** | Must validate and retain `agentMaxSteps` & `agentMaxMs` | Discards `agentMaxSteps` and `agentMaxMs` via Zod strip | **YES** | Add fields to `scanPipelineSchema` in `apps/scanner/src/middleware/validation.ts`. |
| **Scanner Container Revision** | `7caf193` + validation fix | Running `742879c` | **YES** | Rebuild and deploy scanner container on Coolify. |
| **Report UI Revision** | `7caf193` | Running `7caf193` (`04:02:03 GMT`) | **NO** | Already deployed and verified compatible. |
| **AssistiveMap Matching** | Strict URL / fingerprint matching | Queryless prefix match to historical challenge scan | **NO** | Safe: widget locks out non-ready maps; payload has 0 image/label remediations. |
| **SSRF & Execution Gates** | Ports 80/443, autonomous agent disabled | Configured and verified active | **NO** | Safe: SSRF active, autonomous execution disabled. |

---

## 5. Stopping Point & Awaiting Coordinator Authorization

In compliance with Phase 7B.5B instructions:
- Verification and root-cause tracing are complete.
- Zero scans or mutations were performed.
- **The system is STOPPED.**

**Awaiting coordinator authorization and instructions regarding:**
1. Authorizing the fix to `apps/scanner/src/middleware/validation.ts`.
2. Coordinating the scanner container redeploy on Coolify.
3. Authorizing the final runtime acceptance test scan.
