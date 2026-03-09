# Security Audit - End-to-End Security Enforcement

## Overview

This document outlines the security measures enforced throughout the scanning pipeline, from job creation to page capture.

## Security Checkpoints

### 1. Job Queue Entry (`job-queue.ts` - `addJob`)

**Security Checks:**
- ✅ **SSRF Protection**: `validateUrl()` called before job creation
- ✅ **URL Policy Check**: `checkUrlPolicy()` validates same-origin/allowed origins
- ✅ **maxPages Hard Cap**: Enforced via `Math.min(request.maxPages || 25, config.quotas.maxPagesHardLimit)`
- ✅ **maxDepth Hard Cap**: Enforced via `Math.min(request.maxDepth || 2, 5)`
- ✅ **Path Traversal Protection**: ScanId sanitized before use in paths
- ✅ **Audit Logging**: `logScanCreated()` called on job creation

**Code Location:**
```typescript
// apps/scanner/src/job-queue.ts:34-109
```

### 2. Job Execution Start (`job-queue.ts` - `executeJob`)

**Security Checks:**
- ✅ **Path Traversal Protection**: ScanId sanitized before constructing output directory
- ✅ **Output Directory Validation**: Ensures outputDir is within base directory
- ✅ **Audit Logging**: `logScanStart()` called when job begins execution

**Code Location:**
```typescript
// apps/scanner/src/job-queue.ts:149-176
```

### 3. BFS Crawler Initialization (`bfs-crawler.ts` - `constructor`)

**Security Checks:**
- ✅ **maxPages Hard Cap**: Enforced regardless of user input
- ✅ **maxDepth Hard Cap**: Enforced (max 5)
- ✅ **Output Directory Path Safety**: Validates outputDir is within base directory
- ✅ **Path Traversal Protection**: Throws error if path traversal detected

**Code Location:**
```typescript
// apps/scanner/src/crawler/bfs-crawler.ts:36-67
```

### 4. URL Processing (`bfs-crawler.ts` - `processPage`)

**Security Checks (BEFORE any network navigation):**
- ✅ **maxPages Hard Cap**: Checked before processing (`if (this.pages.length >= this.maxPages)`)
- ✅ **maxDepth Hard Cap**: Checked before processing (`if (depth > this.maxDepth)`)
- ✅ **Include/Exclude Regex Rules**: Enforced via `shouldIncludeUrl()`
- ✅ **SSRF Protection**: `validateUrl()` called BEFORE Playwright goto
- ✅ **URL Policy Check**: `checkUrlPolicy()` called BEFORE network navigation
- ✅ **Same-Hostname Enforcement**: Explicit check (`urlHostname !== this.seedHostname`)
- ✅ **Audit Logging**: `logBlockedByPolicy()` called when URL is blocked

**Code Location:**
```typescript
// apps/scanner/src/crawler/bfs-crawler.ts:92-150
```

### 5. Link Extraction (`bfs-crawler.ts` - `processPage` link queueing)

**Security Checks:**
- ✅ **Same-Hostname Enforcement**: `isSameHostname()` check before adding to queue
- ✅ **maxPages Hard Cap**: Checked before queueing (`this.pages.length + this.queue.length >= this.maxPages`)
- ✅ **maxDepth Hard Cap**: Checked before queueing (`depth + 1 > this.maxDepth`)
- ✅ **Duplicate Prevention**: Visited set and queue check prevent duplicate processing

**Code Location:**
```typescript
// apps/scanner/src/crawler/bfs-crawler.ts:150-180
```

### 6. Page Capture (`page-capture.ts` - `capturePage`)

**Security Checks (BEFORE Playwright goto):**
- ✅ **SSRF Protection**: `validateUrl()` called BEFORE `page.goto()`
- ✅ **Protocol Validation**: Explicit check for http/https only
- ✅ **Dangerous Protocol Block**: Blocks file://, ftp://, gopher://
- ✅ **Redirect Safety**: `checkRedirectSafety()` validates redirect URLs
- ✅ **Path Traversal Protection**: Page number sanitized before use in paths
- ✅ **Output Directory Validation**: Ensures pageDir is within baseOutputDir

**Code Location:**
```typescript
// apps/scanner/src/crawler/page-capture.ts:23-75
```

### 7. Output Storage (`storage.ts` - `SecureStorage`)

**Security Checks:**
- ✅ **Path Traversal Protection**: `sanitizeScanId()` removes dangerous characters
- ✅ **Path Resolution Check**: Validates resolved path is within baseDir
- ✅ **Filename Sanitization**: Removes path separators and dangerous characters

**Code Location:**
```typescript
// apps/scanner/src/security/storage.ts
```

## Security Enforcement Flow

```
User Request
    ↓
[1] Job Queue Entry
    ├─> SSRF Protection (validateUrl)
    ├─> URL Policy Check (checkUrlPolicy)
    ├─> maxPages/maxDepth Hard Caps
    └─> Audit: logScanCreated
    ↓
[2] Job Execution Start
    ├─> Path Traversal Check (scanId sanitization)
    ├─> Output Directory Validation
    └─> Audit: logScanStart
    ↓
[3] BFS Crawler Init
    ├─> maxPages/maxDepth Hard Caps
    └─> Output Directory Path Safety
    ↓
[4] URL Processing (per URL)
    ├─> maxPages/maxDepth Hard Caps
    ├─> Include/Exclude Regex Rules
    ├─> SSRF Protection (validateUrl) ← BEFORE network
    ├─> URL Policy Check (checkUrlPolicy) ← BEFORE network
    ├─> Same-Hostname Enforcement
    └─> Audit: logBlockedByPolicy (if blocked)
    ↓
[5] Page Capture
    ├─> SSRF Protection (validateUrl) ← BEFORE Playwright goto
    ├─> Protocol Validation ← BEFORE Playwright goto
    ├─> Redirect Safety Check
    ├─> Path Traversal Protection
    └─> Output Directory Validation
    ↓
[6] Link Extraction
    ├─> Same-Hostname Enforcement
    ├─> maxPages/maxDepth Hard Caps
    └─> Duplicate Prevention
```

## Defense in Depth

Multiple layers of security checks:

1. **Input Validation**: Zod schemas + regex sanitization
2. **Job Queue**: SSRF + URL policy at entry
3. **Crawler**: Hard caps + same-hostname + regex rules
4. **Page Capture**: SSRF + protocol check BEFORE navigation
5. **Storage**: Path traversal protection at file system level

## Audit Logging Events

All security-relevant events are logged:

1. ✅ **scan_created**: When scan job is created
2. ✅ **scan_start**: When scan execution begins
3. ✅ **scan_complete**: When scan finishes successfully
4. ✅ **scan_failed**: When scan fails (with error message)
5. ✅ **scan_timeout**: When scan exceeds max runtime
6. ✅ **blocked_by_policy**: When URL is blocked by policy

**Log Format:**
```json
{
  "timestamp": "2024-12-19T...",
  "type": "blocked_by_policy",
  "scanId": "scan_...",
  "message": "URL blocked by policy: https://... - reason",
  "metadata": {
    "url": "https://...",
    "reason": "..."
  }
}
```

## Security Guarantees

### ✅ SSRF Protection
- DNS resolution with private IP blocking
- Protocol restrictions (http/https only)
- Port restrictions (80/443 only)
- Localhost/loopback blocking
- **Enforced BEFORE any network navigation**

### ✅ URL Policy
- Same-origin enforcement (configurable)
- Allowed origins whitelist
- Redirect safety checks
- **Enforced BEFORE Playwright goto**

### ✅ Resource Limits
- maxPages hard cap (200 default, configurable)
- maxDepth hard cap (5 maximum)
- Max runtime per scan (10 minutes default)
- Concurrency limits (5 default)
- **Enforced at multiple checkpoints**

### ✅ Path Safety
- ScanId sanitization
- Page number sanitization
- Output directory validation
- Path traversal detection
- **Enforced at file system operations**

### ✅ Input Hygiene
- Zod schema validation
- Regex pattern sanitization (max length 500)
- Pattern array limits (max 20 patterns)
- Try/catch for regex compilation
- **Enforced at request validation**

### ✅ Same-Hostname Crawling
- Default behavior: only crawl same hostname
- Explicit check in `processPage()`
- Explicit check in link queueing
- **Enforced at multiple points**

### ✅ Include/Exclude Rules
- Regex pattern matching
- Enforced before URL processing
- Sanitized patterns (validated and compiled)
- **Enforced in `processPage()`**

## Prevention of Arbitrary File Access

**Mechanisms:**
1. **Protocol Blocking**: file://, ftp://, gopher:// blocked
2. **SSRF Protection**: Private IPs and localhost blocked
3. **Path Traversal Protection**: All paths sanitized and validated
4. **Output Directory Isolation**: All writes validated to be within baseDir
5. **No File Reading**: Crawler only reads captured HTML (from controlled output directory)

**Guarantee**: Scan jobs cannot read arbitrary local files or access internal network resources.

## Testing Recommendations

1. **SSRF Tests**: Verify private IPs, localhost, file:// are blocked
2. **Path Traversal Tests**: Verify `../` and path separators are sanitized
3. **Quota Tests**: Verify maxPages/maxDepth caps are enforced
4. **Policy Tests**: Verify same-origin and allowed origins work
5. **Audit Log Tests**: Verify all events are logged correctly

## Configuration

Security settings in `apps/scanner/src/config.ts`:

```typescript
quotas: {
  maxPagesHardLimit: 200,      // Hard cap on maxPages
  maxRuntimeMs: 600000,         // 10 minutes
},
urlPolicy: {
  sameOriginOnly: false,        // Enable same-origin policy
  allowedOrigins: [],           // Whitelist of allowed origins
},
```

## Summary

✅ **All security checks are in place**
✅ **SSRF protection enforced BEFORE network navigation**
✅ **URL policy checks enforced BEFORE Playwright goto**
✅ **Hard caps enforced at multiple checkpoints**
✅ **Path traversal protection at all file operations**
✅ **Audit logging for all security events**
✅ **Defense in depth with multiple validation layers**

The system is hardened end-to-end with security checks at every critical point.

