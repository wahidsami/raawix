# Widget Reliability & Intelligence Features

## Overview

Raawi X widget uses intelligent URL matching and stale scan detection to provide reliable guidance even when pages change or URLs vary.

## A) Canonical URL + Page Fingerprint

### During Scan Capture

Each page stores:
- **canonicalUrl**: Normalized URL (strip hash, normalize trailing slash, lowercase host)
- **finalUrl**: Actual URL after redirects (already exists)
- **pageFingerprint**:
  - `title`: Page title
  - `firstHeading`: First H1 or H2 text
  - `mainTextHash`: SHA256 hash of normalized `<main>` text content (truncated to 2000 chars)

### Storage

- **File**: `output/{scanId}/pages/{n}/page.json`
- **Postgres**: `Page` table (if database enabled)

### Example

```json
{
  "pageNumber": 1,
  "url": "https://example.com/page?ref=home#section",
  "finalUrl": "https://example.com/page",
  "canonicalUrl": "https://example.com/page",
  "title": "Welcome Page",
  "pageFingerprint": {
    "title": "Welcome Page",
    "firstHeading": "Get Started Today",
    "mainTextHash": "a1b2c3d4e5f6..."
  }
}
```

## B) Backend URL Resolution

### Widget Endpoints

Both `/api/widget/guidance` and `/api/widget/issues` now:

1. **Accept** `url` parameter (may have query params, hash, etc.)
2. **Resolve page** using multiple strategies:
   - **Strategy 1**: Exact canonical URL match (confidence: `high`)
   - **Strategy 2**: Final URL match (confidence: `high`)
   - **Strategy 3**: Best-effort match ignoring query params (confidence: `medium`)
   - **Strategy 4**: Fingerprint similarity (confidence: `low`)

3. **Return** match metadata:
   ```json
   {
     "matchedUrl": "https://example.com/page",
     "matchConfidence": "high",
     "scanTimestamp": {
       "startedAt": "2024-01-01T00:00:00Z",
       "completedAt": "2024-01-01T00:05:00Z"
     },
     "pageFingerprint": {
       "title": "Welcome Page",
       "firstHeading": "Get Started Today",
       "mainTextHash": "a1b2c3d4e5f6..."
     }
   }
   ```

### Matching Logic

```typescript
// Strategy 1: Canonical URL (highest confidence)
if (page.canonicalUrl === computeCanonicalUrl(requestUrl)) {
  return { matchConfidence: 'high', matchMethod: 'canonical' };
}

// Strategy 2: Final URL
if (normalizeUrl(page.finalUrl) === normalizeUrl(requestUrl)) {
  return { matchConfidence: 'high', matchMethod: 'final' };
}

// Strategy 3: Ignore query params
if (urlWithoutQuery(page.finalUrl) === urlWithoutQuery(requestUrl)) {
  return { matchConfidence: 'medium', matchMethod: 'query-ignored' };
}

// Strategy 4: Fingerprint similarity
if (compareFingerprints(currentFp, pageFp) > 0.5) {
  return { matchConfidence: 'low', matchMethod: 'fingerprint' };
}
```

## C) Stale Scan Detection

### Widget-Side Detection

After fetching guidance, widget:

1. **Computes current page fingerprint** from live DOM:
   - Title
   - First H1/H2
   - Main content hash (first 2000 chars)

2. **Compares** to scan fingerprint from API

3. **Shows warning** if:
   - Match confidence is `low` or `medium`, OR
   - Fingerprint similarity < 0.5

4. **Warning message** (non-blocking):
   > "⚠️ Scan Notice: Guidance may be based on an older or different page version. Using DOM-only reading for content, scan data for general hints."

5. **Widget continues functioning** with hybrid approach

### Implementation

```typescript
// In widget after fetching guidance
const currentFp = computePageFingerprint(); // From live DOM
const scanFp = guidance.pageFingerprint; // From API

const similarity = compareFingerprints(currentFp, scanFp);
const shouldWarn = 
  guidance.matchConfidence === 'low' || 
  guidance.matchConfidence === 'medium' ||
  similarity < 0.5;

if (shouldWarn) {
  showStaleScanWarning(); // Non-blocking
}
```

## D) Hybrid Reading Behavior

### Clarified Approach

**"Read Page" always uses:**
- ✅ **Live DOM text** for actual content sections
- ✅ **Scan guidance** for:
  - Page structure and ordering
  - Landmarks and navigation hints
  - Key actions descriptions
  - Known accessibility issues

**Never:**
- ❌ Reads HTML snapshot content directly
- ❌ Uses stale content from scan

### Example Flow

```
User says "read page"
    ↓
Widget builds reading queue:
    ↓
1. Page title → Live DOM (document.title)
    ↓
2. Summary → Scan guidance (if available) OR live DOM
    ↓
3. Sections → Live DOM (querySelector('h2, h3'))
   - Uses scan guidance for ordering/landmarks
    ↓
4. Cards → Scan guidance descriptions OR live DOM fallback
    ↓
5. Forms → Scan guidance structure OR live DOM fallback
    ↓
6. Key Actions → Scan guidance descriptions
    ↓
Speak each segment (with translation if enabled)
```

## E) Privacy Statement

**Widget Privacy:**
- ✅ **Does NOT send user behavior** to server
- ✅ **Only fetches** scan intelligence (guidance, issues)
- ✅ **All user interactions** stay in browser
- ✅ **No tracking** or analytics
- ✅ **No personal data** collected

**What Widget Sends:**
- Current page URL (for matching)
- Scan ID (if configured)

**What Widget Receives:**
- Page guidance (structure, landmarks, actions)
- Known issues (accessibility problems)

**What Widget Does Locally:**
- Voice recognition (browser API)
- Text-to-speech (browser API)
- DOM reading (browser API)
- All user interactions

## Technical Details

### Canonical URL Computation

```typescript
function computeCanonicalUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hash = ''; // Remove hash
  parsed.hostname = parsed.hostname.toLowerCase(); // Lowercase host
  // Normalize trailing slash
  if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }
  return parsed.toString();
}
```

### Page Fingerprint Computation

**Server-side** (during scan):
```typescript
{
  title: page.title,
  firstHeading: firstH1 || firstH2,
  mainTextHash: sha256(mainContent.substring(0, 2000))
}
```

**Client-side** (in widget):
```typescript
{
  title: document.title,
  firstHeading: document.querySelector('h1') || document.querySelector('h2'),
  mainTextHash: simpleHash(mainContent.substring(0, 2000))
}
```

### Fingerprint Comparison

```typescript
function compareFingerprints(fp1, fp2): number {
  let score = 0, factors = 0;
  
  // Title match: 0.5 (exact) or 0.3 (partial)
  // Heading match: 0.5 (exact) or 0.3 (partial)
  // Hash match: 1.0 (exact)
  
  return factors > 0 ? score / factors : 0;
}
```

## Benefits

1. **Reliable Matching**: Works even if URLs have query params or hashes
2. **Stale Detection**: Warns users when scan is outdated
3. **Hybrid Approach**: Always reads current content, uses scan for intelligence
4. **Privacy First**: No user behavior tracking
5. **Graceful Degradation**: Falls back to DOM-only if scan unavailable

## Example Scenarios

### Scenario 1: URL with Query Params

**Scan URL**: `https://example.com/page`  
**Widget URL**: `https://example.com/page?ref=home&utm_source=email`

**Result**: Matches via Strategy 3 (query-ignored), confidence: `medium`

### Scenario 2: Page Content Changed

**Scan**: Page had "Welcome" heading  
**Current**: Page now has "Get Started" heading

**Result**: Fingerprint mismatch detected, shows warning, uses live DOM

### Scenario 3: Different Page, Similar Content

**Scan**: `https://example.com/page1` (title: "Products")  
**Widget**: `https://example.com/page2` (title: "Products")

**Result**: Matches via Strategy 4 (fingerprint), confidence: `low`, shows warning

## Summary

- ✅ Canonical URLs for reliable matching
- ✅ Page fingerprints for content comparison
- ✅ Multi-strategy URL resolution
- ✅ Stale scan detection with warnings
- ✅ Hybrid reading (live DOM + scan guidance)
- ✅ Privacy-first (no user tracking)
- ✅ Graceful fallback to DOM-only

