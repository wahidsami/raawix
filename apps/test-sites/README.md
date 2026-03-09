# Raawi X Test Sites

Test pages for accessibility scanning and widget integration.

## Overview

This app provides two test pages:
- **Good Page** (`/good`) - Clean semantic HTML, WCAG-friendly
- **Messy Page** (`/messy`) - Same visuals, intentionally messy DOM with accessibility issues

Both pages include:
- Header/nav/main/footer landmarks
- Hero section, cards, CTA buttons
- Small form (name/email)
- Modal dialog trigger
- At least 3 links and 3 buttons
- Raawi X widget integration

## Good Page Features

✅ **Proper Accessibility:**
- Correct `<label>` associations
- Proper heading hierarchy
- Keyboard navigation works
- Focus visible and obvious
- Contrast compliant
- Proper ARIA attributes

## Messy Page Issues

❌ **Intentionally Problematic:**
- Some buttons replaced with `<div onclick>` styled like buttons but no role/tabindex
- Icon-only clickable with no aria-label
- Form inputs missing label (placeholder only)
- At least one focus indicator removed via CSS
- Tab order odd (tabindex misuse)
- At least one text-on-image contrast risk

## Development

### Start Development Server

```bash
pnpm test-sites:dev
```

Server runs on `http://localhost:4173`

### Build

```bash
pnpm --filter @raawi-x/test-sites build
```

## Widget Integration

The widget is automatically injected on both pages. The pages load the widget from `/widget.iife.js`.

### Setup Widget

**Option 1: Copy widget to public folder (Recommended)**
```bash
# Build widget
pnpm --filter widget build

# Copy to test-sites public folder
mkdir -p apps/test-sites/public
cp apps/widget/dist/widget.iife.js apps/test-sites/public/
```

**Option 2: Use symlink (Development)**
```bash
# On Windows (PowerShell as Admin)
New-Item -ItemType SymbolicLink -Path "apps\test-sites\public\widget.iife.js" -Target "apps\widget\dist\widget.iife.js"

# On Linux/Mac
ln -s ../../widget/dist/widget.iife.js apps/test-sites/public/widget.iife.js
```

**Option 3: Serve from widget app**
- Start widget dev server separately
- Update script src in pages to point to widget dev server URL

## Testing with Scanner

1. Start scanner: `pnpm scanner:dev`
2. Start test sites: `pnpm test-sites:dev`
3. Scan the pages:

   **PowerShell (Windows):**
   ```powershell
   # Use the provided script
   .\apps\test-sites\scan-test-pages.ps1
   
   # Or manually:
   $body = @{seedUrl="http://localhost:4173/good";maxPages=1;maxDepth=1} | ConvertTo-Json
   Invoke-RestMethod -Uri "http://localhost:3001/api/scan" `
     -Method POST `
     -Headers @{"Content-Type"="application/json";"X-API-Key"="dev-api-key-change-in-production"} `
     -Body $body
   ```

   **Bash (Linux/Mac):**
   ```bash
   # Scan good page
   curl -X POST http://localhost:3001/api/scan \
     -H "Content-Type: application/json" \
     -H "X-API-Key: dev-api-key-change-in-production" \
     -d '{"seedUrl": "http://localhost:4173/good", "maxPages": 1, "maxDepth": 1}'
   
   # Scan messy page
   curl -X POST http://localhost:3001/api/scan \
     -H "Content-Type: application/json" \
     -H "X-API-Key: dev-api-key-change-in-production" \
     -d '{"seedUrl": "http://localhost:4173/messy", "maxPages": 1, "maxDepth": 1}'
   ```

## Routes

- `/` - Home page with links to good/messy pages
- `/good` - WCAG-friendly page
- `/messy` - Page with intentional accessibility issues

