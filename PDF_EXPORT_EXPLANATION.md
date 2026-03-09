# PDF Export - Current Implementation & Template Proposal

## 🔍 Current Implementation

### How It Works Now

The PDF export is **programmatically generated** using `pdf-lib`:

1. **Backend Endpoint**: `POST /api/reports/export`
2. **Library**: `pdf-lib` (JavaScript PDF generation)
3. **Method**: Code-based drawing (no template)

### Current Flow

```
1. User clicks "Export PDF" → Frontend calls API
2. Backend fetches scan data from database
3. Calculates compliance scores
4. Creates PDF document programmatically:
   - Cover page (title, entity, property, date)
   - Executive summary (scores, stats)
   - Key issues (top findings)
5. Returns PDF as binary blob
6. Frontend downloads file
```

### Current Structure

```typescript
// Hardcoded in pdf-export.ts
const pdfDoc = await PDFDocument.create();
const coverPage = pdfDoc.addPage([595, 842]); // A4

// Manual drawing
coverPage.drawText('Raawi X Accessibility Report', {
  x: 50,
  y: 742,
  size: 24,
  font: fontBold,
});
// ... more manual drawing
```

### Limitations

1. **Hard to maintain**: Layout changes require code changes
2. **No design flexibility**: Can't easily change fonts, colors, layout
3. **No template reuse**: Each report type needs new code
4. **Limited styling**: Basic text positioning only
5. **No branding**: Hard to add logos, custom headers/footers

---

## 🎨 Template-Based Approach (Proposed)

### Option 1: HTML/CSS Template → PDF (Recommended)

**Use libraries**: `puppeteer` or `playwright` to render HTML → PDF

**Advantages**:
- ✅ Easy to design (HTML/CSS)
- ✅ Full styling control (fonts, colors, layouts)
- ✅ Can use existing React components
- ✅ Easy to maintain and update
- ✅ Supports RTL naturally
- ✅ Can embed images, charts, tables

**Structure**:
```
templates/
  report-template.html (or .tsx)
  styles/
    report-en.css
    report-ar.css
```

**Flow**:
```
1. Load HTML template
2. Inject data (scan results, scores, findings)
3. Apply CSS (EN or AR)
4. Render with Puppeteer/Playwright
5. Generate PDF
```

### Option 2: PDF Template with Placeholders

**Use libraries**: `pdf-lib` with template PDFs

**Advantages**:
- ✅ Professional design in design tools (InDesign, Figma)
- ✅ Exact layout control
- ✅ Branding (logos, colors)

**Limitations**:
- ❌ Harder to update (need design tool)
- ❌ Limited dynamic content
- ❌ RTL support is complex

### Option 3: React Component → PDF

**Use libraries**: `@react-pdf/renderer` or `react-pdf`

**Advantages**:
- ✅ React components (reusable)
- ✅ Type-safe
- ✅ Easy to maintain
- ✅ Good RTL support

**Example**:
```tsx
// templates/ReportTemplate.tsx
import { Document, Page, Text, View } from '@react-pdf/renderer';

export const ReportTemplate = ({ scan, scores }) => (
  <Document>
    <Page>
      <Text>Raawi X Accessibility Report</Text>
      <Text>{scan.entity.nameEn}</Text>
      {/* ... */}
    </Page>
  </Document>
);
```

---

## 🚀 Recommended Solution: HTML Template + Puppeteer

### Why This Approach?

1. **Easy to design**: Use HTML/CSS (familiar)
2. **Flexible**: Can use Tailwind, custom CSS, or CSS-in-JS
3. **RTL support**: Natural CSS direction support
4. **Maintainable**: Update templates without code changes
5. **Rich content**: Tables, charts, images easily

### Implementation Plan

1. **Create template structure**:
   ```
   apps/scanner/src/templates/
     report-template.html
     styles/
       report.css
       report-ar.css
   ```

2. **Template variables**:
   ```html
   <h1>{{reportTitle}}</h1>
   <p>Entity: {{entityName}}</p>
   <p>WCAG A: {{scoreA}}%</p>
   <!-- ... -->
   ```

3. **Backend rendering**:
   ```typescript
   // Load template
   const template = await readFile('templates/report-template.html');
   
   // Replace variables
   const html = template
     .replace('{{reportTitle}}', 'Raawi X Report')
     .replace('{{entityName}}', scan.entity.nameEn)
     // ...
   
   // Render with Puppeteer
   const pdf = await page.pdf({ format: 'A4' });
   ```

4. **Benefits**:
   - Designers can edit HTML/CSS directly
   - No code changes for layout updates
   - Easy to add new sections
   - Supports complex layouts

---

## 🔧 Fixing Current 500 Error

The error is likely due to:
- `scores.scoreA` or `scores.scoreAA` being `null`
- Calling `.toFixed()` on `null` throws error

**Fix needed**:
```typescript
// Before (crashes if null)
summaryPage.drawText(`WCAG A Compliance: ${scores.scoreA.toFixed(1)}%`, ...);

// After (handles null)
summaryPage.drawText(
  `WCAG A Compliance: ${scores.scoreA !== null ? scores.scoreA.toFixed(1) : 'N/A'}%`,
  ...
);
```

---

## 📋 Next Steps

1. **Immediate**: Fix 500 error (null score handling)
2. **Short-term**: Improve current PDF (better formatting, more content)
3. **Long-term**: Implement template-based system (HTML + Puppeteer)

Would you like me to:
- A) Fix the 500 error first?
- B) Implement template-based PDF generation?
- C) Both?

