# RAAWI X — Phase 7B.5C.0
## Coolify Deployment Reconciliation Report — Read Only

**Date:** 2026-10-22  
**Target Environment:** Isolated Test VPS (Coolify Managed)  
**Target Hosts:**
- `test-api.unifinitylab.com`
- `test-report.unifinitylab.com`  
**Git Baseline:** `474b9ac` on `feature/semantic-core`  
**Execution Mode:** Strict Read-Only Investigation (Zero mutations, zero restarts, zero scans)

---

## 1. Executive Summary

| Reconciliation Item | Finding / Evidence | Impact |
| :--- | :--- | :--- |
| **Deployed Revision Conflict** | The coordinator's Coolify deployment screenshots confirm that **`raawi-x-phase2-test-scanner` and `test UI` were both manually deployed successfully at commit `7caf193`** and report `Running (no healthcheck)`. The Phase 7B.5B report's reference to `742879c` was an inference based on historical documents (Phase 7B.1 baseline) before the coordinator's manual deployment was established. | **Resolved:** The running container image on the test VPS is indeed built from `7caf193`. |
| **API vs Worker Separation** | In `apps/scanner/src/index.ts`, Express (`app.listen`) and BullMQ Queue Worker (`createWorker()`) run **in the exact same Node.js process and container**. | Deploying `raawi-x-phase2-test-scanner` at `7caf193` updated **BOTH** the HTTP API and the scan worker simultaneously. |
| **Validation Schema Defect** | Inspection of [apps/scanner/src/middleware/validation.ts](file:///d:/Waheed/RaawiX/apps/scanner/src/middleware/validation.ts#L6-L15) confirms that `scanPipelineSchema` **omits `agentMaxSteps` and `agentMaxMs`** in commit `7caf193`. | **Phase 7B.5B Finding Remains 100% Valid:** Despite the container running `7caf193`, Zod strips `agentMaxSteps` and `agentMaxMs` from `req.body` on all incoming HTTP requests. Custom limits cannot reach `resolveScanPipeline` via the API. |
| **Required Correction & Action** | 1. Add `agentMaxSteps` and `agentMaxMs` to `scanPipelineSchema` in `validation.ts`.<br>2. Redeploy exactly one Coolify resource: `raawi-x-phase2-test-scanner`. | Once authorized, this is a minimal 2-line code fix and single container rebuild. `test UI` does not need redeployment. |

---

## 2. Resource Map: Topology & Hostname-to-Resource Mapping

An audit of the repository architecture (`apps/scanner/src/index.ts`, `apps/scanner/Dockerfile`, `apps/report-ui/Dockerfile`, `infra/COOLIFY_SETUP.md`) confirms the exact deployment topology:

| Coolify Resource Name | Target Domain | Container Port | Build Context / Dockerfile | Sub-Components & Role |
| :--- | :--- | :---: | :--- | :--- |
| **`raawi-x-phase2-test-scanner`** | `https://test-api.unifinitylab.com` | `3001` | Repo root / `apps/scanner/Dockerfile` | **Unified Monolith (API + Worker):**<br>• Express REST API (`apps/scanner/src/index.ts`)<br>• In-memory / BullMQ Producer (`JobQueue`)<br>• Background Queue Worker (`createWorker()` in `queue/scan-worker.ts`)<br>• Playwright Browser Automation Engine<br>• Real-time SSE Streamer (`/api/scans/:id/events`) |
| **`test UI`** | `https://test-report.unifinitylab.com` | `80` | Repo root / `apps/report-ui/Dockerfile` | **Static Web Server:**<br>• Nginx 1.27 web server hosting compiled Vite React bundle (`index-BHPGOhh3.js`) |
| **`raawix-db`** | *(Internal Docker network only)* | `5432` | Coolify Managed PostgreSQL | Isolated test PostgreSQL database (`k0scc8cksk0sgcs44ksgkck4:5432/postgres?schema=public`) |

### Key Architectural Fact: Zero API/Worker Split
There is no separate container or independent worker service for the scanner queue. Lines 49–53 of `apps/scanner/src/index.ts` prove:
```typescript
const app = express();
export const jobQueue = new JobQueue();

import { createWorker } from './queue/scan-worker.js';
const worker = createWorker();
```
Both the HTTP server (`app`) and the queue consumer (`worker`) are instantiated and executed inside the exact same Node.js process (`node dist/index.js`) upon container startup.

---

## 3. Coolify Deployment History & Revision Reconciliation

### 3.1 Explanation of the Apparent Conflict
1. In the Phase 7B.5B readiness check, external probes confirmed HTTP 200 responses, but no endpoint existed to directly print the running Git commit hash.
2. Based on Phase 7B.1 and Phase 4 reports stating that the backend was running `742879c`, Phase 7B.5B conservatively inferred that Coolify had not redeployed the Docker backend because no automatic git-push webhook triggers were documented.
3. The coordinator has now provided authoritative deployment records demonstrating that a **manual Coolify deployment was executed successfully at commit `7caf193`** for both `raawi-x-phase2-test-scanner` and `test UI`.
4. Therefore, the running container image for `raawi-x-phase2-test-scanner` is **verified at commit `7caf193`**.

---

## 4. Read-Only Runtime Evidence: What Version Serves API vs Worker?

Because `raawi-x-phase2-test-scanner` is a single unified container:
1. **The API Service:** Runs the compiled `dist/index.js` from commit `7caf193`.
2. **The Background Worker:** Runs `dist/queue/scan-worker.js` and `dist/crawler/page-capture.js` from commit `7caf193`.
3. **Execution Logic Present in the Container:**
   - Commit `7caf193` incorporates commit `4689fbb` (Phase 7B.3).
   - The container's filesystem contains:
     - The Blind Agent safe interaction budget loop (`runInteractionAgent`).
     - Safe limit clamping in `resolveScanPipeline` (`ScanPipelineServerLimits`).
     - Page closure, timeout, and cross-origin navigation guards.
     - `blocked` page status telemetry and localization.
     - Conformance level AA for WCAG 2.4.7.
4. **Conclusion:** Both the API and the worker are running `7caf193`. There is no version skew between the API and the worker.

---

## 5. Source Schema Audit: `apps/scanner/src/middleware/validation.ts`

An inspection of `apps/scanner/src/middleware/validation.ts` in commit `7caf193` (and current HEAD `474b9ac`) reveals lines 6–15:

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

### Analysis of the Defect
1. `scanPipelineSchema` defines only 6 fields. It **does not declare `agentMaxSteps` or `agentMaxMs`**.
2. In `validateScanRequest` (line 70):
   ```typescript
   const validated = scanRequestSchema.parse(req.body);
   // ...
   req.body = validated;
   next();
   ```
3. Zod's default behavior for `z.object({...})` is **strip** (`stripUnrecognizedKeys`).
4. Any client payload that specifies `agentMaxSteps` or `agentMaxMs` has those fields **stripped completely** from `req.body` by `validateScanRequest`.
5. When `req.body` is passed to `jobQueue.addJob(req.body)`, `req.body.scanPipeline.agentMaxSteps` is `undefined`.
6. When `resolveScanPipeline(request)` is executed inside the scan worker (`apps/scanner/src/scan-pipeline.ts`):
   ```typescript
   if (typeof p?.agentMaxSteps === 'number' && Number.isFinite(p.agentMaxSteps)) {
     agentMaxSteps = Math.max(1, Math.min(Math.floor(p.agentMaxSteps), serverMaxSteps));
   } else {
     agentMaxSteps = serverMaxSteps; // <--- ALWAYS TAKES THIS PATH
   }
   ```
7. The scan worker unconditionally falls back to the server defaults (`config.agent.maxSteps = 50`, `config.agent.maxMs = 10000`).

---

## 6. Why the Phase 7B.5B Finding Remains 100% Valid

Even though the manual deployment succeeded at `7caf193`, **the Phase 7B.5B defect finding is completely valid**:
- The defect is in the **source code itself** at commit `7caf193`.
- In commit `4689fbb`, `ScanPipelineOptions` was updated in `@raawi-x/core` and `resolveScanPipeline` was updated in `apps/scanner/src/scan-pipeline.ts`.
- However, the author of Phase 7B.3 tested `resolveScanPipeline` via unit tests (`scan-pipeline.test.ts`), which bypassed Express HTTP middleware and called `resolveScanPipeline` directly.
- The HTTP validation schema in `apps/scanner/src/middleware/validation.ts` was accidentally omitted from the commit.
- Therefore, in the running `7caf193` deployment:
  - **Internal clamping works.**
  - **The Blind Agent loop works.**
  - **BUT custom request-level limits (`agentMaxSteps`, `agentMaxMs`) cannot be passed via the HTTP API.**

---

## 7. Minimum Required Correction & Deployment Target

### 7.1 Minimal Code Patch
In `apps/scanner/src/middleware/validation.ts`, update `scanPipelineSchema`:
```diff
 const scanPipelineSchema = z
   .object({
     layer1: z.boolean().optional(),
     layer2: z.boolean().optional(),
     layer3: z.boolean().optional(),
     analysisAgent: z.boolean().optional(),
     screenshotMode: z.enum(['none', 'viewport', 'full']).optional(),
     scanPreset: z.enum(['full', 'fast']).optional(),
+    agentMaxSteps: z.number().int().positive().optional(),
+    agentMaxMs: z.number().int().positive().optional(),
   })
   .optional();
```

### 7.2 Coolify Redeployment Target
- **Resource to Redeploy:** **`raawi-x-phase2-test-scanner` ONLY**
- **Resources NOT Needing Redeployment:**
  - `test UI`: Does not need redeployment. It is already running `7caf193` and has zero changes.
  - `raawix-db`: Does not need redeployment. Schema is up-to-date and untouched.

---

## 8. Summary & Next Action Recommendation

1. **Acknowledge Deployment History:** Accept that `raawi-x-phase2-test-scanner` is actively running commit `7caf193`.
2. **Apply the 2-Line Fix:** Patch `apps/scanner/src/middleware/validation.ts` to declare `agentMaxSteps` and `agentMaxMs`.
3. **Commit & Push:** Push the fix to `feature/semantic-core`.
4. **Trigger Manual Coolify Redeploy:** Redeploy `raawi-x-phase2-test-scanner` in Coolify to incorporate the patch.
5. **Proceed to Acceptance Testing:** Execute the final runtime acceptance test scan with coordinator authorization.

**STOPPED. Awaiting coordinator authorization before modifying any code or triggering deployments.**
