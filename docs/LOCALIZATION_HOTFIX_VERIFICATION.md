# Raawi X — Localization Hotfix Verification

## 1. Root Cause Analysis & Call Site Inspection (Local Verification)
The untranslated UI strings observed in the production smoke test were traced back directly to missing keys in the English (`en.json`) and Arabic (`ar.json`) localization dictionaries. 

A code audit of the JSX component call sites confirmed the exact rendering defects:

* **Findings Drawer (`FindingsPage.tsx` and `EntityDetailPage.tsx`)**:
  * **Code:** `<h2>{t('findings.title')} {t('common.details')}</h2>`
  * **Root Cause:** This is an intentional JSX string concatenation. Because `common.details` was missing from the dictionary, `i18next` fell back to returning the raw key path string (`"common.details"`). Providing the key directly resolves this natively. (Note: This concatenation approach was later replaced; see Hotfix 2).

* **Entities Filters (`EntitiesPage.tsx`)**:
  * **Code:** `{t('common.allStatuses') || 'All Statuses'}`
  * **Root Cause:** The JavaScript logical OR `||` fallback was fundamentally defeated by `i18next`. When a translation key is missing, `i18next` returns the literal key string (e.g. `"common.allStatuses"`). Because non-empty strings are truthy, the fallback `'All Statuses'` is never reached.

* **Scan Status Badges (`ScansPage.tsx`)**:
  * **Code:** `{t(\`scans.${scan.status}\` as any) || scan.status}`
  * **Root Cause:** The same truthiness defect applies. Missing `canceled` and `discovering` keys in the `scans` namespace caused the UI to render the raw keys instead of falling back to the raw status variable.

## 2. Post-Deployment Acceptance Test 1 (Production Verification of 0d2be88)
A live browser acceptance test was conducted on production (`https://rxreport.unifinitylab.com/login`) in both English and Arabic to verify the actual rendered UI output for commit `0d2be88`.

* **Passed:** Entities Filter dropdowns ("All Statuses", "All Types"), Findings Drawer title, and Scans Status Badges ("Canceled", "Discovering"). RTL layout remained intact.
* **Failed:** Dashboard Quick Actions (`overview.quickActions`, `overview.newScan`, `overview.criticalIssues`, `overview.reports`, `overview.manageEntities`) still rendered as raw strings in both locales.

**Root Cause for Production Failure:**
During the local hotfix implementation (commit `0d2be88`), the missing keys were added by injecting a brand new `"overview": { ... }` block at the top of both `en.json` and `ar.json`. However, an existing `"overview"` namespace block already existed further down in the files, which contained translations for the KPI boxes like `"totalSites"`. 
Because JSON does not support duplicate root keys, `JSON.parse` quietly overwrote the first `"overview"` block with the second one during runtime dictionary hydration. The new keys were silently discarded.

## 3. Localization Hotfix 2: Dictionary Merge & Arabic Title Correction
To resolve the duplicate JSON key issue and correct an awkward Arabic translation (`النتائج التفاصيل`):

1. **Dictionary Merge:** The duplicate root-level `"overview"` objects in `en.json` and `ar.json` were merged manually into a single `"overview"` block per file. The `quickActions`, `newScan`, `criticalIssues`, `reports`, and `manageEntities` keys were appended to the existing blocks.
2. **Arabic Title Correction:** The concatenated title `{t('findings.title')} {t('common.details')}` in `FindingsPage.tsx` and `EntityDetailPage.tsx` was replaced with a single semantic key `{t('findings.detailsTitle')}`.
3. **Dictionary Addition:** `detailsTitle` was added to the `"findings"` namespace:
   * **EN:** `"Findings Details"`
   * **AR:** `"تفاصيل النتائج"`

### Files Changed (Hotfix 2)
* `apps/report-ui/src/i18n/locales/en.json`
* `apps/report-ui/src/i18n/locales/ar.json`
* `apps/report-ui/src/pages/FindingsPage.tsx`
* `apps/report-ui/src/pages/EntityDetailPage.tsx`
* `docs/LOCALIZATION_HOTFIX_VERIFICATION.md`

## 4. Tests and Regression Validation (Local)
* **Duplicate-Key Validation:** Performed manually by inspecting the JSON files and confirming only one `"overview"` root key exists in each dictionary. (The project lacks automated testing tools to assert JSON structure uniqueness).
* **Production Build:** Executed `pnpm --filter report-ui build`. Passed successfully. `vite build` completed in ~4.11s, confirming that the JSON modifications were syntactically valid and the application compiles correctly.

## 5. Deployment Gate & Remaining Requirements
No production changes, commits, or deployments were triggered manually. The live environment remains as deployed by `0d2be88`.
* **Action Required:** This Hotfix 2 commit must be pushed and deployed via Coolify.
* **Remaining Verification:** A subsequent live browser acceptance test on production must be executed to confirm that the `overview.*` Dashboard tiles and the Findings Drawer title render correctly.
