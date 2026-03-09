# Dashboard Upgrade - Remaining Phases

## Status: Phases 0-1 Complete, Phase 2 Started

### ✅ Completed Phases

**Phase 0: i18n & RTL Foundation** ✅
- i18next setup with EN/AR translations
- RTL support with logical CSS
- Language switcher component
- Language preference persistence

**Phase 1: Admin Auth + App Shell** ✅
- Supabase Auth integration (to be replaced with local auth)
- Bilingual login form
- Protected routes
- Admin layout with RTL-aware sidebar
- Header with language switcher

**Phase 2: Overview Dashboard** 🚧 (Structure complete, needs API integration)
- Overview page with KPI cards
- Charts with Recharts (RTL-aware)
- All labels translated
- ⚠️ Currently using mock data

---

## 📋 Remaining Phases

### Phase 3: Sites & Scans Management

**Sites Page:**
- List all sites (domain, last scan, total scans, issue summary)
- Site detail page:
  - Scan history chart
  - Widget integration snippet
  - Assistive map coverage
- Filters: domain, date range
- Pagination (RTL-aware)

**Scans Page:**
- Professional table with:
  - Filters (status, date, domain)
  - Pagination (RTL-aware)
  - Sortable columns
- Scan details page:
  - Page list with stats
  - Per-page breakdown
  - Screenshot previews
  - Findings summary

**Implementation Notes:**
- Use existing `/api/scan/:id` endpoint
- Query database for sites list
- All UI text translated
- RTL-aware table layout

---

### Phase 4: Findings Explorer

**Findings Page:**
- Advanced filters:
  - Site (dropdown)
  - Scan (dropdown, filtered by site)
  - WCAG ID (search/autocomplete)
  - Status (pass/fail/needs_review/na)
  - Confidence (high/medium/low)
  - Date range
- Professional table:
  - Sortable columns
  - Pagination
  - Bulk actions
- Detail panel/sidebar:
  - Evidence viewer
  - How to verify instructions
  - Screenshots/crops
  - Related findings

**Implementation Notes:**
- Query `Finding` and `VisionFinding` tables
- Use existing evidence structure
- WCAG IDs remain untranslated (as specified)
- All UI labels translated

---

### Phase 5: Widget Usage Analytics (Privacy-Safe)

**Database Schema Updates:**
```prisma
model WidgetEvent {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  siteId      String   @db.Uuid
  eventType   String   // page_view, widget_open, voice_enabled, command_used
  pageUrl     String
  metadata    Json?    // Additional event data (command name, etc.)
  createdAt   DateTime @default(now())
  
  site        Site     @relation(fields: [siteId], references: [id], onDelete: Cascade)
  
  @@index([siteId, createdAt])
  @@index([eventType])
  @@index([createdAt])
  @@schema("public")
}

model WidgetDailyAggregate {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  siteId          String   @db.Uuid
  date            DateTime @db.Date
  uniqueSessions  Int      @default(0)
  widgetOpens     Int      @default(0)
  voiceEnabled    Int      @default(0)
  commandUsed     Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  site            Site     @relation(fields: [siteId], references: [id], onDelete: Cascade)
  
  @@unique([siteId, date])
  @@index([siteId, date])
  @@index([date])
  @@schema("public")
}
```

**Update Site Model:**
```prisma
model Site {
  // ... existing fields ...
  widgetEvents        WidgetEvent[]
  widgetDailyAggregates WidgetDailyAggregate[]
}
```

**Analytics Dashboard Page:**
- KPIs:
  - Unique sessions (last 30 days)
  - Widget opens (total)
  - Voice usage percentage
  - Top pages by usage
- Charts:
  - Daily usage trend (line chart)
  - Command usage distribution (pie/bar chart)
  - Top pages (bar chart)
- Filters:
  - Site selector
  - Date range
  - Event type

**Widget Telemetry Endpoint:**
- `POST /api/widget/telemetry` (optional, privacy-safe)
- Accepts: `{ siteId, eventType, pageUrl, metadata? }`
- Rate-limited
- Stores in `WidgetEvent` table
- Aggregates daily into `WidgetDailyAggregate`

**Implementation Notes:**
- All analytics UI translated
- Dates/numbers formatted per locale
- Privacy: No PII collected, only aggregate usage
- Optional feature (can be disabled per site)

---

### Phase 6: Settings

**Settings Page:**
- Language preferences:
  - Default language (EN/AR)
  - Per-user preference (stored in user metadata)
- Telemetry settings:
  - Enable/disable per site
  - Global telemetry on/off
- Gemini configuration:
  - Enabled/disabled toggle
  - API key management (masked)
  - Model selection
- Retention settings:
  - Scan retention days
  - Auto-cleanup enabled/disabled
- API keys management:
  - View current API key (masked)
  - Regenerate API key
  - View usage stats

**Implementation Notes:**
- Settings stored in database (AdminUser or Settings table)
- All UI translated
- Sensitive data masked
- Changes require admin authentication

---

## Implementation Checklist

### Phase 3: Sites & Scans
- [ ] Create SitesPage component
- [ ] Create SitesList component with table
- [ ] Create SiteDetailPage component
- [ ] Create ScansPage component with filters
- [ ] Create ScanDetailPage component
- [ ] Add API endpoints if needed:
  - `GET /api/sites` - List all sites
  - `GET /api/sites/:id` - Site details
  - `GET /api/scans` - List scans with filters
- [ ] Connect to database via Prisma
- [ ] Add translations for all UI text
- [ ] Test RTL layout

### Phase 4: Findings
- [ ] Create FindingsPage component
- [ ] Create FindingsTable component
- [ ] Create FindingDetailPanel component
- [ ] Add filters UI (site, scan, WCAG ID, status, confidence)
- [ ] Add API endpoint: `GET /api/findings` with filters
- [ ] Connect to database
- [ ] Add translations
- [ ] Test RTL layout

### Phase 5: Widget Analytics
- [ ] Update Prisma schema with WidgetEvent and WidgetDailyAggregate
- [ ] Run migration
- [ ] Create telemetry endpoint: `POST /api/widget/telemetry`
- [ ] Create aggregation job (daily)
- [ ] Create WidgetAnalyticsPage component
- [ ] Add charts (daily trend, command usage, top pages)
- [ ] Add API endpoint: `GET /api/analytics/widget`
- [ ] Add translations
- [ ] Test RTL layout

### Phase 6: Settings
- [ ] Create SettingsPage component
- [ ] Add Settings model to Prisma (or use AdminUser metadata)
- [ ] Create API endpoints:
  - `GET /api/settings`
  - `PUT /api/settings`
- [ ] Add settings UI sections
- [ ] Add translations
- [ ] Test RTL layout

---

## API Endpoints Needed

### Sites
- `GET /api/sites` - List all sites with stats
- `GET /api/sites/:id` - Site details with scan history

### Scans
- `GET /api/scans` - List scans (filters: status, date, domain)
- `GET /api/scans/:id` - Scan details (already exists)

### Findings
- `GET /api/findings` - List findings (filters: site, scan, WCAG ID, status, confidence)

### Analytics
- `POST /api/widget/telemetry` - Record widget event
- `GET /api/analytics/widget` - Get analytics data

### Settings
- `GET /api/settings` - Get settings
- `PUT /api/settings` - Update settings

---

## Notes

- All phases maintain RTL support
- All UI text translated (EN/AR)
- WCAG IDs, Rule IDs, URLs remain untranslated
- Existing scan flow preserved
- Database queries use Prisma
- Charts use Recharts with RTL support

