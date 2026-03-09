# Quick Fix: Set 40 Minutes Timeout

## 🎯 EASIEST SOLUTION (Recommended)

Since we're having persistent Prisma Client issues, use the **config file fallback** which works immediately:

### Step 1: Edit Config File

**File:** `apps/scanner/src/config/scanner-settings.ts`

**Line 22-26:** Change `maxRuntimeMs` to `2400000`:

```typescript
export const DEFAULT_SCANNER_SETTINGS: ScannerSettingsConfig = {
  // Maximum number of pages to scan
  maxPages: 200,

  // Maximum crawl depth (how many levels deep to follow links)
  maxDepth: 10,

  // Maximum scan runtime in MILLISECONDS
  // 40 minutes = 2400000 ms (RECOMMENDED for government sites)
  maxRuntimeMs: 2400000, // ← CHANGE THIS LINE
};
```

### Step 2: Restart Scanner

```powershell
# Close scanner terminal (Ctrl+C)
# Then restart:
cd D:\Waheed\RaawiX
pnpm scanner:dev
```

### Step 3: Verify

Check scanner logs for:
```
[SETTINGS] Using config file defaults: { maxPages: 200, maxDepth: 10, maxRuntimeMs: 2400000 }
```

✅ **DONE!** Scans will now run for 40 minutes.

---

## Why This Works

- ❌ **Database settings**: Requires working Prisma Client (currently broken)
- ✅ **Config file settings**: Always works, no dependencies

---

## Runtime Values Reference

```typescript
// Common values:
600000    // 10 minutes
1200000   // 20 minutes
1800000   // 30 minutes
2400000   // 40 minutes ← RECOMMENDED
3600000   // 60 minutes
```

---

## If You Want to Fix Prisma Later

1. **Close scanner completely**
2. Run:
   ```powershell
   cd apps\scanner
   pnpm prisma generate
   pnpm dev
   ```
3. Check if `[SETTINGS] Loaded from database` appears
4. If yes: Use Dashboard → Settings UI
5. If no: Continue using config file (it works!)

---

## Current Status

✅ **Config file system**: Working
❌ **Database system**: Prisma Client issues
✅ **Fallback**: Automatic

**Recommendation:** Use config file for now. It's simple, reliable, and works immediately.

---

**Last Updated:** 2026-01-15
