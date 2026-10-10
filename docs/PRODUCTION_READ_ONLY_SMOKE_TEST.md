# Raawi X — Production Read-Only Smoke Test

**Test Date/Time:** October 10, 2026, 00:12 - 00:19 (Local Server Time)
**Target URL:** `https://rxreport.unifinitylab.com`

## 1. Authentication and Dashboard Access
**Status: Succeeded**
The standard login form at `/login` rendered properly. Authentication using the authorized credentials succeeded seamlessly, resulting in a successful redirect to the Overview Dashboard without displaying any runtime errors or exposing sensitive tokens.

## 2. Screens and Workflows Inspected
- Dashboard Overview (`/`)
- All Scans List (`/scans`)
- Scan Details (`/scans/:id`) including Export Actions
- All Findings Explorer (`/findings`)
- Finding Detail Drawer (Slide-over panel)
- Entities Management (`/entities`) and Entity Overview (`/entities/:id`)
- System Settings (`/settings`)
- User Management (`/users`)

## 3. Inspection Checklist

| Check Area | Status | Notes |
| :--- | :--- | :--- |
| **A. Login and dashboard** | **Pass** (with minor i18n issues) | Metrics populated successfully. Untranslated i18n keys observed in Quick Actions. |
| **B. All Scans** | **Pass** | Scans listed successfully. No immediate UI crash. |
| **C. Existing scan details** | **Pass** | Metrics loaded. Export buttons (PDF/Excel) render correctly. |
| **D. Findings list and details** | **Pass** (with minor i18n issues) | Table layout holds. Drawer opens/closes successfully. Untranslated header key in drawer. |
| **E. Evidence and reports** | **Not Verified** | Export workflows explicitly skipped to adhere strictly to non-mutating/non-bulk operational rules. |
| **F. Other relevant screens** | **Pass** (with minor i18n issues) | Entities list and Entity detail views loaded successfully. Entity filters display raw i18n keys. |

## 4. Observed Defects and Anomalies

**Defect 1: Untranslated Localization Keys in Dashboard Quick Actions**
- **Reproduction:** Login and observe the Dashboard Overview page.
- **Observation:** The Quick Actions buttons display raw translation keys instead of localized text: `overview.quickActions`, `overview.newScan`, `overview.criticalIssues`, `overview.reports`, `overview.manageEntities`.

**Defect 2: Untranslated Localization Keys in Findings Details Drawer**
- **Reproduction:** Navigate to `/findings` and click "View" on any finding (e.g., WCAG 1.1.1).
- **Observation:** The slide-over panel header title displays the literal string `Findings common.details`.

**Defect 3: Untranslated Localization Keys in Entity Filters**
- **Reproduction:** Navigate to the `/entities` list view.
- **Observation:** The filter dropdowns render raw keys: `common.allStatuses` and `common.allTypes`.

## 5. Console and Network Failures
No critical console runtime errors or sensitive API response exposures were observed during standard navigation. (Note: Network traffic analysis was strictly limited to avoid logging authentication headers and sensitive cookies). 

## 6. Limitations of the Smoke Test
- **Browser limits:** The smoke test strictly observed front-end rendering and available DOM data. It could not definitively verify whether backend jobs (e.g., PDF generation) are mutating data because testing exports was deemed a potential state-changing operation in a production environment. 
- **Database/Source limits:** Verification of actual "stuck" scanning states, queued jobs, or database timestamps (`canceledAt` vs `completedAt`) requires direct backend/database access, which was out of scope for this read-only test.

## 7. Recommended Next Steps (Mapped to DGA Requirements)
Based on this production baseline, the following DGA implementation items should be prioritized:
- **DGA-05 (WCAG rule names and descriptions):** Investigate why the UI is failing to resolve basic localization strings (`common.*`, `overview.*`). Ensure the `@raawi-x/core` boundary correctly delivers locale dictionaries.
- **DGA-06 (Dashboard Quick Actions):** The UI structure is present, but missing translation keys block usability.
- **DGA-13 & DGA-14 (Localization):** The repeated appearance of untranslated keys across Dashboard, Findings, and Entities indicates a systematic break in the translation cache or provider hydration that needs immediate remediation.
- **Phase 2 Execution:** Resume the Scan Lifecycle Reliability (BullMQ integration) locally now that we have confirmed the production frontend is generally stable but will require the data-integrity improvements for stuck/canceled scans.

---

## 8. Account and Access Management — Future Workstream

*This is a roadmap addition, distinct from the immediate Phase 2 implementation tasks.*

A dedicated security and access management sprint must be scheduled to cover:
- Account creation, invitations, activation, deactivation, and password recovery workflows.
- Granular role and permission definitions.
- Organization-level data isolation.
- Session and authorization boundary enforcement.
- Implementation of comprehensive audit logs tracking account and permission modifications.
- Explicit regression testing for unauthorized access and cross-organization data leakage.
