# Testing Widget Functionality

## Quick Test in Browser Console

Open browser console (F12) and run these commands to test widget:

```javascript
// 1. Check if widget loaded
const widget = window.raawiAccessibilityWidget;
console.log('Widget:', widget);

// 2. Check if elements exist
console.log('Text increase button:', document.getElementById('raawi-text-increase'));
console.log('Text decrease button:', document.getElementById('raawi-text-decrease'));
console.log('Contrast toggle:', document.getElementById('raawi-contrast-toggle'));

// 3. Test text size directly
widget.adjustTextSize(0.2);
console.log('Text size after increase:', widget.settings.textSize);

// 4. Check if CSS variable is set
const root = document.documentElement;
console.log('CSS variable --raawi-text-size:', getComputedStyle(root).getPropertyValue('--raawi-text-size'));
console.log('Has data attribute:', root.hasAttribute('data-raawi-text-size'));

// 5. Test contrast mode
widget.setContrastMode(true);
console.log('Contrast mode:', widget.settings.contrastMode);
console.log('Has contrast attribute:', root.hasAttribute('data-raawi-contrast-mode'));

// 6. Manually trigger click event
const btn = document.getElementById('raawi-text-increase');
if (btn) {
  btn.click();
  console.log('Button clicked, text size now:', widget.settings.textSize);
}
```

## Expected Behavior

1. **Text Size Controls:**
   - Clicking +/- should change `widget.settings.textSize`
   - CSS variable `--raawi-text-size` should update
   - `data-raawi-text-size` attribute should appear on `<html>`
   - Page text should visibly resize

2. **Line Spacing Controls:**
   - Clicking +/- should change `widget.settings.lineSpacing`
   - CSS variable `--raawi-line-spacing` should update
   - `data-raawi-line-spacing` attribute should appear on `<html>`
   - Line spacing should visibly change

3. **Contrast Mode:**
   - Toggling should change `widget.settings.contrastMode`
   - `data-raawi-contrast-mode="true"` should appear on `<html>`
   - Page should change to high contrast colors

4. **Focus Highlight:**
   - Toggling should change `widget.settings.focusHighlight`
   - `data-raawi-focus-highlight="true"` should appear on `<html>`
   - Focused elements should show strong red outline

5. **Reading Mode:**
   - Toggling should change `widget.settings.readingMode`
   - `data-raawi-reading-mode="true"` should appear on `<html>`
   - Navigation, ads, sidebar should hide

## Debugging Steps

If controls don't work:

1. **Check event listeners:**
   ```javascript
   const btn = document.getElementById('raawi-text-increase');
   console.log('Button:', btn);
   console.log('Event listeners:', getEventListeners(btn)); // Chrome DevTools
   ```

2. **Check if widget methods exist:**
   ```javascript
   console.log('adjustTextSize:', typeof widget.adjustTextSize);
   console.log('applySettings:', typeof widget.applySettings);
   ```

3. **Manually call methods:**
   ```javascript
   widget.adjustTextSize(0.2);
   widget.applySettings();
   ```

4. **Check CSS:**
   ```javascript
   const style = document.getElementById('raawi-accessibility-styles');
   console.log('Style element:', style);
   console.log('Style content length:', style?.textContent?.length);
   ```

5. **Check for React interference:**
   - React might be preventing event propagation
   - Try clicking buttons directly in Elements panel
   - Check if React DevTools shows event handlers

## Common Issues

### Event Listeners Not Attached
- Widget might initialize before DOM is ready
- React might be interfering
- Check browser console for errors

### CSS Not Applied
- Check if style element exists in `<head>`
- Check if CSS variables are set on `<html>`
- Check if page CSS is overriding with higher specificity

### Methods Not Working
- Check if `this` context is preserved
- Check if settings object is updating
- Check browser console for errors

