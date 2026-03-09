# Raawi X Test Sites

Two comprehensive test sites for validating the Raawi X 3-Layer Scanner System and Widget integration.

## Sites Overview

### 1. Portal Good (`portal-good`)
**Port:** `http://localhost:4173`  
**Entity Code:** `TEST-GOOD`  
**Status:** WCAG 2.1 Level AA Compliant

A fully accessible test portal demonstrating best practices:
- ✅ Semantic HTML structure
- ✅ Proper heading hierarchy
- ✅ Alt text for all images
- ✅ Keyboard navigation
- ✅ Visible focus indicators
- ✅ Proper form labels
- ✅ ARIA used appropriately
- ✅ Sufficient color contrast

### 2. Gov Sim (`gov-sim`)
**Port:** `http://localhost:4174`  
**Entity Code:** `TEST-GOV`  
**Status:** Intentional Accessibility Issues (for testing)

A government service simulator with known accessibility issues:
- ❌ Missing alt text on 3+ images
- ❌ Unlabeled buttons (2+)
- ❌ Form fields missing proper labels (2+)
- ❌ Low contrast text (1+)
- ❌ Tabindex misuse (1+)
- ❌ Ambiguous link text ("Click here" repeated)

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm 8+
- Raawi Scanner API running on `http://localhost:3001`

### Installation

```bash
# Install dependencies for both sites
cd test-sites/portal-good && pnpm install
cd ../gov-sim && pnpm install
```

### Running the Sites

**Terminal 1 - Portal Good:**
```bash
cd test-sites/portal-good
pnpm dev
# Runs on http://localhost:4173
```

**Terminal 2 - Gov Sim:**
```bash
cd test-sites/gov-sim
pnpm dev
# Runs on http://localhost:4174
```

**Or use root scripts:**
```bash
# From repo root
pnpm --filter @raawi-x/test-portal-good dev
pnpm --filter @raawi-x/test-gov-sim dev
```

## Site Structures

### Portal Good Pages
- `/` - Home (hero, cards, featured news)
- `/about` - About page
- `/news` - News listing
- `/news/:slug` - News detail (5 articles)
- `/services` - Services listing
- `/services/:serviceId` - Service detail (5 services)
- `/resources` - Resources table
- `/resources/accessibility` - Accessibility statement
- `/contact` - Contact form
- `/sitemap` - Complete sitemap

**Total:** 10+ pages with deep linking

### Gov Sim Pages
- `/` - Landing page
- `/login` - Login page
- `/auth/verify` - OTP/Verification step
- `/dashboard` - Post-login dashboard
- `/services` - Services list
- `/services/:id` - Service detail
- `/apply/:id/step-1` - Personal info form
- `/apply/:id/step-2` - Contact info form
- `/apply/:id/step-3` - File uploads
- `/apply/:id/review` - Review summary
- `/apply/:id/success` - Success page

**Total:** 11+ pages with authentication flow

## Widget Integration

Both sites automatically load the Raawi X widget on every page:

```javascript
window.RAWI_API_URL = 'http://localhost:3001'
window.RAWI_ENTITY_CODE = 'TEST-GOOD' // or 'TEST-GOV'
window.VOICE_ENABLED = true
```

Widget script is loaded from `/widget.iife.js` (copied from `apps/widget/dist/widget.iife.js`)

## Scanning Workflow

### Step 1: Create Entities in Dashboard

1. Open dashboard: `http://localhost:5173`
2. Create Entity:
   - **Entity 1:** Code `TEST-GOOD`, Name "Portal Good Test"
   - **Entity 2:** Code `TEST-GOV`, Name "Gov Sim Test"
3. Add Properties:
   - **Entity 1:** Domain `localhost:4173`
   - **Entity 2:** Domain `localhost:4174`

### Step 2: Run Scans

**Scan Portal Good:**
- Start scan from Entity `TEST-GOOD`
- Seed URL: `http://localhost:4173`
- Expected: 95-100% compliance, minimal findings

**Scan Gov Sim:**
- Start scan from Entity `TEST-GOV`
- Seed URL: `http://localhost:4174`
- Expected: Multiple fails + needs review (see Expected Issues below)

### Step 3: Verify Third Layer

In Dashboard → Entity → Scans → Pipeline Inspector:

**Check Layer 1 (DOM):**
- ✅ HTML captured
- ✅ Findings extracted
- ✅ Pages stored

**Check Layer 2 (Vision):**
- ✅ Screenshots taken
- ✅ Vision findings created
- ✅ Missing labels detected

**Check Layer 3 (Assistive Map):**
- ✅ AssistiveMap records created
- ✅ `imageDescriptions` populated (for missing alt images)
- ✅ `labelOverrides` populated (for unlabeled buttons)
- ✅ `actionIntents` populated
- ✅ `forms` populated (for multi-step forms)

### Step 4: Verify Widget Integration

1. Open `http://localhost:4174` (Gov Sim)
2. Open Raawi Widget
3. Test "Describe Image" on hero image (no alt)
   - ✅ Should use assistiveMap.imageDescriptions (enriched)
   - ✅ Should NOT just say "Image without description"
4. Test "Describe Focused Element" on unlabeled button
   - ✅ Should use assistiveMap.labelOverrides (enriched label)
   - ✅ Should NOT just say "unlabeled button"
5. Test "What can I do here?" on apply pages
   - ✅ Should use scan-generated keyActions
   - ✅ Should include context titles
6. Test Form Assistant on `/apply/:id/step-1`
   - ✅ Should use scan-generated form plan
   - ✅ Should use enriched field labels from assistiveMap.forms

## Expected Issues (Gov Sim)

### Documented Intentional Issues

#### 1. Missing Alt Text (3 images)
- **Location:** `/` (Landing page)
  - Hero image: `gov_hero.jpg` - NO alt attribute
- **Location:** `/` (Service cards)
  - Service card 1 image: `service_card_1.jpg` - NO alt attribute
- **Location:** `/apply/:id/success`
  - Success icon: `success_icon.png` - NO alt attribute (should be aria-hidden)

**Expected Scan Result:**
- Layer 1: 3 findings for "1.1.1 Non-text Content"
- Layer 2: Vision should detect these images
- Layer 3: AssistiveMap.imageDescriptions should have enriched descriptions

#### 2. Unlabeled Buttons (2+)
- **Location:** `/` (Landing page)
  - "Learn more" button - Generic text, no aria-label
- **Location:** Various pages
  - Icon-only button (if implemented) - No aria-label

**Expected Scan Result:**
- Layer 1: Findings for "4.1.2 Name, Role, Value"
- Layer 3: AssistiveMap.labelOverrides should have enriched labels

#### 3. Form Fields Missing Labels (2+)
- **Location:** `/login`
  - National ID input - Uses placeholder only, no `<label>`
- **Location:** `/apply/:id/step-2`
  - Email input - Uses `<div>` as label, not bound to input

**Expected Scan Result:**
- Layer 1: Findings for "3.3.2 Labels or Instructions"
- Layer 3: AssistiveMap.forms should have proper labels

#### 4. Low Contrast Text (1+)
- **Location:** TBD (add a section with light gray text on white)

**Expected Scan Result:**
- Layer 1: Finding for "1.4.3 Contrast (Minimum)"

#### 5. Tabindex Misuse (1+)
- **Location:** TBD (add element with tabindex="5")

**Expected Scan Result:**
- Layer 1: Finding for "2.4.3 Focus Order" (heuristic)

#### 6. Ambiguous Link Text (1+)
- **Location:** TBD (add multiple "Click here" links)

**Expected Scan Result:**
- Layer 1: Finding for "2.4.4 Link Purpose (In Context)" - Needs Review

## Image Requirements

See `IMAGE_GENERATION_PROMPTS.md` for detailed prompts to generate all required images.

**Quick Summary:**
- Portal Good: 8+ images, ALL with proper alt text
- Gov Sim: 3+ images, some intentionally missing alt text

## Testing Checklist

### Pre-Scan
- [ ] Both sites running on correct ports
- [ ] Widget script copied to both sites' `public/` folders
- [ ] Entities created in dashboard
- [ ] Properties added with correct domains

### Post-Scan (Portal Good)
- [ ] Scan completed successfully
- [ ] Layer 1: HTML captured for all pages
- [ ] Layer 2: Screenshots and vision findings created
- [ ] Layer 3: AssistiveMap created with imageDescriptions, labelOverrides
- [ ] Compliance score: 95-100%
- [ ] Findings: Minimal (mostly Pass)

### Post-Scan (Gov Sim)
- [ ] Scan completed successfully
- [ ] Layer 1: Findings include all documented issues
- [ ] Layer 2: Vision detects missing labels/images
- [ ] Layer 3: AssistiveMap has enriched data for all issues
- [ ] Compliance score: Lower (expected)
- [ ] Findings: Multiple Fail + Needs Review

### Widget Verification (Gov Sim)
- [ ] Open site after scan
- [ ] Widget loads and fetches page-package
- [ ] "Describe Image" uses assistiveMap.imageDescriptions
- [ ] "Describe Focused Element" uses assistiveMap.labelOverrides
- [ ] "What can I do here?" uses scan-generated keyActions
- [ ] Form Assistant uses scan-generated form plan

## Troubleshooting

### Widget Not Loading
- Check browser console for errors
- Verify `widget.iife.js` exists in `public/` folder
- Rebuild widget: `pnpm --filter widget build`
- Copy widget: `Copy-Item apps\widget\dist\widget.iife.js test-sites\portal-good\public\widget.iife.js`

### Scan Not Finding Pages
- Verify sites are running on correct ports
- Check seed URL format (include http://)
- Verify internal links are working (crawler follows links)

### Third Layer Not Generated
- Check scanner logs for Layer 3 generation
- Verify pages have `canonicalUrl` and `pageFingerprint`
- Check database: `PageVersion` and `AssistiveMap` tables
- See `SCAN_METHODOLOGY.md` for Layer 3 requirements

### Widget Not Using Scan Data
- Verify widget API URL is correct
- Check browser network tab for `/api/widget/page-package` request
- Verify entity code matches scanned entity
- Check assistiveMap data in database

## File Structure

```
test-sites/
├── portal-good/          # Compliant test site
│   ├── src/
│   │   ├── pages/        # All page components
│   │   ├── components/   # Shared components
│   │   └── App.tsx       # Router setup
│   ├── public/
│   │   └── widget.iife.js
│   └── package.json
├── gov-sim/              # Intentional issues site
│   ├── src/
│   │   ├── pages/        # All page components
│   │   ├── components/   # Shared components
│   │   └── App.tsx       # Router + auth
│   ├── public/
│   │   └── widget.iife.js
│   └── package.json
├── assets/
│   └── images/           # Shared images
├── IMAGE_GENERATION_PROMPTS.md
└── README.md             # This file
```

## Next Steps

1. Generate images using prompts in `IMAGE_GENERATION_PROMPTS.md`
2. Place images in `test-sites/assets/images/`
3. Run both sites
4. Create entities and run scans
5. Verify Third Layer data generation
6. Test widget integration with scan data

## Support

For issues or questions:
- Check scanner logs: `apps/scanner/logs/`
- Check database: Use SQL scripts in repo root
- Review `SCAN_METHODOLOGY.md` for Layer 3 details
- Review `WIDGET_USER_GUIDE.md` for widget features

