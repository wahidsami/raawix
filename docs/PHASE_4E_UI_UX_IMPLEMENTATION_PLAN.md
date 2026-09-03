# PHASE 4E UI/UX IMPLEMENTATION PLAN
**Homepage / Organization Logo Fallback**

## PHASE 4E STATUS: PLANNING COMPLETE
## IMPLEMENTATION STATUS: NOT STARTED

## 1. Objective
Audit the current homepage (`OverviewPage.tsx`) to determine how organizations/sites are currently displayed and if DGA-04 ("Homepage should preferably replace links with clear organization logos.") can be satisfied using existing data without modifying the backend.

## 2. Audit Findings

### A. Homepage Current State
*   **Component**: `apps/report-ui/src/pages/OverviewPage.tsx`
*   **Data Displayed**: The only list of sites/organizations is the "Top Affected Sites" section. It currently renders a list of `domain` names as plain text spans, along with their issue count.
*   **Links**: These domains are *not* currently links. The DGA observation likely refers to this list (perhaps mistaking domains for links, or requesting they become navigable logo-based cards).
*   **Current User Journey**: There is currently no direct user journey from the homepage's Top Affected Sites list to the actual Entity or Site details.

### B. Data Availability
*   **Entities (`EntitiesPage.tsx`)**: The frontend API client (`apiClient.getEntities()`) returns `Entity` objects which contain a `logoPath` property (a string path to an uploaded image). Entities also contain a `properties` array of sites with their `domain` names.
*   **Sites (`SitesPage.tsx`)**: Sites do not have standalone logos. They are associated with Entities.
*   **Overview API (`apiClient.getOverview()`)**: Returns `topAffectedSites` as an array of `{ domain: string; issues: number }`. It does *not* return `logoPath` or `entityId`.
*   **Conclusion**: The database already stores organization logos (`logoPath`), but the Overview API does not currently expose them.

### C. Existing Reusable Mechanisms
*   **Image Loading**: `EntitiesPage.tsx` constructs image URLs using `${import.meta.env.VITE_API_URL}/${entity.logoPath}`. This logic can be reused.
*   **Icons**: The `lucide-react` library provides `Globe` and `Building2` icons, which are used heavily as visual fallbacks elsewhere in the UI.

### D. Current Homepage Information Architecture
*   DGA-04 requests replacing "links" with clear organization logos.
*   **Accessibility**: If we replace textual domains with logos, we must preserve the accessible text. This means using an `<img>` tag with `alt={site.domain}`, or rendering the logo alongside the domain text. Removing text entirely in favor of an image creates accessibility risks for screen readers and users who don't recognize the logo.

### E. Missing / Broken Logo Behavior
*   **Availability**: Logos are optional (`logoPath?: string`).
*   **Fallback Strategy**: If `logoPath` is missing or fails to load, a generic fallback icon (`Building2` or `Globe`) should be displayed, alongside the textual domain name. 
*   **Error Handling**: An `onError` handler on the `<img>` tag should trigger a fallback state if the uploaded image URL returns a 404.

### F. Accessibility
*   **Current State**: Domains are read as plain text. 
*   **Proposed State**: An `img` tag with `alt=""` (decorative) if text is preserved visually, or `alt={domain}` if it replaces text. The safest, most accessible approach is to display the logo purely as a decorative element *next* to the visible domain text, keeping `alt=""`.
*   **Navigation**: If we make the items clickable (links), they must have visible focus indicators (`focus:ring-2`) and keyboard navigability (`href`).

### G. Responsive / Visual Behavior
*   The Top Affected Sites list is a flex container. Adding a fixed-size logo (e.g., `w-8 h-8 rounded-md object-contain bg-white`) will not break the layout, provided it uses `shrink-0`.

## 3. Traceability to DGA
*   **DGA-04**: "Homepage should preferably replace links with clear organization logos."
*   **Translation**: DGA wants the Top Affected Sites list (and perhaps Quick Actions) to be more visual.
*   **Feasibility**: Can be satisfied entirely in the frontend using a client-side join (Option A) to avoid backend changes.

## 4. Scope Boundaries
*   Strictly limited to modifying `OverviewPage.tsx` to display logos for Top Affected Sites.
*   Does not involve changing the backend, building a new logo upload service (one already exists in Entities), or modifying other pages.

## 5. Dependency Analysis
*   **B. Existing frontend data already available but currently unused.**
*   We will fetch `apiClient.getEntities()` inside `OverviewPage.tsx` to retrieve the `logoPath` map. No new backend endpoints or schema changes are required.

## 6. Proposed Implementation Options

### Option A: Client-Side Mapping (Recommended)
*   **Description**: Fetch `/api/entities` on the homepage alongside `/api/overview`. Map each domain in `topAffectedSites` to its parent entity's `logoPath`. 
*   **Advantages**: Requires zero backend modifications. Achieves DGA-04 immediately.
*   **Disadvantages**: Slight frontend overhead (fetching entities).
*   **Dependencies**: None.

### Option B: Backend Join
*   **Description**: Modify `/api/overview` to perform a SQL join and return `logoPath` natively.
*   **Advantages**: Cleaner frontend code, smaller payload.
*   **Disadvantages**: Violates the "DO NOT modify API contracts" constraint.

**Recommended Option**: Option A, as it respects all current Phase 4E constraints (no backend changes).

## 7. Implementation Plan

1.  **Files to change**: `apps/report-ui/src/pages/OverviewPage.tsx`.
2.  **Components to change**: `OverviewPage` (Top Affected Sites section).
3.  **Data expected**: Fetch `apiClient.getEntities()` in the existing `fetchOverview` effect (using `Promise.all`).
4.  **UI behavior**: Transform the Top Affected Sites list items into clickable `<Link>` elements pointing to `/scans?hostname={domain}`.
5.  **Logo behavior**: Display the entity logo as a `w-8 h-8` image. If no logo is mapped or the image fails to load (`onError`), display a `Globe` icon.
6.  **Accessibility**: Set `alt=""` on the logo since the visible domain text will be preserved adjacent to it. Apply `focus-visible:ring-2` to the links.
7.  **Responsive**: Use `flex items-center gap-3`, ensuring text truncates correctly (`truncate` class).
8.  **Error Handling**: Image `onError` state will revert to the generic icon.

## 8. Test / Verification Plan

### Static Verification
*   Compile using `npm run type-check`.
*   Verify `Link` usage and routing paths.
*   Verify `alt=""` attributes on purely decorative logos.
*   Verify no API, schema, or dependency changes occurred.

### Runtime Verification
*   **Logo Available**: Verify a domain mapped to an entity with a logo renders the image.
*   **Logo Missing**: Verify the `Globe` fallback renders.
*   **Image Failure**: Verify a broken `logoPath` triggers the `onError` fallback.
*   **Keyboard**: Tab navigation reaches each "Top Affected Site" link and displays focus outline.
*   **Screen Reader**: Verifies the site text is read cleanly without redundant image alt-text.

## 9. Change Control
*   Source changes: NONE
*   Dependency changes: NONE
*   API changes: NONE
*   Schema changes: NONE
*   Config changes: NONE
*   Scanner changes: NONE
*   Agent changes: NONE
*   Semantic Engine changes: NONE
*   Commits: NONE
*   Pushes: NONE
*   `SEMANTIC_ENGINE_IMPLEMENTATION_PLAN.md` remains untouched.
