# Gemini Translation Integration

## Overview

Google Gemini is integrated into Raawi X for **server-side translation only**. The widget calls our API, and our API calls Gemini. API keys are never exposed to the browser.

## Security Rules

✅ **Server-side only** - No browser calls to Gemini  
✅ **API keys in environment variables only** - Never logged or exposed  
✅ **Widget → Our API → Gemini** - All translation goes through our server  
✅ **Translation for narration only** - Not for full page DOM translation  
✅ **Gemini outputs never mark WCAG pass/fail** - Uses `needs_review` status  

## Configuration

### Environment Variables (apps/scanner/.env)

```env
# Gemini Translation (default: disabled)
GEMINI_ENABLED=false
GEMINI_API_KEY=your-api-key-here
GEMINI_MODEL=gemini-1.5-flash
GEMINI_MAX_CHARS=4000
```

**Important:**
- `GEMINI_ENABLED` must be `true` to enable translation
- `GEMINI_API_KEY` is required if enabled
- API key is **never logged** in console or files
- Default model: `gemini-1.5-flash` (fast, cost-effective)
- Max characters per request: `4000` (configurable)

## API Endpoint

### POST /api/widget/translate

**Request:**
```json
{
  "text": "Welcome to our website",
  "targetLang": "ar",
  "sourceLang": "en"  // optional, auto-detected if not provided
}
```

**Response (Success):**
```json
{
  "translatedText": "مرحباً بكم في موقعنا"
}
```

**Response (Disabled):**
```json
{
  "error": "Translation is disabled. Set GEMINI_ENABLED=true and GEMINI_API_KEY to enable."
}
```
Status: `501 Not Implemented`

**Response (Error):**
```json
{
  "error": "Failed to translate text",
  "message": "Error details"
}
```
Status: `500 Internal Server Error`

**Validation:**
- `text`: Required, string, 1-10000 chars (truncated to `GEMINI_MAX_CHARS`)
- `targetLang`: Required, `"ar"` or `"en"`
- `sourceLang`: Optional, `"ar"` or `"en"`

**Rate Limiting:**
- 50 requests per 15 minutes per IP
- Separate from main API rate limit

**Caching:**
- Translations cached by `(textHash, targetLang)` for 1 hour
- Reduces API calls and improves performance

## Widget Integration

### Translation Setting

The widget includes a **"Translate Reading"** dropdown in the narration controls:

- **Off** - No translation (default)
- **Arabic** - Translate to Arabic
- **English** - Translate to English

### How It Works

1. User enables **Voice Mode** in widget
2. User selects **"Translate Reading"** language (Arabic/English)
3. User clicks **"Read Page"** or says **"read page"**
4. Widget builds reading queue as usual
5. For each segment:
   - If translation is enabled and API URL configured:
     - Widget sends segment text to `/api/widget/translate`
     - API translates using Gemini
     - Widget speaks translated text
   - If API unavailable or translation fails:
     - Widget falls back to original text
     - Narration continues without interruption

### Translation Flow

```
User clicks "Read Page"
    ↓
Widget builds reading queue
    ↓
For each segment:
    ↓
Translation enabled? → Yes → POST /api/widget/translate
    ↓                              ↓
    No                      Check cache
    ↓                              ↓
Speak original            Cache hit? → Yes → Use cached
    ↓                              ↓
                          No → Call Gemini API
                                  ↓
                          Cache result
                                  ↓
                          Return translated text
                                  ↓
                          Speak translated text
```

### Fallback Behavior

- **API unavailable**: Falls back to original text
- **Translation disabled (501)**: Falls back to original text
- **Translation error**: Falls back to original text
- **Network error**: Falls back to original text

Narration **never stops** due to translation failures.

## Implementation Details

### Server-Side

**Files:**
- `apps/scanner/src/config.ts` - Configuration
- `apps/scanner/src/api/gemini-translator.ts` - Translation service
- `apps/scanner/src/api/translation-cache.ts` - Caching
- `apps/scanner/src/index.ts` - API endpoint

**Translation Prompt:**
```
Translate the following text from [source] to [target].

Requirements:
- Translate accurately and preserve meaning
- Keep UI labels short and concise
- Do not add extra commentary or explanations
- Return only the translated text, nothing else

Text to translate:
[text]
```

### Widget-Side

**Files:**
- `apps/widget/src/widget.ts` - Widget implementation

**Changes:**
- Added `translateLanguage: 'off' | 'ar' | 'en'` to `AccessibilitySettings`
- Added translation dropdown UI
- Added `translateText()` method
- Updated `speakChunked()` to be async and handle translation
- Added CSS for select element

## Testing

### Enable Translation

1. Set environment variables:
   ```env
   GEMINI_ENABLED=true
   GEMINI_API_KEY=your-key-here
   ```

2. Restart scanner:
   ```bash
   pnpm --filter scanner dev
   ```

3. Test endpoint:
   ```bash
   curl -X POST http://localhost:3001/api/widget/translate \
     -H "Content-Type: application/json" \
     -d '{"text": "Hello world", "targetLang": "ar"}'
   ```

### Test Widget

1. Open test page (`/good` or `/messy`)
2. Enable Voice Mode
3. Select "Translate Reading" → Arabic
4. Click "Read Page"
5. Verify narration is in Arabic

### Verify Fallback

1. Disable Gemini (`GEMINI_ENABLED=false`)
2. Restart scanner
3. Try to translate
4. Should get 501 error
5. Widget should fall back to original text

## Abuse Controls

### Rate Limiting
- **Translation endpoint**: 50 requests per 15 minutes per IP
- **Separate from main API**: Doesn't affect other endpoints

### Caching
- **Cache key**: `sha256(text + targetLang)`
- **TTL**: 1 hour
- **Automatic cleanup**: Every 30 minutes

### Budget Guardrails
- **Max chars per request**: `GEMINI_MAX_CHARS` (default: 4000)
- **Text truncation**: Automatic if exceeds limit
- **Per-scan budget**: Can be added in future

## Vision Enrichment (Already Implemented)

Gemini Vision API is already integrated for:
- **OCR/text extraction** from screenshot crops
- **UI element description** to improve user guidance

**Note:** Vision enrichment uses different Gemini endpoints and is separate from translation.

## Documentation Notes

**Important:** API keys must only be stored in server environment variables. Never:
- ❌ Hardcode in source code
- ❌ Log to console or files
- ❌ Expose to browser/client
- ❌ Commit to version control

## Future Enhancements

- [ ] Batch translation (multiple segments in one request)
- [ ] Per-scan budget tracking
- [ ] Translation quality metrics
- [ ] Support for more languages
- [ ] Custom translation prompts per use case

