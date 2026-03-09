# Vision v0 Implementation - Raawi X

## Overview

Vision v0 adds visual analysis capabilities to detect potentially inaccessible UI elements during page scanning. It runs while the Playwright page context is available and saves findings that are merged into the canonical report.json.

## Features

### A) Core Types

**VisionFinding** (`packages/core/src/index.ts`):
- `id`: Unique identifier
- `pageNumber`, `url`: Page context
- `kind`: Type of finding (clickable_unlabeled, icon_button_unlabeled, text_contrast_risk, looks_like_button_not_button, focus_indicator_missing_visual)
- `bbox`: Bounding box coordinates
- `detectedText`: Optional OCR-detected text
- `confidence`: high|medium|low
- `correlatedSelector`: Optional DOM selector
- `evidence`: EvidenceItem[] (includes screenshot crops)
- `suggestedWcagIds`: Array of relevant WCAG IDs

### B) Vision Analyzer

**Location**: `apps/scanner/src/vision/analyzer.ts`

**Functionality**:
1. **Collects candidate interactive elements**:
   - `button`, `a[href]`, `input`, `select`, `textarea`
   - `[role="button"]`, `[tabindex]`, `[onclick]`

2. **For each candidate**:
   - Computes accessible name (aria-label, aria-labelledby, associated label, innerText)
   - Gets bounding box
   - Detects icon-only elements (empty text + SVG/IMG or icon class)

3. **Creates findings**:
   - `clickable_unlabeled`: Visible clickable element with empty accessible name and text
   - `icon_button_unlabeled`: Element contains SVG/IMG and no accessible name
   - `looks_like_button_not_button`: Element styled like button but not semantic button

4. **Evidence**:
   - Stores correlatedSelector (stable selector)
   - Saves element screenshot crop to `output/{scanId}/pages/{n}/vision/{findingId}.png`
   - Includes outerHTML snippet as EvidenceItem

5. **Optional OCR**:
   - Feature flag: `VISION_OCR_ENABLED=true`
   - Uses `tesseract.js` for text detection
   - If OCR finds text, attaches `detectedText` and raises confidence

### C) Persistence

**Vision findings saved to**: `output/{scanId}/pages/{n}/vision/vision.json`

**Structure**:
```json
[
  {
    "id": "vision-1-1234567890-abc123",
    "pageNumber": 1,
    "url": "https://example.com",
    "kind": "clickable_unlabeled",
    "bbox": { "x": 100, "y": 200, "width": 50, "height": 30 },
    "confidence": "high",
    "correlatedSelector": "button.submit-btn",
    "evidence": [...],
    "suggestedWcagIds": ["4.1.2"]
  }
]
```

### D) Report Integration

**Location**: `apps/scanner/src/runner/report-generator.ts`

**Process**:
1. During report generation, loads `vision.json` for each page
2. Converts each `VisionFinding` to `RuleResult`:
   - `ruleId`: `vision-{kind}`
   - `wcagId`: Primary from `suggestedWcagIds` (usually 4.1.2)
   - `status`: `needs_review` by default; `fail` if high confidence + correlatedSelector
   - `confidence`: From finding
   - `evidence`: Includes crop path + selector + OCR text if any
   - `howToVerify`: Describes how to confirm with screen reader/keyboard

3. Merged into `PageRuleResults` alongside WCAG rule results

### E) Widget Intelligence

**Updated Endpoints**:

1. **GET /api/widget/guidance**:
   - Enriched with vision findings
   - `keyActions` includes probable Next/Submit buttons detected visually
   - Vision findings converted to actionable guidance

2. **GET /api/widget/issues**:
   - Includes section: "Potential accessibility blockers detected visually"
   - User-friendly explanations (not compliance claims)
   - Severity mapping: critical/important/minor

## Configuration

### Environment Variables

**Enable/Disable Vision**:
```env
VISION_ENABLED=true  # Default: true
```

**Enable OCR** (optional):
```env
VISION_OCR_ENABLED=true  # Default: false
```

## Integration Points

### 1. Page Capture (`apps/scanner/src/crawler/page-capture.ts`)

Vision analysis runs **during page capture** while Playwright page context is available:

```typescript
// After capturing screenshot, HTML, and a11y snapshot
if (config.vision.enabled) {
  const visionAnalyzer = new VisionAnalyzer();
  const visionFindings = await visionAnalyzer.analyzePage(
    page,
    pageNumber,
    finalUrl,
    outputDir
  );
  
  if (visionFindings.length > 0) {
    visionPath = await visionAnalyzer.saveFindings(visionFindings, pageNumber, outputDir);
    result.visionPath = visionPath;
  }
}
```

### 2. Report Generation (`apps/scanner/src/runner/report-generator.ts`)

Vision findings are loaded and converted to rule results:

```typescript
// Load and convert vision findings to rule results
const visionRuleResults = await this.loadVisionFindings(page, scanId);

results.push({
  pageNumber: page.pageNumber,
  url: page.url,
  ruleResults: [...ruleResults, ...visionRuleResults],
});
```

### 3. Widget Guidance (`apps/scanner/src/api/widget-guidance.ts`)

Vision findings enrich guidance and issues:

```typescript
// Enrich key actions with vision findings
if (artifact.visionPath && scanId) {
  const visionFindings = await loadVisionFindings(artifact.visionPath);
  keyActions = enrichKeyActionsWithVision(keyActions, visionFindings);
}

// Add vision findings as issues
if (artifact.visionPath && scanId) {
  const visionFindings = await loadVisionFindings(artifact.visionPath);
  const visionIssues = convertVisionFindingsToIssues(visionFindings);
  issues.push(...visionIssues);
}
```

## File Structure

```
output/
└── scan_1234567890_abc123/
    ├── report.json
    └── pages/
        ├── 1/
        │   ├── page.json
        │   ├── page.html
        │   ├── screenshot.png
        │   ├── a11y.json
        │   └── vision/
        │       ├── vision.json
        │       ├── vision-1-1234567890-abc123.png
        │       └── vision-1-1234567890-def456.png
        └── 2/
            └── ...
```

## Constraints

✅ **Do not claim compliance**: Vision findings are marked as `needs_review` by default  
✅ **Additive**: Vision does not break existing pipeline  
✅ **Feature flag**: Can be disabled via `VISION_ENABLED=false`  
✅ **Optional OCR**: OCR is opt-in via `VISION_OCR_ENABLED=true`  
✅ **Error handling**: Vision failures don't crash page capture  

## Dependencies

- **tesseract.js**: Optional dependency for OCR (only used if `VISION_OCR_ENABLED=true`)
  - Installed but build scripts ignored (requires native compilation)
  - OCR gracefully fails if library not available

## Testing

To test vision analysis:

1. Start scanner: `pnpm scanner:dev`
2. Run scan with vision enabled (default)
3. Check `output/{scanId}/pages/{n}/vision/vision.json` for findings
4. Verify findings appear in `report.json` as rule results
5. Test widget endpoints to see enriched guidance/issues

## Future Enhancements

- Additional finding types (text_contrast_risk, focus_indicator_missing_visual)
- Improved OCR accuracy
- Machine learning for better detection
- Visual regression detection
- Screenshot comparison

