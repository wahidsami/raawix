# Widget Clarity & Robustness Enhancements

## Overview

Enhanced Raawi X widget and post-scan workflow for clarity, trust, and real-world robustness.

## A) Guidance vs Content Contract

### Implementation

**Code Comments Updated:**
- `apps/widget/src/widget.ts` - `buildReadingQueue()` method
- `apps/scanner/src/api/widget-guidance.ts` - `extractPageGuidance()` function

**Key Statement:**
> "Scan data NEVER replaces live page content. The widget ALWAYS reads live DOM for content and uses scan data ONLY for structure, ordering, action descriptions, and issue explanations."

**What Widget Does:**
- ✅ **Always reads live DOM** for actual content
- ✅ **Uses scan guidance ONLY for**:
  - Page structure and ordering
  - Landmarks and navigation hints
  - Key actions descriptions
  - Known accessibility issues
- ❌ **Never reads HTML snapshot** content directly

**Documentation Updated:**
- `WORKFLOW_AFTER_SCAN.md` - Added "Guidance vs Content Contract" section
- `WIDGET_INTEGRATION_SCENARIO.md` - Clarified hybrid reading behavior

## B) Scan Freshness UI

### Implementation

**Widget UI Element:**
- Added `showScanFreshness()` method in `apps/widget/src/widget.ts`
- Displays: "Guidance based on scan from {formatted date}"
- Example: "Guidance based on scan from Jan 15, 2024"

**Display Characteristics:**
- **Subtle styling**: Light gray background, small font
- **Non-blocking**: Informational only, doesn't interrupt user
- **Positioned**: After narration controls in widget panel
- **Accessible**: Uses `aria-live="polite"` for screen readers

**When Shown:**
- Automatically displayed when guidance is fetched
- Shows `completedAt` date from `scanTimestamp`
- Falls back to `startedAt` if `completedAt` not available

**Code:**
```typescript
private showScanFreshness(guidance: PageGuidance | null): void {
  const completedAt = guidance.scanTimestamp.completedAt;
  const formattedDate = new Date(completedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  // Display: "Guidance based on scan from Jan 15, 2024"
}
```

## C) Latest Scan Support

### Backend Implementation

**New Method:**
- `findLatestScanForDomain(requestUrl: string)` in `apps/scanner/src/api/widget-service.ts`

**How It Works:**
1. Extracts hostname from request URL
2. Searches all scan directories
3. Filters by:
   - Same hostname/domain
   - Status = 'completed'
4. Sorts by completion time (most recent first)
5. Returns scan ID of most recent match

**Integration:**
- `getPageGuidance()` checks if `scanId === 'latest'`
- `getPageIssues()` checks if `scanId === 'latest'`
- Uses same URL resolution logic (canonical URL + fingerprint matching)
- Falls back gracefully if no scan found (returns null, widget uses DOM-only)

**Widget Default:**
- Widget defaults to `'latest'` if `RAWI_SCAN_ID` not set
- Can be explicitly set: `window.RAWI_SCAN_ID = 'latest'`

**Example:**
```javascript
// Option 1: Use latest scan automatically
window.RAWI_SCAN_ID = 'latest';

// Option 2: Use specific scan
window.RAWI_SCAN_ID = 'scan_1234567890_abc123';

// Option 3: Not set (defaults to 'latest')
// window.RAWI_SCAN_ID not set
```

## D) Documentation Updates

### Files Updated

**1. WORKFLOW_AFTER_SCAN.md**
- Added "latest scan" option in setup section
- Reinforced "Guidance vs Content Contract"
- Expanded privacy guarantee section
- Clarified hybrid reading behavior

**2. WIDGET_INTEGRATION_SCENARIO.md**
- Added "latest" scan option example
- Updated hybrid reading behavior section
- Reinforced privacy guarantee
- Added scan freshness mention in workflow diagram

### Key Messages Added

**Guidance vs Content Contract:**
> "Scan data NEVER replaces live page content. The widget ALWAYS reads live DOM for content and uses scan data ONLY for structure, ordering, action descriptions, and issue explanations."

**Privacy Guarantee:**
> "Widget does NOT send user behavior to server. Widget does NOT track user interactions. Widget does NOT collect personal data. Only fetches scan intelligence (guidance, issues) - read-only."

**Latest Scan:**
> "If `RAWI_SCAN_ID = "latest"`, the backend automatically finds the most recent completed scan for the domain."

## Technical Details

### Backend: Latest Scan Resolution

```typescript
private async findLatestScanForDomain(requestUrl: string): Promise<string | null> {
  const requestHostname = getHostname(requestUrl);
  
  // Find all completed scans for this domain
  const scanCandidates = [];
  for (const scan of allScans) {
    if (scan.status === 'completed' && 
        getHostname(scan.seedUrl) === requestHostname) {
      scanCandidates.push({
        scanId: scan.id,
        completedAt: scan.completedAt || scan.startedAt
      });
    }
  }
  
  // Return most recent
  scanCandidates.sort((a, b) => b.completedAt - a.completedAt);
  return scanCandidates[0]?.scanId || null;
}
```

### Widget: Scan Freshness Display

```typescript
private showScanFreshness(guidance: PageGuidance | null): void {
  const completedAt = guidance.scanTimestamp.completedAt;
  const formattedDate = new Date(completedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  
  // Create subtle UI element
  const freshness = document.createElement('div');
  freshness.textContent = `Guidance based on scan from ${formattedDate}`;
  // Insert into widget panel
}
```

## Benefits

1. **Clarity**: Users understand scan data is for structure, not content
2. **Trust**: Scan freshness is visible, privacy is guaranteed
3. **Robustness**: "Latest" scan option works automatically
4. **Transparency**: Users know when guidance is based on older scans
5. **Flexibility**: Can use specific scan or latest scan

## Testing Checklist

- [ ] Test `RAWI_SCAN_ID = "latest"` resolves most recent scan
- [ ] Test `RAWI_SCAN_ID = "latest"` with no scans returns null gracefully
- [ ] Verify scan freshness UI appears in widget panel
- [ ] Verify freshness date is formatted correctly
- [ ] Test stale scan warning appears when fingerprint mismatch
- [ ] Verify widget always reads live DOM (not HTML snapshot)
- [ ] Verify documentation mentions "latest" option
- [ ] Verify privacy guarantee is clearly stated

## Summary

All enhancements completed:
- ✅ Guidance vs content contract clarified in code and docs
- ✅ Scan freshness UI added to widget
- ✅ "Latest" scan support implemented
- ✅ Documentation updated with all clarifications

The widget now provides clear, trustworthy, and robust functionality with transparent scan freshness information.

