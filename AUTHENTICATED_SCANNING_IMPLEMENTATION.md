# Authenticated Scanning + Route Seeding Implementation Plan

## Status: In Progress

### ✅ Completed

1. **Database Schema**
   - ✅ `ScanAuthProfile` model added to Prisma schema
   - ✅ Relationship with `Property` model (one-to-one)

2. **Backend Infrastructure**
   - ✅ `AuthProfileRepository` for database operations
   - ✅ API endpoints for auth profile CRUD (`/api/properties/:propertyId/auth-profile`)
   - ✅ Test login endpoint (`POST /api/properties/:propertyId/auth-profile/test`)
   - ✅ `auth-helper.ts` with `performLoginAndSaveState()` and `loadStorageState()`

3. **Type Definitions**
   - ✅ Extended `ScanRequest` with `authProfileId`, `seedUrls`, `sitemapUrl`
   - ✅ `AuthProfileData` interface

4. **PageCapture Updates**
   - ✅ Support for authenticated contexts via storage state
   - ✅ Context management for authenticated sessions

### ⏳ In Progress

1. **Job Queue Integration**
   - ⏳ Load auth profile when `authProfileId` provided
   - ⏳ Perform login before crawling
   - ⏳ Pass storage state path to `PageCapture`
   - ⏳ Enqueue post-login seed paths

2. **BFSCrawler Updates**
   - ⏳ Support for `seedUrls` (absolute URLs)
   - ⏳ Enqueue seed URLs even if not discovered by crawl
   - ⏳ Track page discovery source (crawl vs seed vs sitemap)

3. **Sitemap Parsing**
   - ⏳ Parse sitemap.xml if `sitemapUrl` provided
   - ⏳ Extract URLs and enqueue (respecting maxPages/maxDepth)

4. **Scan Monitor UI**
   - ⏳ Show page discovery source in tree
   - ⏳ Display which pages were seeded vs discovered

5. **Widget Fallback**
   - ⏳ Client-side assistive map generation
   - ⏳ DOM heuristics for labels
   - ⏳ Optional vision API for image descriptions
   - ⏳ Session-based caching

6. **Dashboard UI**
   - ⏳ Auth profile management in Property settings
   - ⏳ Form for configuring login flow
   - ⏳ Test login button

### 📋 Next Steps

1. Complete job-queue integration for authenticated scanning
2. Add route seeding to BFSCrawler
3. Implement sitemap parser
4. Update Scan Monitor to show discovery sources
5. Implement widget fallback
6. Create dashboard UI components
7. Run acceptance tests on gov-sim

---

## Implementation Details

### A) Authenticated Scan Flow

```
1. User starts scan with authProfileId
2. JobQueue.executeJob():
   a. Load auth profile from DB
   b. If authType === 'scripted_login':
      - Call performLoginAndSaveState()
      - Save storage state to output/{scanId}/auth-storage-state.json
   c. Create PageCapture with storageStatePath
   d. Pass to BFSCrawler
3. BFSCrawler:
   a. If postLoginSeedPaths exist, enqueue them at high priority
   b. Use authenticated PageCapture for all page navigations
4. All pages use authenticated context (cookies/localStorage preserved)
```

### B) Route Seeding

```
1. User provides seedUrls: ["http://localhost:4174/dashboard", "/services"]
2. BFSCrawler constructor:
   a. Normalize seedUrls to absolute URLs
   b. Add to queue with depth=0 (high priority)
   c. Mark as "seeded" source
3. During crawl:
   a. Process seeded URLs first
   b. Track discovery source in page metadata
```

### C) Sitemap Parsing

```
1. If sitemapUrl provided:
   a. Fetch sitemap.xml
   b. Parse XML (support sitemap index and regular sitemaps)
   c. Extract <loc> URLs
   d. Filter by same hostname
   e. Enqueue up to maxPages
   f. Mark as "sitemap" source
```

### D) Widget Fallback

```
1. Widget requests /api/widget/page-package
2. If 404 or low matchConfidence:
   a. Build temp assistive map:
      - labelOverrides: DOM proximity heuristics
      - imageDescriptions: Call vision API if enabled
      - actionIntents: Infer from context
   b. Cache in session memory (Map<url, assistiveMap>)
   c. Use for widget features
3. Features using fallback:
   - "Describe Image" → use temp imageDescriptions
   - "Describe Focused Element" → use temp labelOverrides
   - "What can I do here?" → use temp actionIntents
   - Form Assistant → use temp form data
```

---

## Files Modified/Created

### Created
- `apps/scanner/src/db/auth-profile-repository.ts`
- `apps/scanner/src/api/auth-profiles.ts`
- `apps/scanner/src/crawler/auth-helper.ts`
- `AUTHENTICATED_SCANNING_IMPLEMENTATION.md`

### Modified
- `apps/scanner/prisma/schema.prisma` (added ScanAuthProfile model)
- `packages/core/src/index.ts` (extended ScanRequest)
- `apps/scanner/src/index.ts` (registered auth-profiles router)
- `apps/scanner/src/crawler/page-capture.ts` (added context support)

### To Modify
- `apps/scanner/src/job-queue.ts` (auth profile loading, login flow)
- `apps/scanner/src/crawler/bfs-crawler.ts` (seed URLs, discovery source tracking)
- `apps/scanner/src/crawler/sitemap-parser.ts` (new file)
- `apps/report-ui/src/components/ScanMonitorModal.tsx` (discovery source display)
- `apps/widget/src/widget.ts` (fallback assistive map)
- `apps/report-ui/src/pages/EntityDetailPage.tsx` (auth profile UI)

---

## Testing Checklist

- [ ] Test authenticated scan on gov-sim
- [ ] Verify protected routes are accessible after login
- [ ] Verify seed URLs are enqueued and scanned
- [ ] Verify sitemap parsing works
- [ ] Verify widget fallback on unscanned pages
- [ ] Verify no regressions to existing scans
- [ ] Verify storage state is saved and reused
- [ ] Verify test login button works

