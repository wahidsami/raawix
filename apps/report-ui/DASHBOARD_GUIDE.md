# Dashboard Usage Guide

## Quick Start

1. **Start all services** (or use the automated script):
   ```powershell
   .\apps\test-sites\run-full-test.ps1
   ```

2. **Open the dashboard** in your browser:
   ```
   http://localhost:5173
   ```

## Step-by-Step: Scanning Links

### Step 1: Configure API Connection

When you first open the dashboard, you'll see the API Configuration screen:

1. **API URL**: Enter `http://localhost:3001` (or your scanner API URL)
2. **API Key**: Enter `dev-api-key-change-in-production` (default dev key)
3. Click **"Connect"**

### Step 2: Start a Scan

After connecting, you'll see the scan form:

1. **Seed URL**: Enter the URL you want to scan
   - For good page: `http://localhost:4173/good`
   - For messy page: `http://localhost:4173/messy`
   - Or any other website URL

2. **Max Pages**: Set how many pages to scan (default: 25)
   - For test pages, use `2` pages

3. **Max Depth**: Set crawl depth (default: 2)
   - For test pages, use `1` depth

4. Click **"Start Scan"**

### Step 3: Monitor Progress

The dashboard will:
- Show scan status (pending → running → completed)
- Display progress information
- Automatically refresh every 2 seconds

### Step 4: View Results

Once the scan completes, you'll see:
- **Report Summary**: Total pages, rules checked, pass/fail counts
- **Issues**: List of accessibility issues found
- **Page Details**: Individual page results
- **Artifacts**: Screenshots, HTML, and other scan artifacts

## Example: Scanning Test Pages

### Scan Good Page:
```
Seed URL: http://localhost:4173/good
Max Pages: 2
Max Depth: 1
```

### Scan Messy Page:
```
Seed URL: http://localhost:4173/messy
Max Pages: 2
Max Depth: 1
```

## Troubleshooting

### "Failed to start scan" Error
- Check that scanner API is running on port 3001
- Verify API key is correct: `dev-api-key-change-in-production`
- Check browser console for CORS errors

### "Not allowed by CORS" Error
- Make sure scanner has been restarted after CORS changes
- Check that `ALLOW_LOCALHOST=true` is set in scanner environment

### Dashboard Not Loading
- Check that report-ui is running: `pnpm --filter report-ui dev`
- Verify port 5173 is not blocked
- Check browser console for errors

## Features

- ✅ Visual scan form
- ✅ Real-time scan status
- ✅ Automatic status polling
- ✅ Detailed report viewer
- ✅ Issue breakdown
- ✅ Artifact viewing
- ✅ New scan button to start over

## API Configuration

The dashboard stores API configuration in memory only. If you refresh the page, you'll need to reconfigure.

Default values:
- **API URL**: `http://localhost:3001`
- **API Key**: `dev-api-key-change-in-production`

