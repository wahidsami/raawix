# E2E Test Improvements Needed

## Current State: Shallow Tests

The current E2E tests are **smoke tests** - they verify that UI elements exist and that some text appears, but they don't verify the **quality or correctness** of the widget's analysis.

## What's Actually Implemented (But Not Tested)

### 1. Describe Image (`describeImage()`)
**Real Implementation:**
- Finds candidate image (focused or topmost visible)
- **Priority 1**: Checks assistive map for enriched description
- **Priority 2**: Falls back to DOM `alt` text
- **Priority 3**: Handles decorative images (`alt=""`)
- **Priority 4**: Reports "Image without description" if no alt
- Speaks the description using TTS

**Current Test:**
- ✅ Checks if result text exists
- ❌ Doesn't verify correct image was found
- ❌ Doesn't verify assistive map was used
- ❌ Doesn't verify description quality

**Should Test:**
```typescript
test('should describe image with assistive map priority', async ({ page }) => {
  // Setup: Page with image that has assistive map data
  // Action: Click describe image
  // Assert: Description matches assistive map (not just DOM alt)
});

test('should fallback to DOM alt when assistive map missing', async ({ page }) => {
  // Setup: Page with image that has alt but no assistive map
  // Action: Click describe image
  // Assert: Description matches alt text
});

test('should handle decorative images correctly', async ({ page }) => {
  // Setup: Image with alt=""
  // Action: Click describe image
  // Assert: Says "Decorative image" (not empty)
});
```

### 2. Describe Focused Element (`describeFocusedElement()`)
**Real Implementation:**
- Gets `document.activeElement`
- Determines element type (button, link, input, etc.)
- Gets accessible name using `getAccessibleLabel()` which:
  - **Priority 1**: Checks assistive map label overrides
  - **Priority 2**: Uses DOM accessible name (aria-label, aria-labelledby, label[for])
- Adds state information (checked, expanded, disabled, required, invalid)
- For inputs: Checks if required/invalid
- Speaks full description

**Current Test:**
- ✅ Checks if result text exists
- ❌ Doesn't verify element type is correct
- ❌ Doesn't verify accessible name is correct
- ❌ Doesn't verify state information is included

**Should Test:**
```typescript
test('should describe focused button with assistive map label', async ({ page }) => {
  // Setup: Button with messy DOM but assistive map has good label
  // Action: Focus button, click describe
  // Assert: Description includes assistive map label (not DOM label)
});

test('should include state information for checkboxes', async ({ page }) => {
  // Setup: Checkbox that is checked
  // Action: Focus checkbox, click describe
  // Assert: Description includes "checked" state
});

test('should detect required/invalid inputs', async ({ page }) => {
  // Setup: Required input that is invalid
  // Action: Focus input, click describe
  // Assert: Description includes "required" and "invalid" states
});
```

### 3. What Can I Do Here? (`whatCanIDoHere()`)
**Real Implementation:**
- **Priority 1**: Uses `page-package.guidance.keyActions` (from scan)
- **Priority 2**: Merges with assistive map `actionIntents` for context
- **Priority 3**: Falls back to DOM scanning for buttons/links
- Gets context titles (nearest heading, section title)
- Formats as: "{actionLabel} about {contextTitle}."
- Speaks actions with context

**Current Test:**
- ✅ Checks if actions list has items
- ❌ Doesn't verify actions are from scan data
- ❌ Doesn't verify context titles are included
- ❌ Doesn't verify assistive map merging

**Should Test:**
```typescript
test('should use scan-generated keyActions when available', async ({ page }) => {
  // Setup: Page with scan data containing keyActions
  // Action: Click "What can I do here?"
  // Assert: Actions match scan data (not just DOM buttons)
});

test('should include context titles in action descriptions', async ({ page }) => {
  // Setup: Page with actions in sections with headings
  // Action: Click "What can I do here?"
  // Assert: Actions include context like "Submit about Contact Form"
});

test('should merge assistive map actionIntents', async ({ page }) => {
  // Setup: Page with assistive map actionIntents
  // Action: Click "What can I do here?"
  // Assert: Action descriptions use assistive map intents
});
```

## Recommendations

1. **Add Functional Tests**: Test that the analysis is correct, not just that it happens
2. **Test Data Priority**: Verify assistive map > DOM fallback priority
3. **Test Context**: Verify context titles and descriptions are meaningful
4. **Test Edge Cases**: Decorative images, unlabeled elements, missing scan data
5. **Test Integration**: Verify widget uses scan data when available, falls back gracefully

## Priority

**High Priority:**
- Verify assistive map data is used when available
- Verify fallback to DOM works when scan data missing
- Verify context titles are included in "What can I do here?"

**Medium Priority:**
- Verify state information (checked, disabled, required)
- Verify decorative images are handled correctly
- Verify error messages when no data available

**Low Priority:**
- Performance testing (response time)
- Accessibility of test results display
- Voice command integration testing

