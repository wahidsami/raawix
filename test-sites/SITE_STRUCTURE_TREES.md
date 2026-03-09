# Test Sites Structure - Visual Tree Diagrams

Visual representation of page hierarchy and navigation structure for both test sites.

---

## Portal Good (`localhost:4173`) - Site Structure

```
Portal Good
│
├── / (Home)
│   ├── Hero Section
│   ├── Features (5 cards)
│   └── Latest News (3 articles)
│
├── /about
│   ├── Mission
│   ├── Values
│   ├── Compliance
│   └── Testing
│
├── /news
│   ├── News Listing (5 articles)
│   │
│   └── /news/:slug (Detail Pages)
│       ├── /news/accessibility-awards-2024
│       ├── /news/wcag-2-2-updates
│       ├── /news/screen-reader-testing
│       ├── /news/keyboard-navigation
│       └── /news/aria-basics
│
├── /services
│   ├── Services Listing (5 services)
│   │
│   └── /services/:serviceId (Detail Pages)
│       ├── /services/web-accessibility
│       ├── /services/consulting
│       ├── /services/training
│       ├── /services/remediation
│       └── /services/testing
│
├── /resources
│   ├── Resources Table (6 resources)
│   │
│   └── /resources/accessibility
│       └── Accessibility Statement
│
├── /contact
│   └── Contact Form
│       ├── Name (required)
│       ├── Email (required)
│       ├── Subject (required)
│       └── Message (required)
│
└── /sitemap
    └── Complete Site Map

Total Pages: 10+ pages
Deep Structure: L1 → L2 → L3 (3 levels)
```

### Navigation Flow

```
Navbar
│
├── Home → /
├── About → /about
├── News → /news → /news/:slug
├── Services (Dropdown)
│   ├── All Services → /services
│   ├── Web Accessibility → /services/web-accessibility
│   ├── Consulting → /services/consulting
│   ├── Training → /services/training
│   └── (More services...)
├── Resources → /resources → /resources/accessibility
├── Contact → /contact
└── Language Switcher (AR/EN)
```

### Internal Linking Structure

```
/ (Home)
  ├─→ /services (via "Explore Services" button)
  ├─→ /about (via "Learn More" button)
  ├─→ /news/:slug (via article links)
  └─→ /resources/accessibility (via feature cards)

/news
  ├─→ /news/:slug (via article cards)
  └─→ / (via breadcrumbs)

/news/:slug
  ├─→ /news (via "Back to News" button)
  └─→ / (via breadcrumbs)

/services
  ├─→ /services/:serviceId (via service cards)
  └─→ /contact (via "Contact Us" button)

/services/:serviceId
  ├─→ /services (via "Back to Services" button)
  └─→ /contact (via "Request Quote" modal)

/resources
  └─→ /resources/accessibility (via link)

/resources/accessibility
  └─→ /contact (via link)

/contact
  └─→ / (after form submission)

/sitemap
  └─→ All pages (via sitemap links)
```

---

## Gov Sim (`localhost:4174`) - Site Structure

```
Gov Sim
│
├── / (Landing) [PUBLIC]
│   ├── Hero Section (missing alt)
│   └── Services Preview (2 cards)
│
├── /login [PUBLIC]
│   └── Login Form
│       └── National ID Input (missing label)
│
├── /auth/verify [PUBLIC]
│   └── OTP Verification Form
│
├── /dashboard [PROTECTED]
│   ├── Quick Services
│   └── Recent Requests
│
├── /services [PROTECTED]
│   ├── Services List (3 services)
│   │
│   └── /services/:id (Detail Pages)
│       ├── /services/renew-id
│       ├── /services/certificates
│       └── /services/license
│
└── /apply/:id/* [PROTECTED - Multi-step Form]
    ├── /apply/:id/step-1
    │   ├── Full Name (required)
    │   ├── National ID (required)
    │   └── Date of Birth (required)
    │
    ├── /apply/:id/step-2
    │   ├── Mobile (required)
    │   ├── Email (required - missing label)
    │   └── Address (optional)
    │
    ├── /apply/:id/step-3
    │   ├── ID Copy Upload (required)
    │   └── Supporting Doc (optional)
    │
    ├── /apply/:id/review
    │   └── Review Summary
    │
    └── /apply/:id/success
        └── Success Message (missing alt icon)

Total Pages: 11+ pages
Deep Structure: L1 → L2 → L3 → L4 (4 levels)
Auth Flow: Public → Login → Verify → Protected
```

### Navigation Flow

```
Navbar (Public)
│
├── الرئيسية → /
├── تسجيل الدخول → /login
└── Language Switcher (AR/EN)

Navbar (Authenticated)
│
├── لوحة التحكم → /dashboard
├── الخدمات → /services → /services/:id
├── تسجيل الخروج → (logout)
└── Language Switcher (AR/EN)
```

### Authentication Flow

```
/ (Landing)
  └─→ /login (via "تسجيل الدخول" button)

/login
  └─→ /auth/verify (after form submit)

/auth/verify
  └─→ /dashboard (after verification)

/dashboard
  ├─→ /services (via quick services)
  └─→ /apply/:id/step-1 (via "تقديم طلب" button)

/services
  └─→ /services/:id (via service cards)

/services/:id
  └─→ /apply/:id/step-1 (via "بدء التقديم" button)
```

### Multi-Step Form Flow

```
/apply/:id/step-1 (Personal Info)
  └─→ /apply/:id/step-2 (Next button)

/apply/:id/step-2 (Contact Info)
  ├─→ /apply/:id/step-1 (Previous button)
  └─→ /apply/:id/step-3 (Next button)

/apply/:id/step-3 (Attachments)
  ├─→ /apply/:id/step-2 (Previous button)
  └─→ /apply/:id/review (Next button)

/apply/:id/review (Review)
  ├─→ /apply/:id/step-3 (Previous button)
  └─→ /apply/:id/success (Submit button)

/apply/:id/success (Success)
  ├─→ /dashboard (via "العودة إلى لوحة التحكم")
  └─→ /services (via "الخدمات الأخرى")
```

### Internal Linking Structure

```
/ (Landing)
  ├─→ /login (via login button)
  └─→ /services/:id (via service cards - if authenticated)

/login
  └─→ /auth/verify (after submit)

/auth/verify
  └─→ /dashboard (after verification)

/dashboard
  ├─→ /services/:id (via quick services)
  └─→ /apply/:id/step-1 (via apply button)

/services
  ├─→ /services/:id (via service cards)
  └─→ /apply/:id/step-1 (via apply button)

/services/:id
  └─→ /apply/:id/step-1 (via start application button)

/apply/:id/step-1
  └─→ /apply/:id/step-2 (next)

/apply/:id/step-2
  ├─→ /apply/:id/step-1 (previous)
  └─→ /apply/:id/step-3 (next)

/apply/:id/step-3
  ├─→ /apply/:id/step-2 (previous)
  └─→ /apply/:id/review (next)

/apply/:id/review
  ├─→ /apply/:id/step-3 (previous)
  └─→ /apply/:id/success (submit)

/apply/:id/success
  ├─→ /dashboard (back to dashboard)
  └─→ /services (other services)
```

---

## Page Count Summary

### Portal Good
- **Total Routes:** 10+ pages
- **Level 1 (Root):** 1 page (/)
- **Level 2 (Direct):** 5 pages (/about, /news, /services, /resources, /contact)
- **Level 3 (Nested):** 4+ pages (/news/:slug, /services/:serviceId, /resources/accessibility, /sitemap)
- **Deepest Level:** 3 levels

### Gov Sim
- **Total Routes:** 11+ pages
- **Level 1 (Root):** 1 page (/)
- **Level 2 (Direct):** 2 pages (/login, /auth/verify)
- **Level 3 (Protected):** 2 pages (/dashboard, /services)
- **Level 4 (Nested):** 6+ pages (/services/:id, /apply/:id/*)
- **Deepest Level:** 4 levels
- **Auth Required:** 8 pages (protected routes)

---

## Crawler Depth Analysis

### Portal Good - Crawler Paths

```
Seed: http://localhost:4173/

Depth 0: /
  ├─→ /about (depth 1)
  ├─→ /news (depth 1)
  ├─→ /services (depth 1)
  ├─→ /resources (depth 1)
  └─→ /contact (depth 1)

Depth 1: /news
  ├─→ /news/accessibility-awards-2024 (depth 2)
  ├─→ /news/wcag-2-2-updates (depth 2)
  ├─→ /news/screen-reader-testing (depth 2)
  ├─→ /news/keyboard-navigation (depth 2)
  └─→ /news/aria-basics (depth 2)

Depth 1: /services
  ├─→ /services/web-accessibility (depth 2)
  ├─→ /services/consulting (depth 2)
  ├─→ /services/training (depth 2)
  ├─→ /services/remediation (depth 2)
  └─→ /services/testing (depth 2)

Depth 1: /resources
  └─→ /resources/accessibility (depth 2)

Total Pages Crawlable: ~15 pages
```

### Gov Sim - Crawler Paths

```
Seed: http://localhost:4174/

Depth 0: /
  ├─→ /login (depth 1)
  └─→ /services/:id (depth 1 - if links exist)

Depth 1: /login
  └─→ /auth/verify (depth 2 - form redirect)

Note: Protected routes (/dashboard, /apply/*) require authentication
      Scanner may not reach these unless auth is handled

Public Pages Crawlable: ~3 pages
Protected Pages (if auth handled): ~8 pages
```

---

## Key Differences

| Feature | Portal Good | Gov Sim |
|---------|-------------|---------|
| **Default Language** | Arabic (AR) | Arabic (AR) |
| **Total Pages** | 10+ | 11+ |
| **Max Depth** | 3 levels | 4 levels |
| **Auth Required** | No | Yes (8 pages) |
| **Forms** | 1 (contact) | 4+ (login, verify, multi-step) |
| **Intentional Issues** | None | 7+ issues |
| **Compliance Target** | 95-100% | Lower (testing) |
| **Crawlable (Public)** | All pages | 3 pages (rest protected) |

---

## Scanner Crawling Notes

### Portal Good
- ✅ All pages are public and crawlable
- ✅ Deep linking structure allows full crawl
- ✅ No authentication barriers
- ✅ Expected: Scanner can reach all 15+ pages

### Gov Sim
- ⚠️ Most pages require authentication
- ⚠️ Scanner may only reach: /, /login, /auth/verify
- ⚠️ Protected routes need auth handling in scanner
- ⚠️ Multi-step form pages require session state
- 💡 **Recommendation:** Test scanner with auth credentials or make test pages public for scanning

---

**Last Updated:** After test sites implementation  
**Purpose:** Visual reference for site structure and navigation

