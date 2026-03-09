# Vision Scan (Layer 2) & Assistive Maps (Layer 3) - How They Work

## 🎯 Key Answer: Why Layer 3 Exists with 0 Vision Findings?

**Layer 3 (Assistive Maps) works INDEPENDENTLY from Vision Findings!**

Layer 3 generates assistive maps for:
1. **Images missing alt text** (processes ALL images in the DOM)
2. **Action intents** (processes ALL buttons/links in the DOM)
3. **Label overrides** (from vision findings IF they exist)

So even with **0 vision findings**, Layer 3 will still generate maps for images and actions!

---

## 🔍 Vision Scan (Layer 2) - How It Works

### Does NOT Require Gemini API Key

Vision analysis works **WITHOUT Gemini** using **DOM-based detection**:

1. **Collects Interactive Elements**:
   - Buttons (`<button>`)
   - Links (`<a href>`)
   - Inputs (`<input>`, `<select>`, `<textarea>`)
   - Elements with `role="button"`
   - Elements with `tabindex`
   - Elements with `onclick` handlers

2. **Analyzes Each Element**:
   - Checks if element has accessible name (aria-label, aria-labelledby, label[for], innerText)
   - Checks if element is icon-only
   - Checks if element looks like a button but isn't semantic

3. **Creates Findings** for:
   - **Clickable unlabeled**: Button/link without accessible name or text
   - **Icon button unlabeled**: Icon-only button without accessible name
   - **Looks like button but not button**: Div/span styled like button but not semantic

### When Vision Findings = 0

**This is CORRECT behavior if:**
- All buttons/links have accessible names
- All interactive elements are properly labeled
- No icon-only buttons without labels
- No divs/spans masquerading as buttons

**0 findings = Page passed vision accessibility checks! ✅**

---

## 🤖 Gemini API - Optional Enhancement

### Gemini is NOT Required for Vision Analysis

Gemini is **optional** and only used for **enhancement**:

1. **OCR (Text Extraction)**:
   - If element has no accessible name, Gemini can extract text from screenshot
   - Falls back to DOM analysis if Gemini not enabled

2. **Element Descriptions**:
   - Gemini can describe what an element does (for user guidance)
   - Only used if `GEMINI_ENABLED=true` and `GEMINI_API_KEY` is set

### Configuration

```env
# Vision analysis (works without Gemini)
VISION_ENABLED=true  # Default: enabled

# Gemini enhancement (optional)
GEMINI_ENABLED=true  # Default: disabled
GEMINI_API_KEY=your_key_here
```

**Current Status**: Vision analysis is working correctly without Gemini!

---

## 🗺️ Layer 3 (Assistive Maps) - How It Works

### Works Independently from Vision Findings

Layer 3 generates assistive maps by processing:

1. **Vision Findings** (if any):
   - Creates label overrides for unlabeled controls
   - Uses detected text or Gemini descriptions

2. **Images** (always processed):
   - Finds all `<img>` elements
   - Checks for missing `alt` text
   - Generates descriptions (uses Gemini if enabled, else uses DOM fallback)

3. **Actions** (always processed):
   - Finds all buttons and links
   - Extracts action intents (what the button/link does)
   - Uses accessible name or text content

### Why Layer 3 Exists with 0 Vision Findings

**Layer 3 processes images and actions from the DOM**, not just vision findings!

Even if:
- Vision findings = 0 (no unlabeled controls)
- Gemini is disabled

Layer 3 will still generate:
- **Image descriptions** for images missing alt text
- **Action intents** for all buttons/links

---

## 📊 Your Scan Results Explained

From your screenshot:
- **Layer 1 (WCAG)**: 6 / 10 findings ✅ (DOM-based checks)
- **Layer 2 (Vision)**: 0 findings ✅ (No unlabeled controls - this is GOOD!)
- **Layer 3 (Assistive Map)**: ✅ Generated (Processed images and actions)

**This is correct!** Your page:
- Has no unlabeled interactive elements (passed vision checks)
- Has images/actions that need assistive map data (Layer 3 generated)

---

## 🔧 How to Enable Gemini (Optional)

If you want Gemini enhancement:

1. **Set environment variables**:
   ```env
   GEMINI_ENABLED=true
   GEMINI_API_KEY=your_actual_api_key_here
   ```

2. **What Gemini adds**:
   - Better OCR for unlabeled controls
   - Rich descriptions for UI elements
   - Enhanced image descriptions

3. **Restart scanner** after setting environment variables

**Note**: Gemini is NOT required - vision analysis works fine without it!

---

## ✅ Summary

- **Vision Scan**: DOM-based, works without Gemini
- **0 Vision Findings**: Correct if page has no unlabeled controls
- **Layer 3 with 0 Vision**: Normal - processes images and actions independently
- **Gemini**: Optional enhancement, not required

Your system is working correctly! 🎉

