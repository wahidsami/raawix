# Debug Widget Issues

## Quick Checks

### 1. Is Widget Loading?
Open browser console (F12) and check:
```javascript
// Should return the widget instance
window.raawiAccessibilityWidget

// Should return the button element
document.querySelector('.raawi-accessibility-button')

// Should return the panel element
document.querySelector('.raawi-accessibility-panel')
```

### 2. Is Widget CSS Injected?
```javascript
// Should return the style element
document.getElementById('raawi-accessibility-styles')
```

### 3. Are Event Listeners Attached?
```javascript
// Get the widget instance
const widget = window.raawiAccessibilityWidget;

// Check if button exists
widget.button

// Check if panel exists
widget.panel

// Check settings
widget.settings
```

### 4. Test Text Size Manually
```javascript
// Get widget
const widget = window.raawiAccessibilityWidget;

// Manually adjust text size
widget.adjustTextSize(0.2);

// Check if attribute is set
document.documentElement.hasAttribute('data-raawi-text-size')

// Check CSS variable
getComputedStyle(document.documentElement).getPropertyValue('--raawi-text-size')
```

### 5. Check Network Tab
- Open DevTools → Network tab
- Reload page
- Look for `widget.iife.js`
- Should show status 200
- Should show file size ~14-15 KB

## Common Issues

### Widget Not Visible
- Check z-index conflicts
- Check if CSS is injected
- Check browser console for errors

### Controls Not Working
- Check if event listeners are attached
- Check browser console for JavaScript errors
- Verify button IDs match in HTML and event listeners

### Text Size Not Changing
- Check if `data-raawi-text-size` attribute is set on `<html>`
- Check if CSS variable `--raawi-text-size` is set
- Check if page CSS is overriding with `!important`
- Try manually setting: `document.documentElement.style.setProperty('--raawi-text-size', '1.5')`

### Scanner API Not Starting
- Check if port 3001 is in use
- Check scanner logs for errors
- Verify `jsdom` is installed: `pnpm --filter scanner install`

