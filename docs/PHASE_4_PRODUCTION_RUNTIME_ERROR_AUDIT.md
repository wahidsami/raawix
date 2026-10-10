# Phase 4 Production Runtime Error Audit

## 1. Executive Summary
A fatal runtime error (`Cannot read properties of undefined (reading 'prototype')`) is occurring in the deployed Raawi X Report UI. This is **not** a caching or version mismatch issue. The root cause is a fundamental build-graph contamination: the `@raawi-x/rules` package was recently linked to `apps/report-ui` to resolve TypeScript compilation errors, but it exports both browser-safe metadata and Node-only rule engines (which import `jsdom` and Node native modules). Vite bundled these Node-only dependencies, externalized the core modules (like `http`, `events`, `crypto`), and caused a fatal crash during the browser's initial script evaluation.

## 2. Exact Error
```
Uncaught TypeError: Cannot read properties of undefined (reading 'prototype')
    at index-agmsdLeR.js:750:15886
```

## 3. Deployed Version
The deployed frontend corresponds to commit `63b1ea5`.

## 4. Exact Bundle Location
The error originates from the main generated frontend chunk (e.g., `dist/assets/index-agmsdLeR.js` on production, matching the `dist/assets/index-DxMCYix8.js` structure generated locally). 

## 5. Original Source Mapping
- **Source Maps**: **ABSENT**. The `apps/report-ui` Vite configuration does not currently emit `.map` files for the production build.
- **Original Source**: Without source maps, the exact line maps to polyfill or transpiled class inheritance helpers (e.g., `Object.create(undefined.prototype)` or `class X extends Y`). This originates from **`jsdom`** or its immediate dependencies (`http-proxy-agent`, `https-proxy-agent`), which attempt to inherit from Node.js native modules like `http.Agent` or `events.EventEmitter`.

## 6. Root Cause
**Confidence: HIGH**
The root cause is the inclusion of `jsdom` in a browser bundle.
1. `jsdom` strictly relies on Node.js core modules (`http`, `https`, `crypto`, `vm`, `net`, `tls`, `fs`, `events`, `child_process`).
2. Vite detects these as Node built-ins and **externalizes** them for browser compatibility (producing build warnings but exiting with 0).
3. In the browser, these externalized modules evaluate to empty objects (`{}`) or `undefined`.
4. When the browser evaluates the bundled JS, `jsdom` or its dependencies execute top-level inheritance (e.g., extending `http.Agent`).
5. Because `http.Agent` is `undefined`, accessing `.prototype` to set up the prototype chain throws the fatal `TypeError`.

## 7. Trigger/Initialization Path
The error occurs **during application startup (script evaluation)**, before React can even mount or the router can initialize.
The dependency chain is:
1. `apps/report-ui/src/pages/ScanDetailPage.tsx` imports `getWCAGRuleTitle` from `@raawi-x/rules`.
2. `packages/rules/src/index.ts` is the barrel export for `@raawi-x/rules`. It exports `getWCAGRuleTitle` (from `wcag-metadata.ts`) **AND** exports `RuleEngine` / `wcagRules` (from `wcag-rules.ts`).
3. `packages/rules/src/wcag-rules.ts` imports `JSDOM` from `jsdom`.
4. Vite's bundler evaluates the barrel file and includes `jsdom` in the frontend chunk.

## 8. Local vs Production Comparison
- **Local Build**: Reproducible. Running `pnpm --filter @raawi-x/report-ui... build` locally generates the same Vite warnings about externalizing `tls`, `assert`, `url`, `net`, `events`, `crypto`, `http`, `vm`, `fs`, etc. Running a local HTTP server on the `dist` folder replicates the exact white-screen crash.
- **Production Build**: Identical failure.

## 9. Cache/Asset Version Analysis
This is **NOT** a stale-cache or mixed-asset issue. The new HTML correctly references the new JS chunk. The failure is deterministic and inherent to the compiled JS logic itself.

## 10. Dependency/Build-Graph Analysis
Commit `63b1ea5` introduced `@raawi-x/rules` to `apps/report-ui`'s `package.json` and `tsconfig.json` to resolve a static typing error (TS2304 / TS2307) during production builds. While this fixed the TypeScript compilation (allowing Docker to pass), it inadvertently poisoned the browser build graph with a Node.js-only dependency (`jsdom`).

## 11. Affected Files
- `apps/report-ui/src/pages/ScanDetailPage.tsx`
- `packages/rules/src/index.ts`
- `packages/rules/src/wcag-rules.ts`

## 12. Why the Error Was Not Caught by TypeScript/build
- **TypeScript**: TS only performs static type checking. `jsdom` has valid types (`@types/jsdom`), so TS sees no issue with importing it.
- **Vite/Rollup**: Vite treats missing/Node modules as "externalized for browser compatibility." This emits a terminal warning but does not fail the build process (Exit Code 0). Coolify sees a successful build and deploys the broken bundle.

## 13. Recommended Fix
**Decouple Browser Metadata from Node Execution.**
The `@raawi-x/rules` package should not use a single barrel file (`index.ts`) that mixes Node execution code with static browser data.
- **Option A (Subpath Exports)**: Update `packages/rules/package.json` with `"exports"` to expose UI-safe metadata separately (e.g., `@raawi-x/rules/metadata`). Update the UI to import from this subpath.
- **Option B (Separate Packages)**: Split `@raawi-x/rules` into `@raawi-x/rules-engine` (Node only) and `@raawi-x/rules-metadata` (Browser/Shared).
- **Option C (Type-only Imports)**: If the UI only needs types, use `import type {...}`. However, runtime functions like `getWCAGRuleTitle` are used, so separation is required.

## 14. Verification Plan
1. Implement the export separation in `@raawi-x/rules`.
2. Update import paths in `apps/report-ui`.
3. Run `pnpm --filter @raawi-x/report-ui... build`.
4. **Assert**: Zero Vite warnings regarding `jsdom`, `fs`, `http`, etc.
5. Serve locally and assert the React app mounts successfully.

## 15. Regression Risk
**Low for core functionality, High for build pipeline.** The fix purely alters module resolution boundaries. No business logic or UI rendering logic needs to change.

## 16. Deployment Verification Plan
After pushing the fix, monitor the Coolify deployment logs to ensure build success. Then, verify `https://rxreport.unifinitylab.com` loads the dashboard without console errors.
