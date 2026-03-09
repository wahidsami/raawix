# Expected Scanner Findings - Test Sites

This document lists all accessibility issues that the Raawi X Scanner **SHOULD** detect when scanning the test sites. Use this to verify scanner accuracy and compare against actual scan results.

---

## Portal Good (`localhost:4173`) - Expected: High Compliance

**Target:** 95-100% compliance, minimal findings

### ✅ Expected: PASS (Compliant)

#### 1.1.1 Non-text Content (Level A)
- **Status:** ✅ PASS
- **Reason:** All images have proper `alt` attributes
- **Locations:**
  - Home page: hero image, 5 feature images
  - News pages: all article images
  - Services pages: all service images
- **Expected Finding:** None (all images have alt text)

#### 3.3.2 Labels or Instructions (Level A)
- **Status:** ✅ PASS
- **Reason:** All form fields have proper `<label>` elements bound with `htmlFor`
- **Location:** Contact page (`/contact`)
- **Expected Finding:** None

#### 4.1.2 Name, Role, Value (Level A)
- **Status:** ✅ PASS
- **Reason:** All buttons have accessible names (text content or aria-label)
- **Locations:** All pages
- **Expected Finding:** None

#### 2.4.7 Focus Visible (Level AA)
- **Status:** ✅ PASS
- **Reason:** CSS includes `:focus-visible` styles with visible outline
- **Location:** Global CSS
- **Expected Finding:** None

#### 1.4.3 Contrast (Minimum) (Level AA)
- **Status:** ✅ PASS
- **Reason:** Text colors meet WCAG contrast requirements
- **Location:** All pages
- **Expected Finding:** None

#### 2.1.1 Keyboard (Level A)
- **Status:** ✅ PASS
- **Reason:** All interactive elements are keyboard accessible
- **Location:** All pages
- **Expected Finding:** None

#### 2.4.3 Focus Order (Level A)
- **Status:** ✅ PASS
- **Reason:** Logical tab order, no tabindex misuse
- **Location:** All pages
- **Expected Finding:** None

#### 2.4.4 Link Purpose (In Context) (Level A)
- **Status:** ✅ PASS
- **Reason:** All links have descriptive text, no "click here" ambiguity
- **Location:** All pages
- **Expected Finding:** None

### ⚠️ Expected: Needs Review (Possible)

#### Semantic HTML Structure
- **Status:** ⚠️ REVIEW
- **Reason:** Scanner may flag if heading hierarchy is not perfect (h1 → h2 → h3)
- **Location:** Various pages
- **Expected Finding:** May have 0-2 findings for heading order

---

## Gov Sim (`localhost:4174`) - Expected: Multiple Issues

**Target:** Multiple fails + needs review (intentional issues for testing)

### ❌ Expected: FAIL (Intentional Issues)

#### 1.1.1 Non-text Content (Level A) - **3 FAILS**

**Issue #1: Missing Alt Text - Hero Image**
- **WCAG ID:** `1.1.1`
- **Level:** A
- **Status:** ❌ FAIL
- **Location:** Landing page (`/`)
- **File:** `gov-sim/src/pages/LandingPage.tsx`
- **Line:** ~13
- **Code:**
  ```tsx
  <img
    src="/assets/images/gov_hero.png"
    width="1200"
    height="400"
    style={{ width: '100%', height: 'auto' }}
  />
  ```
- **Issue:** Image has NO `alt` attribute
- **Expected Finding:**
  - Rule: 1.1.1 Non-text Content
  - Status: Fail
  - Message: "Image missing alt text"
  - Selector: `img[src="/assets/images/gov_hero.png"]`
  - Confidence: High

**Issue #2: Missing Alt Text - Service Card Image**
- **WCAG ID:** `1.1.1`
- **Level:** A
- **Status:** ❌ FAIL
- **Location:** Landing page (`/`)
- **File:** `gov-sim/src/pages/LandingPage.tsx`
- **Line:** ~33
- **Code:**
  ```tsx
  <img
    src="/assets/images/service_card_1.png"
    width="300"
    height="200"
  />
  ```
- **Issue:** Image has NO `alt` attribute
- **Expected Finding:**
  - Rule: 1.1.1 Non-text Content
  - Status: Fail
  - Message: "Image missing alt text"
  - Selector: `img[src="/assets/images/service_card_1.png"]`
  - Confidence: High

**Issue #3: Missing Alt Text - Success Icon**
- **WCAG ID:** `1.1.1`
- **Level:** A
- **Status:** ❌ FAIL
- **Location:** Success page (`/apply/:id/success`)
- **File:** `gov-sim/src/pages/SuccessPage.tsx`
- **Line:** ~16
- **Code:**
  ```tsx
  <img
    src="/assets/images/success_icon.png"
    width="100"
    height="100"
    style={{ margin: '0 auto', display: 'block' }}
  />
  ```
- **Issue:** Image has NO `alt` attribute (should be `aria-hidden="true"` if decorative)
- **Expected Finding:**
  - Rule: 1.1.1 Non-text Content
  - Status: Fail
  - Message: "Image missing alt text"
  - Selector: `img[src="/assets/images/success_icon.png"]`
  - Confidence: High

---

#### 3.3.2 Labels or Instructions (Level A) - **2 FAILS**

**Issue #4: Missing Label - National ID Input**
- **WCAG ID:** `3.3.2`
- **Level:** A
- **Status:** ❌ FAIL
- **Location:** Login page (`/login`)
- **File:** `gov-sim/src/pages/LoginPage.tsx`
- **Line:** ~24-34
- **Code:**
  ```tsx
  <div className="form-group">
    <input
      type="text"
      placeholder="رقم الهوية الوطنية / الإقامة"
      value={username}
      onChange={(e) => setUsername(e.target.value)}
      required
      pattern="[0-9]{10}"
      title="يجب أن يكون 10 أرقام"
    />
  </div>
  ```
- **Issue:** Input uses `placeholder` only, no `<label>` element
- **Expected Finding:**
  - Rule: 3.3.2 Labels or Instructions
  - Status: Fail
  - Message: "Form input missing label"
  - Selector: `input[type="text"][placeholder*="الهوية"]`
  - Confidence: High

**Issue #5: Unbound Label - Email Input**
- **WCAG ID:** `3.3.2`
- **Level:** A
- **Status:** ❌ FAIL
- **Location:** Apply Step 2 (`/apply/:id/step-2`)
- **File:** `gov-sim/src/pages/ApplyStep2Page.tsx`
- **Line:** ~45-55
- **Code:**
  ```tsx
  <div className="form-group">
    <div>البريد الإلكتروني <span className="required">*</span></div>
    <input
      type="email"
      id="email"
      name="email"
      value={formData.email}
      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
      required
      aria-required="true"
      aria-invalid={errors.email ? 'true' : 'false'}
    />
  </div>
  ```
- **Issue:** Label text in `<div>`, not bound to input with `htmlFor` or `aria-labelledby`
- **Expected Finding:**
  - Rule: 3.3.2 Labels or Instructions
  - Status: Fail
  - Message: "Form input label not properly associated"
  - Selector: `input[type="email"][id="email"]`
  - Confidence: High

---

#### 4.1.2 Name, Role, Value (Level A) - **2 FAILS**

**Issue #6: Unlabeled Button - Generic Text**
- **WCAG ID:** `4.1.2`
- **Level:** A
- **Status:** ❌ FAIL
- **Location:** Landing page (`/`)
- **File:** `gov-sim/src/pages/LandingPage.tsx`
- **Line:** ~36-38
- **Code:**
  ```tsx
  <button type="button" className="button">
    المزيد
  </button>
  ```
- **Issue:** Button has generic text "المزيد" (More) without context, no `aria-label`
- **Expected Finding:**
  - Rule: 4.1.2 Name, Role, Value
  - Status: Fail
  - Message: "Button has ambiguous accessible name"
  - Selector: `button.button` (within service card)
  - Confidence: Medium

**Issue #7: Icon-Only Button (If Present)**
- **WCAG ID:** `4.1.2`
- **Level:** A
- **Status:** ❌ FAIL (if exists)
- **Location:** Various pages
- **Issue:** Any icon-only button without `aria-label`
- **Expected Finding:**
  - Rule: 4.1.2 Name, Role, Value
  - Status: Fail
  - Message: "Icon button missing accessible name"
  - Confidence: High

---

### ⚠️ Expected: Needs Review

#### 2.4.4 Link Purpose (In Context) (Level A) - **1 REVIEW**

**Issue #8: Ambiguous Link Text**
- **WCAG ID:** `2.4.4`
- **Level:** A
- **Status:** ⚠️ NEEDS REVIEW
- **Location:** Landing page (`/`)
- **File:** `gov-sim/src/pages/LandingPage.tsx`
- **Line:** ~36-38 (button) or similar
- **Issue:** Generic button text "المزيد" (More) without context
- **Expected Finding:**
  - Rule: 2.4.4 Link Purpose (In Context)
  - Status: Needs Review
  - Message: "Link/button text may be ambiguous without context"
  - Selector: `button.button` or similar
  - Confidence: Medium

---

### 🔍 Expected: Vision Layer Findings (Layer 2)

The Vision analysis should detect:

1. **Missing Alt Images:**
   - Hero image on landing page
   - Service card 1 image
   - Success icon

2. **Unlabeled Form Fields:**
   - National ID input (placeholder only)
   - Email input (div label not bound)

3. **Unlabeled Buttons:**
   - Generic "المزيد" button

---

### 🗺️ Expected: Assistive Map (Layer 3)

The Assistive Map should generate:

1. **Image Descriptions:**
   - For the 3 missing alt images, generate enriched descriptions:
     - `gov_hero.png`: "Saudi government building facade with modern architecture"
     - `service_card_1.png`: "Government service card design with official document style"
     - `success_icon.png`: "Green checkmark icon indicating successful submission"

2. **Label Overrides:**
   - For unlabeled buttons, generate accessible names:
     - "المزيد" button → "Learn more about service" (AR/EN)

3. **Form Field Labels:**
   - For unlabeled inputs, generate proper labels:
     - National ID input → "National ID / Iqama Number" (AR/EN)
     - Email input → "Email Address" (AR/EN)

---

## Summary Table

### Portal Good - Expected Findings

| WCAG Rule | Level | Status | Count | Notes |
|-----------|-------|--------|-------|-------|
| 1.1.1 Non-text Content | A | ✅ PASS | 0 | All images have alt |
| 3.3.2 Labels or Instructions | A | ✅ PASS | 0 | All inputs labeled |
| 4.1.2 Name, Role, Value | A | ✅ PASS | 0 | All buttons labeled |
| 2.4.7 Focus Visible | AA | ✅ PASS | 0 | Focus styles present |
| 1.4.3 Contrast (Minimum) | AA | ✅ PASS | 0 | Contrast sufficient |
| 2.1.1 Keyboard | A | ✅ PASS | 0 | Keyboard accessible |
| 2.4.3 Focus Order | A | ✅ PASS | 0 | Logical tab order |
| 2.4.4 Link Purpose | A | ✅ PASS | 0 | Descriptive links |
| **Total Failures** | | | **0** | High compliance |
| **Total Needs Review** | | | **0-2** | Possible heading issues |

### Gov Sim - Expected Findings

| WCAG Rule | Level | Status | Count | Issue Location |
|-----------|-------|--------|-------|----------------|
| 1.1.1 Non-text Content | A | ❌ FAIL | **3** | Landing hero, service card 1, success icon |
| 3.3.2 Labels or Instructions | A | ❌ FAIL | **2** | Login ID input, Step 2 email input |
| 4.1.2 Name, Role, Value | A | ❌ FAIL | **2** | Generic "المزيد" button, icon buttons |
| 2.4.4 Link Purpose | A | ⚠️ REVIEW | **1** | Ambiguous button text |
| **Total Failures** | | | **7** | Intentional issues |
| **Total Needs Review** | | | **1** | Ambiguous text |

---

## Verification Checklist

After scanning both sites, verify:

### Portal Good Verification
- [ ] **Layer 1 (DOM):** 0-2 findings (mostly Pass)
- [ ] **Layer 2 (Vision):** Minimal findings (if any)
- [ ] **Layer 3 (Assistive Map):** Generated for all pages
- [ ] **Compliance Score:** 95-100% for WCAG A and AA
- [ ] **Status Breakdown:** Mostly "Pass", few "Needs Review"

### Gov Sim Verification
- [ ] **Layer 1 (DOM):** 7+ findings (Fail + Needs Review)
- [ ] **Layer 2 (Vision):** Detects missing alt images, unlabeled fields
- [ ] **Layer 3 (Assistive Map):** 
  - [ ] Image descriptions for 3 missing alt images
  - [ ] Label overrides for 2 unlabeled buttons
  - [ ] Form field labels for 2 unlabeled inputs
- [ ] **Compliance Score:** Lower than Portal Good (expected)
- [ ] **Status Breakdown:** Multiple "Fail", some "Needs Review"

---

## Detailed Issue Locations

### Gov Sim - Exact File Locations

#### Landing Page (`/`)
- **File:** `test-sites/gov-sim/src/pages/LandingPage.tsx`
- **Line 13:** Hero image (no alt) - `gov_hero.png`
- **Line 33:** Service card 1 image (no alt) - `service_card_1.png`
- **Line 36:** Generic button "المزيد" (unlabeled/ambiguous)

#### Login Page (`/login`)
- **File:** `test-sites/gov-sim/src/pages/LoginPage.tsx`
- **Line 24-34:** National ID input (placeholder only, no label)

#### Apply Step 2 (`/apply/:id/step-2`)
- **File:** `test-sites/gov-sim/src/pages/ApplyStep2Page.tsx`
- **Line 45-55:** Email input (div label not bound)

#### Success Page (`/apply/:id/success`)
- **File:** `test-sites/gov-sim/src/pages/SuccessPage.tsx`
- **Line 16:** Success icon (no alt) - `success_icon.png`

---

## Expected Scanner Output Format

Each finding should include:
- **WCAG ID:** e.g., `1.1.1`
- **Rule Title:** e.g., "Non-text Content"
- **Level:** A, AA, or AAA
- **Status:** Pass, Fail, Needs Review, or N/A
- **Message:** Human-readable description
- **Selector:** CSS selector for the element
- **Page URL:** Full URL where issue was found
- **Confidence:** High, Medium, or Low
- **Evidence:** HTML snippet or screenshot path

---

## Notes

1. **Portal Good** is intentionally compliant - any findings should be minimal and mostly "Pass" or "Needs Review"

2. **Gov Sim** has intentional issues - scanner should detect all 7 documented failures

3. **Layer 3 (Assistive Map)** should enrich the missing data:
   - Generate alt text for images without alt
   - Generate labels for unlabeled buttons/inputs
   - This allows the widget to provide better assistance even when the page has issues

4. **Vision Layer** should complement DOM analysis by detecting visual issues that DOM analysis might miss

5. **Compliance Scores** should reflect:
   - Portal Good: 95-100% (high compliance)
   - Gov Sim: Lower percentage (intentional issues)

---

## Comparison: Applied vs Detected

| Issue Type | Applied in Code | Should Be Detected | WCAG Rule |
|------------|----------------|-------------------|-----------|
| Missing alt text (hero) | ✅ Yes | ✅ Yes | 1.1.1 |
| Missing alt text (card) | ✅ Yes | ✅ Yes | 1.1.1 |
| Missing alt text (icon) | ✅ Yes | ✅ Yes | 1.1.1 |
| Input placeholder only | ✅ Yes | ✅ Yes | 3.3.2 |
| Div label not bound | ✅ Yes | ✅ Yes | 3.3.2 |
| Generic button text | ✅ Yes | ✅ Yes | 4.1.2 |
| Ambiguous link text | ✅ Yes | ⚠️ Review | 2.4.4 |

---

**Last Updated:** After test sites implementation  
**Purpose:** Verification checklist for scanner accuracy

