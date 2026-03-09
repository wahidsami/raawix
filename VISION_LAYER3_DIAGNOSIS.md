# Vision (Layer 2) & Assistive Maps (Layer 3) Diagnosis

## Current Issue
- **Layer 2 (Vision)**: Showing 0 findings
- **Layer 3 (Assistive Map)**: Showing "No"

## How Vision Analysis Works

### Vision Analysis (Layer 2)
Vision analysis runs **without Gemini** and detects:
1. **Clickable unlabeled**: Buttons/links without accessible name or text
2. **Icon button unlabeled**: Icon-only buttons without accessible name
3. **Looks like button but not button**: Divs/spans styled like buttons but not semantic buttons

**Vision analysis can return 0 findings if the page doesn't have these issues** - this is correct behavior!

### When Vision Findings = 0
- The page might actually be accessible (no unlabeled controls)
- Vision analysis is working correctly but finding no issues
- This is **not a bug** - it means the page passed vision checks

## How Layer 3 (Assistive Map) Works

### Requirements for Layer 3 Generation
Layer 3 generation requires:
1. ✅ `page.status === 'success'` (page captured successfully)
2. ✅ `page.canonicalUrl` exists (URL normalization worked)
3. ✅ `page.pageFingerprint` exists (page fingerprint computed)

### What Layer 3 Generates (Even with 0 Vision Findings)
Layer 3 generates assistive maps for:
1. **Label Overrides**: From vision findings (can be empty if no unlabeled controls)
2. **Image Descriptions**: For images missing alt text (works independently)
3. **Action Intents**: For buttons/links (works independently)

**Layer 3 should generate even with 0 vision findings** because it processes images and actions from the DOM.

## Diagnostic Steps

### 1. Check Scanner Logs
Look for these log messages:
- `[L2] Vision complete for page X: Y findings` - Should appear even if Y=0
- `[L3] Assistive map generated for page X` - Should appear if Layer 3 ran
- `[L3] Assistive map saved: DB pageVersionId {id}` - Should appear if saved to DB
- Any warnings or errors

### 2. Run SQL Diagnostic
Run `diagnose-vision-layer3.sql` to check:
- Are vision findings in the database? (Even if 0, should see records)
- Do pages have `canonicalUrl` and `pageFingerprint`?
- Are AssistiveMaps being created?

### 3. Check File System
Check if these files exist:
- `output/{scanId}/pages/1/vision/vision-findings.json` - Vision findings file
- `output/{scanId}/pages/1/assistive-model.json` - Assistive map artifact

## Possible Root Causes

### Vision Findings = 0
1. ✅ **Page is actually accessible** (no unlabeled controls) - This is GOOD!
2. ❌ Vision analysis not running (check `config.vision.enabled`)
3. ❌ Vision analysis failing silently (check logs for errors)

### Layer 3 Not Generating
1. ❌ `page.canonicalUrl` is missing (check page metadata)
2. ❌ `page.pageFingerprint` is missing (check page metadata)
3. ❌ `page.status !== 'success'` (page capture failed)
4. ❌ Layer 3 generation failing silently (check logs for warnings)
5. ❌ Site/PageVersion creation failing (domain mismatch - we fixed this!)

## Next Steps

1. **Run `diagnose-vision-layer3.sql`** and share results
2. **Check scanner terminal logs** for `[L2]` and `[L3]` messages
3. **Check file system** for vision findings and assistive map artifacts
4. **Verify page metadata** (canonicalUrl, pageFingerprint) in database

## Expected Behavior

### If Page Has No Issues
- **Layer 1 (WCAG)**: May have findings (DOM-based checks)
- **Layer 2 (Vision)**: 0 findings (no unlabeled controls) ✅
- **Layer 3 (Assistive Map)**: Should still generate (for images/actions) ✅

### If Page Has Issues
- **Layer 1 (WCAG)**: Findings present
- **Layer 2 (Vision)**: Findings present (unlabeled controls detected)
- **Layer 3 (Assistive Map)**: Should generate with label overrides

## Fix Strategy

Once we identify the root cause:
1. If `canonicalUrl`/`pageFingerprint` missing → Fix page capture
2. If Layer 3 failing silently → Add better error handling/logging
3. If vision analysis not running → Check config/environment variables
4. If 0 findings is expected → Update UI to show "No issues found" instead of "0"

