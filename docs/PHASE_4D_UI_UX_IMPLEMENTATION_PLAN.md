# PHASE 4D UI/UX IMPLEMENTATION PLAN
**Entities, Sites & Quick Actions**

## 1. Phase Objective
Audit and define the implementation scope to satisfy UI-007 (DGA-07 / DGA-09) and UI-008 (DGA-06). The objective is to improve Entity/Site search, sorting, filtering, and provide Dashboard Quick Actions using ONLY existing data, routes, APIs, and UI patterns. No backend changes or new dependencies are permitted.

## 2. DGA Traceability & Analysis

### DGA-07 — Entities (UI-007)
*   **Current State:** `EntitiesPage` lists all entities without search, sort, or filter capabilities.
*   **Observed Issue:** Users cannot quickly find specific entities by name, type, or status.
*   **Root Cause:** UI components for search/filter/sort are absent, though data is available client-side.
*   **Required Behavior:** Add a client-side search bar (Name), sort dropdown/headers, and filter dropdowns (Status, Type).

### DGA-09 — Sites (UI-007)
*   **Current State:** `SitesPage` lists all sites without search, sort, or filter capabilities.
*   **Observed Issue:** Users cannot find specific websites or sort by issues/scan dates.
*   **Root Cause:** UI components are missing.
*   **Required Behavior:** Add a client-side search bar (Domain) and sorting (Scan Date, Issues).

### DGA-06 — Quick Actions (UI-008)
*   **Current State:** Dashboard (`OverviewPage`) only displays KPIs and charts.
*   **Observed Issue:** Users must navigate through multiple menus to perform common tasks (e.g., viewing critical issues, adding entities).
*   **Root Cause:** Lack of actionable entry points on the main dashboard.
*   **Required Behavior:** Add a Quick Actions section linking to existing workflows.

## 3. Field Inventories

### Entity Field Inventory (`EntitiesPage`)
| Field | API Available | UI Available | Searchable? | Sortable? | Filterable? | Backend Dependency |
|---|---|---|---|---|---|---|
| Name (EN/AR) | Yes | Yes | Proposed | Proposed | No | No |
| Type | Yes | Yes | No | Proposed | Proposed | No |
| Status | Yes | Yes | No | Proposed | Proposed | No |
| Total Properties | Yes | Yes | No | Proposed | No | No |
| Total Scans | Yes | Yes | No | Proposed | No | No |

### Site Field Inventory (`SitesPage`)
| Field | API Available | UI Available | Searchable? | Sortable? | Filterable? | Backend Dependency |
|---|---|---|---|---|---|---|
| Domain | Yes | Yes | Proposed | Proposed | No | No |
| Last Scan Date | Yes | Yes | No | Proposed | No | No |
| Total Scans | Yes | Yes | No | Proposed | No | No |
| Issue Summary | Yes | Yes | No | Proposed | No | No |

## 4. Audit Findings

### Search Audit
*   **Current:** No search exists.
*   **Proposed:** Implement a client-side text filter on `EntitiesPage` (searching `nameEn`, `nameAr`) and `SitesPage` (searching `domain`). It will update as the user types (with a slight debounce if necessary) and operate on the in-memory array before pagination.

### Sort Audit
*   **Current:** No explicit sorting (defaults to API order, usually chronological).
*   **Proposed:** Add sort state (field and direction). Apply `Array.prototype.sort()` to the local array prior to pagination. Stable sorting is achievable client-side.

### Filter Audit
*   **Current:** No filtering.
*   **Proposed:** Add dropdowns for `type` and `status` in `EntitiesPage`.

### Entity → Site → Scan Workflow Audit
*   **Current:** `EntitiesPage` -> `EntityDetailPage` (Properties Tab) -> "Start Scan" or view existing in Scans Tab. `SitesPage` -> links directly to `ScansPage?hostname=X`. 
*   **Proposed:** No major IA changes needed. It is functional, just difficult to navigate without search/filters.

### Quick Actions Audit
*   **Current Dashboard:** KPI cards only.
*   **Proposed Actions:**
    *   **New Scan:** Route to `/entities` (prompting user to select an entity to scan).
    *   **Critical Issues:** Route to `/findings?level=A` or `/findings`.
    *   **Reports:** Route to `/scans`.
    *   **Add Entity/Site:** Route to `/entities` (users can click "Add Entity" there).

### Loading / Empty / Error State Audit
*   **Current:** Basic loading (spinner/text) and empty states ("No entities") exist.
*   **Proposed:** Ensure a specific "No results found for '[query]'" empty state is shown when search yields zero results, distinguishing it from an empty database.

### URL / State Audit
*   **Current:** State is not stored in URL.
*   **Proposed:** Keep it in React local state (`useState`) to avoid over-engineering, as this is a Track A UI-only pass. URL sync can be deferred.

### Performance / Data-Scale Audit
*   **Current:** The architecture fetches ALL entities/sites and uses `useClientPagination`.
*   **Risk:** Safe for hundreds of records, but will degrade with thousands. 
*   **Track B Note:** Server-side pagination and search must be deferred to Track B. Client-side is the only permitted Track A approach.

## 5. Root-Cause Classification & Dependency Matrix

| Feature | UI-Only | Existing API | Track B Required | Architecture Decision |
|---|---|---|---|---|
| Entity search | Yes | Yes | No (Client-side) | No |
| Entity sorting | Yes | Yes | No (Client-side) | No |
| Entity filtering | Yes | Yes | No (Client-side) | No |
| Site search | Yes | Yes | No (Client-side) | No |
| Site sorting | Yes | Yes | No (Client-side) | No |
| Site filtering | Yes | Yes | No | No |
| Quick Actions | Yes | Yes | No | No |
| Empty search state | Yes | Yes | No | No |
| URL State Sync | No | No | Yes (Deferred) | Yes |

## 6. Proposed Phase 4D Scope

### Phase 4D-A — Entities
*   **File:** `apps/report-ui/src/pages/EntitiesPage.tsx`
*   **Change:** Add a search input and dropdown filters (Status, Type). Add sorting logic to the table headers. Update the `useClientPagination` to receive the filtered/sorted array instead of the raw `entities` array.

### Phase 4D-B — Sites
*   **File:** `apps/report-ui/src/pages/SitesPage.tsx`
*   **Change:** Add a search input for domain. Add sorting logic (Domain, Last Scan, Issues). Update `useClientPagination` input.

### Phase 4D-C — Quick Actions
*   **File:** `apps/report-ui/src/pages/OverviewPage.tsx`
*   **Change:** Inject a visually distinct "Quick Actions" row above or below the KPI cards, containing 3-4 buttons (e.g., "View Critical Issues", "Recent Scans", "Manage Entities") that use standard `react-router-dom` navigation.

## 7. Explicitly Excluded Scope
*   Server-side pagination, sorting, or searching (Track B).
*   URL Query Parameter synchronization for filters (over-engineering for Track A).
*   New API endpoints for Quick Actions.

## 8. Track B Dependencies
*   True server-side data grid management (required if entity/site count scales massively).

## 9. Testing Strategy
*   **Static Verification:** `npm run type-check` to ensure `EntitiesPage`, `SitesPage`, and `OverviewPage` compile.
*   **Behavioral Verification:** Verify standard local state logic (search text matching `nameEn`/`nameAr`).
*   **Regression Verification:** Ensure `handleCreate`, `handleEdit`, and navigation links remain intact.

## 10. Acceptance Criteria
1. `EntitiesPage` contains a working client-side search and status/type filter.
2. `SitesPage` contains a working client-side search.
3. Both pages can sort by primary columns.
4. `OverviewPage` contains a Quick Actions section linking to existing routes.
5. No dependencies added. No API contracts changed.

## 11. Final Recommendation & Readiness
**Final Recommendation:** Proceed with Phase 4D-A, 4D-B, and 4D-C using strictly client-side filtering arrays before pagination.
**Implementation Readiness:** READY
