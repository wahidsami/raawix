# Widget API Documentation

## Overview

Backend endpoints to support the widget as an assistive layer powered by scan intelligence. All endpoints are read-only, cached, and safe (no PII collection).

## Endpoints

### 1. GET /api/widget/guidance

Fetch page guidance by normalized URL. Returns summary, landmarks, form steps, and key actions derived from scan artifacts.

**Query Parameters:**
- `url` (required): The page URL to get guidance for
- `scanId` (optional): Specific scan ID to search in (otherwise searches most recent scans)
- `lang` (optional): Language code (`en` or `ar`), defaults to `en`

**Response:**
```json
{
  "url": "https://example.com/page",
  "normalizedUrl": "https://example.com/page",
  "title": "Page Title",
  "summary": "Page: Page Title. 3 landmarks found. 1 form with 5 fields. 8 key actions available.",
  "landmarks": [
    {
      "type": "main",
      "label": "Main Content",
      "selector": "main",
      "description": "Main content area..."
    },
    {
      "type": "navigation",
      "label": "Main Navigation",
      "selector": "nav.main-nav",
      "description": "Primary navigation menu..."
    }
  ],
  "formSteps": [
    {
      "stepNumber": 1,
      "label": "Contact Form",
      "fields": [
        {
          "label": "Name",
          "type": "text",
          "required": true,
          "selector": "#name",
          "description": "Enter your full name"
        }
      ],
      "description": "Contact form for inquiries"
    }
  ],
  "keyActions": [
    {
      "label": "Submit",
      "type": "form-submit",
      "selector": "button[type='submit']",
      "description": "Submit the form"
    }
  ],
  "lastScanned": "2024-12-19T..."
}
```

**Features:**
- ✅ Read-only (no modifications)
- ✅ Cached (1 hour TTL)
- ✅ No PII collection
- ✅ URL normalization (handles trailing slashes, hashes, etc.)
- ✅ Language support (en/ar)

### 2. GET /api/widget/issues

Fetch known issues for a page. Returns user-friendly explanations of accessibility issues (not compliance claims).

**Query Parameters:**
- `url` (required): The page URL to get issues for
- `scanId` (optional): Specific scan ID to search in
- `lang` (optional): Language code (`en` or `ar`), defaults to `en`

**Response:**
```json
{
  "url": "https://example.com/page",
  "normalizedUrl": "https://example.com/page",
  "issues": [
    {
      "id": "wcag-1.1.1",
      "wcagId": "1.1.1",
      "severity": "critical",
      "title": "Found 3 image(s) with alt text issues",
      "description": "Add descriptive alt attributes to all non-decorative images. Use alt=\"\" for decorative images.",
      "userImpact": "Images without alt text cannot be understood by screen readers.",
      "howToFix": "Add descriptive alt attributes to all non-decorative images. Use alt=\"\" for decorative images.",
      "elementCount": 3
    },
    {
      "id": "wcag-2.4.2",
      "wcagId": "2.4.2",
      "severity": "important",
      "title": "Page title missing or empty",
      "description": "Page must have a non-empty title element",
      "userImpact": "Missing page title makes navigation difficult.",
      "howToFix": "Add a descriptive title element to the page",
      "elementCount": 1
    }
  ],
  "lastScanned": "2024-12-19T..."
}
```

**Severity Levels:**
- `critical`: Blocks core functionality (e.g., missing alt text, keyboard traps)
- `important`: Significantly impacts usability (e.g., missing titles, contrast issues)
- `minor`: Minor usability issues

**Features:**
- ✅ Read-only
- ✅ Cached (1 hour TTL)
- ✅ No PII collection
- ✅ User-friendly explanations (not compliance claims)
- ✅ Sorted by severity
- ✅ Language support

### 3. GET /api/widget/config

Get widget configuration including scanId/domain key, language, and feature flags.

**Query Parameters:**
- `scanId` (optional): Scan ID to associate with widget
- `domain` (optional): Domain key for domain-based configuration
- `lang` (optional): Language code (`en` or `ar`), defaults to `en`

**Response:**
```json
{
  "scanId": "scan_1234567890_abc123",
  "domain": "example.com",
  "language": "en",
  "featureFlags": {
    "textSize": true,
    "lineSpacing": true,
    "contrastMode": true,
    "focusHighlight": true,
    "readingMode": true,
    "pageGuidance": true,
    "knownIssues": true
  },
  "apiUrl": "http://localhost:3001"
}
```

**Feature Flags:**
- `textSize`: Enable text size adjustment
- `lineSpacing`: Enable line spacing adjustment
- `contrastMode`: Enable contrast mode toggle
- `focusHighlight`: Enable focus highlight toggle
- `readingMode`: Enable reading mode (hide clutter)
- `pageGuidance`: Enable page guidance feature
- `knownIssues`: Enable known issues display

## Security & Privacy

### ✅ Read-Only
- All endpoints are GET requests
- No data modification
- No side effects

### ✅ Caching
- In-memory cache with 1 hour TTL
- Reduces load on scan artifacts
- Automatic cleanup of expired entries

### ✅ No PII Collection
- No user tracking
- No personal information stored
- Only page URLs and scan data (public)

### ✅ Safe URL Handling
- URL normalization prevents duplicates
- SSRF protection (inherited from scan validation)
- No arbitrary file access

## CORS Configuration

Widget endpoints support configurable CORS origins:

**Environment Variable:**
```env
WIDGET_ORIGINS=https://example.com,https://another-domain.com
```

**Default:** Only `REPORT_UI_ORIGIN` is allowed

**Behavior:**
- Requests with no origin are allowed (for widget embedding)
- Origin must be in allowed list
- Credentials supported

## Usage Examples

### Fetch Page Guidance

```javascript
// Basic usage
const response = await fetch('http://localhost:3001/api/widget/guidance?url=https://example.com/page');
const guidance = await response.json();

// With scan ID
const response = await fetch('http://localhost:3001/api/widget/guidance?url=https://example.com/page&scanId=scan_123');
const guidance = await response.json();

// Arabic language
const response = await fetch('http://localhost:3001/api/widget/guidance?url=https://example.com/page&lang=ar');
const guidance = await response.json();
```

### Fetch Known Issues

```javascript
// Basic usage
const response = await fetch('http://localhost:3001/api/widget/issues?url=https://example.com/page');
const issues = await response.json();

// With scan ID and Arabic
const response = await fetch('http://localhost:3001/api/widget/issues?url=https://example.com/page&scanId=scan_123&lang=ar');
const issues = await response.json();
```

### Get Widget Config

```javascript
// Basic usage
const response = await fetch('http://localhost:3001/api/widget/config');
const config = await response.json();

// With scan ID and domain
const response = await fetch('http://localhost:3001/api/widget/config?scanId=scan_123&domain=example.com&lang=ar');
const config = await response.json();
```

## Implementation Details

### Guidance Extraction

Guidance is extracted from:
- **HTML artifacts**: Parsed with JSDOM to extract structure
- **Landmarks**: ARIA landmarks and semantic HTML (`<main>`, `<nav>`, etc.)
- **Forms**: Form elements with labels, types, and required status
- **Key Actions**: Links, buttons, and form submits

### Issues Extraction

Issues are derived from:
- **Rule Results**: WCAG rule evaluation results
- **Severity Mapping**: WCAG IDs mapped to severity levels
- **User Impact**: User-friendly explanations of impact
- **How to Fix**: Actionable guidance

### Caching Strategy

- **Cache Type**: In-memory Map
- **TTL**: 1 hour
- **Key**: Normalized URL
- **Cleanup**: Automatic every 30 minutes

### Search Strategy

1. **If scanId provided**: Search only in that scan
2. **Otherwise**: Search in most recent 5 scans (by modification time)
3. **URL Matching**: Uses normalized URL comparison

## Language Support

Currently supports:
- `en` (English) - Default
- `ar` (Arabic) - Placeholder implementation

**Note:** Arabic translation is a placeholder. In production, use a proper i18n library or translation service.

## Error Handling

All endpoints return standard HTTP status codes:

- `200`: Success
- `400`: Bad request (missing required parameters)
- `404`: Not found (page not scanned yet)
- `500`: Internal server error

**Error Response Format:**
```json
{
  "error": "Error message"
}
```

## Rate Limiting

Widget endpoints are subject to the same rate limiting as other API endpoints:
- 100 requests per 15 minutes per IP
- Configurable via `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS`

## Future Enhancements

1. **Proper i18n**: Replace placeholder Arabic translation with proper translation service
2. **Domain-based routing**: Map domains to specific scans automatically
3. **Persistent cache**: Use Redis or similar for distributed caching
4. **Analytics**: Track widget usage (anonymized)
5. **Real-time updates**: WebSocket support for live guidance updates

## Files Created

- `apps/scanner/src/api/widget-guidance.ts` - Guidance extraction logic
- `apps/scanner/src/api/widget-cache.ts` - Caching implementation
- `apps/scanner/src/api/widget-service.ts` - Service layer for widget endpoints
- `apps/scanner/src/index.ts` - Endpoint definitions (updated)

