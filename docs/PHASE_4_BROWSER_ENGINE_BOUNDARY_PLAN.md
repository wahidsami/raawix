# Phase 4 Browser/Engine Boundary Plan

## 1. Confirmed Root Cause
Commit `63b1ea5` introduced `@raawi-x/rules` as a dependency to `apps/report-ui` to resolve missing symbols for WCAG rule titles and descriptions. The Report UI imported these via the default barrel export (`@raawi-x/rules`), which also exports the Node-based `wcag-rules.ts`. This file imports `jsdom`, which depends on Node.js core modules. Vite externalized these core modules for the browser, resulting in a fatal `TypeError` during script evaluation when `jsdom` dependencies attempted to extend `undefined` prototypes (e.g., `http.Agent`).

## 2. Current Dependency Graph
`apps/report-ui/src/pages/ScanDetailPage.tsx`
  ↳ `import { getWCAGRuleTitle } from '@raawi-x/rules'`
    ↳ `packages/rules/src/index.ts` (Barrel file)
      ↳ `export * from './wcag-metadata.ts'` (Browser safe)
      ↳ `export * from './wcag-rules.ts'` (Node ONLY)
        ↳ `import { JSDOM } from 'jsdom'`
          ↳ `import 'http', 'events', 'crypto', etc.` (Externalized = Crashes)

## 3. Browser vs Server Responsibilities
- **Browser (Report UI)**: Needs localized rule titles, descriptions, and static WCAG mappings to render UI components without executing any rules or parsing DOMs.
- **Server (Scanner)**: Needs full JSDOM rule execution and heuristic evaluations.

## 4. Options Considered
- **Option A: A browser-safe metadata entry point inside `@raawi-x/rules`**
  Add an `"exports"` map to `packages/rules/package.json` to expose a separate subpath (e.g., `@raawi-x/rules/metadata`).
  - *Pros*: Keeps WCAG metadata physically located in the rules package.
  - *Cons*: Relies on TypeScript's `moduleResolution` settings (`NodeNext` or `Bundler`) to strictly respect the subpath, which could introduce cascading TS config changes.
- **Option B: A separate package for WCAG metadata**
  - *Pros*: Absolute isolation.
  - *Cons*: Unnecessary boilerplate and overhead for a single metadata file.
- **Option C: Move localization metadata to `@raawi-x/core`**
  Move `wcag-metadata.ts` into `packages/core` and export it from there.
  - *Pros*: `@raawi-x/core` is already the established, universally browser-safe shared data layer containing `RuleResult`, `Finding`, etc. It enforces an absolute physical boundary.
  - *Cons*: Slight semantic shift (rules metadata living in core instead of rules).

## 5. Recommended Architecture
**Option C: Move localization metadata to `@raawi-x/core`.**
Based on the existing repository structure, `@raawi-x/core` is the designated boundary for shared browser/server contracts. Moving `wcag-metadata.ts` to `core` ensures that `report-ui` never imports `@raawi-x/rules` again, structurally eliminating any risk of JSDOM or Node built-ins leaking into the frontend bundle.

## 6. Exact Implementation Changes
1. **Move File**: Move `packages/rules/src/wcag-metadata.ts` to `packages/core/src/wcag-metadata.ts`.
2. **Update Core Exports**: Export `wcag-metadata` from `packages/core/src/index.ts`.
3. **Clean Rules Package**:
   - Remove `wcag-metadata.ts` from `packages/rules/src/`.
   - Update `packages/rules/src/index.ts` to remove the metadata exports.
   - If `packages/rules` needs metadata functions, it will now import them from `@raawi-x/core`.
4. **Clean Report UI**:
   - Update imports in `apps/report-ui/src/pages/EntityDetailPage.tsx`, `FindingsPage.tsx`, and `ScanDetailPage.tsx` to import `getWCAGRuleTitle`, `getWCAGRuleDescription`, and `getRuleMeta` from `@raawi-x/core`.
   - Remove `@raawi-x/rules` from `apps/report-ui/package.json`.
   - Remove the `packages/rules` project reference from `apps/report-ui/tsconfig.json`.

## 7. Risks
- **Migration Risk**: Minimal. The functions are pure and synchronous; only the import paths change.
- **Localization Compatibility**: Fully preserved. The logic inside `wcag-metadata.ts` that handles bilingual strings remains unchanged.

## 8. Verification Plan
- **A. pnpm install --frozen-lockfile**: Verify dependencies install cleanly.
- **B. clean production build**: Run `pnpm --filter @raawi-x/report-ui... build` and confirm Exit 0.
- **C. bundle inspection**: Verify that the Vite build logs no longer show "Module externalized for browser compatibility" for Node core modules.
- **D. browser runtime test**: Serve the production build locally and ensure the blank screen crash is resolved.
- **E. dashboard route smoke tests**: Navigate `/entities`, `/sites`, `/scans`, `/findings`, and `/scan/:id`.
- **F. Arabic/English localization test**: Toggle language and confirm WCAG titles update correctly.
- **G. grep analysis**: Ensure `JSDOM` does not exist in the `dist` folder.
- **H. scanner rule execution**: Ensure `packages/rules` still builds and passes its type checks.

## 9. Rollback Plan
Revert the commit performing the migration. No database schemas or external APIs are affected.

## 10. Acceptance Criteria
- `pnpm --filter @raawi-x/report-ui... build` succeeds.
- No Node-only modules (like `jsdom`, `fs`, `http`) are bundled into the Report UI.
- The deployed frontend renders successfully without `TypeError` crashes.
- WCAG metadata correctly displays in both English and Arabic.
