# Scanning Large Government Websites

## Overview

Government websites like [www.mim.gov.sa](https://www.mim.gov.sa/ar) often have hundreds of pages. This guide explains how to handle large-scale scans.

---

## 🎯 Problem: Discovery Stops at Page Limit

### Symptoms:
```
Discovery Phase: 200 pages found
Status: Stopped
Reason: Reached maxPages limit
```

### Cause:
Scanner has a `maxPages` limit to prevent infinite crawling. Default is **200 pages**.

---

## ✅ Solution: Adjust Scanner Settings

### Option 1: Config File (Recommended - Always Works)

**File:** `apps/scanner/src/config/scanner-settings.ts`

**For Large Government Sites:**
```typescript
export const DEFAULT_SCANNER_SETTINGS: ScannerSettingsConfig = {
  maxPages: 500,        // Increased from 200
  maxDepth: 10,         // Standard depth
  maxRuntimeMs: 3600000, // 60 minutes (increased from 40)
};
```

**Restart Scanner:**
```powershell
# Close scanner (Ctrl+C)
pnpm scanner:dev
```

### Option 2: Dashboard UI (If Database Works)

1. Go to: Dashboard → Settings
2. Set: Max Pages = `500`
3. Set: Max Runtime = `60` minutes
4. Click: Save
5. Restart scanner

---

## 📊 Recommended Settings by Site Size

| Site Type | Typical Pages | maxPages | maxDepth | maxRuntime |
|-----------|--------------|----------|----------|------------|
| **Small Portal** | 50-100 | 200 | 10 | 20 min |
| **Medium Portal** | 100-300 | 300 | 10 | 40 min |
| **Large Portal** | 300-600 | 500 | 10 | 60 min |
| **Very Large Portal** | 600-1000 | 800 | 10 | 90 min |
| **Enterprise Site** | 1000+ | Maximum (varies) | 15 | 120 min |

---

## 🕒 Scan Time Estimation

### Formula:
```
Estimated Time = (Pages × 6 seconds) + 20% buffer

Examples:
- 200 pages: ~20-25 minutes
- 300 pages: ~30-35 minutes
- 500 pages: ~50-60 minutes
- 800 pages: ~80-95 minutes
```

### Why 6 seconds per page?
- DOM capture: ~1 second
- Screenshot: ~1-2 seconds
- Vision analysis (if enabled): ~2-3 seconds
- Layer 3 processing: ~1 second

---

## 🏛️ Ministry of Industry Website Case Study

**URL:** [https://www.mim.gov.sa/ar](https://www.mim.gov.sa/ar)

### Site Structure:

**Main Sections:**
- 📋 Services (خدمات) - ~20+ pages
- 🏭 Sectors (القطاعات) - Multiple sub-sections
- 📰 News (الأخبار) - Dozens of articles
- 💼 Initiatives (المبادرات) - Multiple programs
- 📞 Contact (تواصل معنا) - Multiple branches
- 📚 Knowledge Base (المعرفة) - Policies, FAQs

**Estimated Total:** 400-600 pages

**Recommended Settings:**
```typescript
maxPages: 500
maxDepth: 10
maxRuntimeMs: 3600000 // 60 minutes
```

---

## 🔍 How to Check Actual Page Count

### Method 1: Discovery Phase
1. Start scan with high `maxPages` (e.g., 800)
2. Wait for discovery to complete
3. Check: "X Pages Discovered"
4. Adjust `maxPages` for future scans

### Method 2: Site Analysis Tools
```bash
# Use sitemap (if available)
curl https://www.mim.gov.sa/sitemap.xml

# Count links (rough estimate)
# Note: May include duplicates
```

### Method 3: Check Scanner Logs
```
[DISCOVERY] Discovery complete. Found X pages
```

---

## ⚙️ Optimizing for Large Scans

### 1. **Prioritize Important Pages**
If site has 1000+ pages, use **Single Page Mode** to scan specific sections:

```
Scan 1: Homepage + Services
Scan 2: News Section
Scan 3: Contact Pages
```

### 2. **Use Include/Exclude Patterns**
Skip unnecessary pages:

**Exclude:**
- `/print/` (printer-friendly versions)
- `/download/` (file downloads)
- `/archive/` (old content)

**Include:**
- `/services/` (priority)
- `/ar/` (Arabic content)

### 3. **Adjust Depth**
- **Shallow (depth 5):** Homepage + direct links only
- **Standard (depth 10):** Most sites
- **Deep (depth 15):** Complex hierarchies

---

## 🚨 Common Issues & Solutions

### Issue 1: "Scan Timeout"
**Symptom:** Scan stops mid-way with timeout error

**Solution:**
```typescript
// Increase runtime
maxRuntimeMs: 7200000 // 120 minutes (2 hours)
```

### Issue 2: "Too Many Pages, Scan Slow"
**Symptom:** Discovery finds 800+ pages, scan takes forever

**Solutions:**
- **A)** Reduce `maxPages` to focus on important sections
- **B)** Use **Single Page Mode** for specific URLs
- **C)** Split into multiple scans by section

### Issue 3: "Same Pages Counted Multiple Times"
**Symptom:** Discovery shows 500 pages, but many are duplicates

**Cause:** URL variations (trailing slashes, query params)

**Solution:** 
- Scanner automatically normalizes URLs
- Check for `/ar` vs `/ar/` (handled automatically)
- Query params are typically ignored

---

## 📋 Scan Workflow for Large Sites

### **Step 1: Initial Discovery**
```
Settings: maxPages = 800 (high limit)
Mode: Full Domain
Goal: Find actual page count
```

### **Step 2: Adjust Settings**
```
If found 450 pages:
  Set maxPages = 500 (safe buffer)
  Set maxRuntime = 60 minutes
```

### **Step 3: Full Scan**
```
Mode: Full Domain
Select: All discovered pages
Monitor: Check progress in UI
```

### **Step 4: Report Generation**
```
Wait for: "Scan Complete"
Export: PDF (Arabic) for government entity
```

---

## 🎯 Best Practices

### ✅ DO:
- Start with discovery to find page count
- Adjust settings based on actual site size
- Use generous timeouts (better safe than timeout)
- Monitor scan progress in UI
- Export reports immediately after completion

### ❌ DON'T:
- Set `maxPages` too low (scan incomplete)
- Set `maxRuntime` too low (timeout mid-scan)
- Scan same site multiple times simultaneously
- Ignore timeout warnings
- Forget to save important scan results

---

## 📊 Current Configuration

**Location:** `apps/scanner/src/config/scanner-settings.ts`

**Current Settings (Updated for Large Gov Sites):**
```typescript
maxPages: 500        // Covers most government portals
maxDepth: 10         // Standard depth
maxRuntimeMs: 3600000 // 60 minutes
```

**When to Adjust:**
- **Smaller sites (<300 pages):** Reduce to `300` and `40 minutes`
- **Very large sites (>600 pages):** Increase to `800` and `90 minutes`

---

## 🔄 Quick Reference Commands

### Update Settings:
```powershell
# Edit config file
code apps/scanner/src/config/scanner-settings.ts

# Restart scanner
Ctrl+C
pnpm scanner:dev
```

### Check Scanner Logs:
```powershell
# Look for:
[SETTINGS] Using config file defaults: { maxPages: 500, ... }
[DISCOVERY] Discovery complete. Found X pages
```

---

## 📈 Scalability Limits

### Current System Capacity:
- **Max Pages:** 500 (recommended), 800 (maximum tested)
- **Max Runtime:** 120 minutes (2 hours)
- **Max Depth:** 20 levels
- **Concurrent Scans:** 5 (configurable)

### Future Scalability:
- Database pagination for 1000+ pages
- Distributed scanning across multiple workers
- Resume capability for interrupted scans
- Incremental scanning (scan only changed pages)

---

## Status

✅ **Scanner Optimized for Large Government Sites**
✅ **Settings: 500 pages, 60 minutes**
✅ **Ready to Scan: www.mim.gov.sa**

**Last Updated:** 2026-01-15
