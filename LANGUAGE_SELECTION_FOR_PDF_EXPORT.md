# Language Selection for PDF Report Export - Implementation Plan

## 📋 Overview

This document outlines the plan to enhance the PDF report export feature to allow users to explicitly select the language (Arabic or English) when exporting scan reports.

## ✅ Current Status

### Backend (Already Implemented ✅)
- **API Endpoint**: `POST /api/reports/export`
- **Language Support**: Fully supports `locale: 'en' | 'ar'` parameter
- **Content Generation**: AI-powered content generation supports both languages
- **Translations**: All UI labels use `getPDFTranslation()` with locale support
- **RTL Support**: Full RTL layout support for Arabic reports

### Frontend (Partially Implemented ⚠️)

#### ✅ EntityDetailPage
- Has **two separate buttons** for English and Arabic export
- Users can choose language explicitly
- **Location**: `apps/report-ui/src/pages/EntityDetailPage.tsx` (lines 1251-1292)

#### ⚠️ ScanDetailPage
- Uses **current UI language** only (follows i18n language)
- No explicit language selection
- **Location**: `apps/report-ui/src/pages/ScanDetailPage.tsx` (line 315)

## 🎯 Implementation Plan

### Phase 1: Enhance ScanDetailPage Export Button

**Goal**: Add a language selector dropdown to the Export PDF button

**Implementation Steps**:

1. **Add Language Selector Component**
   - Create a dropdown menu with two options: "English" and "Arabic"
   - Use a split button design: Main button + dropdown arrow
   - Or use a simple dropdown that appears on click

2. **Update ScanDetailPage.tsx**
   ```typescript
   // Add state for selected export language
   const [exportLocale, setExportLocale] = useState<'en' | 'ar'>('en');
   
   // Update export button to use selected locale
   onClick={async () => {
     const blob = await apiClient.exportPDF(scanId, exportLocale);
     // ... rest of export logic
   }}
   ```

3. **UI Design Options**:
   - **Option A**: Split button with dropdown arrow
   - **Option B**: Dropdown menu on button click
   - **Option C**: Language selector next to button

### Phase 2: Improve EntityDetailPage (Optional Enhancement)

**Goal**: Replace two separate buttons with a single button + dropdown

**Benefits**:
- Cleaner UI
- Consistent with ScanDetailPage
- Saves space

**Implementation**:
- Replace two buttons with one button + language selector
- Same dropdown component as ScanDetailPage

### Phase 3: Add Translation Keys

**New Translation Keys Needed**:
```json
{
  "common": {
    "exportPDF": "Export PDF",
    "exportPDFEnglish": "Export PDF (English)",
    "exportPDFArabic": "Export PDF (Arabic)",
    "selectLanguage": "Select Language",
    "english": "English",
    "arabic": "Arabic"
  }
}
```

### Phase 4: Testing

**Test Cases**:
1. ✅ Export PDF in English from ScanDetailPage
2. ✅ Export PDF in Arabic from ScanDetailPage
3. ✅ Language selector persists selection
4. ✅ PDF content is in selected language
5. ✅ RTL layout works for Arabic PDFs
6. ✅ AI-generated content is in selected language

## 🎨 UI/UX Design

### Recommended Design: Split Button with Dropdown

```
┌─────────────────────────────┐
│  Export PDF          ▼     │  ← Main button
└─────────────────────────────┘
         │
         ▼ (on click)
┌─────────────────────────────┐
│  📄 Export PDF (English)    │
│  📄 Export PDF (Arabic)     │
└─────────────────────────────┘
```

### Alternative: Simple Dropdown Menu

```
┌─────────────────────────────┐
│  Export PDF          ▼     │  ← Button with dropdown
└─────────────────────────────┘
```

## 📁 Files to Modify

### Frontend
1. `apps/report-ui/src/pages/ScanDetailPage.tsx`
   - Add export locale state
   - Add language selector UI
   - Update export handler

2. `apps/report-ui/src/pages/EntityDetailPage.tsx` (optional)
   - Replace two buttons with dropdown
   - Use same language selector component

3. `apps/report-ui/src/i18n/locales/en.json`
   - Add translation keys

4. `apps/report-ui/src/i18n/locales/ar.json`
   - Add Arabic translations

### Components (New - Optional)
5. `apps/report-ui/src/components/ExportPDFButton.tsx` (optional)
   - Reusable component with language selector
   - Can be used in both pages

## 🔧 Technical Details

### API Usage
```typescript
// Current usage
await apiClient.exportPDF(scanId, 'en'); // English
await apiClient.exportPDF(scanId, 'ar'); // Arabic

// No changes needed - API already supports it!
```

### State Management
```typescript
// In ScanDetailPage
const [exportLocale, setExportLocale] = useState<'en' | 'ar'>(
  i18n.language === 'ar' ? 'ar' : 'en' // Default to current UI language
);
```

### Component Structure
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button>
      <Download /> Export PDF
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={() => handleExport('en')}>
      <FileText /> Export PDF (English)
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => handleExport('ar')}>
      <FileText /> Export PDF (Arabic)
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

## ✅ Acceptance Criteria

- [ ] Users can select language (EN/AR) when exporting from ScanDetailPage
- [ ] Selected language is used for PDF generation
- [ ] PDF content (AI-generated + UI labels) is in selected language
- [ ] RTL layout works correctly for Arabic PDFs
- [ ] UI is intuitive and accessible
- [ ] Translations are complete (EN/AR)
- [ ] Works consistently across all export locations

## 🚀 Implementation Priority

**Priority**: Medium
**Estimated Effort**: 2-3 hours
**Dependencies**: None (backend already supports it)

## 📝 Notes

- Backend is **fully ready** - no changes needed
- This is primarily a **UI enhancement**
- Can reuse existing dropdown components from UI library
- Consider caching user's language preference for future exports
