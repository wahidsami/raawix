# WCAG Rules Implementation (MVP)

## ✅ Implemented Rules

### 1. WCAG 1.1.1 (Level A): Non-text Content - Alt Text

**Rule ID**: `wcag-1.1.1`

**Description**: All images must have alt text unless decorative.

**Logic**:
- Finds all `<img>` elements
- Checks if image is decorative:
  - `role="presentation"` or `role="none"` → decorative
  - `aria-hidden="true"` → decorative
- For decorative images: requires `alt=""` (or no alt)
- For non-decorative images: requires non-empty `alt` text

**Evidence**:
- `selector`: CSS selector for the image
- `value`: outerHTML snippet (first 300 chars)
- `description`: Reason for violation

**Status**:
- `pass`: All images have appropriate alt text
- `fail`: Non-decorative images missing alt, or decorative images with alt text
- `na`: HTML not available

**Confidence**: `high` (automated, deterministic)

---

### 2. WCAG 2.4.2 (Level A): Page Titled

**Rule ID**: `wcag-2.4.2`

**Description**: HTML document must have a title element with non-empty text.

**Logic**:
- Checks for `<title>` element in document
- Verifies title text is non-empty (after trimming)

**Evidence**:
- `type`: 'text' (on pass) or 'html' (on fail)
- `value`: Title text or HTML snippet
- `description`: Status description

**Status**:
- `pass`: Title exists and is non-empty
- `fail`: Title missing or empty
- `na`: HTML not available

**Confidence**: `high` (automated, deterministic)

---

### 3. WCAG 3.1.1 (Level A): Language of Page

**Rule ID**: `wcag-3.1.1`

**Description**: HTML document must have a lang attribute on the html element.

**Logic**:
- Checks `<html>` element for `lang` attribute
- Verifies `lang` value is non-empty (after trimming)

**Evidence**:
- `type`: 'html'
- `value`: HTML tag snippet (e.g., `<html lang="en">`)
- `description`: Status description

**Status**:
- `pass`: `lang` attribute present and non-empty
- `fail`: `lang` attribute missing or empty
- `na`: HTML not available

**Confidence**: `high` (automated, deterministic)

---

### 4. WCAG 4.1.2 (Level A): Name, Role, Value - Accessible Name for Form Controls

**Rule ID**: `wcag-4.1.2`

**Description**: All form controls (input, select, textarea) must have accessible names.

**Logic**:
- Checks all `input`, `select`, `textarea` elements
- Verifies accessible name via:
  1. Associated `<label for="id">` (if control has `id`)
  2. Wrapped `<label>` element
  3. `aria-label` attribute (non-empty)
  4. `aria-labelledby` pointing to element with text content

**Evidence**:
- `selector`: CSS selector for the control
- `value`: outerHTML snippet (first 300 chars)
- `description`: Reason why accessible name is missing

**Status**:
- `pass`: All form controls have accessible names
- `fail`: Form controls missing accessible names
- `na`: HTML not available

**Confidence**: `high` (automated, deterministic)

---

### 5. WCAG 2.4.4 (Level A): Link Purpose (Basic)

**Rule ID**: `wcag-2.4.4`

**Description**: Links must have discernible purpose. Flags generic link text.

**Logic**:
- Checks all `<a href>` elements
- Skips links with `aria-label` (that's the accessible name)
- Matches link text against generic patterns:
  - English: "click here", "here", "more", "read more", "link", "this", "that", "see more", "continue", "next", "previous", "prev"
  - Arabic: "المزيد" (more), "اقرأ المزيد" (read more)
- Includes nearby context (parent element text) in evidence

**Evidence**:
- `selector`: CSS selector for the link
- `value`: outerHTML snippet (first 300 chars)
- `description`: Link text, href, and nearby context snippet

**Status**:
- `pass`: No generic link text found
- `needs_review`: Generic link text detected (heuristic)
- `na`: HTML not available

**Confidence**: `medium` (heuristic-based, requires manual review)

---

## Evidence Structure

All rules provide strong evidence in the `EvidenceItem[]` format:

```typescript
{
  type: 'element' | 'screenshot' | 'html' | 'text' | 'url',
  value: string,           // HTML snippet, text content, etc.
  selector?: string,       // CSS selector for element
  description?: string    // Additional context
}
```

## Status Accuracy

Rules return accurate statuses based on confidence:

- **`pass`**: High confidence - rule passes
- **`fail`**: High confidence - rule fails (automated)
- **`needs_review`**: Medium/low confidence - requires manual review (heuristic)
- **`na`**: Not applicable (e.g., HTML not available)

## Rule Confidence Levels

- **High confidence** (`high`): Automated, deterministic checks
  - WCAG 1.1.1, 2.4.2, 3.1.1, 4.1.2
- **Medium confidence** (`medium`): Heuristic-based checks
  - WCAG 2.4.4 (link purpose)

## Usage

All rules are automatically included in scans via `allWcagRules` export:

```typescript
import { allWcagRules, RuleEngine } from '@raawi-x/rules';

const engine = new RuleEngine();
engine.registerRules(allWcagRules);

// Evaluate rules on a page
const results = await engine.evaluatePage(pageArtifact);
```

## Example Evidence Output

### WCAG 1.1.1 (Fail)
```json
{
  "ruleId": "wcag-1.1.1",
  "status": "fail",
  "confidence": "high",
  "evidence": [
    {
      "type": "element",
      "value": "<img src=\"photo.jpg\" class=\"hero-image\">",
      "selector": "img.hero-image",
      "description": "Non-decorative image missing alt text"
    }
  ]
}
```

### WCAG 2.4.4 (Needs Review)
```json
{
  "ruleId": "wcag-2.4.4",
  "status": "needs_review",
  "confidence": "medium",
  "evidence": [
    {
      "type": "element",
      "value": "<a href=\"/article\">more</a>",
      "selector": "a",
      "description": "Generic link text \"more\" may lack context. Nearby text: \"Read our latest article about accessibility...\""
    }
  ]
}
```

## Implementation Notes

1. **Decorative Image Detection**: Uses `role="presentation"`, `role="none"`, or `aria-hidden="true"` as heuristics
2. **Accessible Name Resolution**: Checks multiple methods (label, aria-label, aria-labelledby) in order
3. **Generic Link Text**: Pattern matching with case-insensitive regex, includes Arabic patterns
4. **Evidence Quality**: All evidence includes selectors and HTML snippets for easy debugging
5. **Error Handling**: Rules gracefully handle missing HTML and return `na` status

