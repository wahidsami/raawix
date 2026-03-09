# Raawi X Dashboard Documentation

## Overview

The Raawi X Dashboard is a comprehensive admin console for managing website accessibility scans, analyzing findings, and monitoring widget usage analytics. The dashboard provides a bilingual interface (English and Arabic) with full RTL (Right-to-Left) support for Arabic users.

**Key Features:**
- Multi-language support (English/Arabic) with RTL layout
- Real-time scan management and monitoring
- WCAG compliance tracking and reporting
- Assistive map generation and management
- Widget usage analytics
- Secure authentication with JWT

---

## Authentication

### Login Screen

**Location:** `/login`

**Description:**
The login screen provides secure access to the dashboard using email and password authentication.

**Features:**
- Email/password authentication
- Bilingual UI (English/Arabic)
- RTL-friendly form layout
- Error handling and validation
- System logo display
- Auto-redirect to dashboard after successful login

**Default Credentials (Development):**
- Email: `admin@local`
- Password: `admin123`

**Security:**
- JWT token-based authentication
- Token stored in browser localStorage
- Automatic token validation on page load
- Secure logout functionality

---

## Dashboard Layout

### Header

**Location:** Top of all dashboard pages

**Components:**
- **Logo/App Name:** Displays "Raawi X Dashboard" title
- **Language Switcher:** Toggle between English (EN) and Arabic (العربية)
- **User Menu:** Shows logged-in user email and logout button

**Features:**
- Responsive design
- RTL-aware positioning
- Persistent language preference

### Sidebar Navigation

**Location:** Left side (LTR) or Right side (RTL) of dashboard

**Components:**
- **Logo:** System logo displayed above navigation
- **Navigation Items:**
  - Overview (Dashboard icon)
  - Sites (Globe icon)
  - Scans (Scan icon)
  - Findings (Alert icon)
  - Assistive Maps (Map icon)
  - Widget Analytics (Chart icon)
  - Settings (Settings icon)

**Features:**
- Active route highlighting
- Icon-based navigation
- RTL-aware positioning
- Collapsible on mobile devices

---

## Dashboard Sections

### 1. Overview Page

**Route:** `/` (Home/Dashboard)

**Description:**
The Overview page provides a high-level summary of your accessibility scanning activities with key performance indicators (KPIs) and visual charts.

#### KPI Cards

Displays seven key metrics:

1. **Total Sites**
   - Number of unique domains scanned
   - Icon: Globe

2. **Total Scans**
   - Total number of scans performed
   - Icon: Scan Search

3. **Pages Scanned**
   - Total number of pages analyzed across all scans
   - Icon: File Text

4. **WCAG A Failures**
   - Count of Level A compliance failures
   - Icon: Alert Triangle (Red)

5. **WCAG AA Failures**
   - Count of Level AA compliance failures
   - Icon: Alert Triangle (Orange)

6. **Needs Review**
   - Items requiring manual review
   - Icon: Clock

7. **Vision Findings**
   - Findings detected by vision analysis
   - Icon: Eye

#### Charts

1. **Scans Over Time (30 Days)**
   - Line chart showing scan activity trends
   - X-axis: Date
   - Y-axis: Number of scans
   - RTL-aware axis orientation

2. **Failures by WCAG Level**
   - Bar chart displaying failures by compliance level
   - Levels: A, AA, AAA
   - Color-coded visualization

3. **Top Failing WCAG Rules**
   - Horizontal/vertical bar chart (RTL-aware)
   - Shows most common WCAG rule violations
   - Displays rule ID (e.g., 1.1.1) and failure count

4. **Top Affected Sites**
   - List of sites with highest issue counts
   - Shows domain name and total issues
   - Sorted by issue count (descending)

**Data Source:** Real-time data from PostgreSQL database

---

### 2. Sites Page

**Route:** `/sites`

**Description:**
The Sites page provides a comprehensive list of all scanned websites with their scan history and issue summaries.

#### Features

- **Site List Table:**
  - Domain name with globe icon
  - Last scan information (date, page count)
  - Total number of scans performed
  - Issue summary (total, critical, important)
  - View action button

- **Empty State:**
  - Helpful message when no sites exist
  - Guidance on how to create sites (by running scans)

#### Site Information Displayed

- **Domain:** Website domain name
- **Last Scan:**
  - Completion date
  - Total pages scanned
  - WCAG A failures count
  - WCAG AA failures count
- **Total Scans:** Number of scans performed for this site
- **Issue Summary:**
  - Total issues
  - Critical issues
  - Important issues

**Data Source:** Real-time data from `Site` and `Scan` tables

---

### 3. Scans Page

**Route:** `/scans`

**Description:**
The Scans page provides detailed information about all accessibility scans with filtering and status tracking.

#### Features

- **Filter Bar:**
  - Status filter (Pending, Running, Completed, Failed)
  - Domain filter (search by hostname)
  - Date range filters (From/To dates)

- **Scans Table:**
  - Status indicator with icon
  - Scan ID (clickable code)
  - Seed URL (original scan URL)
  - Start date/time
  - Completion date/time
  - Page count and failure summary
  - View action button

#### Status Indicators

- **Completed:** Green checkmark icon
- **Failed:** Red X icon
- **Running:** Blue spinning clock icon
- **Pending:** Gray alert icon

#### Scan Information Displayed

- **Scan ID:** Unique identifier (format: `scan_1234567890_abc123`)
- **Seed URL:** The initial URL that started the scan
- **Status:** Current scan state
- **Started At:** Scan initiation timestamp
- **Completed At:** Scan completion timestamp (if completed)
- **Hostname:** Domain of scanned website
- **Summary:**
  - Total pages scanned
  - WCAG A failures
  - WCAG AA failures
  - Needs review count

**Data Source:** Real-time data from `Scan` table with pagination

---

### 4. Findings Page

**Route:** `/findings`

**Description:**
The Findings page provides a detailed explorer for all accessibility findings with advanced filtering and evidence viewing.

#### Features

- **Advanced Filter Bar:**
  - Search box (searches message, WCAG ID, rule ID)
  - Site filter (dropdown)
  - Scan filter (dropdown)
  - WCAG ID filter (text input, e.g., "1.1.1")
  - Status filter (Fail, Pass, Needs Review)
  - Confidence filter (High, Medium, Low)

- **Findings Table:**
  - WCAG ID and rule ID
  - Compliance level (A, AA, AAA)
  - Status badge (color-coded)
  - Confidence indicator
  - Finding message/description
  - View details button

- **Finding Detail Panel:**
  - Opens when a finding is selected
  - Displays:
    - WCAG ID and rule ID
    - Status and confidence
    - Detailed message
    - Page URL (clickable link)
    - Evidence information
    - How to verify instructions

#### Status Colors

- **Fail:** Red background
- **Pass:** Green background
- **Needs Review:** Yellow background

#### Confidence Levels

- **High:** Green text
- **Medium:** Yellow text
- **Low:** Red text

**Data Source:** Real-time data from `Finding` table with filtering

---

### 5. Assistive Maps Page

**Route:** `/assistive-maps`

**Description:**
The Assistive Maps page displays all generated assistive maps that provide enhanced accessibility information for scanned pages.

#### Features

- **Assistive Maps Table:**
  - Domain name
  - Page URL (canonical URL)
  - Generation date
  - Confidence summary (High/Medium/Low counts)
  - View action button

- **Empty State:**
  - Informative message when no maps exist
  - Explains that maps are generated during scanning
  - Lists benefits of assistive maps

#### Assistive Map Information

- **Domain:** Website domain
- **Page URL:** Canonical URL of the mapped page
- **Generated At:** When the assistive map was created
- **Confidence Summary:**
  - High confidence items (green indicator)
  - Medium confidence items (yellow indicator)
  - Low confidence items (red indicator)

#### What Are Assistive Maps?

Assistive maps are automatically generated during the scanning process and contain:
- **Label Overrides:** Enhanced labels for UI elements
- **Image Descriptions:** AI-generated descriptions for images missing alt text
- **Action Intents:** Descriptions of interactive elements

**Data Source:** Real-time data from `AssistiveMap` and `PageVersion` tables

---

### 6. Widget Analytics Page

**Route:** `/widget-analytics`

**Description:**
The Widget Analytics page provides insights into widget usage, voice interactions, and user engagement metrics.

#### KPI Cards

1. **Unique Sessions**
   - Number of unique user sessions
   - Icon: Users

2. **Widget Opens**
   - Total number of times the widget was opened
   - Icon: Mouse Pointer

3. **Voice Usage**
   - Percentage of sessions using voice features
   - Icon: Microphone

4. **Top Pages**
   - Number of pages with widget activity
   - Icon: Bar Chart

#### Charts

1. **Daily Usage Trend (30 Days)**
   - Line chart showing:
     - Unique sessions per day
     - Widget opens per day
   - X-axis: Date
   - Y-axis: Count
   - Dual-line visualization

2. **Command Usage Distribution**
   - Bar chart (horizontal/vertical based on RTL)
   - Shows most used voice commands
   - Displays command name and usage count

3. **Top Pages List**
   - Ranked list of pages with most widget activity
   - Shows page URL and open count
   - Numbered ranking (#1, #2, etc.)

#### Empty States

- Charts display helpful messages when no data is available
- Explains that analytics appear after widget usage
- Non-blocking, informative messaging

**Data Source:** Real-time data from `WidgetEvent` and `WidgetDailyAggregate` tables

**Note:** Analytics require widget telemetry to be enabled and widget events to be tracked.

---

### 7. Settings Page

**Route:** `/settings`

**Description:**
The Settings page allows administrators to configure system preferences and manage application settings.

#### Features

- **Language Settings:**
  - Default language selection (English/Arabic)
  - Language preference persistence

- **Telemetry Settings:**
  - Enable/disable widget telemetry per site
  - Privacy controls

- **Gemini Integration:**
  - Enable/disable Gemini AI features
  - API key management (server-side only)

- **Retention Settings:**
  - Scan data retention period
  - Automatic cleanup configuration

- **API Keys:**
  - View and manage API keys
  - Security settings

**Note:** Settings page is currently a placeholder and will be fully implemented in future phases.

---

## Technical Details

### Data Sources

All dashboard data is fetched from the scanner API endpoints:

- **GET /api/scans** - List all scans
- **GET /api/sites** - List all sites
- **GET /api/findings** - List all findings
- **GET /api/overview** - Dashboard KPIs and charts
- **GET /api/assistive-maps** - List assistive maps
- **GET /api/analytics/widget** - Widget analytics

### Authentication

- All API endpoints require JWT authentication
- Token is stored in browser localStorage
- Automatic token refresh on page load
- Secure logout clears token

### Internationalization

- Full i18n support using i18next
- English (en) and Arabic (ar) languages
- RTL layout for Arabic
- Language preference persisted in localStorage

### Responsive Design

- Mobile-friendly layout
- Responsive tables and charts
- Adaptive sidebar (collapsible on mobile)
- Touch-friendly controls

---

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ JavaScript support required
- LocalStorage support for token persistence

---

## Future Enhancements

Planned features for future releases:

1. **Settings Page:**
   - Complete settings management UI
   - Advanced configuration options

2. **Site Detail Pages:**
   - Individual site dashboards
   - Scan history charts
   - Widget integration snippets

3. **Scan Detail Pages:**
   - Full scan report viewer
   - Page-by-page breakdown
   - Screenshot gallery

4. **Finding Detail Pages:**
   - Enhanced evidence viewer
   - Screenshot annotations
   - Remediation suggestions

5. **Export Features:**
   - PDF report generation
   - CSV data export
   - API data export

---

## Support

For issues or questions about the dashboard:
- Check the scanner API logs for errors
- Verify database connectivity
- Ensure authentication token is valid
- Review browser console for client-side errors

---

**Last Updated:** January 2025
**Version:** 1.0.0

