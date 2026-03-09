# Accessibility Widget Implementation

## ✅ Completed Features

### 1. Embeddable Script
- **Output**: `dist/widget.iife.js` (single file, ~14KB minified, ~3KB gzipped)
- **Format**: IIFE (Immediately Invoked Function Expression)
- **Auto-initialization**: Widget initializes automatically when script loads
- **No dependencies**: Pure JavaScript, no external libraries

### 2. Floating Button
- **Position**: Fixed bottom-right corner
- **Appearance**: Circular blue button with "A" icon
- **Accessibility**:
  - `aria-label`: "Open accessibility options"
  - `aria-expanded`: Tracks panel state
  - `aria-controls`: References panel ID
  - Keyboard operable (Enter/Space)
  - Visible focus indicator

### 3. Accessible Panel
- **Position**: Fixed above button
- **ARIA Attributes**:
  - `role="dialog"`
  - `aria-labelledby`: References title
  - `aria-modal="false"`: Does NOT trap focus
- **Keyboard Navigation**:
  - Tab through all controls
  - Escape closes panel and returns focus to button
  - All controls keyboard accessible
- **No Focus Hijacking**: Panel opens without moving focus

### 4. Accessibility Features

#### Text Size Increase/Decrease
- **Range**: 80% to 200% (0.8x to 2.0x)
- **Implementation**: CSS variable on `:root` → `html` font-size
- **Controls**: +/- buttons with current value display
- **Applied via**: `data-raawi-text-size` attribute + CSS variable

#### Line Spacing Increase/Decrease
- **Range**: 80% to 200% (0.8x to 2.0x)
- **Implementation**: CSS variable for line-height multiplier
- **Controls**: +/- buttons with current value display
- **Applied via**: `data-raawi-line-spacing` attribute + CSS variable

#### Contrast Mode Toggle
- **Implementation**: High contrast theme (black bg, white text, yellow links)
- **Control**: Toggle switch
- **Applied via**: `data-raawi-contrast-mode="true"` attribute
- **CSS Variables**: Uses CSS custom properties for theme colors

#### Focus Highlight Toggle
- **Implementation**: Strong red outline on `:focus-visible` elements
- **Control**: Toggle switch
- **Applied via**: `data-raawi-focus-highlight="true"` attribute
- **Style**: 4px red outline + white border + shadow for visibility

#### Reading Mode Toggle
- **Implementation**: Hides common clutter elements
- **Hidden Elements**:
  - `<nav>`, `<aside>`, `<footer>`
  - `[role="navigation"]`, `[role="complementary"]`, `[role="banner"]`
  - Elements with classes/IDs containing "ad", "ads", "advertisement", "banner"
- **Preserved Elements**:
  - All `<form>` elements and their children
  - `[role="form"]` elements and their children
  - Form inputs, buttons, etc.
- **Applied via**: `data-raawi-reading-mode="true"` attribute
- **Heuristic**: Avoids false positives (e.g., "address", "admin" classes)

### 5. Reset Button
- **Function**: Restores all settings to defaults
- **Defaults**:
  - Text size: 100% (1.0x)
  - Line spacing: 100% (1.0x)
  - Contrast mode: off
  - Focus highlight: off
  - Reading mode: off

## Accessibility Compliance

### ✅ ARIA Support
- All interactive elements have proper ARIA labels
- Panel has `role="dialog"` and `aria-labelledby`
- Button has `aria-expanded` and `aria-controls`
- Toggle switches have descriptive labels

### ✅ Keyboard Navigation
- All controls keyboard accessible
- Tab order is logical
- Enter/Space activate buttons
- Escape closes panel
- Focus indicators visible

### ✅ Screen Reader Support
- Semantic HTML structure
- ARIA labels and descriptions
- No focus hijacking
- Panel is `aria-modal="false"` (doesn't trap focus)
- Screen readers can navigate naturally

### ✅ No Focus Hijacking
- Panel opens without moving focus
- User maintains control of focus
- Escape returns focus to button (optional, not forced)

### ✅ No Semantic Override
- Uses data attributes (not semantic HTML changes)
- CSS-only modifications
- Doesn't alter page structure
- Doesn't claim compliance

## Technical Implementation

### CSS Variables
All features use CSS custom properties for clean application:

```css
:root {
  --raawi-text-size: 1;
  --raawi-line-spacing: 1;
  --raawi-contrast-bg: #000000;
  --raawi-contrast-text: #ffffff;
  --raawi-contrast-link: #ffff00;
}
```

### Data Attributes
Features are applied via HTML data attributes:
- `data-raawi-text-size`
- `data-raawi-line-spacing`
- `data-raawi-contrast-mode="true"`
- `data-raawi-focus-highlight="true"`
- `data-raawi-reading-mode="true"`

### Injected CSS
All styles are injected via a `<style>` element in the document head. This ensures:
- No conflicts with existing styles
- Easy cleanup (remove style element)
- Scoped to widget classes (`.raawi-*`)

## Usage

### Basic Embedding

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Page</title>
</head>
<body>
  <!-- Your page content -->
  
  <!-- Load widget at end of body -->
  <script src="path/to/widget.iife.js"></script>
</body>
</html>
```

The widget auto-initializes when the script loads.

### Manual Initialization (Optional)

If you need to control initialization:

```javascript
// Widget is available as window.raawiAccessibilityWidget
// But it auto-initializes, so manual init is usually not needed
```

## File Structure

```
apps/widget/
├── src/
│   └── widget.ts          # Main widget implementation
├── dist/
│   └── widget.iife.js     # Built embeddable script
├── example.html           # Usage example
└── vite.config.ts         # Build configuration
```

## Build Output

- **File**: `dist/widget.iife.js`
- **Size**: ~14KB (minified), ~3KB (gzipped)
- **Format**: IIFE (self-contained)
- **Dependencies**: None (pure JavaScript)

## Security & Privacy

- **No data collection**: Widget doesn't send any data
- **No external requests**: All functionality is local
- **No tracking**: No analytics or tracking code
- **No cookies**: Doesn't set or read cookies
- **Settings**: Stored in memory only (lost on page refresh)

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires CSS custom properties support
- Requires `:focus-visible` support (with fallback)
- Works with JavaScript enabled

## Limitations & Notes

1. **Reading Mode**: Uses heuristics to identify ads/clutter. May have false positives/negatives.
2. **Form Preservation**: Forms are always visible in reading mode, but complex nested structures may need refinement.
3. **CSS Specificity**: Uses `!important` to override page styles. May conflict with very specific selectors.
4. **Settings Persistence**: Settings are lost on page refresh (by design for privacy).

## Future Enhancements

Potential improvements:
- LocalStorage option for settings persistence
- More granular reading mode controls
- Additional contrast themes
- Font family selection
- Color filter options (for color blindness)

