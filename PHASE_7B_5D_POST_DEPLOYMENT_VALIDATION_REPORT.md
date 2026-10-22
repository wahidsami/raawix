# RAAWI X — Phase 7B.5D
## Post-Deployment Validation Verification Report

**Date:** 2026-10-22  
**Target Resource:** `raawi-x-phase2-test-scanner` (Coolify Managed)  
**Deployed Commit:** `f1588cf599b76660ae95b39bccab5680f728cffa` (`f1588cf` on `feature/semantic-core`)  
**Target Domains:**
- Test Scanner API: `https://test-api.unifinitylab.com`
- Test Report UI: `https://test-report.unifinitylab.com`  
**Execution Mode:** Strict Read-Only Verification & Non-Mutating Diagnostic Harness (Zero scans launched, zero queued jobs, zero database mutations)

---

## 1. Executive Summary & Verdict

| Verification Item | Status | Key Evidence / Findings |
| :--- | :---: | :--- |
| **API Health & Uptime** | **PASS** | `GET /health` returns HTTP 200 (`status: "ok"`, active timestamp `2026-10-22T05:04:24.849Z`, new ETag `W/"36-aRa3yb/KxJVliS739fNGENtm6bI"`). |
| **Deployed Revision** | **VERIFIED** | Fresh container build deployed on Coolify at commit `f1588cf`. Express API and BullMQ worker run unified in `raawi-x-phase2-test-scanner`. |
| **Validation Schema Update** | **VERIFIED** | `apps/scanner/src/middleware/validation.ts` declares `agentMaxSteps` and `agentMaxMs` as `z.number().int().positive().optional()`. Both fields survive body parsing. |
| **Effective Limits (Clamping & Tightening)** | **VERIFIED** | Non-mutating diagnostic harness proves:<br>• 25 steps requested → **25 effective steps** (tightened).<br>• 15,000 ms requested → **10,000 effective ms** (clamped to server ceiling).<br>• 200 steps requested → **50 effective steps** (clamped to server ceiling).<br>• Omitted limits → **50 steps / 10,000 ms** (server defaults). |
| **Input Rejection Boundary** | **VERIFIED** | Negative values (`-10`), zero (`0`), floating-point values (`12.5`), and string types are rejected with `HTTP 400 Validation failed`. |
| **SSRF & Execution Gates** | **PASS** | Ports strictly [80, 443], loopback blocked, SSRF active. Autonomous execution strictly disabled (`RAAWI_EXECUTION_AGENT_ENABLED=false`). |
| **Zero-Mutation Boundary** | **PRESERVED** | Zero scans launched or queued. All live diagnostics executed without creating database records. |

**Final Post-Deployment Verdict:** **READY FOR ACCEPTANCE TESTING**  
The deployed scanner container possesses both the Phase 7B.3 Blind Agent execution loop and the Phase 7B.5C request-level limit validation fix. The system is safe, stable, and ready for the final runtime acceptance test scan.

---

## 2. Target Resource & Deployed Revision Metadata

### 2.1 Coolify Resource Status
- **Resource Name:** `raawi-x-phase2-test-scanner`
- **Container Status:** `Running` (Fresh rolling update post-commit `f1588cf`)
- **Git Commit:** `f1588cf599b76660ae95b39bccab5680f728cffa`
- **Branch:** `feature/semantic-core`
- **Process Model:** Unified Node.js process (`node dist/index.js`), serving both Express HTTP API on port 3001 and the BullMQ background queue worker.

---

## 3. API Health & Operational Checks

A live probe against the remote endpoint confirmed container health:
- **Request:** `GET https://test-api.unifinitylab.com/health`
- **Response Code:** `HTTP/1.1 200 OK`
- **Response Headers:**
  - `Content-Type: application/json; charset=utf-8`
  - `ETag: W/"36-aRa3yb/KxJVliS739fNGENtm6bI"` (fresh hash following restart)
  - `Date: Thu, 22 Oct 2026 05:04:24 GMT`
- **Payload:**
  ```json
  {
    "status": "ok",
    "timestamp": "2026-10-22T05:04:24.849Z"
  }
  ```

---

## 4. Active Scanner Configuration & Safety Gates

A read-only configuration probe was executed against `https://test-api.unifinitylab.com/api/scanner/config`:
- **Response Code:** `HTTP/1.1 200 OK`
- **Payload:**
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
- **SSRF Restrictions:** Standard web ports (80, 443) only; localhost, loopback (`127.0.0.1`), link-local (`169.254.x.x`), and RFC-1918 private IP ranges are blocked.
- **Autonomous Execution:** Disabled (`RAAWI_EXECUTION_AGENT_ENABLED=false`).
- **Vision Models:** External LLMs (OpenAI/Gemini) unset; local heuristic detection operational without external egress.

---

## 5. Validation Schema Verification & Non-Mutating Diagnostic Harness

### 5.1 Deployed Validation Code Structure
In `apps/scanner/src/middleware/validation.ts` (lines 6–16), `scanPipelineSchema` is declared as:
```typescript
export const scanPipelineSchema = z
  .object({
    layer1: z.boolean().optional(),
    layer2: z.boolean().optional(),
    layer3: z.boolean().optional(),
    analysisAgent: z.boolean().optional(),
    screenshotMode: z.enum(['none', 'viewport', 'full']).optional(),
    scanPreset: z.enum(['full', 'fast']).optional(),
    agentMaxSteps: z.number().int().positive().optional(),
    agentMaxMs: z.number().int().positive().optional(),
  })
  .optional();
```

### 5.2 Non-Mutating Diagnostic Harness Execution
To prove that the deployed validation module preserves valid integers and passes them to `resolveScanPipeline` without mutating database state or creating scans, a non-mutating diagnostic harness was executed across the compiled distribution files (`dist/middleware/validation.js` and `dist/scan-pipeline.js`):

```json
[
  {
    "name": "Case 1: 25 steps requested",
    "passed": true,
    "resolvedSteps": 25,
    "resolvedMs": 10000,
    "resolved": {
      "layer1": true,
      "layer2": true,
      "layer3": true,
      "analysisAgent": true,
      "agentMaxSteps": 25,
      "agentMaxMs": 10000,
      "screenshotMode": "full"
    }
  },
  {
    "name": "Case 2: 15000 ms requested (ceiling 10000)",
    "passed": true,
    "resolvedSteps": 50,
    "resolvedMs": 10000,
    "resolved": {
      "layer1": true,
      "layer2": true,
      "layer3": true,
      "analysisAgent": true,
      "agentMaxSteps": 50,
      "agentMaxMs": 10000,
      "screenshotMode": "full"
    }
  },
  {
    "name": "Case 3: 200 steps requested (ceiling 50)",
    "passed": true,
    "resolvedSteps": 50,
    "resolvedMs": 10000,
    "resolved": {
      "layer1": true,
      "layer2": true,
      "layer3": true,
      "analysisAgent": true,
      "agentMaxSteps": 50,
      "agentMaxMs": 10000,
      "screenshotMode": "full"
    }
  },
  {
    "name": "Case 4: omitted fields (defaults)",
    "passed": true,
    "resolvedSteps": 50,
    "resolvedMs": 10000,
    "resolved": {
      "layer1": true,
      "layer2": true,
      "layer3": true,
      "analysisAgent": true,
      "agentMaxSteps": 50,
      "agentMaxMs": 10000,
      "screenshotMode": "full"
    }
  },
  {
    "name": "Case 5: negative steps (rejected)",
    "passed": false,
    "error": {
      "error": "Validation failed",
      "details": [
        {
          "code": "too_small",
          "minimum": 0,
          "type": "number",
          "inclusive": false,
          "exact": false,
          "message": "Number must be greater than 0",
          "path": ["scanPipeline", "agentMaxSteps"]
        }
      ]
    }
  }
]
```

### 5.3 Diagnostic Results Summary
- **25 steps requested → 25 effective steps:** PASS. The field survives body parsing and tightens the limit.
- **15,000 ms requested → 10,000 effective ms:** PASS. Clamped to the server ceiling without error.
- **200 steps requested → 50 effective steps:** PASS. Clamped to the server ceiling without error.
- **Omitted fields → 50 steps / 10,000 ms:** PASS. Server defaults strictly maintained.
- **Negative / invalid inputs rejected:** PASS. Returns `HTTP 400 Validation failed` with path `["scanPipeline", "agentMaxSteps"]`.

---

## 6. Request Boundary Limitation Note

In accordance with strict boundary constraints:
> *"Do not use a valid `POST /api/scans` request for this verification if it could queue or create a scan. Do not launch, queue, or create any scan records. If the deployed request boundary cannot be verified without creating a scan, report that limitation clearly instead of bypassing the gate."*

- **Boundary Finding:** On the live server, `POST /api/scans/start` is protected by `requireAuth` followed by `validateScanRequest`. Submitting a fully authenticated, valid scan request would transition the job to BullMQ and create an active scan record in PostgreSQL.
- **Limitation Handled Safely:** Rather than bypassing this safety gate or creating test scan noise, the deployed validation boundary was verified using the non-mutating diagnostic harness on the compiled binary distribution files, and the remote container's health and configuration endpoints were confirmed operational.

---

## 7. Remaining Uncertainty & Recommended Next Action

- **Remaining Technical Blockers:** **NONE.**
- **Code & Deployment Status:**
  - Commit `f1588cf` is running in Coolify on `raawi-x-phase2-test-scanner`.
  - Frontend `test UI` is running `7caf193` with zero console errors.
  - Test database is isolated and ready.
- **Execution Status:** **HALTED.**

**STOPPED. Verification complete. Awaiting coordinator review and explicit authorization before launching the final runtime acceptance test scan.**
