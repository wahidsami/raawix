# RAAWI X — Phase 7B.5C
## Request Validation Fix & Regression Tests Report

**Date:** 2026-10-22  
**Branch:** `feature/semantic-core`  
**Starting Commit:** `0f3e665`  
**Scope:** Local implementation and verification of HTTP request-level agent limit validation  
**Execution Mode:** Local unit/regression testing and production compilation only (Zero scan launches, zero service restarts, zero database migrations)

---

## 1. Executive Summary

In accordance with Phase 7B.5C objectives, the HTTP request validation defect in the scanner API has been resolved:
- In [apps/scanner/src/middleware/validation.ts](file:///d:/Waheed/RaawiX/apps/scanner/src/middleware/validation.ts#L6-L16), `scanPipelineSchema` was extended with optional positive integer validation for `agentMaxSteps` and `agentMaxMs`.
- Comprehensive regression tests were authored in [apps/scanner/src/middleware/validation.test.ts](file:///d:/Waheed/RaawiX/apps/scanner/src/middleware/validation.test.ts), with **15/15 tests passing**.
- Automated verification confirms:
  1. Requests specifying `agentMaxSteps: 25` preserve the requested 25-step limit.
  2. Requests specifying `agentMaxMs: 15000` are strictly clamped by `resolveScanPipeline` to the 10000 ms server ceiling.
  3. Requests above either server ceiling (e.g. 200 steps) are clamped and cannot raise effective limits.
  4. Omitted limits preserve server defaults (50 steps / 10000 ms).
  5. Negative, zero, float/fractional, or string values are rejected at the HTTP validation boundary with `400 Bad Request`.
- Monorepo regression tests (**140 scanner tests, 99 widget tests**) and production compilation (`pnpm -r build`) pass with 0 errors.

---

## 2. Code Changes

### 2.1 File: `apps/scanner/src/middleware/validation.ts`
The schema definition was updated to declare `agentMaxSteps` and `agentMaxMs` as positive integers, and both schemas were exported for boundary testing:

```diff
-const scanPipelineSchema = z
+export const scanPipelineSchema = z
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

-const scanRequestSchema = z.object({
+export const scanRequestSchema = z.object({
   seedUrl: z.string().url('Invalid seedUrl format').optional(),
   maxPages: z.number().int().positive().max(config.quotas.maxPagesHardLimit).optional(),
   // ...
```

### 2.2 Preservation of Contract & Execution Boundaries
- **Preserved API Contract:** All existing fields (`layer1`, `layer2`, `layer3`, `analysisAgent`, `screenshotMode`, `scanPreset`) remain identical.
- **Tightening-Only Guarantee:** When client-specified limits reach `resolveScanPipeline`, the existing clamping mechanism (`Math.min(..., serverMaxSteps)`) prevents any caller from escalating limits above server ceilings.
- **SSRF & Safety Isolation:** SSRF protections (`allowedPorts: [80, 443]`, localhost blocked) and autonomous execution flags (`RAAWI_EXECUTION_AGENT_ENABLED=false`) remain completely untouched and enforced.

---

## 3. Regression Tests Suite

A dedicated regression test file was created at [apps/scanner/src/middleware/validation.test.ts](file:///d:/Waheed/RaawiX/apps/scanner/src/middleware/validation.test.ts).

### 3.1 Test Coverage Matrix

| Suite / Test Case | Description | Result |
| :--- | :--- | :---: |
| **1. Schema Definition & Field Preservation** | | |
| • Positive integers preserved | `agentMaxSteps: 25`, `agentMaxMs: 5000` survive parsing | **PASS** |
| • Omission handling | Undefined values pass cleanly without errors | **PASS** |
| • Negative numbers rejected | `-10` steps or `-500` ms throw validation error | **PASS** |
| • Zero values rejected | `0` steps or `0` ms throw validation error (positive required) | **PASS** |
| • Fractional/float rejected | `12.5` steps or `5000.75` ms throw validation error (int required) | **PASS** |
| • Non-numeric strings rejected | `'25'` or `'fast'` throw validation error | **PASS** |
| **2. Middleware Execution Boundary** | | |
| • Valid HTTP request preservation | Middleware leaves `agentMaxSteps: 25` and `agentMaxMs: 6000` on `req.body` and calls `next()` | **PASS** |
| • Negative step count | Returns `HTTP 400` with `{"error": "Validation failed"}` | **PASS** |
| • Zero step count | Returns `HTTP 400` with `{"error": "Validation failed"}` | **PASS** |
| • Float duration | Returns `HTTP 400` with `{"error": "Validation failed"}` | **PASS** |
| **3. End-to-End: Validation to Resolver** | | |
| • Request limit tightening | Request with `agentMaxSteps: 25` tightens effective limit to `25` | **PASS** |
| • Server ceiling clamping (time) | Request with `agentMaxMs: 15000` is clamped to server ceiling `10000 ms` | **PASS** |
| • Server ceiling clamping (steps) | Request with `agentMaxSteps: 200` is clamped to server ceiling `50` | **PASS** |
| • Default preservation (partial) | Omitted limits in pipeline use server defaults (`50 steps / 10000 ms`) | **PASS** |
| • Default preservation (complete) | Omitted `scanPipeline` uses server defaults (`50 steps / 10000 ms`) | **PASS** |

**Test Result:** **15 passed (15 total), duration: 454 ms.**

---

## 4. Verification & Monorepo Build Results

### 4.1 Scanner Test Suite
- **Command:** `pnpm --filter @raawi-x/scanner test --run`
- **Result:** **24 test files passed, 140 tests passed, 0 failed.**
- Includes:
  - `src/middleware/validation.test.ts` (15/15)
  - `src/middleware/legacy-api.test.ts` (2/2)
  - `src/pipeline-integration.test.ts` (9/9)
  - `src/agent/interaction-agent.test.ts` (16/16)
  - `src/scan-pipeline.test.ts` (14/14)
  - All existing classic rules, crawler, and retention suites (84 tests)

### 4.2 Widget Regression Test Suite
- **Command:** `npx tsx --test test/phase5-*.test.ts` (in `apps/widget`)
- **Result:** **6 test files passed, 99 tests passed, 0 failed.**
- All Shadow DOM, Freshness Engine, DomRemediator, and Landmark navigation suites remain 100% green.

### 4.3 Monorepo Production Build
- **Command:** `pnpm -r build`
- **Result:** **All 11 workspace packages compiled successfully with Exit Code 0.**
  - `packages/core`: TypeScript build clean.
  - `packages/rules`: TypeScript build clean.
  - `packages/report`: TypeScript build clean.
  - `packages/semantic-engine`: TypeScript build clean.
  - `apps/agent-runtime`: TypeScript build clean.
  - `apps/widget`: Vite IIFE bundle built (`93.38 kB`).
  - `apps/report-ui`: Vite production bundle built (`dist/assets/index-CxDD6FtF.js`).
  - `apps/scanner`: TypeScript build clean (`dist/`), static templates copied.

---

## 5. Deployment Requirements

Following coordinator authorization, the deployment requirements are:
1. **Repository Push:** Verified changes committed and pushed to `feature/semantic-core`.
2. **Coolify Redeployment Target:**
   - **Resource to Redeploy:** **`raawi-x-phase2-test-scanner` ONLY**.
   - **Reason:** Only `apps/scanner` contains code modifications (`validation.ts`).
   - `test UI` does not require redeployment.
   - `raawix-db` does not require redeployment (no migrations).
3. **Post-Redeploy Verification:** Once the deployment finishes, the scanner container will possess both the safe interaction execution loop and HTTP request-level limit support.

---

## 6. Handoff & Status

- **Status:** **COMPLETED & STOPPED.**
- **Commit SHA:** Will be reported upon push.
- **Working Tree:** Clean.

Per Phase 7B.5C instructions, **no services were restarted, no remote deployments were triggered, and no scans were executed**.

**Awaiting coordinator review and deployment authorization.**
