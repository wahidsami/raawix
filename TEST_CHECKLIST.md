# Test Checklist - Post-Fix Verification

## ✅ Fixed Issues to Verify

### 1. Layer 3 (Assistive Maps) Generation
**Status**: Fixed (changed `page.status === 'success'` to `!page.error`)

**Test Steps**:
1. Go to Entity Details → Properties tab
2. Click "Start Scan" for a property
3. Wait for scan to complete
4. Check scanner terminal logs for:
   - `[L3] Assistive map generated for page X`
   - `[L3] Assistive map saved: DB pageVersionId {id}`
5. Go to Entity Details → Assistive Maps tab
6. Verify assistive maps appear in the table

**Expected Result**: 
- Layer 3 should generate even with 0 vision findings
- Assistive Maps tab should show the generated maps

---

### 2. Property Addition
**Status**: Fixed (domain normalization + error display)

**Test Steps**:
1. Go to Entity Details → Properties tab
2. Click "Add Property"
3. Enter a domain (try both formats):
   - Full URL: `http://localhost:4173/messy`
   - Hostname: `localhost:4173`
4. Fill in display names
5. Click Save

**Expected Result**:
- Domain should be normalized to `localhost:4173` (with port)
- If domain already exists, should show error message in modal
- Property should save successfully

---

### 3. Scan Deletion
**Status**: Implemented (complete cleanup)

**Test Steps**:
1. Go to Entity Details → Scans tab
2. Find a completed scan
3. Click the delete button (trash icon)
4. Review confirmation modal
5. Click "Delete" to confirm
6. Verify:
   - Scan disappears from list
   - Check database: scan, pages, findings should be deleted
   - Check files: `output/{scanId}/` directory should be deleted
   - Check Assistive Maps: should be deleted from database

**Expected Result**:
- Confirmation modal shows what will be deleted
- After deletion, everything related to scan is removed
- No orphaned records or files

---

### 4. Vision Findings (Layer 2)
**Status**: May be working correctly (0 findings = no issues)

**Test Steps**:
1. Run a scan on a page with unlabeled buttons/links
2. Check scanner logs for:
   - `[L2] Vision complete for page X: Y findings`
3. Check Scan Detail page → Pages table
4. Verify Layer 2 column shows findings count

**Expected Result**:
- If page has unlabeled controls → should show findings
- If page is accessible → 0 findings is correct
- Vision findings should appear in database

---

## 🔍 Diagnostic Queries (if issues persist)

If Layer 3 still doesn't appear, run these SQL queries:

```sql
-- Check if pages have required metadata
SELECT 
    scan."scanId",
    COUNT(*) as total_pages,
    COUNT(CASE WHEN p."canonicalUrl" IS NOT NULL THEN 1 END) as pages_with_canonical_url,
    COUNT(CASE WHEN p."pageFingerprintJson" IS NOT NULL THEN 1 END) as pages_with_fingerprint,
    COUNT(CASE WHEN p."canonicalUrl" IS NOT NULL AND p."pageFingerprintJson" IS NOT NULL THEN 1 END) as pages_ready_for_layer3
FROM "Scan" scan
JOIN "Page" p ON p."scanId" = scan.id
WHERE scan.status = 'completed'
GROUP BY scan."scanId"
ORDER BY scan."startedAt" DESC
LIMIT 5;

-- Check if Assistive Maps were created
SELECT 
    scan."scanId",
    COUNT(DISTINCT pv.id) as page_version_count,
    COUNT(DISTINCT am.id) as assistive_map_count
FROM "Scan" scan
LEFT JOIN "PageVersion" pv ON pv."scanId" = scan."scanId"
LEFT JOIN "AssistiveMap" am ON am."pageVersionId" = pv.id
WHERE scan.status = 'completed'
GROUP BY scan."scanId"
ORDER BY scan."completedAt" DESC
LIMIT 5;
```

---

## 📋 Next Steps After Testing

1. **If Layer 3 works**: ✅ Great! System is fully functional
2. **If Layer 3 still fails**: Check scanner logs for `[L3] Skipped` warnings
3. **If Vision = 0**: This is correct if page has no unlabeled controls
4. **If Property addition fails**: Check error message in modal

---

## 🎯 Priority Testing Order

1. **Layer 3 Generation** (most critical fix)
2. **Property Addition** (user-facing feature)
3. **Scan Deletion** (new feature)
4. **Vision Findings** (verify it's working correctly)

