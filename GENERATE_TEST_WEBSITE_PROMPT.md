# Test Website Generation Prompt for Accessibility Scanner

## Context
I need you to create a complete, working test website that contains **intentional accessibility violations** for testing an accessibility scanner. This website will be used to verify that our vision-based AI scanner (using Gemini Vision API) can detect common accessibility issues.

## Requirements

### Project Setup
- **Framework**: [React.js OR Angular - specify which one]
- **Styling**: Use Tailwind CSS classes (assume Tailwind is already available)
- **Single Page**: All content on one page (no routing needed)
- **Self-contained**: No external API calls, all data/images embedded
- **Output Format**: ONLY the component file code, NOT a full project
- **Dependencies**: NONE - use only React/Angular core, no additional libraries

### Page Structure

Create a single-page website with the following structure:

```
├── Header (with navigation)
├── Warning Banner (RED - explaining this is for testing)
├── Section 1: Unlabeled Icon Buttons
├── Section 2: Images Without Alt Text
├── Section 3: Clickable Divs Without Roles
├── Section 4: Form Inputs Without Labels
├── Section 5: Icon-Only Links
├── Section 6: Custom Controls Without ARIA
├── Section 7: Low Contrast Text
├── Section 8: Missing Form Labels
├── Footer
```

---

## Detailed Requirements for Each Section

### 1. **Unlabeled Icon Buttons** ❌
Create **6 buttons** with ONLY icons (no text, no aria-label, no title):

**Icons to use:**
- 🔍 Search button (blue background)
- ⚙️ Settings button (green background)
- 🗑️ Delete button (red background)
- ➕ Add button (purple background)
- 📥 Download button (orange background)
- 🔔 Notifications button (yellow background)

**Requirements:**
- Use `<button>` elements
- NO `aria-label` attribute
- NO `title` attribute
- NO visible text (only emoji/icon)
- Add hover effects for visual feedback

**Example (what NOT to do - this is what we WANT):**
```jsx
<button className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
  🔍
</button>
```

---

### 2. **Images Without Alt Text** ❌
Create **4 images** with missing or improper alt attributes:

**Image Requirements:**
1. **Image 1:** No `alt` attribute at all
2. **Image 2:** Empty `alt=""` on a meaningful image
3. **Image 3:** Generic alt text like "image" or "photo"
4. **Image 4:** Alt text that's just the filename like "img_1234.jpg"

**Use embedded SVG or data URIs for images:**
```jsx
<img 
  src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect fill='%23ff6b6b' width='200' height='150'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='white' font-size='20'%3EProduct Image%3C/text%3E%3C/svg%3E"
  className="w-full"
/>
```

Create 4 different colored rectangles with text: "Product 1", "Product 2", "Product 3", "Product 4"

---

### 3. **Clickable Divs Without Roles** ❌
Create **5 clickable div elements** that should be buttons but are implemented as divs:

**Requirements:**
- Use `<div>` with `onClick` handlers
- NO `role="button"` attribute
- NO `tabIndex` attribute
- NO keyboard support
- Add cursor pointer and hover effects

**Examples:**
1. Email icon div (📧) - Light blue background
2. Phone icon div (📱) - Light green background
3. Message icon div (💬) - Light purple background
4. Share icon div (🔗) - Light orange background
5. Print icon div (🖨️) - Light gray background

---

### 4. **Form Inputs Without Labels** ❌
Create a complete form with **8 form fields**, ALL without proper `<label>` elements:

**Form Fields:**
1. Username input (text) - only placeholder="Username"
2. Email input (email) - only placeholder="Email"
3. Password input (password) - only placeholder="Password"
4. Phone Number input (tel) - only placeholder="Phone"
5. Country select dropdown - first option says "Select Country"
6. Birth Date input (date) - only placeholder
7. Gender radio buttons (3 options) - no labels, just icons ♂️ ♀️ ⚧️
8. Subscribe checkbox - no label, just text next to it
9. Submit button - only icon ➡️ with no text

**Requirements:**
- NO `<label>` elements
- Use placeholders only
- NO `aria-label` or `aria-labelledby`

---

### 5. **Icon-Only Links** ❌
Create **6 navigation links** with ONLY icons (no text):

**Links:**
1. 🏠 Home link
2. 📄 Documents link
3. 📊 Reports link
4. ⚙️ Settings link
5. 👤 Profile link
6. ❓ Help link

**Plus 3 generic text links:**
1. "Click here"
2. "Read more"
3. "Learn more"

**Requirements:**
- Use `<a>` elements with href="#"
- NO visible text (icons only)
- NO `aria-label` attribute
- NO `title` attribute

---

### 6. **Custom Controls Without ARIA** ❌
Create **5 custom interactive controls** without proper ARIA attributes:

1. **Custom Checkbox** - A div that looks like a checkbox (square with border)
2. **Custom Toggle Switch** - A div that looks like a toggle (rounded rectangle)
3. **Custom Radio Buttons** - Divs that look like radio buttons (circles)
4. **Custom Slider** - A div with a draggable handle (no role="slider")
5. **Custom Dropdown** - A div that opens a menu (no role="combobox")

**Requirements:**
- Use `<div>` elements
- NO ARIA roles (`role="checkbox"`, etc.)
- NO ARIA states (`aria-checked`, `aria-selected`, etc.)
- Add visual states (colors/borders) for hover
- Include onClick handlers but NO keyboard support

---

### 7. **Low Contrast Text** ❌
Create **4 text examples** with insufficient color contrast:

1. Light gray text on white background (#E0E0E0 on #FFFFFF)
2. Yellow text on white background (#FFEB3B on #FFFFFF)
3. Light blue text on white background (#81D4FA on #FFFFFF)
4. Orange text on light orange background (#FF9800 on #FFE0B2)

**Content:** Use 2-3 sentences of lorem ipsum for each example

---

### 8. **Missing Heading Structure** ❌
Create content with skipped heading levels:

```html
<h1>Main Title</h1>
<h3>Skipped H2 - Direct to H3</h3>
<h5>Skipped H4 - Direct to H5</h5>
<p>Some content...</p>
```

---

## Visual Design Requirements

### Color Scheme
- **Warning Banner:** Bright red (#EF4444) background with white text
- **Section Cards:** White background with subtle shadow
- **Buttons:** Colorful (blue, green, red, purple, orange, yellow)
- **Background:** Light gray (#F9FAFB)

### Layout
- Max width: 1200px
- Centered content
- Padding: 2rem
- Sections separated by 1.5rem margin
- Rounded corners on cards (8px)

### Typography
- **H1:** 36px, bold, margin-bottom: 8px
- **H2:** 24px, bold, margin-bottom: 16px
- **H3:** 20px, semi-bold
- **Body:** 16px, regular

---

## Code Structure Requirements

### For React Version:
```jsx
import React from 'react';

export default function AccessibilityTestPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header>...</header>
      
      {/* Warning Banner */}
      <div className="bg-red-500 text-white">
        <h1>⚠️ ACCESSIBILITY TEST PAGE</h1>
        <p>This page contains INTENTIONAL violations for scanner testing</p>
      </div>
      
      {/* Sections */}
      <main>
        <section>{/* Unlabeled Buttons */}</section>
        <section>{/* Images Without Alt */}</section>
        {/* ... more sections ... */}
      </main>
      
      {/* Footer */}
      <footer>...</footer>
    </div>
  );
}
```

### For Angular Version:
```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-accessibility-test',
  standalone: true,
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <header>...</header>
      
      <!-- Warning Banner -->
      <div class="bg-red-500 text-white">
        <h1>⚠️ ACCESSIBILITY TEST PAGE</h1>
        <p>This page contains INTENTIONAL violations for scanner testing</p>
      </div>
      
      <!-- Sections -->
      <main>
        <section><!-- Unlabeled Buttons --></section>
        <section><!-- Images Without Alt --></section>
        <!-- ... more sections ... -->
      </main>
      
      <!-- Footer -->
      <footer>...</footer>
    </div>
  `,
  styles: [`
    /* Add inline styles here */
  `]
})
export class AccessibilityTestComponent {}
```

---

## What NOT to Include (Important!)

❌ **DO NOT add:**
- `aria-label` attributes
- `title` attributes
- `<label>` elements for form inputs
- `alt` attributes on images (or make them empty/wrong)
- ARIA roles on custom controls
- Proper semantic HTML
- Keyboard navigation support
- Focus indicators
- Screen reader support

✅ **These violations are INTENTIONAL** - we want the scanner to find them!

---

## Example Section Template

Each section should look like this:

```jsx
<section className="bg-white rounded-lg shadow-md p-6 mb-6">
  <h2 className="text-xl font-bold mb-4">
    [Section Number]. [Section Title]
  </h2>
  
  <div className="flex gap-4 mb-4">
    {/* Interactive elements with violations */}
  </div>
  
  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
    <p className="text-sm text-yellow-800">
      ❌ <strong>Violation:</strong> [Explain what's wrong]
    </p>
    <p className="text-xs text-yellow-700 mt-1">
      🎯 <strong>Expected Finding:</strong> Scanner should detect [specific issue]
    </p>
  </div>
</section>
```

---

## Additional Requirements

1. **Self-Contained:** No external dependencies except React/Angular core
2. **Copy-Paste Ready:** Should work immediately after pasting
3. **Visual Polish:** Make it look professional (use good spacing, colors, shadows)
4. **Clear Labels:** Each section should clearly state what violation it contains
5. **Test Instructions:** Include a final section explaining how to test with the scanner

---

## Expected Output

⚠️ **IMPORTANT:** I only need the COMPONENT CODE, not a full project!

Please provide:
1. **ONLY the component file code** (AccessibilityTest.tsx or .component.ts)
2. **NO package.json, NO vite.config, NO project setup**
3. **Self-contained component** that can be dropped into an existing project
4. **All styles inline** (using className with Tailwind or inline styles)

**Format your response like this:**

```tsx
// ============================================
// FILE: AccessibilityTest.tsx (React Version)
// ============================================

import React from 'react';

export default function AccessibilityTest() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Component code here */}
    </div>
  );
}

// ============================================
// INTEGRATION INSTRUCTIONS:
// ============================================
// 1. Save this file as: apps/test-sites/src/pages/AccessibilityTest.tsx
// 2. Add route in main.tsx:
//    import AccessibilityTest from './pages/AccessibilityTest';
//    <Route path="/accessibility-test" element={<AccessibilityTest />} />
// 3. Restart dev server
```

**DO NOT provide:**
- Full project structure
- package.json
- vite.config.ts
- tsconfig.json
- Index files
- Build configurations

---

## Testing Checklist

The generated website should have:
- [ ] 6 unlabeled icon buttons
- [ ] 4 images without proper alt text
- [ ] 5 clickable divs without roles
- [ ] 8 form inputs without labels
- [ ] 9 links without descriptive text
- [ ] 5 custom controls without ARIA
- [ ] 4 low contrast text examples
- [ ] Skipped heading levels
- [ ] Professional visual design
- [ ] Clear section explanations

**Total Expected Violations:** ~40+ accessibility issues

---

## Notes for AI Generator

- Focus on creating **realistic-looking** UI components that developers might actually build
- Make violations **obvious** but not cartoonishly bad
- Include **explanatory text** in each section so testers understand what's being tested
- Make it **visually appealing** - this will be shown to clients/stakeholders
- Ensure all code is **production-ready** quality (even though it has violations)

---

**Generate the complete, working code now!**
