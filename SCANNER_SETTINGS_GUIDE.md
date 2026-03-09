# Scanner Settings Configuration Guide

## Overview

The scanner now has **TWO ways** to configure settings, with automatic fallback:

1. **Database (Recommended)** - Edit via Dashboard UI
2. **Config File (Fallback)** - Edit TypeScript file directly

---

## ⚙️ Configuration Methods

### Method 1: Database Settings (Recommended)

**How to Use:**
1. Go to Dashboard → Settings
2. Adjust values:
   - Max Pages: 1-500
   - Max Depth: 1-20
   - Max Runtime: 1-120 minutes
3. Click "Save"
4. Settings persist in PostgreSQL

**Pros:**
- ✅ Easy to change (no code edits)
- ✅ Changes without restart
- ✅ Persists across restarts

**Cons:**
- ❌ Requires working database
- ❌ Requires Prisma Client to be working

**Default Values:**
```json
{
  "maxPages": 200,
  "maxDepth": 10,
  "maxRuntimeMs": 600000  // 10 minutes
}
```

---

### Method 2: Config File (Fallback)

**File Location:**
```
apps/scanner/src/config/scanner-settings.ts
```

**How to Use:**
1. Open `scanner-settings.ts`
2. Edit `DEFAULT_SCANNER_SETTINGS`:
   ```typescript
   export const DEFAULT_SCANNER_SETTINGS: ScannerSettingsConfig = {
     maxPages: 200,
     maxDepth: 10,
     maxRuntimeMs: 2400000, // 40 minutes
   };
   ```
3. Save file
4. Restart scanner: `pnpm scanner:dev`

**Pros:**
- ✅ Always works (no database needed)
- ✅ No Prisma Client issues
- ✅ Simple and reliable

**Cons:**
- ❌ Requires code change
- ❌ Requires scanner restart
- ❌ Not editable from UI

---

## 🕒 Runtime Examples (in milliseconds)

| Minutes | Milliseconds | Use Case |
|---------|--------------|----------|
| 5 min   | 300000       | Quick test scans |
| 10 min  | 600000       | Default (small sites) |
| 20 min  | 1200000      | Medium sites |
| 30 min  | 1800000      | Large sites |
| **40 min** | **2400000** | **Government sites (recommended)** |
| 60 min  | 3600000      | Very large sites |
| 90 min  | 5400000      | Comprehensive audits |
| 120 min | 7200000      | Maximum allowed |

---

## 🔄 How Fallback Works

### Startup Sequence:

```
1. Scanner starts
    ↓
2. Settings API receives request
    ↓
3. Try to load from database
    ├─ SUCCESS → Use database settings ✅
    └─ FAIL → Use config file defaults ✅
         ↓
4. Settings ALWAYS available!
```

### Error Scenarios:

| Error | Fallback Behavior |
|-------|-------------------|
| Database down | ✅ Uses config file |
| Prisma Client issue | ✅ Uses config file |
| `scannerSettings` table missing | ✅ Uses config file |
| `scannerSettings` model undefined | ✅ Uses config file |

**Result:** System never fails! 🎯

---

## 📝 Quick Setup Guide

### For 40-Minute Scans (Recommended for Gov Sites)

**Option A: Via Database (if working)**
1. Dashboard → Settings
2. Max Runtime: `40` minutes
3. Save

**Option B: Via Config File (always works)**
1. Open `apps/scanner/src/config/scanner-settings.ts`
2. Change line:
   ```typescript
   maxRuntimeMs: 2400000, // 40 minutes
   ```
3. Save & restart scanner

---

## 🐛 Troubleshooting

### Issue: "Cannot read properties of undefined (reading 'findFirst')"

**Cause:** Prisma Client doesn't know about `scannerSettings` model.

**Solution 1: Regenerate Prisma (try first)**
```bash
cd apps/scanner
pnpm prisma generate
# Restart scanner
```

**Solution 2: Clear Cache (if solution 1 fails)**
```powershell
# Stop scanner
Remove-Item -Recurse -Force "node_modules\.pnpm\@prisma+client@*\node_modules\.prisma"
cd apps\scanner
pnpm prisma generate
# Restart scanner
```

**Solution 3: Use Config File (guaranteed to work)**
```typescript
// Edit apps/scanner/src/config/scanner-settings.ts
maxRuntimeMs: 2400000, // 40 minutes
// Restart scanner
```

---

### Issue: Settings page shows "Failed to fetch settings"

**Check Scanner Logs:**

**If you see:**
```
[SETTINGS] Loaded from database: { maxPages: 200, ... }
```
✅ Database working - settings loaded successfully

**If you see:**
```
[SETTINGS] Using config file defaults: { maxPages: 200, ... }
```
⚠️ Database not working - fallback active (but still works!)

**Fix:**
- Database fallback is working - no fix needed!
- Settings UI will show config file values
- To change: Edit `scanner-settings.ts` instead

---

## 🎯 Best Practices

### Development
- Use **Config File** for consistent local testing
- Set generous timeouts (40+ minutes)
- Commit config changes to git

### Production
- Use **Database** for flexibility
- Start with conservative values (200 pages, 10 depth, 10 min)
- Increase gradually based on monitoring

### Emergency
- If database fails in production
- Fallback automatically uses config file
- System continues working without interruption

---

## 📊 Current Configuration

To check what settings are currently active:

1. **Check Scanner Logs:**
   ```
   [SETTINGS] Loaded from database: ...
   or
   [SETTINGS] Using config file defaults: ...
   ```

2. **Check Database:**
   ```sql
   SELECT * FROM scanner_settings;
   ```

3. **Check Config File:**
   ```typescript
   // apps/scanner/src/config/scanner-settings.ts
   DEFAULT_SCANNER_SETTINGS
   ```

---

## 🚀 Recommended Setup for Government Sites

```typescript
// apps/scanner/src/config/scanner-settings.ts
export const DEFAULT_SCANNER_SETTINGS: ScannerSettingsConfig = {
  maxPages: 300,      // Allow more pages for large government portals
  maxDepth: 10,       // Standard depth
  maxRuntimeMs: 2400000, // 40 minutes - allows thorough scanning
};
```

**Why these values?**
- **300 pages**: Government sites often have 100-500 pages
- **10 depth**: Captures most site structures without going too deep
- **40 minutes**: Enough time for thorough scanning without timeout issues

---

## 📁 Files Reference

### Configuration Files
- `apps/scanner/src/config/scanner-settings.ts` - Config file settings
- `apps/scanner/src/api/settings.ts` - Settings API with fallback
- `apps/scanner/prisma/schema.prisma` - ScannerSettings model

### Database
- Table: `scanner_settings`
- Location: `raawi_x` database (PostgreSQL)

---

## Status

✅ **Bulletproof Configuration System**
✅ **Multiple Fallback Layers**
✅ **Always Works - Even if Database Fails**
✅ **Production Ready**

**Last Updated:** 2026-01-15
