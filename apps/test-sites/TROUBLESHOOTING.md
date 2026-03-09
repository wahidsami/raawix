# Troubleshooting Test Sites

## Widget Not Working

### Check 1: Widget File Exists
```powershell
Test-Path apps\test-sites\public\widget.iife.js
```

If missing, rebuild and copy:
```powershell
pnpm --filter widget build
Copy-Item apps\widget\dist\widget.iife.js -Destination apps\test-sites\public\widget.iife.js -Force
```

### Check 2: Browser Console
Open browser DevTools (F12) and check Console tab for errors:
- `Failed to load resource: /widget.iife.js` → File not found
- `Uncaught TypeError` → Widget code error
- No errors but widget not visible → Check if script loaded

### Check 3: Network Tab
In DevTools Network tab, verify:
- `widget.iife.js` loads with status 200
- File size matches (should be ~14-15 KB)

### Check 4: Widget Initialization
In browser console, type:
```javascript
window.raawiAccessibilityWidget
```

Should return the widget instance. If `undefined`, widget didn't initialize.

### Check 5: Script Loading
Verify script tag is in DOM:
```javascript
document.querySelector('script[src="/widget.iife.js"]')
```

Should return the script element.

## Scanner Not Starting

### Error: Cannot find package 'jsdom'
**Fixed:** Added `jsdom` to `apps/scanner/package.json` dependencies.

If still seeing error:
```powershell
cd apps/scanner
pnpm install
```

### Error: Port 3001 already in use
Kill the process:
```powershell
# Find process
Get-NetTCPConnection -LocalPort 3001 | Select-Object OwningProcess

# Kill it (replace PID with actual process ID)
Stop-Process -Id <PID> -Force
```

## Test Sites Not Loading

### Error: Cannot GET /
Make sure test sites server is running:
```powershell
pnpm test-sites:dev
```

Should see: `VITE v5.x.x  ready in xxx ms`

### Error: 404 on /good or /messy
Check routes are defined in `src/main.tsx`:
- `/` → App component
- `/good` → GoodPage component
- `/messy` → MessyPage component

## Common Issues

### Widget Button Not Visible
1. Check z-index conflicts (widget uses z-index 9998/9999)
2. Check if CSS is injected (look for `#raawi-accessibility-styles` in `<head>`)
3. Check browser console for JavaScript errors

### Widget Panel Not Opening
1. Check if button click handler is attached
2. Check browser console for errors
3. Verify panel element exists in DOM:
   ```javascript
   document.querySelector('.raawi-accessibility-panel')
   ```

### Widget Settings Not Applying
1. Check if CSS variables are set on `:root`
2. Check browser console for errors
3. Verify settings object:
   ```javascript
   window.raawiAccessibilityWidget.settings
   ```

## Debug Steps

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Hard refresh** (Ctrl+F5)
3. **Check browser console** for errors
4. **Verify file paths** are correct
5. **Restart dev servers** (scanner and test-sites)
6. **Rebuild widget** if code changed:
   ```powershell
   pnpm --filter widget build
   Copy-Item apps\widget\dist\widget.iife.js -Destination apps\test-sites\public\widget.iife.js -Force
   ```

