# Raawi X Widget E2E Tests

End-to-end tests for the Raawi X Widget using Playwright.

## Setup

1. Install Playwright browsers:
```bash
pnpm exec playwright install --with-deps
```

2. Ensure test sites are running (or let Playwright start them automatically):
```bash
pnpm test-sites:dev
```

## Running Tests

### Run all tests:
```bash
pnpm test:widget:e2e
```

### Run with UI (interactive):
```bash
pnpm test:widget:e2e:ui
```

### Run specific test:
```bash
pnpm exec playwright test widget.spec.ts -g "should open widget"
```

## Test Structure

Tests are organized by feature:

- **E1: Smoke** - Basic widget open/close functionality
- **E2: Locale + Direction** - RTL/LTR switching and launcher position
- **E3: Presets** - Blind, Low Vision, Dyslexia presets
- **E4: Assist Tools** - Describe Image, Describe Focused Element, What Can I Do Here
- **E5: Reading Guide / Mask** - Reading assistance features
- **E6: Stop Animations** - Animation control
- **E7: Form Assistant** - Form detection and visibility
- **E8: Voice Language Binding** - Arabic/English voice switching

## E2E Mode

Tests run with `?e2e=1` query parameter, which enables:

- Voice mocking (no mic permissions needed)
- `window.RaawiE2E.injectTranscript(text)` - Simulate voice input
- `window.RaawiE2E.getSpokenLog()` - Get all spoken text
- `window.RaawiE2E.clearSpokenLog()` - Clear spoken log

## Test Results

After running tests, you'll find:

- **HTML Report**: `test-results/html-report/index.html`
- **JSON Results**: `test-results/results.json`
- **Summary**: `test-results/raawi-widget-summary.json`

## Test Selectors

All widget elements use `data-testid` attributes for stable selectors:

- `raawi-launcher` - Widget launcher button
- `raawi-panel` - Widget panel
- `raawi-close` - Close button
- `raawi-lang-switch` - Language switcher
- `raawi-tab-*` - Tab buttons
- `raawi-tool-*` - Tool buttons
- `raawi-preset-*` - Preset buttons
- `raawi-reading-mask-overlay` - Reading mask overlay
- `raawi-reading-guide-overlay` - Reading guide overlay

## Troubleshooting

### Tests fail with "element not found"
- Ensure widget is built: `pnpm --filter widget build`
- Ensure widget is copied to test sites: `cp apps/widget/dist/widget.iife.js apps/test-sites/public/`
- Check that test sites are running on port 4173

### Voice tests fail
- Ensure E2E mode is enabled (tests add `?e2e=1` automatically)
- Check browser console for `[RaawiX Widget E2E]` logs

### Screenshots not generated
- Screenshots are only generated on test failure
- Check `test-results/` directory for failure screenshots

