# PDF Export System - Complete Implementation

## 🎯 Overview

A professional, AI-powered PDF report generation system with template-based rendering and intelligent fallbacks.

## ✨ Features

### 1. **AI-Generated Content** (Gemini AI)
- **Professional Introduction**: Context-aware introduction tailored for government/private entities
- **Executive Summary**: Overview of results, strengths, weaknesses, and recommendations
- **Key Findings Analysis**: Detailed analysis of main issues and their impact
- **Bilingual Support**: Generates content in English or Arabic
- **Fallback Templates**: Uses professional templates if AI is unavailable

### 2. **Template-Based Rendering**
- **HTML/CSS Template**: Easy to design and maintain
- **Playwright Rendering**: High-quality PDF with full CSS support
- **Logo Integration**: Raawi X logo on cover page
- **RTL Support**: Full right-to-left support for Arabic
- **Professional Design**: Tables, cards, badges, proper typography

### 3. **Smart Fallback System**
- **Primary**: Playwright (best quality, full CSS)
- **Fallback**: pdf-lib (basic, always works)
- **No Failures**: Always generates a PDF

## 📁 File Structure

```
apps/scanner/src/
├── api/
│   └── pdf-export.ts              # Main export endpoint
├── services/
│   ├── report-content-generator.ts # AI content generation
│   └── pdf-template-renderer.ts   # Template rendering
├── templates/
│   └── report-template.html        # HTML template
└── utils/
    ├── pdf-i18n.ts                # Translations
    └── logo-loader.ts              # Logo loading
```

## 🔧 How It Works

### Step 1: Data Collection
```typescript
// Fetch scan data from database
const scan = await prisma.scan.findUnique({ ... });

// Calculate compliance scores
const scores = calculateComplianceScores(ruleResults);
```

### Step 2: AI Content Generation
```typescript
// Generate professional content
const contentGenerator = new ReportContentGenerator(scanId);
const reportContent = await contentGenerator.generateContent(scanData);

// Returns:
// - introduction: Professional intro text
// - executiveSummary: Overview and recommendations
// - keyFindings: Detailed analysis
```

### Step 3: Template Rendering
```typescript
// Load logo and prepare template data
const logoDataUrl = await loadLogoAsDataUrl();
const templateData = { ... };

// Render HTML template to PDF
const renderer = new PDFTemplateRenderer(scanId);
const pdfBuffer = await renderer.renderToPDF(templateData);
```

### Step 4: Fallback (if needed)
```typescript
// If Playwright fails, use pdf-lib
const pdfDoc = await PDFDocument.create();
// ... basic PDF generation
```

## 🎨 Template Variables

The HTML template uses `{{variable}}` syntax:

- **Cover Page**: `{{reportTitle}}`, `{{entityName}}`, `{{logoDataUrl}}`
- **Introduction**: `{{introductionContent}}` (AI-generated)
- **Scores**: `{{scoreA}}`, `{{scoreAA}}`, `{{needsReviewRate}}`
- **Findings**: `{{findingsRows}}` (HTML table rows)
- **i18n**: All labels use translation keys

## 🤖 AI Content Generation

### Prompt Structure
- **Context**: Entity type, scan data, findings
- **Requirements**: Professional language, government-appropriate
- **Output**: Structured sections (introduction, summary, findings)

### Fallback Content
If Gemini is unavailable:
- Uses professional template-based content
- Maintains quality and professionalism
- No degradation in user experience

## 🌐 Internationalization

### Supported Languages
- **English (en)**: Full support
- **Arabic (ar)**: Full RTL support

### Translation Keys
All UI text uses `getPDFTranslation(key, locale)`:
- Report titles
- Section headers
- Labels and descriptions
- Status badges

## 📊 Report Sections

1. **Cover Page**
   - Raawi X logo
   - Report title
   - Entity and property info
   - Scan date

2. **Introduction Page**
   - AI-generated introduction
   - Executive summary
   - Compliance scores (WCAG A/AA)
   - Scan statistics

3. **Key Findings Page**
   - AI-generated findings analysis
   - Top findings table
   - WCAG ID, level, status, description

## 🔄 Error Handling

### Levels of Fallback
1. **Playwright fails** → Use pdf-lib
2. **AI unavailable** → Use template content
3. **Logo missing** → Continue without logo
4. **Template missing** → Use pdf-lib directly

### Error Logging
- All errors logged with context
- User-friendly error messages
- Never fails silently

## 🚀 Usage

### API Endpoint
```http
POST /api/reports/export
Content-Type: application/json

{
  "scanId": "scan_123",
  "format": "pdf",
  "locale": "en" | "ar"
}
```

### Response
- **Content-Type**: `application/pdf`
- **Content-Disposition**: `attachment; filename="raawi-x-report-{scanId}-{locale}.pdf"`
- **Body**: PDF binary data

## ⚙️ Configuration

### Environment Variables
```env
# Gemini AI (optional but recommended)
GEMINI_ENABLED=true
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-1.5-flash
```

### Logo Location
The system searches for `dashboardlogo.png` in:
1. Project root
2. `apps/report-ui/public/`
3. `apps/scanner/`
4. Current directory

## 📝 Customization

### Update Template
Edit `apps/scanner/src/templates/report-template.html`:
- Change layout
- Add sections
- Modify styling
- No code changes needed!

### Add Translations
Edit `apps/scanner/src/utils/pdf-i18n.ts`:
- Add new keys
- Update existing translations
- Support new languages

### Customize AI Prompts
Edit `apps/scanner/src/services/report-content-generator.ts`:
- Modify prompt structure
- Add new sections
- Change tone/style

## ✅ Testing

1. **Test with AI enabled**: Full feature set
2. **Test with AI disabled**: Fallback content
3. **Test Playwright failure**: pdf-lib fallback
4. **Test both languages**: EN and AR
5. **Test with/without logo**: Both scenarios

## 🎯 Next Steps

- [ ] Add charts/graphs to template
- [ ] Support custom branding
- [ ] Add more report sections
- [ ] Export to other formats (DOCX, HTML)
- [ ] Batch export multiple scans

---

**Status**: ✅ Fully Implemented and Ready for Testing

