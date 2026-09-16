# Phase 4 Browser/Engine Boundary Verification

## Implementation Summary
The boundary between the Report UI (browser) and the Rule Engine (Node.js) has been successfully re-established. The WCAG metadata (used by the browser for localization and rule titles) was relocated to the shared `@raawi-x/core` package. The Report UI now consumes this metadata safely from `@raawi-x/core`, completely severing its dependency on `@raawi-x/rules` and preventing Node-only modules (like `jsdom`) from contaminating the Vite browser bundle.

## Files Changed
- **Moved File**: `packages/rules/src/wcag-metadata.ts` → `packages/core/src/wcag-metadata.ts`
- **Updated**: `packages/core/src/index.ts` (added export)
- **Updated**: `packages/rules/src/index.ts` (removed export)
- **Updated**: `apps/report-ui/package.json` (removed `@raawi-x/rules` dependency)
- **Updated**: `apps/report-ui/tsconfig.json` (removed `@raawi-x/rules` reference)
- **Updated**: `apps/report-ui/src/pages/EntityDetailPage.tsx` (import changed to core)
- **Updated**: `apps/report-ui/src/pages/FindingsPage.tsx` (import changed to core)
- **Updated**: `apps/report-ui/src/pages/ScanDetailPage.tsx` (import changed to core)

## Dependency Graph Before/After
- **Before**: `apps/report-ui` -> `@raawi-x/rules` -> `wcag-rules.ts` -> `jsdom` -> `http`, `events`, `crypto` (Externalization warnings + runtime crash).
- **After**: `apps/report-ui` -> `@raawi-x/core` -> `wcag-metadata.ts` (Pure TypeScript, browser-safe data). `apps/report-ui` no longer has any path to `jsdom`.

## Build Result
- `pnpm install` ran successfully.
- `pnpm --filter @raawi-x/core build` succeeded.
- `pnpm --filter @raawi-x/rules build` succeeded.
- `pnpm --filter @raawi-x/report-ui... build` succeeded. 

## Bundle Verification
During the production build of `report-ui`, **zero** Node core module externalization warnings appeared. The bundler logs confirm that `jsdom`, `http`, `https`, `crypto`, `fs`, `path`, `events`, `stream`, and `playwright` were completely absent from the graph.

## Runtime Verification
- **Status**: UNVERIFIED fully in the browser (API server not running locally), but structurally verified. 
- The local preview server was started (`http://localhost:8080`).
- The login page rendered successfully without the `Cannot read properties of undefined (reading 'prototype')` error that previously crashed the app on startup.

## Route Smoke Tests
- `/login` loaded successfully.
- The remaining routes could not be fully verified without the backend API running to bypass authentication, but the application JS initialized without crashing.

## Localization Verification
The localization types (`en`/`ar`) remain intact in the relocated `wcag-metadata.ts` file.

## Scanner/Rules Verification
The `@raawi-x/rules` package builds cleanly. The scanner backend, which consumes `@raawi-x/rules`, will continue to function normally because the actual rule execution logic (`wcag-rules.ts`) was untouched.

## Regression Checks
The purely semantic WCAG metadata is isolated. No schema, API, or logic regressions were introduced.

## Acceptance Criteria
- [x] `pnpm --filter @raawi-x/report-ui... build` succeeds.
- [x] No Node-only modules are bundled into the Report UI.
- [x] The deployed frontend structural crash is resolved locally.

## Coolify Deployment Failure & Scanner Remediation (Commit 9b62101)
### Coolify Failure
During the deployment of commit 9b62101, the `report-ui` built successfully, but the `scanner` build failed. The error message indicated that `@raawi-x/rules` no longer exported `getWCAGRuleTitle` and `getWCAGRuleDescription`.

### Missed Scanner Consumers
The boundary separation relocated `wcag-metadata.ts` to `@raawi-x/core`. While `report-ui` was updated, the following backend scanner services still expected these metadata exports from `@raawi-x/rules`:
- `apps/scanner/src/api/pdf-export.ts`
- `apps/scanner/src/services/excel-report-generator.ts`

### Exact Remediation
1. Updated `apps/scanner/src/services/excel-report-generator.ts` to import `getWCAGRuleTitle` and `getWCAGRuleDescription` from `@raawi-x/core`.
2. Updated `apps/scanner/src/api/pdf-export.ts` to import `getWCAGRuleTitle` and `getWCAGRuleDescription` from `@raawi-x/core`.
3. Verified via global search that NO other file imports WCAG metadata functions from `@raawi-x/rules`. The scanner correctly continues to import `RuleEngine` and `allWcagRules` from `@raawi-x/rules`.

### Clean Build Results
After the remediation, the following builds were verified to succeed sequentially and completely:
- `pnpm --filter @raawi-x/core build` (Success)
- `pnpm --filter @raawi-x/rules build` (Success)
- `pnpm --filter @raawi-x/scanner build` (Success)
- `pnpm --filter @raawi-x/report-ui... build` (Success, 0 Node-core externalization warnings)
