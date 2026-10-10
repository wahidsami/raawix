# Phase 4 Production Build Audit

**Date:** 2026-09-03
**Commit:** 744fcc31646606897fcabde9afd4a265066a3ea9
**Failing command:** `pnpm --filter @raawi-x/report-ui... build` then `tsc -b && vite build`

---

## Summary Table

| # | Error | Phase Introduced | Fix Required |
|---|-------|-----------------|-------------|
| A | `@raawi-x/rules` not in report-ui deps/tsconfig | Track B | Add to package.json + tsconfig references + pnpm install |
| B | `i18n` not destructured in ScanDetailPage | Phase 4C | Add `i18n` to useTranslation() destructure |
| C | `Globe` unused in ScanDetailPage | Phase 4E | Remove from import |
| D | `PlusCircle`, `LayoutDashboard` unused in OverviewPage | Phase 4D | Remove from import |
| E | `disabled` not in DropdownMenuItemProps | Phase 4C | Extend interface + forward prop |

**All 5 errors were introduced by Phase 4/Track B. None existed in commit c8afcc8.**

---

## ERROR A — @raawi-x/rules Cannot Be Resolved (Critical)

### Exact Error
Cannot find module '@raawi-x/rules' or its corresponding type declarations:
- apps/report-ui/src/pages/EntityDetailPage.tsx
- apps/report-ui/src/pages/FindingsPage.tsx
- apps/report-ui/src/pages/ScanDetailPage.tsx

### Root Cause

Track B added imports of @raawi-x/rules into three report-ui pages, but @raawi-x/rules was never declared as a dependency of @raawi-x/report-ui.

Evidence chain:

1. apps/report-ui/package.json — @raawi-x/rules is ABSENT from dependencies. Only @raawi-x/core is listed.
2. pnpm-lock.yaml line 139 — @raawi-x/rules appears only under apps/scanner, not under apps/report-ui.
3. apps/report-ui/tsconfig.json references — Only ../../packages/core. No reference to ../../packages/rules.
4. packages/rules/package.json — "main": "./dist/index.js", "types": "./dist/index.d.ts". Resolution depends on dist/.
5. .gitignore — dist/ is globally gitignored. Therefore packages/rules/dist/ is NOT committed and is absent from the clean GitHub checkout that Docker uses.
6. Dockerfile — COPY packages ./packages copies source only. No explicit step builds @raawi-x/rules before running pnpm --filter @raawi-x/report-ui... build.
7. pnpm --filter @raawi-x/report-ui... — The ... suffix means this package and its workspace dependencies. Because @raawi-x/rules is not declared in report-ui's package.json, pnpm's filter does not include it and does NOT build it first.

### Why Local Verification Succeeded

Locally, packages/rules/dist/ exists on disk from a prior manual build and is not git-tracked. The local TypeScript compiler resolves the module from pre-existing dist artifacts. In a clean Docker build (fresh checkout, no pre-built dist), these files are absent.

### Smallest Safe Remediation

Two changes required together:

1. Add @raawi-x/rules to apps/report-ui/package.json dependencies:
   "@raawi-x/rules": "workspace:*"

2. Add a references entry to apps/report-ui/tsconfig.json:
   { "path": "../../packages/rules" }

This ensures tsc -b builds @raawi-x/rules (producing dist/) before compiling report-ui.
Also requires: pnpm install to update pnpm-lock.yaml, which must be committed.

---

## ERROR B — i18n Cannot Be Found in ScanDetailPage (TS2304)

### Exact Error
TS2304: Cannot find name 'i18n' at:
  Line 755: const locale = i18n.language === 'ar' ? 'ar' : 'en';
  Line 784: const locale = i18n.language === 'ar' ? 'ar' : 'en';
  Line 1132: getWCAGRuleTitle(finding.wcagId, i18n.language)
  Line 1563: getWCAGRuleTitle(finding.wcagId, i18n.language)

### Root Cause

ScanDetailPage.tsx line 416 destructures only t from useTranslation():
  const { t } = useTranslation();

But i18n is referenced at 4 locations. The correct pattern — used correctly in EntityDetailPage.tsx (line 133) and FindingsPage.tsx (line 32) — is:
  const { t, i18n } = useTranslation();

ScanDetailPage.tsx was incompletely updated during Phase 4C.

### Intended Architecture
The project uses react-i18next. useTranslation() returns { t, i18n }. i18n.language is the standard way to read the active locale at runtime. No separate i18n import exists.

### Smallest Safe Remediation
Change line 416 of ScanDetailPage.tsx from:
  const { t } = useTranslation();
to:
  const { t, i18n } = useTranslation();

---

## ERROR C — Unused Import Globe in ScanDetailPage (TS6133)

### Exact Error
TS6133: 'Globe' is declared but its value is never read.
  apps/report-ui/src/pages/ScanDetailPage.tsx line 20

### Root Cause
Globe is listed in the lucide-react import on line 20 of ScanDetailPage.tsx but is never referenced anywhere in that file. Globe IS legitimately used in OverviewPage.tsx (line 294) as a fallback icon. It was likely added to ScanDetailPage by mistake during Phase 4E.

### Smallest Safe Remediation
Remove Globe from the lucide-react import in ScanDetailPage.tsx line 20.

---

## ERROR D — Unused Imports PlusCircle and LayoutDashboard in OverviewPage (TS6133)

### Exact Error
TS6133: 'PlusCircle' is declared but its value is never read.
TS6133: 'LayoutDashboard' is declared but its value is never read.
  apps/report-ui/src/pages/OverviewPage.tsx line 18

### Root Cause
OverviewPage.tsx line 18 imports PlusCircle and LayoutDashboard from lucide-react. Neither is referenced anywhere in the file. They were imported during Phase 4D as Quick Action icon candidates but the final JSX did not use them.

### Smallest Safe Remediation
Remove PlusCircle and LayoutDashboard from the import on line 18 of OverviewPage.tsx.

---

## ERROR E — disabled Prop Not Accepted by DropdownMenuItemProps (TS2322)

### Exact Error
TS2322: 'disabled' does not exist in type 'DropdownMenuItemProps'.
  apps/report-ui/src/pages/ScanDetailPage.tsx lines 749, 779

### Root Cause
The custom DropdownMenuItem component in apps/report-ui/src/components/ui/dropdown-menu.tsx defines:
  interface DropdownMenuItemProps {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }

disabled is absent from the interface and not forwarded to the underlying button. Phase 4C added disabled={isExporting} to DropdownMenuItem usages without extending the component interface.

### Smallest Safe Remediation
Add disabled?: boolean to DropdownMenuItemProps and forward it to the underlying button element in dropdown-menu.tsx.
Low risk — additive interface extension, existing usages unaffected.

---

## Why Local Static Verification Did Not Catch These Errors

| Issue | Why Locally Passed | Why Docker Fails |
|-------|-------------------|-----------------|
| @raawi-x/rules not found | packages/rules/dist/ exists locally from prior manual build | No dist exists; not in dep graph |
| i18n TS2304 | Incremental tsc cache skipped recheck | Clean tsc -b with strict:true, full recheck |
| Unused imports TS6133 | Incremental tsc cache skipped recheck | noUnusedLocals:true enforced in full build |
| disabled TS2322 | Incremental tsc cache skipped recheck | Full strict type check |

The primary culprit for errors B-E is that local verification ran against a pre-existing incremental build cache (tsconfig.tsbuildinfo). The Docker build starts completely clean, triggering a full re-typecheck under strict mode.

---

## Verification Plan (Post-Fix)

1. From a clean working tree (delete packages/rules/dist/ first to simulate Docker): pnpm install && pnpm --filter @raawi-x/report-ui... build
2. Confirm packages/rules is built as part of the filter graph before report-ui.
3. tsc -b --noEmit on apps/report-ui must produce zero errors.
4. Docker build must succeed end-to-end.
