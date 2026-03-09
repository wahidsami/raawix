# Generate React Accessibility Test Component

⚠️ **IMPORTANT:** Generate ONLY the React component code, NOT a full project!

## What I Need

A single React component file (`AccessibilityTest.tsx`) that contains **intentional accessibility violations** for testing an AI-powered accessibility scanner.

## Output Format

Please respond with ONLY the component code in this format:

```tsx
import React from 'react';

export default function AccessibilityTest() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* All code here */}
    </div>
  );
}
```

**DO NOT include:**
- package.json
- vite.config
- Project setup
- Build configurations
- Multiple files

**Just give me the single .tsx file content!**

---

## Component Requirements

### Visual Structure

1. **Header**: Simple navigation bar with logo
2. **Warning Banner**: RED background with large warning text
3. **8 Sections**: Each in a white card with shadow
4. **Footer**: Simple footer with copyright

### Section 1: Unlabeled Icon Buttons
Create **6 buttons** with emoji icons but NO aria-label:

```tsx
<button className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
  🔍
</button>
<button className="p-3 bg-green-500 text-white rounded-lg hover:bg-green-600">
  ⚙️
</button>
<button className="p-3 bg-red-500 text-white rounded-lg hover:bg-red-600">
  🗑️
</button>
<button className="p-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
  ➕
</button>
<button className="p-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
  📥
</button>
<button className="p-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">
  🔔
</button>
```

### Section 2: Images Without Alt Text
Create **4 images** using SVG data URIs with NO proper alt:

```tsx
<img 
  src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect fill='%23ff6b6b' width='200' height='150'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='20' fill='white'%3EProduct 1%3C/text%3E%3C/svg%3E"
  className="w-full rounded"
/>
<img 
  src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect fill='%234ecdc4' width='200' height='150'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='20' fill='white'%3EProduct 2%3C/text%3E%3C/svg%3E"
  alt=""
  className="w-full rounded"
/>
<img 
  src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect fill='%2395e1d3' width='200' height='150'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='20' fill='white'%3EProduct 3%3C/text%3E%3C/svg%3E"
  alt="image"
  className="w-full rounded"
/>
<img 
  src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect fill='%23a8e6cf' width='200' height='150'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='20' fill='white'%3EProduct 4%3C/text%3E%3C/svg%3E"
  alt="img_1234.jpg"
  className="w-full rounded"
/>
```

### Section 3: Clickable Divs Without Roles
Create **5 clickable divs** with onClick but NO role="button":

```tsx
<div 
  className="p-4 bg-blue-100 rounded-lg cursor-pointer hover:bg-blue-200"
  onClick={() => console.log('Email clicked')}
>
  <span className="text-3xl">📧</span>
</div>
```

Icons: 📧 📱 💬 🔗 🖨️

### Section 4: Form Without Labels
Create a form with **8 inputs** and NO `<label>` elements:

```tsx
<form className="space-y-4">
  <input 
    type="text"
    placeholder="Username"
    className="w-full px-4 py-2 border rounded-lg"
  />
  <input 
    type="email"
    placeholder="Email Address"
    className="w-full px-4 py-2 border rounded-lg"
  />
  <input 
    type="password"
    placeholder="Password"
    className="w-full px-4 py-2 border rounded-lg"
  />
  <input 
    type="tel"
    placeholder="Phone Number"
    className="w-full px-4 py-2 border rounded-lg"
  />
  <select className="w-full px-4 py-2 border rounded-lg">
    <option>Select Country</option>
    <option>USA</option>
    <option>UK</option>
    <option>Canada</option>
  </select>
  <input 
    type="date"
    placeholder="Birth Date"
    className="w-full px-4 py-2 border rounded-lg"
  />
  <div className="flex gap-4">
    <div className="flex items-center gap-2 cursor-pointer">
      <div className="w-5 h-5 rounded-full border-2 border-gray-400"></div>
      <span>♂️</span>
    </div>
    <div className="flex items-center gap-2 cursor-pointer">
      <div className="w-5 h-5 rounded-full border-2 border-gray-400"></div>
      <span>♀️</span>
    </div>
    <div className="flex items-center gap-2 cursor-pointer">
      <div className="w-5 h-5 rounded-full border-2 border-gray-400"></div>
      <span>⚧️</span>
    </div>
  </div>
  <div className="flex items-center gap-2 cursor-pointer">
    <div className="w-5 h-5 border-2 border-gray-400 rounded"></div>
    <span>Subscribe to newsletter</span>
  </div>
  <button 
    type="submit"
    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
  >
    ➡️
  </button>
</form>
```

### Section 5: Icon-Only Links
Create **6 links** with emojis but NO text:

```tsx
<a href="#" className="text-4xl hover:opacity-70">🏠</a>
<a href="#" className="text-4xl hover:opacity-70">📄</a>
<a href="#" className="text-4xl hover:opacity-70">📊</a>
<a href="#" className="text-4xl hover:opacity-70">⚙️</a>
<a href="#" className="text-4xl hover:opacity-70">👤</a>
<a href="#" className="text-4xl hover:opacity-70">❓</a>
```

Plus **3 generic text links**:
```tsx
<a href="#" className="text-blue-500 underline">Click here</a>
<a href="#" className="text-blue-500 underline">Read more</a>
<a href="#" className="text-blue-500 underline">Learn more</a>
```

### Section 6: Custom Controls Without ARIA
Create **5 custom controls** using divs (NO ARIA):

```tsx
{/* Custom checkbox */}
<div className="w-6 h-6 border-2 border-gray-400 rounded cursor-pointer hover:bg-gray-100"></div>

{/* Custom toggle */}
<div className="w-12 h-6 bg-gray-300 rounded-full cursor-pointer hover:bg-gray-400"></div>

{/* Custom radio */}
<div className="w-6 h-6 border-2 border-gray-400 rounded-full cursor-pointer hover:bg-gray-100"></div>

{/* Custom slider */}
<div className="w-48 h-2 bg-gray-300 rounded-full relative cursor-pointer">
  <div className="absolute top-1/2 left-1/4 transform -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full"></div>
</div>

{/* Custom dropdown */}
<div className="px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
  Select option ▼
</div>
```

### Section 7: Low Contrast Text
Create **4 paragraphs** with poor contrast:

```tsx
<p className="text-gray-300">Light gray text on white background (#E0E0E0)</p>
<p className="text-yellow-300">Yellow text on white background (#FFEB3B)</p>
<p className="text-blue-200">Light blue text on white background (#81D4FA)</p>
<p className="text-orange-400 bg-orange-100 p-2">Orange on light orange (#FF9800 on #FFE0B2)</p>
```

### Section 8: Skipped Heading Levels
```tsx
<h1 className="text-3xl font-bold">Main Title</h1>
<h3 className="text-xl font-semibold">Skipped H2 - Direct to H3</h3>
<h5 className="text-sm font-semibold">Skipped H4 - Direct to H5</h5>
<p>Some content here...</p>
```

---

## Styling Requirements

- Use Tailwind CSS classes throughout
- Max width: `max-w-6xl mx-auto`
- Padding: `p-6` or `p-8`
- Card style: `bg-white rounded-lg shadow-md p-6 mb-6`
- Warning banner: `bg-red-500 text-white p-8 text-center`

---

## Complete Example Structure

```tsx
import React from 'react';

export default function AccessibilityTest() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-blue-600">Test Portal</h1>
        </div>
      </header>

      {/* Warning Banner */}
      <div className="bg-red-500 text-white p-8 text-center">
        <h1 className="text-4xl font-bold mb-2">⚠️ ACCESSIBILITY TEST PAGE</h1>
        <p className="text-xl">Contains INTENTIONAL violations for scanner testing</p>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        
        {/* Section 1: Unlabeled Buttons */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">1. Unlabeled Icon Buttons</h2>
          <div className="flex gap-4 mb-4">
            {/* Buttons here */}
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <p className="text-sm text-yellow-800">
              ❌ <strong>Violation:</strong> Buttons have no accessible labels
            </p>
          </div>
        </section>

        {/* Repeat for all 8 sections */}
        
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6 mt-12">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p>Test Portal - Accessibility Testing Page</p>
          <p className="text-sm text-gray-400 mt-2">Violations are intentional for testing</p>
        </div>
      </footer>
    </div>
  );
}
```

---

## Final Checklist

Before responding, ensure your component has:
- [ ] All 8 sections implemented
- [ ] 6 unlabeled buttons
- [ ] 4 images without proper alt
- [ ] 5 clickable divs without roles
- [ ] 8 form inputs without labels
- [ ] 9 links (6 icon-only + 3 generic)
- [ ] 5 custom controls without ARIA
- [ ] 4 low contrast examples
- [ ] Skipped heading levels
- [ ] Professional styling with Tailwind
- [ ] Self-contained (no external dependencies)
- [ ] Ready to copy-paste

**Now generate the complete React component code!**
