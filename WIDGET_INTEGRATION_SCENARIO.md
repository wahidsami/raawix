# Widget Integration Scenario: Real-World Example

## 🎯 The Story: Sarah's E-commerce Website

**Sarah** owns an online store selling handmade jewelry. She wants to make her website accessible to everyone, including people who use screen readers or have visual impairments.

---

## 📋 Step-by-Step Integration Flow

### **STEP 1: Sarah Scans Her Website** 🔍

Sarah opens the **Raawi X Dashboard** (`http://localhost:5173`):

1. She enters her website URL: `https://sarahs-jewelry.com`
2. Clicks **"Start Scan"**
3. Scanner analyzes her website:
   - Finds 3 pages: Home, Products, Contact
   - Detects 5 WCAG issues (missing alt text, unlabeled buttons, etc.)
   - Creates a detailed report

4. **Scan completes!** Sarah sees:
   - **Scan ID**: `scan_1767827463078_ph97yk8`
   - **Summary**: 3 pages, 5 failures, 2 needs review
   - **Detailed findings** for each page

**What's stored:**
```
Scanner Server (port 3001)
└── output/
    └── scan_1767827463078_ph97yk8/
        ├── report.json          ← Contains all findings
        ├── pages/
        │   ├── 1/
        │   │   ├── screenshot.png
        │   │   └── html.html
        │   └── 2/
        └── ...
```

---

### **STEP 2: Generate Guidance Package** 📦

**This is a first-class output of the scan**, not just an incidental API transformation.

After the scan completes, the system **automatically produces a Guidance Package**:
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

**This package powers the widget** and enables the assistive layer functionality. It's treated as a core output of the scan, not a secondary transformation.

### **STEP 3: Deploy Widget (Assistive Layer)** 🎨

**This is your unique product angle**: Deploy the widget as an **assistive layer - a bridge that improves UX while remediation happens**.

**Important**: The widget is **NOT optional** and should be deployed **immediately after scanning**, not as a final step. It's a bridge that helps users right away while developers fix issues.

Sarah wants her website visitors to get help **immediately**, even before she fixes all the issues. She adds the widget to her website right after the scan completes:

**On her website (`sarahs-jewelry.com`):**

```html
<!DOCTYPE html>
<html>
<head>
  <title>Sarah's Jewelry - Handmade Accessories</title>
</head>
<body>
  <!-- Her website content -->
  <h1>Welcome to Sarah's Jewelry</h1>
  <img src="necklace.jpg" alt="Handmade silver necklace">
  <button>Add to Cart</button>
  
  <!-- Raawi X Widget Integration -->
  <script>
    // Configure widget BEFORE loading
    window.VOICE_ENABLED = true;  // Enable voice features
    window.RAWI_API_URL = 'https://api.raawi-x.com';  // Scanner API
    window.RAWI_SCAN_ID = 'scan_1767827463078_ph97yk8';  // Sarah's scan ID!
    // OR use "latest" to automatically use most recent scan:
    // window.RAWI_SCAN_ID = 'latest';
  </script>
  <script src="https://cdn.raawi-x.com/widget.iife.js"></script>
</body>
</html>
```

**What happens:**
- Widget loads on Sarah's website
- Widget reads: `RAWI_API_URL` and `RAWI_SCAN_ID`
- Widget knows: "I should fetch data from scan `scan_1767827463078_ph97yk8`"

---

### **STEP 4: Widget Fetches Scan Data** 🔄

When a visitor loads Sarah's website, the widget automatically:

1. **Fetches Page Guidance** (on page load):
   ```
   GET https://api.raawi-x.com/api/widget/guidance
     ?url=https://sarahs-jewelry.com
     &scanId=scan_1767827463078_ph97yk8
   ```
   
   **Note**: If `RAWI_SCAN_ID = "latest"`, the backend automatically finds the most recent completed scan for the domain.

2. **Scanner API responds** with structured data:
   ```json
   {
     "url": "https://sarahs-jewelry.com",
     "title": "Sarah's Jewelry - Handmade Accessories",
     "summary": "E-commerce website selling handmade jewelry with product listings and shopping cart.",
     "landmarks": [
       { "type": "main", "label": "Main Content" },
       { "type": "navigation", "label": "Main Navigation" }
     ],
     "keyActions": [
       {
         "label": "Add to Cart",
         "type": "button",
         "description": "Adds selected item to shopping cart",
         "selector": "button.add-to-cart"
       }
     ],
     "formSteps": [...]
   }
   ```

3. **Widget stores this data** in memory (cached for the session)

---

### **STEP 5: Widget Intelligence & Reliability** 🔍

The widget uses **intelligent URL matching** to find the right page:

1. **Exact canonical URL match** (highest confidence)
2. **Final URL match** (high confidence)
3. **Best-effort match** ignoring query params (medium confidence)
4. **Fingerprint similarity** (title + heading match, low confidence)

**Stale Scan Detection:**
- Widget compares current page fingerprint to scan fingerprint
- If mismatch detected, shows non-blocking warning:
  > "Guidance may be based on an older or different page version. Using DOM-only reading for content, scan data for general hints."
- Widget continues functioning with hybrid approach

**Hybrid Reading Behavior (Guidance vs Content Contract):**
**Scan data NEVER replaces live page content.** The widget:
- **Always reads live DOM** for actual content
- **Uses scan guidance ONLY for**:
  - Page structure and ordering
  - Landmarks and navigation hints
  - Key actions descriptions
  - Known accessibility issues
- **Never reads HTML snapshot** directly - always uses current page

This ensures narration reflects the current page state while benefiting from scan intelligence.

**Privacy Guarantee:**
- Widget **does NOT send user behavior** to server
- Widget **does NOT track** user interactions
- Widget **does NOT collect** personal data
- Only fetches scan intelligence (guidance, issues) - read-only
- All user interactions stay in browser
- No analytics, no tracking, no data collection

### **STEP 6: Visitor Uses Widget** 👤

**Maria**, a visitor with visual impairment, visits Sarah's website:

1. **Maria sees the widget button** (floating accessibility icon) on the page
2. **Maria clicks the button** to open the widget panel
3. **Maria clicks "Read Page"** (or says "read page" if using voice)

**What happens:**

#### **A. Widget Uses Scan Data for Intelligent Reading**

**Important**: The widget **always reads live DOM** for actual content. Scan data is used **only for structure and metadata**.

Instead of just reading raw HTML, the widget uses the **scan data** for intelligent structure and ordering:

```
Widget speaks:
"Welcome to Sarah's Jewelry - Handmade Accessories.

E-commerce website selling handmade jewelry with product listings and shopping cart.

Main Content section:
[Reads actual page content from DOM]

Key actions available:
- Add to Cart button: Adds selected item to shopping cart
- View Product Details button: Shows full product information
..."
```

**Why this is better:**
- ✅ Widget knows the **page structure** from the scan
- ✅ Widget can describe **what actions do** (from scan analysis)
- ✅ Widget provides **context** (summary, landmarks)
- ✅ More natural, human-like reading

#### **B. Maria Asks About Issues**

Maria says: **"Read issues"** (or clicks "Read Issues" button)

**Widget fetches issues** (only when requested):
```
GET https://api.raawi-x.com/api/widget/issues
  ?url=https://sarahs-jewelry.com
  &scanId=scan_1767827463078_ph97yk8
```

**Note**: If `RAWI_SCAN_ID = "latest"`, the backend automatically finds the most recent completed scan for the domain.

**Scanner API responds:**
```json
{
  "url": "https://sarahs-jewelry.com",
  "issues": [
    {
      "title": "Missing alternative text for images",
      "severity": "critical",
      "description": "Image 'necklace.jpg' is missing alt text. Screen readers cannot describe this image to users."
    },
    {
      "title": "Unlabeled button",
      "severity": "important",
      "description": "Button 'Add to Cart' lacks accessible name. Screen reader users may not know what this button does."
    }
  ]
}
```

**Widget speaks:**
```
"Found 5 accessibility issues on this page.

Critical issue: Missing alternative text for images. 
Image 'necklace.jpg' is missing alt text. 
Screen readers cannot describe this image to users.

Important issue: Unlabeled button.
Button 'Add to Cart' lacks accessible name. 
Screen reader users may not know what this button does.

[Continues with other issues...]"
```

**Why this is helpful:**
- ✅ Maria knows what **problems exist** on the page
- ✅ Issues are described in **user-friendly language**
- ✅ Maria can **navigate around** known issues
- ✅ Widget provides **actionable information**

---

## 🔄 Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Sarah Scans Website                                │
│  Dashboard → Scanner API → Scan Complete                    │
│  - Computes page fingerprints                               │
│  - Stores canonical URLs                                     │
│  Result: scan_1767827463078_ph97yk8                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Generate Guidance Package                         │
│  (Automatic)                                                │
│  - Extracts page structure                                  │
│  - Creates user-friendly descriptions                       │
│  - Generates navigation guidance                            │
│  - Ready for widget consumption                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ├─────────────────┐
                     │                 │
                     ▼                 ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│  STEP 3: Deploy Widget   │  │  View Report             │
│  (Assistive Layer)       │  │  (Dashboard)              │
│  Users get help NOW!     │  │  - Summary               │
│  While fixes happen      │  │  - Pages                 │
│                          │  │  - Findings              │
└──────────┬───────────────┘  └──────────┬───────────────┘
           │                             │
           │                             ▼
           │                    ┌──────────────────────────┐
           │                    │  Fix Issues             │
           │                    │  (Remediation)          │
           │                    └──────────┬───────────────┘
           │                             │
           └─────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: Visitor Loads Website                             │
│  Widget loads → Fetches guidance from API                  │
│  GET /api/widget/guidance?url=...&scanId=...               │
│  Scanner resolves URL (canonical/final/fingerprint)        │
│  Returns: structured data + match metadata                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: Widget Intelligence                               │
│  - Compares page fingerprints                               │
│  - Detects stale scans                                      │
│  - Shows warning if needed (non-blocking)                  │
│  - Uses hybrid approach (live DOM + scan guidance)         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 6: Visitor Uses Widget                               │
│  "Read Page" → Reads live DOM (content) + scan (structure) │
│  "Read Issues" → Fetches issues → Speaks user-friendly     │
│  Widget shows scan freshness info (non-blocking)           │
│  Widget provides enhanced experience using scan results    │
│  Privacy: No user behavior sent to server                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Benefits of Integration

### **Without Scan Integration:**
- Widget reads raw HTML (confusing)
- Widget doesn't know page structure
- Widget can't describe what actions do
- Widget can't tell about known issues

### **With Scan Integration:**
- ✅ **Intelligent Reading**: Widget knows page structure, landmarks, actions
- ✅ **Context-Aware**: Widget provides summaries and descriptions
- ✅ **Issue Awareness**: Widget can tell users about accessibility problems
- ✅ **Better UX**: More natural, human-like experience
- ✅ **Actionable**: Users know what they can do and what problems exist

---

## 🔧 Technical Details

### **API Endpoints Used:**

1. **`/api/widget/guidance`** (Fetched on page load)
   - Returns: Page summary, landmarks, forms, key actions
   - Used for: Intelligent page reading
   - Cached: Yes (for session)

2. **`/api/widget/issues`** (Fetched when user requests)
   - Returns: Accessibility issues with user-friendly descriptions
   - Used for: "Read Issues" feature
   - Cached: Yes (after first request)

### **How Scanner Finds Data:**

When widget requests guidance for `https://sarahs-jewelry.com`:

1. Scanner looks for scan ID: `scan_1767827463078_ph97yk8`
2. Reads `report.json` from that scan
3. Finds page matching URL: `https://sarahs-jewelry.com`
4. Extracts:
   - Page HTML
   - Rule results (WCAG findings)
   - Vision findings (visual issues)
5. Processes into structured guidance
6. Returns to widget

### **Fallback Behavior:**

If scan data is unavailable:
- Widget falls back to **DOM-only extraction**
- Still works, but less intelligent
- No issue awareness
- Basic reading only

---

## 📝 Real Example: What Maria Hears

### **Scenario: Maria visits Sarah's jewelry website**

**Maria clicks widget → "Read Page"**

```
Widget: "Welcome to Sarah's Jewelry - Handmade Accessories.

E-commerce website selling handmade jewelry with product listings 
and shopping cart.

Main Content section:
Browse our collection of handcrafted jewelry pieces. 
Each piece is unique and made with care.

Product: Silver Necklace
Price: $49.99
[Reads description from page]

Key actions available:
- Add to Cart button: Adds selected item to shopping cart
- View Details button: Shows full product information
- Checkout button: Proceeds to payment

Next section: Customer Reviews..."
```

**Maria says: "Read issues"**

```
Widget: "Found 5 accessibility issues on this page.

Critical issue: Missing alternative text for images.
Image 'necklace.jpg' is missing alt text. 
Screen readers cannot describe this image to users.

Important issue: Unlabeled button.
Button 'Add to Cart' lacks accessible name. 
Screen reader users may not know what this button does.

[Continues...]"
```

---

## ✅ Summary

**The Integration Flow:**
1. **Scan** → Website analyzed, report created, scanId generated
2. **Configure** → Widget added to website with scanId
3. **Fetch** → Widget gets structured data from scanner API
4. **Enhance** → Widget uses scan data for intelligent features
5. **Benefit** → Users get better, more helpful experience

**The Magic:**
- Scan results **enhance** the widget
- Widget becomes **smarter** with scan data
- Users get **better guidance** and **issue awareness**
- Everything works **seamlessly** in the background

**Result:**
Sarah's website is now more accessible, and visitors like Maria can navigate it more easily! 🎉

