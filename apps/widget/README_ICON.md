# Widget Icon Setup

The widget uses `RaawixIcon.png` as its button icon instead of the letter "A".

## Quick Setup

1. **Place the icon file** in one of these locations:
   - Project root: `RaawixIcon.png`
   - Widget directory: `apps/widget/RaawixIcon.png`
   - Widget public: `apps/widget/public/RaawixIcon.png`

2. **Run the embed script:**
   ```powershell
   .\apps\widget\embed-icon.ps1
   ```

3. **Rebuild the widget:**
   ```powershell
   pnpm --filter widget build
   ```

4. **Copy to test-sites (if needed):**
   ```powershell
   Copy-Item apps\widget\dist\widget.iife.js -Destination apps\test-sites\public\widget.iife.js -Force
   ```

## Manual Setup

If you prefer to embed the icon manually:

1. Convert the icon to base64:
   ```powershell
   $bytes = [System.IO.File]::ReadAllBytes("RaawixIcon.png")
   $base64 = [Convert]::ToBase64String($bytes)
   $dataUrl = "data:image/png;base64,$base64"
   ```

2. Update `apps/widget/src/widget.ts`:
   - Find the `getIconDataUrl()` method
   - Replace `return '';` with `return '$dataUrl';`

3. Rebuild the widget

## Alternative: Runtime Loading

You can also provide the icon at runtime by setting a window variable before the widget loads:

```javascript
window.RAWI_ICON_DATA_URL = 'data:image/png;base64,...';
```

This is useful for development or if you want to change the icon without rebuilding.

## Icon Requirements

- **Format**: PNG (recommended), JPG, SVG, or GIF
- **Size**: Recommended 60x60px or larger (will be scaled to fit)
- **Style**: No borders needed - the widget handles styling
- **Transparency**: Supported (PNG with alpha channel)

The icon will be displayed in a circular button (60x60px) with a blue background and shadow.

