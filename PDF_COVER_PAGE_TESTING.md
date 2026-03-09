# 📄 PDF Cover Page Redesign - Testing Guide

## ✅ Features Implemented

### 1. **Bigger Raawi X Logo**
- Size increased from 150px to 250px
- More prominent branding

### 2. **Entity Logo Upload**
- Full upload feature via dashboard
- Supports PNG, JPG, SVG (max 2MB)
- Logo preview before saving
- Remove/change logo option

### 3. **Green Separator Line**
- Elegant gradient separator
- Visual hierarchy enhancement

### 4. **Powered By Unifinity AI Footer**
- Fixed footer with company branding
- Auto-loaded from `D:\Waheed\RaawiX\images\poweredby.png`

### 5. **Improved Layout**
- Entity info left-aligned
- Better spacing and typography
- Professional appearance

---

## 🧪 Testing Steps

### **Step 1: Restart Services**

#### Scanner:
```powershell
# In scanner terminal (Ctrl+C to stop current)
cd D:\Waheed\RaawiX\apps\scanner
pnpm prisma generate
pnpm scanner:dev
```

#### Report UI:
```powershell
# In report-ui terminal (Ctrl+C to stop current)
cd D:\Waheed\RaawiX\apps\report-ui
pnpm dev
```

### **Step 2: Test Logo Upload**

1. **Navigate to Entities**
   - Open Dashboard: `http://localhost:5173`
   - Go to "Entities" page
   - Click "Edit" on "Ministry of Industry and Mineral Resources"

2. **Upload Logo**
   - Scroll to "Entity Logo" section (after "Name (Arabic)")
   - Click "Upload Logo" button
   - Select a PNG/JPG logo file (max 2MB)
   - You should see "Logo uploaded" message
   - Click "Save"

3. **Verify Upload**
   - Logo preview should appear in the form
   - File should be saved to `/uploads/entity-logos/`
   - Entity should be updated successfully

### **Step 3: Test PDF Export**

1. **Navigate to Scan**
   - Go to "Entities" → Select entity → "Scans" tab
   - Click "View" on scan: `scan_1768448045285_q7gxr13`

2. **Export PDF**
   - Click "Export" dropdown
   - Select "Export PDF (Arabic)" or "Export PDF (English)"
   - PDF should download

3. **Verify Cover Page**
   - Open the PDF
   - **Check the cover page for:**
     - ✅ Bigger Raawi X logo at top
     - ✅ Entity logo (if uploaded) in center
     - ✅ Green separator line below entity logo
     - ✅ Entity information (left-aligned):
       - Entity: Ministry of Industry and Mineral Resources
       - Property: www.mim.gov.sa
       - Scan Date: [date]
       - Entity Code: GOV-566131
     - ✅ "Powered By Unifinity AI" logo at bottom

---

## 🎯 Expected Results

### **Cover Page Layout:**

```
┌───────────────────────────────────────┐
│                                       │
│      [Raawi X Logo - BIGGER!]        │ ← 250px
│                                       │
│  Raawi X Accessibility Report         │ ← Green title
│                                       │
│      [Entity Logo]                    │ ← 250px max (if uploaded)
│                                       │
│  ─────────────────────────────────    │ ← Green gradient line
│                                       │
│  Entity: Ministry of Industry...      │ ← Left-aligned
│  Property: www.mim.gov.sa             │
│  Scan Date: 1/15/2026                 │
│  Entity Code: GOV-566131              │
│                                       │
│                                       │
│                                       │
│                                       │
│     [Powered By Unifinity AI]         │ ← Fixed footer
│                                       │
└───────────────────────────────────────┘
```

---

## 🔧 Troubleshooting

### **Issue: Logo not uploading**
- Check file size (max 2MB)
- Check file type (PNG, JPG, SVG only)
- Check scanner logs for errors
- Verify `/uploads/entity-logos/` directory exists

### **Issue: Entity logo not appearing in PDF**
- Check if `logoPath` was saved to database
- Check if file exists in `/uploads/entity-logos/`
- Check scanner logs during PDF generation
- Verify entity was saved with logo

### **Issue: Powered By logo missing**
- Verify file exists at `D:\Waheed\RaawiX\images\poweredby.png`
- Check scanner logs for logo loading errors

### **Issue: Prisma errors**
- Run `pnpm prisma generate` in scanner directory
- Restart scanner service
- Check database migration was applied

---

## 📂 Files Modified

### Backend (Scanner):
- `apps/scanner/prisma/schema.prisma` - Added `logoPath` to Entity model
- `apps/scanner/src/api/upload.ts` - NEW: File upload endpoint
- `apps/scanner/src/api/entities.ts` - Updated validation schema
- `apps/scanner/src/api/pdf-export.ts` - Loads entity logo
- `apps/scanner/src/index.ts` - Registered upload router
- `apps/scanner/src/templates/report-template.html` - Updated cover page HTML
- `apps/scanner/src/services/pdf-template-renderer.ts` - Updated interface
- `apps/scanner/src/utils/logo-loader.ts` - Added logo loading functions

### Frontend (Dashboard):
- `apps/report-ui/src/pages/EntitiesPage.tsx` - Added logo upload UI

---

## 🎉 Success Criteria

✅ **Backend:**
- Logo upload endpoint works
- Logos saved to `/uploads/entity-logos/`
- Entity logoPath saved to database
- Logos loaded during PDF generation

✅ **Frontend:**
- Logo upload form appears
- File selection works
- Preview shows uploaded logo
- Remove logo works
- Upload indicator shows progress

✅ **PDF:**
- Raawi X logo is bigger
- Entity logo appears (if uploaded)
- Green separator line visible
- Entity info properly formatted
- Powered By footer visible

---

## 🚀 Ready to Test!

**Captain, the cover page redesign is complete and ready for testing!**

Follow the steps above to test all features. If everything works as expected, the PDF report will have a professional, branded cover page with all requested elements! 🎨
