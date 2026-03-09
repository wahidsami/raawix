# Image Generation Prompts for Test Sites

Use these prompts with an AI image generation tool (DALL-E, Midjourney, Stable Diffusion, etc.) to create the required images for the test sites.

## Portal Good Images (All with proper alt text)

### 1. Hero Image
**File:** `good_portal_hero.jpg`
**Prompt:**
```
Modern office building with glass facade, representing accessibility and transparency. Clean, professional, bright lighting. Business setting, architectural photography style.
```
**Alt Text:** "Modern office building with glass facade representing accessibility and transparency"

### 2. Feature Images (5 images)
**Files:** `feature_accessibility.jpg`, `feature_semantic.jpg`, `feature_keyboard.jpg`, `feature_aria.jpg`, `feature_testing.jpg`

**Prompts:**
- **feature_accessibility.jpg:** "Accessibility icon showing a person using assistive technology, screen reader, modern illustration style"
- **feature_semantic.jpg:** "HTML code structure diagram showing semantic markup, clean code visualization, tech illustration"
- **feature_keyboard.jpg:** "Computer keyboard with highlighted navigation keys, Tab and Enter keys emphasized, professional photography"
- **feature_aria.jpg:** "ARIA landmarks diagram showing page structure, accessibility visualization, technical diagram style"
- **feature_testing.jpg:** "Testing checklist with accessibility criteria, quality assurance, professional document style"

### 3. News Article Images (5 images)
**Files:** `news_awards.jpg`, `news_wcag.jpg`, `news_testing.jpg`, `news_keyboard.jpg`, `news_aria.jpg`

**Prompts:**
- **news_awards.jpg:** "Award ceremony with accessibility excellence trophy, professional event photography"
- **news_wcag.jpg:** "WCAG 2.2 guidelines document cover, official document style, professional"
- **news_testing.jpg:** "Screen reader software interface showing accessibility features, software screenshot style"
- **news_keyboard.jpg:** "Hands typing on a keyboard with focus indicators visible, professional photography"
- **news_aria.jpg:** "ARIA landmarks diagram showing page structure, technical illustration"

### 4. Service Images (5 images)
**Files:** `service_audit.jpg`, `service_consulting.jpg`, `service_training.jpg`, `service_remediation.jpg`, `service_testing.jpg`

**Prompts:**
- **service_audit.jpg:** "Accessibility audit checklist with checkmarks, professional document style"
- **service_consulting.jpg:** "Two people discussing accessibility solutions at a table, business meeting, professional photography"
- **service_training.jpg:** "Training session with participants learning about accessibility, educational setting"
- **service_remediation.jpg:** "Code editor showing accessibility improvements, programming interface"
- **service_testing.jpg:** "Testing tools and screen reader software, quality assurance setup"

## Gov Sim Images (Some intentionally missing alt text)

### 1. Hero Image (NO ALT - Intentional Issue)
**File:** `gov_hero.jpg`
**Prompt:**
```
Saudi government building facade, modern architecture, official government portal entrance, professional architectural photography, Middle Eastern style
```
**Alt Text:** NONE (intentional accessibility issue)

### 2. Service Card Images (NO ALT - Intentional Issue)
**Files:** `service_card_1.jpg`, `service_card_2.jpg`

**Prompts:**
- **service_card_1.jpg:** "Government service card design, official document style, Arabic text visible"
- **service_card_2.jpg:** "Certificate document, official government paper, Arabic text"

**Alt Text:** 
- `service_card_1.jpg`: NONE (intentional issue)
- `service_card_2.jpg`: "خدمة استخراج شهادة" (has alt - correct)

### 3. Success Icon (NO ALT - Intentional Issue)
**File:** `success_icon.png`
**Prompt:**
```
Green checkmark icon, success symbol, simple vector style, transparent background, professional
```
**Alt Text:** NONE (should be aria-hidden but missing - intentional issue)

## Image Specifications

- **Format:** JPG for photos, PNG for icons
- **Dimensions:** 
  - Hero images: 1200x400px
  - Card images: 400x250px or 300x200px
  - Article images: 800x400px
  - Icons: 100x100px
- **Quality:** High resolution, web-optimized
- **Style:** Professional, clean, modern

## Placement

All images should be placed in:
- `test-sites/assets/images/` (shared)
- Or copied to each site's `public/assets/images/` directory

## Notes

- Portal Good images: ALL must have proper alt text (compliant)
- Gov Sim images: Some intentionally missing alt text (for testing scanner)
- Use descriptive, meaningful alt text that describes the image content and purpose
- For decorative images, use empty alt="" (but document which ones are decorative)

