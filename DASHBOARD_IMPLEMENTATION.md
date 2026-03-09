# Dashboard Implementation - Report UI

## ✅ Completed Features

### 1. API Configuration Screen
**Component**: `ApiConfig.tsx`
- User enters API URL and API Key
- API key stored in memory only (no localStorage)
- Clean, centered form layout
- Security note displayed to user

### 2. Scan Dashboard
**Component**: `ScanDashboard.tsx`
- Main dashboard container
- Manages scan lifecycle (start → poll → display results)
- Handles API communication with authentication
- Auto-fetches report.json when scan completes

### 3. Scan Form
**Component**: `ScanForm.tsx`
- Input fields:
  - Seed URL (required)
  - Max Pages (default: 25, range: 1-100)
  - Max Depth (default: 2, range: 0-5)
- Validates input before submission
- Shows loading state during scan start

### 4. Scan Status Display
**Component**: `ScanStatus.tsx`
- Shows current scan status (pending/running/completed/failed)
- Displays:
  - Scan ID
  - Seed URL
  - Pages scanned (if available)
  - Status with color coding
- Auto-updates via polling (every 2 seconds)

### 5. Report Viewer
**Component**: `ReportViewer.tsx`
- Main container for report display
- Coordinates summary cards, page table, and findings detail
- Manages drill-down state

### 6. Summary Cards
**Component**: `SummaryCards.tsx`
- Four summary cards:
  1. **WCAG A Failures** (red) - Count of Level A failures
  2. **WCAG AA Failures** (orange) - Count of Level AA failures
  3. **Needs Review** (blue) - Items requiring manual review
  4. **Total Pages** (green) - Number of pages scanned
- Color-coded borders and large numbers
- Shows totals for context

### 7. Page Table
**Component**: `PageTable.tsx`
- Table showing all scanned pages
- Columns:
  - Page #
  - URL (clickable link)
  - Pass count (green)
  - Fail count (red)
  - Review count (blue)
  - N/A count (gray)
  - Actions (View Details button)
- Alternating row colors for readability
- Click "View Details" to drill down

### 8. Findings Detail (Drill-down)
**Component**: `FindingsDetail.tsx`
- Modal overlay showing detailed findings for a page
- Features:
  - **Screenshot thumbnail** (fetched with authentication)
  - **Rule results list** with:
    - WCAG ID
    - Status badge (pass/fail/needs_review/na)
    - Confidence badge (high/medium/low)
    - Rule ID
    - Message
    - Evidence items:
      - Selector
      - Description
      - HTML snippet (expandable)
    - "How to verify" instructions
- Color-coded by status
- Scrollable for long lists
- Click outside to close

## API Endpoints Used

### 1. POST /api/scan
- Start a new scan
- Body: `{ seedUrl, maxPages, maxDepth }`
- Headers: `X-API-Key`
- Returns: `{ scanId, status: "accepted" }`

### 2. GET /api/scan/:id
- Get scan status
- Headers: `X-API-Key`
- Returns: Status object with scanId, seedUrl, status, startedAt, pagesScanned

### 3. GET /api/scan/:id/report
- Get canonical report.json
- Headers: `X-API-Key`
- Returns: Complete `ScanRun` object

### 4. GET /api/scan/:id/artifact/*
- Get artifacts (screenshots, HTML, etc.)
- Headers: `X-API-Key`
- Path: `pages/{n}/screenshot.png`, `pages/{n}/page.html`, etc.
- Returns: File content with appropriate content-type

## Security Features

1. **API Key Storage**
   - Stored in React state (memory only)
   - Cleared on page refresh
   - Never stored in localStorage or cookies

2. **Authentication**
   - All API requests include `X-API-Key` header
   - Screenshots fetched as blob with authentication
   - Object URLs created for images (cleaned up on unmount)

3. **CORS**
   - Handled by API server (locked to report-ui origin)
   - No CORS issues in UI code

## UI Design

- **Clean, minimal design** - No heavy design libraries
- **Color coding**:
  - Red: Failures/Errors
  - Orange: Warnings
  - Blue: Needs Review/Info
  - Green: Pass/Success
  - Gray: N/A or neutral
- **Responsive layout** - Grid-based, adapts to screen size
- **Accessible** - Semantic HTML, proper labels, keyboard navigation

## Component Structure

```
App.tsx
├── ApiConfig (if no config)
└── ScanDashboard (if config exists)
    ├── ScanForm (if no active scan)
    ├── ScanStatus (if scan running)
    └── ReportViewer (if scan completed)
        ├── SummaryCards
        ├── PageTable
        └── FindingsDetail (modal, on page select)
```

## Data Flow

1. User enters API URL + Key → Stored in state
2. User starts scan → POST /api/scan
3. Poll scan status → GET /api/scan/:id (every 2s)
4. When completed → GET /api/scan/:id/report
5. Display summary cards + page table
6. User clicks "View Details" → Show FindingsDetail modal
7. Modal fetches screenshot → GET /api/scan/:id/artifact/pages/{n}/screenshot.png

## Screenshot Loading

Screenshots are loaded securely:
1. Fetch as blob with `X-API-Key` header
2. Create object URL from blob
3. Display in `<img>` tag
4. Cleanup object URL on component unmount

This ensures:
- Authentication is maintained
- No CORS issues
- Proper cleanup of resources

## Usage

1. Start the scanner API: `pnpm scanner:dev`
2. Start the report UI: `pnpm dev`
3. Open http://localhost:5173
4. Enter API URL and API Key
5. Start a scan
6. View results in the dashboard

## Features Summary

✅ API URL + Key configuration (memory only)
✅ Scan form with maxPages and maxDepth
✅ Real-time status polling
✅ Summary cards (A/AA failures, needs review, total pages)
✅ Page table with counts per page
✅ Drill-down findings detail with:
  - WCAG ID, status, confidence
  - Evidence snippets
  - Screenshot thumbnails
  - How to verify instructions
✅ Clean UI without heavy design libs
✅ Secure API key handling

