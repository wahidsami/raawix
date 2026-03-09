# Raawi X Dashboard Upgrade - Implementation Guide

## Status: Phase 0-1 Complete, Phase 2 Started

### ✅ Phase 0: i18n & RTL Foundation (Complete)

**Files Created:**
- `src/i18n/config.ts` - i18next configuration
- `src/i18n/locales/en.json` - English translations
- `src/i18n/locales/ar.json` - Arabic translations
- `src/hooks/useLanguage.ts` - Language hook with RTL support
- `src/components/LanguageSwitcher.tsx` - Language switcher component

**Features:**
- ✅ i18next with browser language detection
- ✅ Language preference stored in localStorage
- ✅ RTL support via `dir="rtl"` on document
- ✅ Logical CSS properties for RTL
- ✅ Sidebar moves to right in RTL mode

### ✅ Phase 1: Admin Auth + App Shell (Complete)

**Files Created:**
- `src/lib/supabase.ts` - Supabase client
- `src/hooks/useAuth.ts` - Auth hook
- `src/components/auth/LoginForm.tsx` - Bilingual login form
- `src/components/layout/Header.tsx` - Header with language switcher
- `src/components/layout/Sidebar.tsx` - RTL-aware sidebar
- `src/components/layout/AdminLayout.tsx` - Main layout wrapper
- `src/components/ProtectedRoute.tsx` - Route protection

**Features:**
- ✅ Supabase Auth integration
- ✅ Login form (EN/AR)
- ✅ Protected routes
- ✅ Admin layout with sidebar
- ✅ RTL-aware navigation

### 🚧 Phase 2: Overview Dashboard (In Progress)

**Files Created:**
- `src/pages/OverviewPage.tsx` - Overview with KPIs and charts

**Features:**
- ✅ KPI cards (7 metrics)
- ✅ Charts with Recharts (RTL-aware)
- ✅ All labels translated
- ⚠️ Currently using mock data (needs API integration)

### 📋 Remaining Phases

#### Phase 3: Sites & Scans Management
- Sites list page
- Site detail page
- Scans table with filters
- Scan detail page

#### Phase 4: Findings Explorer
- Findings table with filters
- Finding detail panel
- Evidence viewer

#### Phase 5: Widget Analytics
- Database schema updates (WidgetEvent, WidgetDailyAggregate tables)
- Analytics dashboard
- Privacy-safe telemetry

#### Phase 6: Settings
- Language preferences
- Telemetry settings
- Gemini configuration
- Retention settings

## Setup Instructions

### 1. Environment Variables

Create `apps/report-ui/.env`:

```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_API_URL=http://localhost:3001
VITE_API_KEY=dev-api-key-change-in-production
```

### 2. Supabase Setup

1. Ensure Supabase is running: `supabase start`
2. Get anon key from Supabase Studio: http://localhost:54323
3. Create admin user via Supabase Auth (or SQL)

### 3. Run Dashboard

```bash
cd apps/report-ui
pnpm dev
```

## RTL Support Details

### CSS Approach
- Uses logical properties (`margin-inline`, `padding-inline`)
- Tailwind RTL utilities
- Document `dir` attribute set automatically
- Charts mirror correctly in RTL

### Translation Scope
- ✅ All UI text translated
- ❌ URLs, WCAG IDs, Rule IDs NOT translated (as specified)
- ❌ Raw evidence/code snippets NOT translated

## Database Schema Updates Needed

For Phase 5 (Widget Analytics), add these tables to Prisma schema:

```prisma
model WidgetEvent {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  siteId      String   @db.Uuid
  eventType   String   // page_view, widget_open, voice_enabled, command_used
  pageUrl     String
  metadata    Json?    // Additional event data
  createdAt   DateTime @default(now())
  
  @@index([siteId, createdAt])
  @@index([eventType])
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
  
  @@unique([siteId, date])
  @@index([siteId, date])
}
```

## Migration Strategy

### Preserving Existing Scan Flow

1. **Legacy Route**: Existing `ScanDashboard` available at `/legacy-scan`
2. **Gradual Migration**: New pages can call existing APIs
3. **No Breaking Changes**: All existing components preserved

### Testing Checklist

- [ ] Login works (EN/AR)
- [ ] Language switcher works
- [ ] RTL layout correct
- [ ] Sidebar position correct in RTL
- [ ] Charts render correctly in RTL
- [ ] Protected routes redirect to login
- [ ] Existing scan flow still works

## Next Steps

1. **Complete Phase 2**: Connect Overview to real API data
2. **Phase 3**: Implement Sites & Scans pages
3. **Phase 4**: Implement Findings explorer
4. **Phase 5**: Add analytics tables and dashboard
5. **Phase 6**: Settings page

## Notes

- All components use Tailwind CSS
- RTL is first-class, not hacked
- No hardcoded left/right CSS
- Accessibility maintained (keyboard, contrast, focus)
- Arabic translations are professional MSA

