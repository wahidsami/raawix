# Workflow After Scanning

## Current System Flow

### 1. **Scan Execution** ✅
- User submits scan request via dashboard
- Scanner crawls website and analyzes pages
- WCAG rules are evaluated
- Vision analysis detects visual issues
- Report is generated and stored
- **Page fingerprints** are computed (canonical URLs, content hashes)

### 2. **Generate Guidance Package** ✅
**This is a first-class output of the scan**, not just an incidental API transformation.

After scan completes, the system automatically produces a **Guidance Package**:
- Extracts page structure (landmarks, forms, key actions)
- Creates user-friendly issue descriptions
- Generates navigation guidance
- Computes page fingerprints for URL matching
- Stores guidance data as a primary scan output

**The Guidance Package includes:**
- `/api/widget/guidance` - Page structure and actions
- `/api/widget/issues` - Accessibility issues with descriptions
- Page fingerprints for URL matching
- Match confidence metadata

**This package powers the widget** and enables the assistive layer functionality.

### 3. **Deploy Widget (Assistive Layer)** ✅
**This is your unique product angle**: Deploy the widget as an **assistive layer while remediation happens**.

The widget provides:
- **Immediate help** for users navigating your site
- **Voice narration** with intelligent reading
- **Issue awareness** so users know what problems exist
- **Guidance** for navigating complex pages

**Setup:**
```javascript
// On the scanned website
window.VOICE_ENABLED = true;
window.RAWI_API_URL = 'http://localhost:3001';
window.RAWI_SCAN_ID = 'scan_1234567890_abc123'; // Use specific scanId from dashboard
// OR use "latest" to automatically use most recent scan for your domain:
// window.RAWI_SCAN_ID = 'latest';
```

**Scan ID Options:**
- **Specific scan ID**: `'scan_1234567890_abc123'` - Uses exact scan
- **Latest scan**: `'latest'` - Automatically finds most recent completed scan for your domain
- **Not set**: Defaults to `'latest'` if not specified

**Why Deploy Early:**
- Users get help **immediately**, even before you fix issues
- Widget uses scan intelligence to provide better guidance
- Shows you care about accessibility **right now**
- Creates positive user experience during remediation period

### 4. **Report Viewing** ✅
After scan completes, users can:

#### **A. View Summary Dashboard**
- **Summary Cards** showing:
  - WCAG A Failures (critical issues)
  - WCAG AA Failures (important issues)
  - Needs Review (items requiring manual verification)
  - Total Pages Scanned

#### **B. Browse Pages**
- **Page Table** listing all scanned pages with:
  - Page number and URL
  - Pass/Fail/Review/N/A counts per page
  - "View Details" button for each page

#### **C. Detailed Findings**
Clicking "View Details" shows:
- **Page Screenshot** (visual reference)
- **Rule Results** with:
  - Status (Pass/Fail/Needs Review/N/A)
  - Confidence level (High/Medium/Low)
  - WCAG ID (e.g., "WCAG 1.1.1")
  - Rule message
  - Evidence (selectors, snippets, descriptions)
  - "How to Verify" guidance

### 5. **Widget Intelligence & Reliability** ✅

The widget intelligently matches pages and detects stale scans:

#### **URL Matching:**
The widget endpoints use multiple matching strategies:
1. **Exact canonical URL match** (highest confidence)
2. **Final URL match** (high confidence)
3. **Best-effort match** ignoring query params (medium confidence)
4. **Fingerprint similarity** (title + heading match, low confidence)

#### **Stale Scan Detection:**
- Widget compares current page fingerprint to scan fingerprint
- If mismatch detected, shows non-blocking warning:
  > "Guidance may be based on an older or different page version. Using DOM-only reading for content, scan data for general hints."
- Widget continues functioning with hybrid approach

#### **Hybrid Reading Behavior (Guidance vs Content Contract):**
**Scan data NEVER replaces live page content.** The widget:
- **Always reads live DOM** for actual content
- **Uses scan guidance ONLY for**:
  - Page structure and ordering
  - Landmarks and navigation hints
  - Key actions descriptions
  - Known accessibility issues
- **Never reads HTML snapshot** directly - always uses current page

This ensures narration reflects the current page state while benefiting from scan intelligence.

#### **Privacy Guarantee:**
- Widget **does NOT send user behavior** to server
- Widget **does NOT track** user interactions
- Widget **does NOT collect** personal data
- Only fetches scan intelligence (guidance, issues) - read-only
- All user interactions stay in browser
- No analytics, no tracking, no data collection

### 4. **Current Limitations** ⚠️

The system currently does **NOT** include:

- ❌ **Export Functionality** (PDF, CSV, JSON download)
- ❌ **Remediation Suggestions** (automatic fix recommendations)
- ❌ **Scan Comparison** (compare before/after scans)
- ❌ **Issue Tracking** (mark issues as fixed, assign to team)
- ❌ **CI/CD Integration** (automated scanning in pipelines)
- ❌ **Email/Notifications** (alert when scan completes)
- ❌ **Sharing/Collaboration** (share reports with team)
- ❌ **Historical Trends** (track improvements over time)

## Recommended Next Steps

### **Phase 1: Immediate Actions** (After Scan Completes)

1. **Deploy Widget (Assistive Layer)** 🎯
   - **This is your bridge to better UX while fixing issues**
   - Add widget to your website immediately after scan
   - Configure with scanId from the completed scan
   - Enable voice mode for users
   - **Users get help right away**, even before you fix issues
   - Widget uses the Guidance Package to provide intelligent navigation

2. **Review Critical Issues**
   - Focus on WCAG A failures first (most critical)
   - Check WCAG AA failures (important for compliance)
   - Review "Needs Review" items manually

3. **Fix Issues**
   - Use evidence (selectors, snippets) to locate problems
   - Follow "How to Verify" guidance
   - Make code changes to fix issues
   - **Widget continues helping users during this process**

4. **Re-scan to Verify**
   - Run a new scan after fixes
   - Compare results (manually for now)
   - Verify issues are resolved
   - Update widget with new scanId if needed

### **Phase 2: Enhanced Features** (Future Development)

#### **A. Export & Reporting**
```typescript
// Proposed: Export report as PDF/CSV
POST /api/scan/:id/export
{
  format: 'pdf' | 'csv' | 'json',
  includeScreenshots: boolean
}
```

#### **B. Remediation Workflow**
```typescript
// Proposed: Get fix suggestions
GET /api/scan/:id/remediation
// Returns: Code snippets, fix instructions, priority
```

#### **C. Issue Tracking**
```typescript
// Proposed: Mark issues as fixed
POST /api/scan/:id/issues/:issueId/resolve
// Track resolution status, assign to developers
```

#### **D. Scan Comparison**
```typescript
// Proposed: Compare two scans
GET /api/scan/compare?scanId1=...&scanId2=...
// Returns: New issues, fixed issues, unchanged issues
```

#### **E. CI/CD Integration**
```yaml
# Proposed: GitHub Actions example
- name: Run Accessibility Scan
  uses: raawi-x/scan-action@v1
  with:
    url: ${{ github.event.pull_request.head.url }}
    api-key: ${{ secrets.RAWI_API_KEY }}
```

## Enhanced Workflow Diagram

```
┌─────────────────┐
│  Start Scan     │
│  (Dashboard)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Scan Running   │
│  - Crawl pages   │
│  - Analyze WCAG │
│  - Vision check │
│  - Compute      │
│    fingerprints │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Generate       │
│  Guidance       │
│  Package        │
│  (Automatic)    │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│  Deploy Widget  │  │  View Report    │
│  (Assistive     │  │  (Dashboard)    │
│   Layer)        │  │  - Summary      │
│  🎯 BRIDGE      │  │  - Pages        │
│  Users get help │  │  - Findings     │
│  immediately!   │  │                 │
│  (Not optional) │  └────────┬────────┘
└────────┬────────┘           │
         │                    ▼
         │            ┌─────────────────┐
         │            │  Fix Issues     │
         │            │  (Remediation)  │
         │            │  (Widget helps   │
         │            │   during fixes)  │
         │            └────────┬────────┘
         │                    │
         └────────────────────┘
                    │
                    ▼
         ┌─────────────────┐
         │  Re-scan        │
         │  (Verify Fixes) │
         └─────────────────┘
```

## Integration Points

### **Widget ↔ Scanner API**
- Widget reads scan results via API
- Provides real-time guidance to users
- Speaks issues in user-friendly language

### **Dashboard ↔ Scanner API**
- Dashboard displays scan results
- Shows detailed findings with evidence
- Allows navigation between pages

### **Future: External Tools**
- Export to Jira, GitHub Issues
- Integration with testing frameworks
- Webhook notifications
- API for custom integrations

## Best Practices

1. **Regular Scanning**: Scan after major changes
2. **Prioritize Fixes**: Fix WCAG A before AA issues
3. **Use Widget**: Deploy widget to help users navigate
4. **Document Fixes**: Keep track of what was fixed
5. **Monitor Trends**: Track improvement over time (manual for now)

## Summary

**Current State:**
- ✅ Scan websites
- ✅ View detailed reports
- ✅ See evidence and guidance
- ✅ Integrate with widget
- ❌ Export reports
- ❌ Track fixes
- ❌ Compare scans
- ❌ Automated remediation

**Next Steps for Users:**
1. **Deploy widget immediately** (assistive layer - not optional!)
2. Review report in dashboard
3. Fix critical issues (WCAG A) - widget helps during this process
4. Re-scan to verify
5. Repeat process

**Key Insights:**
- **Widget is a bridge**, not a final step. Deploy it right after scanning to improve UX while remediation happens.
- **Guidance Package is a first-class output** of the scan, automatically generated and ready to power the widget.
- The widget provides **immediate help** to users while you work on fixes. This is your unique product angle: an assistive layer that makes your site more accessible **right now**, not just after remediation.

**Future Enhancements:**
- Export functionality
- Issue tracking
- Remediation suggestions
- CI/CD integration
- Historical tracking

