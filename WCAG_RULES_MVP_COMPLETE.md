# WCAG Rules MVP - Complete Implementation

## ✅ All 10 WCAG Rules Implemented

### Rules 1-5 (Previously Implemented)
1. **WCAG 1.1.1 (A)**: Non-text Content - Alt Text
2. **WCAG 2.4.2 (A)**: Page Titled
3. **WCAG 3.1.1 (A)**: Language of Page
4. **WCAG 4.1.2 (A)**: Name, Role, Value - Accessible Name for Form Controls
5. **WCAG 2.4.4 (A)**: Link Purpose (Basic)

### Rules 6-10 (Newly Implemented)

---

## 6. WCAG 2.4.7 (Level A): Focus Visible

**Rule ID**: `wcag-2.4.7`

**Description**: All focusable elements must have visible focus indicators.

**Implementation**:
- Detects all focusable elements (a[href], button, input, select, textarea, [tabindex], [contenteditable])
- Samples up to 30 elements
- Checks for visible focus indicators via:
  - Inline `outline` styles
  - Inline `border` styles
  - Inline `box-shadow` styles
- Heuristic: Checks inline styles (CSS :focus rules require computed styles)

**Evidence**:
- `selector`: CSS selector for element
- `value`: outerHTML snippet (300 chars)
- `description`: Which focus indicator methods were checked

**Status Logic**:
- `pass`: ≥70% of sampled elements have indicators
- `fail`: None of sampled elements have indicators
- `needs_review`: Some elements missing indicators
- `na`: No focusable elements or HTML unavailable

**Confidence**: `medium` (heuristic-based, limited to inline styles)

**Limitations**:
- Cannot detect CSS :focus rules from stylesheets (requires computed styles)
- Best-effort using inline styles only
- For full accuracy, requires Playwright page evaluation

---

## 7. WCAG 2.1.1 (Level A): Keyboard Reachable (Heuristic)

**Rule ID**: `wcag-2.1.1`

**Description**: All interactive elements should be keyboard accessible via Tab navigation.

**Implementation**:
- Finds all focusable elements
- Checks for `tabindex="-1"` (unreachable via Tab)
- Builds focus sequence list
- Heuristic: Flags if very few focusable elements (< 3)

**Evidence**:
- `type`: 'text'
- `value`: Focus sequence (selectors/tagNames)
- `description`: Number of focusable elements or specific issues

**Status Logic**:
- `pass`: Multiple focusable elements found, no tabindex="-1" issues
- `needs_review`: Very few focusable elements or elements with tabindex="-1"
- `na`: No focusable elements or HTML unavailable

**Confidence**: `medium` (heuristic, cannot simulate actual Tab navigation)

**Limitations**:
- Cannot actually simulate Tab key presses
- Cannot detect JavaScript-based focus management
- Best-effort static analysis

---

## 8. WCAG 2.1.2 (Level A): No Keyboard Trap

**Rule ID**: `wcag-2.1.2`

**Description**: Focus should not get trapped in a region without escape route.

**Implementation**:
- Detects modals/dialogs (`[role="dialog"]`, `.modal`, etc.)
- Checks for escape mechanisms (close buttons, Escape key handlers)
- Flags regions with many focusable elements but no exit
- Heuristic: Looks for patterns that might trap focus

**Evidence**:
- `selector`: CSS selector for modal/region
- `value`: outerHTML snippet
- `description`: Number of focusable elements and escape mechanism status

**Status Logic**:
- `pass`: No obvious keyboard traps detected
- `needs_review`: Potential traps found (modals without escape, regions with many focusables)
- `na`: No focusable elements or HTML unavailable

**Confidence**: `low` (heuristic, cannot simulate actual Tab navigation)

**Limitations**:
- Cannot detect JavaScript-based focus traps
- Cannot verify Escape key handlers
- Best-effort pattern matching

---

## 9. WCAG 1.4.3 (Level AA): Contrast Minimum

**Rule ID**: `wcag-1.4.3`

**Description**: Text must have contrast ratio of at least 4.5:1 for normal text.

**Implementation**:
- Samples up to 50 text elements (p, span, div, headings, a, li, td, th, label)
- Parses colors from inline styles (hex, rgb, rgba, named colors)
- Calculates contrast ratio using WCAG formula
- Checks font size (heuristic for large text - 18px+ or 14px+ bold)

**Evidence**:
- `selector`: CSS selector for element
- `value`: outerHTML snippet
- `description`: Contrast ratio, text color, background color

**Status Logic**:
- `pass`: All sampled elements meet 4.5:1 ratio
- `fail`: Elements below 4.5:1 (normal text)
- `needs_review`: Cannot determine colors or large text detected
- `na`: HTML unavailable

**Confidence**: `medium` (limited to inline styles, cannot access computed styles)

**Limitations**:
- Only checks inline styles (cannot access computed styles from CSS)
- Large text threshold (3:1) not fully implemented (marks as needs_review)
- Cannot handle complex backgrounds (gradients, images)
- Best-effort color parsing

**Contrast Calculation**:
- Uses WCAG 2.1 relative luminance formula
- Supports hex (#rrggbb), rgb/rgba(), and basic named colors
- Ratio = (L1 + 0.05) / (L2 + 0.05) where L1 > L2

---

## 10. WCAG 1.4.10 (Level AA): Reflow

**Rule ID**: `wcag-1.4.10`

**Description**: Content should reflow without horizontal scrolling at 320px viewport width (400% zoom).

**Implementation**:
- Simulates 320px viewport (JSDOM limitation - best effort)
- Checks for fixed pixel widths > 320px
- Checks for min-width > 320px
- Flags `overflow-x: hidden` (may hide scroll issues)

**Evidence**:
- `selector`: CSS selector for element
- `value`: outerHTML snippet
- `description`: Width values that exceed 320px

**Status Logic**:
- `pass`: No obvious reflow issues detected
- `needs_review`: Fixed widths > 320px or overflow-x: hidden found
- `na`: HTML unavailable

**Confidence**: `low` (JSDOM cannot fully simulate viewport, cannot check actual scrollWidth)

**Limitations**:
- JSDOM cannot modify viewport dimensions reliably
- Cannot check `scrollWidth > clientWidth` (requires live browser)
- Only checks inline styles (cannot access CSS media queries)
- Best-effort static analysis

**Note**: For accurate testing, use browser DevTools responsive mode at 320px width.

---

## Utility Functions

### `packages/rules/src/utils/contrast.ts`
- `hexToRgb()`: Parse hex colors
- `rgbStringToRgb()`: Parse rgb/rgba strings
- `getLuminance()`: Calculate relative luminance
- `getContrastRatio()`: Calculate WCAG contrast ratio
- `parseColor()`: Best-effort color parsing

### `packages/rules/src/utils/focus.ts`
- `getFocusableElements()`: Find all focusable elements (heuristic)
- `hasFocusIndicator()`: Check for visible focus indicators (heuristic)

---

## Evidence Quality

All rules provide evidence with:
- **Selectors**: CSS selectors for easy element identification
- **HTML Snippets**: Up to 300 characters of outerHTML
- **Descriptive Messages**: Explaining the issue or status
- **Computed Values**: Where applicable (contrast ratios, widths, etc.)

---

## Status Accuracy Summary

| Rule | Confidence | Status Types | Notes |
|------|-----------|--------------|-------|
| 1.1.1 | High | pass/fail | Automated, deterministic |
| 2.4.2 | High | pass/fail | Automated, deterministic |
| 3.1.1 | High | pass/fail | Automated, deterministic |
| 4.1.2 | High | pass/fail | Automated, deterministic |
| 2.4.4 | Medium | pass/needs_review | Heuristic (generic text patterns) |
| 2.4.7 | Medium | pass/fail/needs_review | Heuristic (inline styles only) |
| 2.1.1 | Medium | pass/needs_review | Heuristic (static analysis) |
| 2.1.2 | Low | pass/needs_review | Heuristic (pattern matching) |
| 1.4.3 | Medium | pass/fail/needs_review | Limited to inline styles |
| 1.4.10 | Low | pass/needs_review | JSDOM limitations |

---

## Future Enhancements

For production use, consider:

1. **Playwright Integration**: Pass live page context to rules for:
   - Computed styles (focus indicators, contrast)
   - Actual Tab navigation simulation
   - Real viewport testing
   - Screenshot capture for evidence

2. **CSS Parsing**: Parse stylesheets to:
   - Detect :focus rules
   - Calculate computed colors
   - Check media queries

3. **Enhanced Contrast**: Support:
   - Complex backgrounds (gradients, images)
   - Large text threshold (3:1)
   - Text over images

4. **Keyboard Simulation**: Use Playwright to:
   - Actually press Tab key
   - Detect focus traps
   - Verify keyboard navigation

---

## Usage

All 10 rules are automatically included in scans:

```typescript
import { allWcagRules, RuleEngine } from '@raawi-x/rules';

const engine = new RuleEngine();
engine.registerRules(allWcagRules);

// Evaluate all rules on a page
const results = await engine.evaluatePage(pageArtifact);
```

The rules will generate evidence-rich results in the canonical `report.json` file with appropriate statuses based on confidence levels.

