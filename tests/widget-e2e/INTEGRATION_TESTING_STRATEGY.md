# Raawi X Widget Integration Testing Strategy

## The Problem

The Raawi X Widget is **NOT** a standalone tool. It's part of a **3-Layer System**:

1. **Layer 1**: DOM/HTML capture (scanner extracts page structure)
2. **Layer 2**: Vision analysis (AI analyzes screenshots for missing labels, issues)
3. **Layer 3**: Assistive Map (enriched metadata: label overrides, image descriptions, action intents, form plans)

The widget's intelligence comes from **Layer 3 data** (Assistive Maps), not just DOM parsing.

## Why Previous Tests Were Inadequate

The original E2E tests (`widget.spec.ts`) were **shallow smoke tests**:
- ✅ Verified UI elements exist
- ✅ Verified buttons can be clicked
- ❌ **Did NOT verify** that widget uses scan data
- ❌ **Did NOT verify** data source priority (Assistive Map > DOM)
- ❌ **Did NOT verify** that enriched descriptions are used
- ❌ **Did NOT test** the full integration flow

## New Integration Testing Approach

### Test File: `integration.spec.ts`

These tests **mock the scanner API** (`/api/widget/page-package`) to simulate:
- ✅ Scan data available (Assistive Map with enriched labels/descriptions)
- ✅ Scan data missing (fallback to DOM)
- ✅ API errors (graceful degradation)
- ✅ Data source priority verification

### What These Tests Verify

#### 1. **Assistive Map Priority** ✅
- When scan data exists, widget uses enriched descriptions
- Image descriptions come from Vision/Gemini analysis, not just DOM `alt` text
- Label overrides come from scan analysis, not messy DOM labels

#### 2. **DOM Fallback** ✅
- When scan data missing, widget gracefully falls back to DOM
- Widget doesn't break when API fails
- Basic functionality works without scan data

#### 3. **Data Source Priority** ✅
- Assistive Map data **always** takes priority over DOM
- When both exist, enriched data is used
- Fallback chain: Assistive Map → DOM → Default message

#### 4. **Full Feature Coverage** ✅
- **Image Descriptions**: Uses scan-enriched descriptions
- **Label Overrides**: Uses scan-enriched labels for focused elements
- **Key Actions**: Uses scan-generated `guidance.keyActions`
- **Form Plans**: Uses scan-generated form metadata
- **Error Handling**: Gracefully handles API failures

## Test Structure

Each test:
1. **Mocks API response** with realistic Assistive Map data
2. **Navigates to test page** (`/good` or `/messy`)
3. **Waits for widget to fetch** page-package data
4. **Triggers widget feature** (describe image, describe focused element, etc.)
5. **Verifies result** contains scan-enriched data (not just DOM data)

## Example Test Flow

```typescript
test('should use assistive map image description', async ({ page }) => {
  // 1. Mock API to return Assistive Map with enriched image description
  await page.route('**/api/widget/page-package*', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({
        assistiveMap: {
          imageDescriptions: {
            'img-1': {
              description: {
                en: 'A beautiful sunset over mountains', // Enriched, not just DOM alt
                ar: 'غروب الشمس الجميل فوق الجبال'
              },
              confidence: 'high',
              source: 'vision'
            }
          }
        }
      })
    });
  });

  // 2. Navigate and open widget
  await page.goto('/good?e2e=1');
  await page.click('[data-testid="raawi-launcher"]');

  // 3. Trigger feature
  await page.click('[data-testid="raawi-tool-describe-image"]');

  // 4. Verify: Description should be enriched (from scan), not just DOM alt
  const spokenLog = await page.evaluate(() => {
    return (window as any).RaawiE2E.getSpokenLog();
  });
  
  expect(lastSpoken).toContain('sunset'); // Enriched description
  expect(lastSpoken).not.toBe('placeholder'); // Not just DOM alt
});
```

## Running Integration Tests

```bash
# Run all tests (including integration)
pnpm test:widget:e2e

# Run only integration tests
pnpm exec playwright test integration.spec.ts

# Run with UI
pnpm test:widget:e2e:ui
```

## Future Enhancements

### 1. **Real Scan Data Tests**
Instead of mocking, use actual scan data:
- Run a real scan on test pages
- Use that scan's Assistive Map data in tests
- Verify widget correctly uses real scan output

### 2. **End-to-End Flow Tests**
Test the complete flow:
- Start scan → Wait for completion → Widget fetches data → Widget uses data
- Verify Layer 1 → Layer 2 → Layer 3 → Widget integration

### 3. **Performance Tests**
- Measure API fetch time
- Measure widget initialization time
- Verify caching works correctly

### 4. **Multi-Page Tests**
- Test widget across multiple pages in same scan
- Verify URL matching works correctly
- Verify fingerprint matching works

## Key Insight

**The widget is only as smart as the scan data it receives.**

Without scan data (Layer 3), the widget is just a basic DOM parser. With scan data, it becomes an intelligent accessibility assistant that understands:
- What images actually show (Vision analysis)
- What buttons actually do (Action intents)
- What forms actually collect (Form plans)
- What labels are actually correct (Label overrides)

The integration tests verify that this intelligence is **actually used** when available.

