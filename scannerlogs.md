Scanner API starting on port 3001...

> raawi-x@0.1.0 scanner:dev D:\Waheed\RaawiX
> pnpm --filter scanner dev


> @raawi-x/scanner@0.1.0 dev D:\Waheed\RaawiX\apps\scanner
> tsx watch src/index.ts

Scanner API server running on port 3001
Report UI origin: http://localhost:5173
Max concurrent scans: 5
Scan retention: 7 days
Database: enabled
[DB] Initializing Prisma client...
[DB] PrismaClient imported, creating instance...
[DB] PrismaClient instance created, testing connection...
[DB] Prisma client initialized successfully
[SSE] Scan scan_1768410655473_cjp79t2 not found in database yet, allowing connection (scan may be creating)
[DISCOVERY] Starting discovery, seed: http://localhost:4173/
[DISCOVERY] Starting discovery, seed: http://localhost:4173/
[DISCOVERY] http://localhost:4173/: found 14 links, added 12 new, total: 13
[DISCOVERY] http://localhost:4173/: found 14 links, added 12 new, total: 13
[DISCOVERY] http://localhost:4173/about: found 9 links, added 0 new, total: 13
[DISCOVERY] http://localhost:4173/about: found 9 links, added 0 new, total: 13
[DISCOVERY] http://localhost:4173/news: found 14 links, added 2 new, total: 15
[DISCOVERY] http://localhost:4173/news: found 14 links, added 2 new, total: 15
[DISCOVERY] http://localhost:4173/resources: found 11 links, added 0 new, total: 15
[DISCOVERY] http://localhost:4173/resources: found 11 links, added 0 new, total: 15
[DISCOVERY] http://localhost:4173/contact: found 9 links, added 0 new, total: 15
[DISCOVERY] http://localhost:4173/contact: found 9 links, added 0 new, total: 15
[DISCOVERY] http://localhost:4173/services: found 14 links, added 3 new, total: 18
[DISCOVERY] http://localhost:4173/services: found 14 links, added 3 new, total: 18
[DISCOVERY] http://localhost:4173/resources/accessibility: found 9 links, added 0 new, total: 18
[DISCOVERY] http://localhost:4173/resources/accessibility: found 9 links, added 0 new, total: 18
[DISCOVERY] http://localhost:4173/services/web-accessibility: found 9 links, added 0 new, total: 18
[DISCOVERY] http://localhost:4173/services/web-accessibility: found 9 links, added 0 new, total: 18
[DISCOVERY] http://localhost:4173/services/training: found 9 links, added 0 new, total: 18
[DISCOVERY] http://localhost:4173/services/training: found 9 links, added 0 new, total: 18
[DISCOVERY] http://localhost:4173/news/accessibility-awards-2024: found 9 links, added 0 new, total: 18
[DISCOVERY] http://localhost:4173/news/accessibility-awards-2024: found 9 links, added 0 new, total: 18
[DISCOVERY] http://localhost:4173/news/wcag-2-2-updates: found 9 links, added 0 new, total: 18
[DISCOVERY] http://localhost:4173/news/wcag-2-2-updates: found 9 links, added 0 new, total: 18
[DISCOVERY] http://localhost:4173/news/screen-reader-testing: found 9 links, added 0 new, total: 18
[DISCOVERY] http://localhost:4173/news/screen-reader-testing: found 9 links, added 0 new, total: 18
[DISCOVERY] http://localhost:4173/sitemap: found 19 links, added 0 new, total: 18
[DISCOVERY] http://localhost:4173/sitemap: found 19 links, added 0 new, total: 18
[DISCOVERY] http://localhost:4173/news/keyboard-navigation: found 9 links, added 0 new, total: 18
[DISCOVERY] http://localhost:4173/news/keyboard-navigation: found 9 links, added 0 new, total: 18
[DISCOVERY] http://localhost:4173/news/aria-basics: found 9 links, added 0 new, total: 18
[DISCOVERY] http://localhost:4173/news/aria-basics: found 9 links, added 0 new, total: 18
[DISCOVERY] http://localhost:4173/services/consulting: found 9 links, added 0 new, total: 18
[DISCOVERY] http://localhost:4173/services/consulting: found 9 links, added 0 new, total: 18
[DISCOVERY] http://localhost:4173/services/remediation: found 9 links, added 0 new, total: 18
[DISCOVERY] http://localhost:4173/services/remediation: found 9 links, added 0 new, total: 18
[DISCOVERY] http://localhost:4173/services/testing: found 9 links, added 0 new, total: 18
[DISCOVERY] http://localhost:4173/services/testing: found 9 links, added 0 new, total: 18
[DISCOVERY] Discovery complete. Found 18 pages
[DISCOVERY] Discovered URLs list: [
  '/',
  '/about',
  '/news',
  '/resources',
  '/contact',
  '/services',
  '/resources/accessibility',
  '/services/web-accessibility',
  '/services/training',
  '/news/accessibility-awards-2024',
  '/news/wcag-2-2-updates',
  '/news/screen-reader-testing',
  '/sitemap',
  '/news/keyboard-navigation',
  '/news/aria-basics',
  '/services/consulting',
  '/services/remediation',
  '/services/testing'
]
[DISCOVERY] Emitting scan_done event with 18 URLs
[DISCOVERY] Discovery complete. Found 18 pages
[DISCOVERY] Discovered URLs list: [
  '/',
  '/about',
  '/news',
  '/resources',
  '/contact',
  '/services',
  '/resources/accessibility',
  '/services/web-accessibility',
  '/services/training',
  '/news/accessibility-awards-2024',
  '/news/wcag-2-2-updates',
  '/news/screen-reader-testing',
  '/sitemap',
  '/news/keyboard-navigation',
  '/news/aria-basics',
  '/services/consulting',
  '/services/remediation',
  '/services/testing'
]
[DISCOVERY] Emitting scan_done event with 18 URLs
{"timestamp":"2026-01-14T17:11:03.430Z","level":"info","scanId":"scan_1768410655473_cjp79t2","message":"Scan created in database"}
{"timestamp":"2026-01-14T17:11:03.433Z","level":"info","scanId":"scan_1768410655473_cjp79t2","message":"Scan status updated in database","status":"queued"}
{"timestamp":"2026-01-14T17:11:03.442Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Scan created in database"}
{"timestamp":"2026-01-14T17:11:03.442Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Scan job created","seedUrl":"http://localhost:4173","maxPages":18,"maxDepth":3}
{"timestamp":"2026-01-14T17:11:03.443Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"State transition","oldStatus":"queued","newStatus":"running"}
{"timestamp":"2026-01-14T17:11:03.443Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Scan execution started","seedUrl":"http://localhost:4173","maxPages":18,"maxDepth":3}
[JOB-QUEUE] Checking selectedUrls: { hasSelectedUrls: false, length: 0, selectedUrls: undefined }
{"timestamp":"2026-01-14T17:11:03.444Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"[JOB-QUEUE] Checking selectedUrls","hasSelectedUrls":false,"length":0}
[JOB-QUEUE] No selectedUrls provided, falling back to BFS CRAWLER
{"timestamp":"2026-01-14T17:11:03.445Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"No selectedUrls provided, using BFS crawler"}
{"timestamp":"2026-01-14T17:11:03.446Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Starting crawl","maxPages":18,"maxDepth":3}
[CRAWL] Starting crawl with queue size: 1, maxPages: 18, maxDepth: 3
[CRAWL] Depth limits: Will crawl up to depth 3 (0 = seed, 1 = one click away, etc.)
[CRAWL] Queue: 1 pages, Processed: 0/18
[CRAWL] Added to batch: http://localhost:4173/ (depth: 0)
[CRAWL] Processing batch of 1 pages
[WAIT] Navigation start: http://localhost:4173/
[WAIT] Navigation end: http://localhost:4173/
[WAIT] Starting page stabilization...
[WAIT] Ready marker not found, continuing with other strategies
[WAIT] Network idle achieved
[WAIT] Fallback due to timeout, proceeding with best effort
[WAIT] Ready marker hit (false)
[WAIT] Network idle achieved
[WAIT] Fallback due to timeout
[L1] Checking for accessibility barriers (disabled tools)...
[ACCESSIBILITY-BARRIERS] Found 0 barriers on page
[L2] Screenshot start
[L2] Screenshot end
[L1] Capture start
[L1] Capture end: DOM/HTML for page 1: http://localhost:4173/
[CRAWL] Extracted 14 links from live DOM for http://localhost:4173/
[CRAWL] Sample links: http://localhost:4173/, http://localhost:4173/about, http://localhost:4173/news, http://localhost:4173/resources, http://localhost:4173/contact
{"timestamp":"2026-01-14T17:11:35.507Z","level":"info","message":"Gemini Vision provider enabled"}
{"timestamp":"2026-01-14T17:11:35.508Z","level":"info","message":"Starting vision analysis","pageNumber":1,"url":"http://localhost:4173/"}
{"timestamp":"2026-01-14T17:11:35.587Z","level":"info","message":"Collected interactive candidates","pageNumber":1,"count":138}
{"timestamp":"2026-01-14T17:11:36.165Z","level":"info","message":"Vision analysis complete","pageNumber":1,"findingsCount":0}
[L2] Vision complete for page 1: 0 findings, screenshot: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\1\screenshot.png
[CRAWL] Using 14 links from live DOM extraction for http://localhost:4173/
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/
[CRAWL] Skipping link (different hostname): https://www.w3.org/WAI/WCAG21/quickref/
[CRAWL] Added 12 new links to queue from http://localhost:4173/ (total in queue: 12)
[CRAWL] Batch complete. Queue now: 12, Pages: 1
[CRAWL] Queue: 12 pages, Processed: 1/18
[CRAWL] Added to batch: http://localhost:4173/about (depth: 1)
[CRAWL] Added to batch: http://localhost:4173/news (depth: 1)
[CRAWL] Processing batch of 2 pages
[WAIT] Navigation start: http://localhost:4173/news
[WAIT] Navigation start: http://localhost:4173/about
[WAIT] Navigation end: http://localhost:4173/news
[WAIT] Starting page stabilization...
[WAIT] Navigation end: http://localhost:4173/about
[WAIT] Starting page stabilization...
[WAIT] Ready marker not found, continuing with other strategies
[WAIT] Network idle achieved
[WAIT] Ready marker not found, continuing with other strategies
[WAIT] Network idle achieved
[WAIT] Fallback due to timeout, proceeding with best effort
[WAIT] Ready marker hit (false)
[WAIT] Network idle achieved
[WAIT] Fallback due to timeout
[WAIT] Fallback due to timeout, proceeding with best effort
[WAIT] Ready marker hit (false)
[WAIT] Network idle achieved
[WAIT] Fallback due to timeout
[L1] Checking for accessibility barriers (disabled tools)...
[L1] Checking for accessibility barriers (disabled tools)...
[ACCESSIBILITY-BARRIERS] Found 0 barriers on page
[L2] Screenshot start
[ACCESSIBILITY-BARRIERS] Found 0 barriers on page
[L2] Screenshot start
[L2] Screenshot end
[L1] Capture start
[L2] Screenshot end
[L1] Capture start
[L1] Capture end: DOM/HTML for page 2: http://localhost:4173/about
[L1] Capture end: DOM/HTML for page 3: http://localhost:4173/news
[CRAWL] Extracted 9 links from live DOM for http://localhost:4173/about
[CRAWL] Sample links: http://localhost:4173/, http://localhost:4173/about, http://localhost:4173/news, http://localhost:4173/resources, http://localhost:4173/contact
[CRAWL] Extracted 14 links from live DOM for http://localhost:4173/news
[CRAWL] Sample links: http://localhost:4173/, http://localhost:4173/about, http://localhost:4173/news, http://localhost:4173/resources, http://localhost:4173/contact
{"timestamp":"2026-01-14T17:12:07.495Z","level":"info","message":"Gemini Vision provider enabled"}
{"timestamp":"2026-01-14T17:12:07.495Z","level":"info","message":"Starting vision analysis","pageNumber":2,"url":"http://localhost:4173/about"}
{"timestamp":"2026-01-14T17:12:07.497Z","level":"info","message":"Gemini Vision provider enabled"}
{"timestamp":"2026-01-14T17:12:07.497Z","level":"info","message":"Starting vision analysis","pageNumber":3,"url":"http://localhost:4173/news"}
{"timestamp":"2026-01-14T17:12:07.603Z","level":"info","message":"Collected interactive candidates","pageNumber":2,"count":125}
{"timestamp":"2026-01-14T17:12:07.604Z","level":"info","message":"Collected interactive candidates","pageNumber":3,"count":135}
{"timestamp":"2026-01-14T17:12:08.070Z","level":"info","message":"Vision analysis complete","pageNumber":2,"findingsCount":0}
[L2] Vision complete for page 2: 0 findings, screenshot: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\2\screenshot.png
[CRAWL] Using 9 links from live DOM extraction for http://localhost:4173/about
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/about
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/news
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/resources
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/contact
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/services
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/sitemap
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/resources/accessibility
[CRAWL] Skipping link (different hostname): https://www.w3.org/WAI/WCAG21/quickref/
[CRAWL] Added 0 new links to queue from http://localhost:4173/about (total in queue: 10)
{"timestamp":"2026-01-14T17:12:08.187Z","level":"info","message":"Vision analysis complete","pageNumber":3,"findingsCount":0}
[L2] Vision complete for page 3: 0 findings, screenshot: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\3\screenshot.png
[CRAWL] Using 14 links from live DOM extraction for http://localhost:4173/news
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/about
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/news
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/resources
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/contact
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/news/accessibility-awards-2024
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/news/wcag-2-2-updates
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/news/screen-reader-testing
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/services
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/sitemap
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/resources/accessibility
[CRAWL] Skipping link (different hostname): https://www.w3.org/WAI/WCAG21/quickref/
[CRAWL] Added 2 new links to queue from http://localhost:4173/news (total in queue: 12)
[CRAWL] Batch complete. Queue now: 12, Pages: 3
[CRAWL] Queue: 12 pages, Processed: 3/18
[CRAWL] Added to batch: http://localhost:4173/resources (depth: 1)
[CRAWL] Added to batch: http://localhost:4173/contact (depth: 1)
[CRAWL] Processing batch of 2 pages
[WAIT] Navigation start: http://localhost:4173/resources
[WAIT] Navigation start: http://localhost:4173/contact
[WAIT] Navigation end: http://localhost:4173/contact
[WAIT] Starting page stabilization...
[WAIT] Navigation end: http://localhost:4173/resources
[WAIT] Starting page stabilization...
[WAIT] Ready marker not found, continuing with other strategies
[WAIT] Network idle achieved
[WAIT] Ready marker not found, continuing with other strategies
[WAIT] Network idle achieved
[WAIT] Fallback due to timeout, proceeding with best effort
[WAIT] Ready marker hit (false)
[WAIT] Network idle achieved
[WAIT] Fallback due to timeout
[WAIT] Fallback due to timeout, proceeding with best effort
[WAIT] Ready marker hit (false)
[WAIT] Network idle achieved
[WAIT] Fallback due to timeout
[L1] Checking for accessibility barriers (disabled tools)...
[L1] Checking for accessibility barriers (disabled tools)...
[ACCESSIBILITY-BARRIERS] Found 0 barriers on page
[L2] Screenshot start
[ACCESSIBILITY-BARRIERS] Found 0 barriers on page
[L2] Screenshot start
[L2] Screenshot end
[L1] Capture start
[L2] Screenshot end
[L1] Capture start
[L1] Capture end: DOM/HTML for page 5: http://localhost:4173/contact
[L1] Capture end: DOM/HTML for page 4: http://localhost:4173/resources
[CRAWL] Extracted 9 links from live DOM for http://localhost:4173/contact
[CRAWL] Sample links: http://localhost:4173/, http://localhost:4173/about, http://localhost:4173/news, http://localhost:4173/resources, http://localhost:4173/contact
[CRAWL] Extracted 11 links from live DOM for http://localhost:4173/resources
[CRAWL] Sample links: http://localhost:4173/, http://localhost:4173/about, http://localhost:4173/news, http://localhost:4173/resources, http://localhost:4173/contact
{"timestamp":"2026-01-14T17:12:39.417Z","level":"info","message":"Gemini Vision provider enabled"}
{"timestamp":"2026-01-14T17:12:39.417Z","level":"info","message":"Starting vision analysis","pageNumber":5,"url":"http://localhost:4173/contact"}
{"timestamp":"2026-01-14T17:12:39.419Z","level":"info","message":"Gemini Vision provider enabled"}
{"timestamp":"2026-01-14T17:12:39.419Z","level":"info","message":"Starting vision analysis","pageNumber":4,"url":"http://localhost:4173/resources"}
{"timestamp":"2026-01-14T17:12:39.525Z","level":"info","message":"Collected interactive candidates","pageNumber":4,"count":132}
{"timestamp":"2026-01-14T17:12:39.526Z","level":"info","message":"Collected interactive candidates","pageNumber":5,"count":130}
{"timestamp":"2026-01-14T17:12:40.109Z","level":"info","message":"Vision analysis complete","pageNumber":4,"findingsCount":0}
[L2] Vision complete for page 4: 0 findings, screenshot: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\4\screenshot.png
[CRAWL] Using 11 links from live DOM extraction for http://localhost:4173/resources
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/about
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/news
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/resources
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/contact
[CRAWL] Skipping link (different hostname): https://www.w3.org/WAI/ARIA/apg/
[CRAWL] Skipping link (different hostname): https://webaim.org/resources/contrastchecker/
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/resources/accessibility
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/services
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/sitemap
[CRAWL] Skipping link (different hostname): https://www.w3.org/WAI/WCAG21/quickref/
[CRAWL] Added 0 new links to queue from http://localhost:4173/resources (total in queue: 10)
{"timestamp":"2026-01-14T17:12:40.146Z","level":"info","message":"Vision analysis complete","pageNumber":5,"findingsCount":0}
[L2] Vision complete for page 5: 0 findings, screenshot: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\5\screenshot.png
[CRAWL] Using 9 links from live DOM extraction for http://localhost:4173/contact
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/about
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/news
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/resources
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/contact
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/services
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/sitemap
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/resources/accessibility
[CRAWL] Skipping link (different hostname): https://www.w3.org/WAI/WCAG21/quickref/
[CRAWL] Added 0 new links to queue from http://localhost:4173/contact (total in queue: 10)
[CRAWL] Batch complete. Queue now: 10, Pages: 5
[CRAWL] Queue: 10 pages, Processed: 5/18
[CRAWL] Added to batch: http://localhost:4173/services (depth: 1)
[CRAWL] Added to batch: http://localhost:4173/resources/accessibility (depth: 1)
[CRAWL] Processing batch of 2 pages
[WAIT] Navigation start: http://localhost:4173/services
[WAIT] Navigation start: http://localhost:4173/resources/accessibility
[WAIT] Navigation end: http://localhost:4173/services
[WAIT] Starting page stabilization...
[WAIT] Navigation end: http://localhost:4173/resources/accessibility
[WAIT] Starting page stabilization...
[WAIT] Ready marker not found, continuing with other strategies
[WAIT] Network idle achieved
[WAIT] Ready marker not found, continuing with other strategies
[WAIT] Network idle achieved
[WAIT] Fallback due to timeout, proceeding with best effort
[WAIT] Ready marker hit (false)
[WAIT] Network idle achieved
[WAIT] Fallback due to timeout
[WAIT] Fallback due to timeout, proceeding with best effort
[WAIT] Ready marker hit (false)
[WAIT] Network idle achieved
[WAIT] Fallback due to timeout
[L1] Checking for accessibility barriers (disabled tools)...
[ACCESSIBILITY-BARRIERS] Found 0 barriers on page
[L2] Screenshot start
[L1] Checking for accessibility barriers (disabled tools)...
[ACCESSIBILITY-BARRIERS] Found 0 barriers on page
[L2] Screenshot start
[L2] Screenshot end
[L1] Capture start
[L2] Screenshot end
[L1] Capture start
[L1] Capture end: DOM/HTML for page 7: http://localhost:4173/resources/accessibility
[L1] Capture end: DOM/HTML for page 6: http://localhost:4173/services
[CRAWL] Extracted 9 links from live DOM for http://localhost:4173/resources/accessibility
[CRAWL] Sample links: http://localhost:4173/, http://localhost:4173/about, http://localhost:4173/news, http://localhost:4173/resources, http://localhost:4173/contact
[CRAWL] Extracted 14 links from live DOM for http://localhost:4173/services
[CRAWL] Sample links: http://localhost:4173/, http://localhost:4173/about, http://localhost:4173/news, http://localhost:4173/resources, http://localhost:4173/contact
{"timestamp":"2026-01-14T17:13:11.458Z","level":"info","message":"Gemini Vision provider enabled"}
{"timestamp":"2026-01-14T17:13:11.458Z","level":"info","message":"Starting vision analysis","pageNumber":7,"url":"http://localhost:4173/resources/accessibility"}
{"timestamp":"2026-01-14T17:13:11.460Z","level":"info","message":"Gemini Vision provider enabled"}
{"timestamp":"2026-01-14T17:13:11.460Z","level":"info","message":"Starting vision analysis","pageNumber":6,"url":"http://localhost:4173/services"}
{"timestamp":"2026-01-14T17:13:11.569Z","level":"info","message":"Collected interactive candidates","pageNumber":7,"count":127}
{"timestamp":"2026-01-14T17:13:11.570Z","level":"info","message":"Collected interactive candidates","pageNumber":6,"count":135}
{"timestamp":"2026-01-14T17:13:12.048Z","level":"info","message":"Vision analysis complete","pageNumber":7,"findingsCount":0}
[L2] Vision complete for page 7: 0 findings, screenshot: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\7\screenshot.png
[CRAWL] Using 9 links from live DOM extraction for http://localhost:4173/resources/accessibility
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/about
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/news
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/resources
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/contact
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/services
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/sitemap
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/resources/accessibility
[CRAWL] Skipping link (different hostname): https://www.w3.org/WAI/WCAG21/quickref/
[CRAWL] Added 0 new links to queue from http://localhost:4173/resources/accessibility (total in queue: 8)
{"timestamp":"2026-01-14T17:13:12.143Z","level":"info","message":"Vision analysis complete","pageNumber":6,"findingsCount":0}
[L2] Vision complete for page 6: 0 findings, screenshot: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\6\screenshot.png
[CRAWL] Using 14 links from live DOM extraction for http://localhost:4173/services
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/about
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/news
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/resources
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/contact
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/services/web-accessibility
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/services/training
[CRAWL] Max pages reached, stopping link discovery
[CRAWL] Added 3 new links to queue from http://localhost:4173/services (total in queue: 11)
[CRAWL] Batch complete. Queue now: 11, Pages: 7
[CRAWL] Queue: 11 pages, Processed: 7/18
[CRAWL] Added to batch: http://localhost:4173/services/web-accessibility (depth: 1)
[CRAWL] Added to batch: http://localhost:4173/services/training (depth: 1)
[CRAWL] Processing batch of 2 pages
[WAIT] Navigation start: http://localhost:4173/services/web-accessibility
[WAIT] Navigation start: http://localhost:4173/services/training
[WAIT] Navigation end: http://localhost:4173/services/web-accessibility
[WAIT] Starting page stabilization...
[WAIT] Navigation end: http://localhost:4173/services/training
[WAIT] Starting page stabilization...
[WAIT] Ready marker not found, continuing with other strategies
[WAIT] Network idle achieved
[WAIT] Ready marker not found, continuing with other strategies
[WAIT] Network idle achieved
[WAIT] Fallback due to timeout, proceeding with best effort
[WAIT] Ready marker hit (false)
[WAIT] Network idle achieved
[WAIT] Fallback due to timeout
[WAIT] Fallback due to timeout, proceeding with best effort
[WAIT] Ready marker hit (false)
[WAIT] Network idle achieved
[WAIT] Fallback due to timeout
[L1] Checking for accessibility barriers (disabled tools)...
[L1] Checking for accessibility barriers (disabled tools)...
[ACCESSIBILITY-BARRIERS] Found 0 barriers on page
[ACCESSIBILITY-BARRIERS] Found 0 barriers on page
[L2] Screenshot start
[L2] Screenshot start
[L2] Screenshot end
[L1] Capture start
[L2] Screenshot end
[L1] Capture start
[L1] Capture end: DOM/HTML for page 9: http://localhost:4173/services/training
[L1] Capture end: DOM/HTML for page 8: http://localhost:4173/services/web-accessibility
[CRAWL] Extracted 9 links from live DOM for http://localhost:4173/services/training
[CRAWL] Sample links: http://localhost:4173/, http://localhost:4173/about, http://localhost:4173/news, http://localhost:4173/resources, http://localhost:4173/contact
[CRAWL] Extracted 9 links from live DOM for http://localhost:4173/services/web-accessibility
[CRAWL] Sample links: http://localhost:4173/, http://localhost:4173/about, http://localhost:4173/news, http://localhost:4173/resources, http://localhost:4173/contact
{"timestamp":"2026-01-14T17:13:43.518Z","level":"info","message":"Gemini Vision provider enabled"}
{"timestamp":"2026-01-14T17:13:43.518Z","level":"info","message":"Starting vision analysis","pageNumber":9,"url":"http://localhost:4173/services/training"}
{"timestamp":"2026-01-14T17:13:43.519Z","level":"info","message":"Gemini Vision provider enabled"}
{"timestamp":"2026-01-14T17:13:43.520Z","level":"info","message":"Starting vision analysis","pageNumber":8,"url":"http://localhost:4173/services/web-accessibility"}
{"timestamp":"2026-01-14T17:13:43.628Z","level":"info","message":"Collected interactive candidates","pageNumber":9,"count":129}
{"timestamp":"2026-01-14T17:13:43.629Z","level":"info","message":"Collected interactive candidates","pageNumber":8,"count":129}
{"timestamp":"2026-01-14T17:13:44.083Z","level":"info","message":"Vision analysis complete","pageNumber":9,"findingsCount":0}
[L2] Vision complete for page 9: 0 findings, screenshot: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\9\screenshot.png
{"timestamp":"2026-01-14T17:13:44.084Z","level":"info","message":"Vision analysis complete","pageNumber":8,"findingsCount":0}
[L2] Vision complete for page 8: 0 findings, screenshot: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\8\screenshot.png
[CRAWL] Using 9 links from live DOM extraction for http://localhost:4173/services/web-accessibility
[CRAWL] Max pages reached, stopping link discovery
[CRAWL] Added 0 new links to queue from http://localhost:4173/services/web-accessibility (total in queue: 9)
[CRAWL] Using 9 links from live DOM extraction for http://localhost:4173/services/training
[CRAWL] Max pages reached, stopping link discovery
[CRAWL] Added 0 new links to queue from http://localhost:4173/services/training (total in queue: 9)
[CRAWL] Batch complete. Queue now: 9, Pages: 9
[CRAWL] Queue: 9 pages, Processed: 9/18
[CRAWL] Added to batch: http://localhost:4173/news/accessibility-awards-2024 (depth: 1)
[CRAWL] Added to batch: http://localhost:4173/news/wcag-2-2-updates (depth: 1)
[CRAWL] Processing batch of 2 pages
[WAIT] Navigation start: http://localhost:4173/news/accessibility-awards-2024
[WAIT] Navigation start: http://localhost:4173/news/wcag-2-2-updates
[WAIT] Navigation end: http://localhost:4173/news/accessibility-awards-2024
[WAIT] Starting page stabilization...
[WAIT] Navigation end: http://localhost:4173/news/wcag-2-2-updates
[WAIT] Starting page stabilization...
[WAIT] Ready marker not found, continuing with other strategies
[WAIT] Network idle achieved
[WAIT] Ready marker not found, continuing with other strategies
[WAIT] Network idle achieved
[WAIT] Fallback due to timeout, proceeding with best effort
[WAIT] Ready marker hit (false)
[WAIT] Network idle achieved
[WAIT] Fallback due to timeout
[WAIT] Fallback due to timeout, proceeding with best effort
[WAIT] Ready marker hit (false)
[WAIT] Network idle achieved
[WAIT] Fallback due to timeout
[L1] Checking for accessibility barriers (disabled tools)...
[L1] Checking for accessibility barriers (disabled tools)...
[ACCESSIBILITY-BARRIERS] Found 0 barriers on page
[L2] Screenshot start
[ACCESSIBILITY-BARRIERS] Found 0 barriers on page
[L2] Screenshot start
[L2] Screenshot end
[L1] Capture start
[L2] Screenshot end
[L1] Capture start
[L1] Capture end: DOM/HTML for page 11: http://localhost:4173/news/wcag-2-2-updates
[L1] Capture end: DOM/HTML for page 10: http://localhost:4173/news/accessibility-awards-2024
[CRAWL] Extracted 9 links from live DOM for http://localhost:4173/news/wcag-2-2-updates
[CRAWL] Sample links: http://localhost:4173/, http://localhost:4173/about, http://localhost:4173/news, http://localhost:4173/resources, http://localhost:4173/contact
[CRAWL] Extracted 9 links from live DOM for http://localhost:4173/news/accessibility-awards-2024
[CRAWL] Sample links: http://localhost:4173/, http://localhost:4173/about, http://localhost:4173/news, http://localhost:4173/resources, http://localhost:4173/contact
{"timestamp":"2026-01-14T17:14:15.545Z","level":"info","message":"Gemini Vision provider enabled"}
{"timestamp":"2026-01-14T17:14:15.545Z","level":"info","message":"Starting vision analysis","pageNumber":11,"url":"http://localhost:4173/news/wcag-2-2-updates"}
{"timestamp":"2026-01-14T17:14:15.546Z","level":"info","message":"Gemini Vision provider enabled"}
{"timestamp":"2026-01-14T17:14:15.546Z","level":"info","message":"Starting vision analysis","pageNumber":10,"url":"http://localhost:4173/news/accessibility-awards-2024"}
{"timestamp":"2026-01-14T17:14:15.699Z","level":"info","message":"Collected interactive candidates","pageNumber":11,"count":127}
{"timestamp":"2026-01-14T17:14:15.700Z","level":"info","message":"Collected interactive candidates","pageNumber":10,"count":127}
{"timestamp":"2026-01-14T17:14:16.266Z","level":"info","message":"Vision analysis complete","pageNumber":11,"findingsCount":0}
[L2] Vision complete for page 11: 0 findings, screenshot: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\11\screenshot.png
{"timestamp":"2026-01-14T17:14:16.267Z","level":"info","message":"Vision analysis complete","pageNumber":10,"findingsCount":0}
[L2] Vision complete for page 10: 0 findings, screenshot: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\10\screenshot.png
[CRAWL] Using 9 links from live DOM extraction for http://localhost:4173/news/accessibility-awards-2024
[CRAWL] Max pages reached, stopping link discovery
[CRAWL] Added 0 new links to queue from http://localhost:4173/news/accessibility-awards-2024 (total in queue: 7)
[CRAWL] Using 9 links from live DOM extraction for http://localhost:4173/news/wcag-2-2-updates
[CRAWL] Max pages reached, stopping link discovery
[CRAWL] Added 0 new links to queue from http://localhost:4173/news/wcag-2-2-updates (total in queue: 7)
[CRAWL] Batch complete. Queue now: 7, Pages: 11
[CRAWL] Queue: 7 pages, Processed: 11/18
[CRAWL] Added to batch: http://localhost:4173/news/screen-reader-testing (depth: 1)
[CRAWL] Added to batch: http://localhost:4173/sitemap (depth: 1)
[CRAWL] Processing batch of 2 pages
[WAIT] Navigation start: http://localhost:4173/news/screen-reader-testing
[WAIT] Navigation start: http://localhost:4173/sitemap
[WAIT] Navigation end: http://localhost:4173/news/screen-reader-testing
[WAIT] Starting page stabilization...
[WAIT] Navigation end: http://localhost:4173/sitemap
[WAIT] Starting page stabilization...
[WAIT] Ready marker not found, continuing with other strategies
[WAIT] Network idle achieved
[WAIT] Ready marker not found, continuing with other strategies
[WAIT] Network idle achieved
[WAIT] Fallback due to timeout, proceeding with best effort
[WAIT] Ready marker hit (false)
[WAIT] Network idle achieved
[WAIT] Fallback due to timeout
[WAIT] Fallback due to timeout, proceeding with best effort
[WAIT] Ready marker hit (false)
[WAIT] Network idle achieved
[WAIT] Fallback due to timeout
[L1] Checking for accessibility barriers (disabled tools)...
[L1] Checking for accessibility barriers (disabled tools)...
[ACCESSIBILITY-BARRIERS] Found 0 barriers on page
[L2] Screenshot start
[ACCESSIBILITY-BARRIERS] Found 0 barriers on page
[L2] Screenshot start
[L2] Screenshot end
[L1] Capture start
[L2] Screenshot end
[L1] Capture start
[L1] Capture end: DOM/HTML for page 13: http://localhost:4173/sitemap
[L1] Capture end: DOM/HTML for page 12: http://localhost:4173/news/screen-reader-testing
[CRAWL] Extracted 19 links from live DOM for http://localhost:4173/sitemap
[CRAWL] Sample links: http://localhost:4173/, http://localhost:4173/about, http://localhost:4173/news, http://localhost:4173/resources, http://localhost:4173/contact
[CRAWL] Extracted 9 links from live DOM for http://localhost:4173/news/screen-reader-testing
[CRAWL] Sample links: http://localhost:4173/, http://localhost:4173/about, http://localhost:4173/news, http://localhost:4173/resources, http://localhost:4173/contact
{"timestamp":"2026-01-14T17:14:47.615Z","level":"info","message":"Gemini Vision provider enabled"}
{"timestamp":"2026-01-14T17:14:47.615Z","level":"info","message":"Starting vision analysis","pageNumber":13,"url":"http://localhost:4173/sitemap"}
{"timestamp":"2026-01-14T17:14:47.617Z","level":"info","message":"Gemini Vision provider enabled"}
{"timestamp":"2026-01-14T17:14:47.617Z","level":"info","message":"Starting vision analysis","pageNumber":12,"url":"http://localhost:4173/news/screen-reader-testing"}
{"timestamp":"2026-01-14T17:14:47.724Z","level":"info","message":"Collected interactive candidates","pageNumber":13,"count":143}
{"timestamp":"2026-01-14T17:14:47.726Z","level":"info","message":"Collected interactive candidates","pageNumber":12,"count":127}
{"timestamp":"2026-01-14T17:14:48.195Z","level":"info","message":"Vision analysis complete","pageNumber":12,"findingsCount":0}
[L2] Vision complete for page 12: 0 findings, screenshot: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\12\screenshot.png
[CRAWL] Using 9 links from live DOM extraction for http://localhost:4173/news/screen-reader-testing
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/about
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/news
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/resources
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/contact
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/services
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/sitemap
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/resources/accessibility
[CRAWL] Skipping link (different hostname): https://www.w3.org/WAI/WCAG21/quickref/
[CRAWL] Added 0 new links to queue from http://localhost:4173/news/screen-reader-testing (total in queue: 5)
{"timestamp":"2026-01-14T17:14:48.350Z","level":"info","message":"Vision analysis complete","pageNumber":13,"findingsCount":0}
[L2] Vision complete for page 13: 0 findings, screenshot: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\13\screenshot.png
[CRAWL] Using 19 links from live DOM extraction for http://localhost:4173/sitemap
[CRAWL] Max pages reached, stopping link discovery
[CRAWL] Added 0 new links to queue from http://localhost:4173/sitemap (total in queue: 5)
[CRAWL] Batch complete. Queue now: 5, Pages: 13
[CRAWL] Queue: 5 pages, Processed: 13/18
[CRAWL] Added to batch: http://localhost:4173/news/keyboard-navigation (depth: 2)
[CRAWL] Added to batch: http://localhost:4173/news/aria-basics (depth: 2)
[CRAWL] Processing batch of 2 pages
[WAIT] Navigation start: http://localhost:4173/news/keyboard-navigation
[WAIT] Navigation start: http://localhost:4173/news/aria-basics
[WAIT] Navigation end: http://localhost:4173/news/keyboard-navigation
[WAIT] Starting page stabilization...
[WAIT] Navigation end: http://localhost:4173/news/aria-basics
[WAIT] Starting page stabilization...
[WAIT] Ready marker not found, continuing with other strategies
[WAIT] Network idle achieved
[WAIT] Ready marker not found, continuing with other strategies
[WAIT] Network idle achieved
[WAIT] Fallback due to timeout, proceeding with best effort
[WAIT] Ready marker hit (false)
[WAIT] Network idle achieved
[WAIT] Fallback due to timeout
[WAIT] Fallback due to timeout, proceeding with best effort
[WAIT] Ready marker hit (false)
[WAIT] Network idle achieved
[WAIT] Fallback due to timeout
[L1] Checking for accessibility barriers (disabled tools)...
[L1] Checking for accessibility barriers (disabled tools)...
[ACCESSIBILITY-BARRIERS] Found 0 barriers on page
[L2] Screenshot start
[ACCESSIBILITY-BARRIERS] Found 0 barriers on page
[L2] Screenshot start
[L2] Screenshot end
[L1] Capture start
[L2] Screenshot end
[L1] Capture start
[L1] Capture end: DOM/HTML for page 15: http://localhost:4173/news/aria-basics
[L1] Capture end: DOM/HTML for page 14: http://localhost:4173/news/keyboard-navigation
[CRAWL] Extracted 9 links from live DOM for http://localhost:4173/news/aria-basics
[CRAWL] Sample links: http://localhost:4173/, http://localhost:4173/about, http://localhost:4173/news, http://localhost:4173/resources, http://localhost:4173/contact
[CRAWL] Extracted 9 links from live DOM for http://localhost:4173/news/keyboard-navigation
[CRAWL] Sample links: http://localhost:4173/, http://localhost:4173/about, http://localhost:4173/news, http://localhost:4173/resources, http://localhost:4173/contact
{"timestamp":"2026-01-14T17:15:19.727Z","level":"info","message":"Gemini Vision provider enabled"}
{"timestamp":"2026-01-14T17:15:19.727Z","level":"info","message":"Starting vision analysis","pageNumber":15,"url":"http://localhost:4173/news/aria-basics"}
{"timestamp":"2026-01-14T17:15:19.728Z","level":"info","message":"Gemini Vision provider enabled"}
{"timestamp":"2026-01-14T17:15:19.728Z","level":"info","message":"Starting vision analysis","pageNumber":14,"url":"http://localhost:4173/news/keyboard-navigation"}
{"timestamp":"2026-01-14T17:15:19.857Z","level":"info","message":"Collected interactive candidates","pageNumber":15,"count":127}
{"timestamp":"2026-01-14T17:15:19.862Z","level":"info","message":"Collected interactive candidates","pageNumber":14,"count":127}
{"timestamp":"2026-01-14T17:15:20.350Z","level":"info","message":"Vision analysis complete","pageNumber":15,"findingsCount":0}
[L2] Vision complete for page 15: 0 findings, screenshot: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\15\screenshot.png
{"timestamp":"2026-01-14T17:15:20.355Z","level":"info","message":"Vision analysis complete","pageNumber":14,"findingsCount":0}
[L2] Vision complete for page 14: 0 findings, screenshot: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\14\screenshot.png
[CRAWL] Using 9 links from live DOM extraction for http://localhost:4173/news/aria-basics
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/about
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/news
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/resources
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/contact
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/services
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/sitemap
[CRAWL] Skipping link (already visited/queued): http://localhost:4173/resources/accessibility
[CRAWL] Skipping link (different hostname): https://www.w3.org/WAI/WCAG21/quickref/
[CRAWL] Added 0 new links to queue from http://localhost:4173/news/aria-basics (total in queue: 3)
[CRAWL] Using 9 links from live DOM extraction for http://localhost:4173/news/keyboard-navigation
[CRAWL] Max pages reached, stopping link discovery
[CRAWL] Added 0 new links to queue from http://localhost:4173/news/keyboard-navigation (total in queue: 3)
[CRAWL] Batch complete. Queue now: 3, Pages: 15
[CRAWL] Queue: 3 pages, Processed: 15/18
[CRAWL] Added to batch: http://localhost:4173/services/consulting (depth: 2)
[CRAWL] Added to batch: http://localhost:4173/services/remediation (depth: 2)
[CRAWL] Processing batch of 2 pages
[WAIT] Navigation start: http://localhost:4173/services/remediation
[WAIT] Navigation start: http://localhost:4173/services/consulting
[WAIT] Navigation end: http://localhost:4173/services/consulting
[WAIT] Starting page stabilization...
[WAIT] Navigation end: http://localhost:4173/services/remediation
[WAIT] Starting page stabilization...
[WAIT] Ready marker not found, continuing with other strategies
[WAIT] Network idle achieved
[WAIT] Ready marker not found, continuing with other strategies
[WAIT] Network idle achieved
[WAIT] Fallback due to timeout, proceeding with best effort
[WAIT] Ready marker hit (false)
[WAIT] Network idle achieved
[WAIT] Fallback due to timeout
[WAIT] Fallback due to timeout, proceeding with best effort
[WAIT] Ready marker hit (false)
[WAIT] Network idle achieved
[WAIT] Fallback due to timeout
[L1] Checking for accessibility barriers (disabled tools)...
[L1] Checking for accessibility barriers (disabled tools)...
[ACCESSIBILITY-BARRIERS] Found 0 barriers on page
[L2] Screenshot start
[ACCESSIBILITY-BARRIERS] Found 0 barriers on page
[L2] Screenshot start
[L2] Screenshot end
[L1] Capture start
[L2] Screenshot end
[L1] Capture start
[L1] Capture end: DOM/HTML for page 16: http://localhost:4173/services/consulting
[L1] Capture end: DOM/HTML for page 17: http://localhost:4173/services/remediation
[CRAWL] Extracted 9 links from live DOM for http://localhost:4173/services/consulting
[CRAWL] Sample links: http://localhost:4173/, http://localhost:4173/about, http://localhost:4173/news, http://localhost:4173/resources, http://localhost:4173/contact
[CRAWL] Extracted 9 links from live DOM for http://localhost:4173/services/remediation
[CRAWL] Sample links: http://localhost:4173/, http://localhost:4173/about, http://localhost:4173/news, http://localhost:4173/resources, http://localhost:4173/contact
{"timestamp":"2026-01-14T17:15:51.766Z","level":"info","message":"Gemini Vision provider enabled"}
{"timestamp":"2026-01-14T17:15:51.766Z","level":"info","message":"Starting vision analysis","pageNumber":16,"url":"http://localhost:4173/services/consulting"}
{"timestamp":"2026-01-14T17:15:51.768Z","level":"info","message":"Gemini Vision provider enabled"}
{"timestamp":"2026-01-14T17:15:51.768Z","level":"info","message":"Starting vision analysis","pageNumber":17,"url":"http://localhost:4173/services/remediation"}
{"timestamp":"2026-01-14T17:15:51.904Z","level":"info","message":"Collected interactive candidates","pageNumber":16,"count":129}
{"timestamp":"2026-01-14T17:15:51.906Z","level":"info","message":"Collected interactive candidates","pageNumber":17,"count":129}
{"timestamp":"2026-01-14T17:15:52.436Z","level":"info","message":"Vision analysis complete","pageNumber":17,"findingsCount":0}
[L2] Vision complete for page 17: 0 findings, screenshot: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\17\screenshot.png
{"timestamp":"2026-01-14T17:15:52.437Z","level":"info","message":"Vision analysis complete","pageNumber":16,"findingsCount":0}
[L2] Vision complete for page 16: 0 findings, screenshot: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\16\screenshot.png
[CRAWL] Using 9 links from live DOM extraction for http://localhost:4173/services/consulting
[CRAWL] Max pages reached, stopping link discovery
[CRAWL] Added 0 new links to queue from http://localhost:4173/services/consulting (total in queue: 1)
[CRAWL] Using 9 links from live DOM extraction for http://localhost:4173/services/remediation
[CRAWL] Max pages reached, stopping link discovery
[CRAWL] Added 0 new links to queue from http://localhost:4173/services/remediation (total in queue: 1)
[CRAWL] Batch complete. Queue now: 1, Pages: 17
[CRAWL] Queue: 1 pages, Processed: 17/18
[CRAWL] Added to batch: http://localhost:4173/services/testing (depth: 2)
[CRAWL] Processing batch of 1 pages
[WAIT] Navigation start: http://localhost:4173/services/testing
[WAIT] Navigation end: http://localhost:4173/services/testing
[WAIT] Starting page stabilization...
[WAIT] Ready marker not found, continuing with other strategies
[WAIT] Network idle achieved
[WAIT] Fallback due to timeout, proceeding with best effort
[WAIT] Ready marker hit (false)
[WAIT] Network idle achieved
[WAIT] Fallback due to timeout
[L1] Checking for accessibility barriers (disabled tools)...
[ACCESSIBILITY-BARRIERS] Found 0 barriers on page
[L2] Screenshot start
[L2] Screenshot end
[L1] Capture start
[L1] Capture end: DOM/HTML for page 18: http://localhost:4173/services/testing
[CRAWL] Extracted 9 links from live DOM for http://localhost:4173/services/testing
[CRAWL] Sample links: http://localhost:4173/, http://localhost:4173/about, http://localhost:4173/news, http://localhost:4173/resources, http://localhost:4173/contact
{"timestamp":"2026-01-14T17:16:23.740Z","level":"info","message":"Gemini Vision provider enabled"}
{"timestamp":"2026-01-14T17:16:23.740Z","level":"info","message":"Starting vision analysis","pageNumber":18,"url":"http://localhost:4173/services/testing"}
{"timestamp":"2026-01-14T17:16:23.810Z","level":"info","message":"Collected interactive candidates","pageNumber":18,"count":129}
{"timestamp":"2026-01-14T17:16:24.188Z","level":"info","message":"Vision analysis complete","pageNumber":18,"findingsCount":0}
[L2] Vision complete for page 18: 0 findings, screenshot: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\18\screenshot.png
[CRAWL] Max pages reached, not extracting links from http://localhost:4173/services/testing
[CRAWL] Batch complete. Queue now: 0, Pages: 18
[CRAWL] Crawl complete. Total pages: 18, Queue remaining: 0
{"timestamp":"2026-01-14T17:16:24.306Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Crawl completed","pages":18,"successful":18,"failed":0}
{"timestamp":"2026-01-14T17:16:24.307Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Generating report"}
{"timestamp":"2026-01-14T17:16:24.995Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Skipping image candidate","selector":"img","reason":"Has meaningful alt text"}
{"timestamp":"2026-01-14T17:16:24.996Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Skipping image candidate","selector":"img","reason":"Has meaningful alt text"}
{"timestamp":"2026-01-14T17:16:24.997Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Skipping image candidate","selector":"img","reason":"Has meaningful alt text"}
{"timestamp":"2026-01-14T17:16:24.997Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Skipping image candidate","selector":"img","reason":"Has meaningful alt text"}
{"timestamp":"2026-01-14T17:16:24.997Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Skipping image candidate","selector":"img","reason":"Has meaningful alt text"}
{"timestamp":"2026-01-14T17:16:24.998Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Skipping image candidate","selector":"img","reason":"Has meaningful alt text"}
{"timestamp":"2026-01-14T17:16:25.063Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Form Assist Plan extracted","formsCount":6,"totalFields":52,"totalUploads":0,"totalActions":0}
[L3] Assistive map generated for page 1: 0 images, 0 labels, 48 actions
[L3] Assistive map saved: DB pageVersionId 0b197be1-2dc3-482f-b6cc-7b42a125520a, artifact: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\1\assistive-model.json
{"timestamp":"2026-01-14T17:16:25.575Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Form Assist Plan extracted","formsCount":6,"totalFields":52,"totalUploads":0,"totalActions":0}
[L3] Assistive map generated for page 2: 0 images, 0 labels, 44 actions
[L3] Assistive map saved: DB pageVersionId f4fd14de-dedf-4e7f-9b07-8809fdc9a295, artifact: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\2\assistive-model.json
{"timestamp":"2026-01-14T17:16:25.928Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Skipping image candidate","selector":"img","reason":"Has meaningful alt text"}
{"timestamp":"2026-01-14T17:16:25.928Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Skipping image candidate","selector":"img","reason":"Has meaningful alt text"}
{"timestamp":"2026-01-14T17:16:25.929Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Skipping image candidate","selector":"img","reason":"Has meaningful alt text"}
{"timestamp":"2026-01-14T17:16:25.929Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Skipping image candidate","selector":"img","reason":"Has meaningful alt text"}
{"timestamp":"2026-01-14T17:16:25.929Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Skipping image candidate","selector":"img","reason":"Has meaningful alt text"}
{"timestamp":"2026-01-14T17:16:25.984Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Form Assist Plan extracted","formsCount":6,"totalFields":52,"totalUploads":0,"totalActions":0}
[L3] Assistive map generated for page 3: 0 images, 0 labels, 45 actions
[L3] Assistive map saved: DB pageVersionId 76c2fef2-e09a-4373-9afd-65617edb6433, artifact: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\3\assistive-model.json
{"timestamp":"2026-01-14T17:16:26.387Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Form Assist Plan extracted","formsCount":6,"totalFields":52,"totalUploads":0,"totalActions":0}
[L3] Assistive map generated for page 4: 0 images, 0 labels, 45 actions
[L3] Assistive map saved: DB pageVersionId 75425077-91ff-4984-b695-4cda37cbc894, artifact: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\4\assistive-model.json
{"timestamp":"2026-01-14T17:16:26.815Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Form Assist Plan extracted","formsCount":12,"totalFields":76,"totalUploads":0,"totalActions":6}
[L3] Assistive map generated for page 5: 0 images, 0 labels, 45 actions
[L3] Assistive map saved: DB pageVersionId 809969e5-2ac5-49bb-a4f9-576602b56f8d, artifact: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\5\assistive-model.json
{"timestamp":"2026-01-14T17:16:27.159Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Skipping image candidate","selector":"img","reason":"Has meaningful alt text"}
{"timestamp":"2026-01-14T17:16:27.159Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Skipping image candidate","selector":"img","reason":"Has meaningful alt text"}
{"timestamp":"2026-01-14T17:16:27.160Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Skipping image candidate","selector":"img","reason":"Has meaningful alt text"}
{"timestamp":"2026-01-14T17:16:27.160Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Skipping image candidate","selector":"img","reason":"Has meaningful alt text"}
{"timestamp":"2026-01-14T17:16:27.160Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Skipping image candidate","selector":"img","reason":"Has meaningful alt text"}
{"timestamp":"2026-01-14T17:16:27.207Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Form Assist Plan extracted","formsCount":6,"totalFields":52,"totalUploads":0,"totalActions":0}
[L3] Assistive map generated for page 6: 0 images, 0 labels, 44 actions
[L3] Assistive map saved: DB pageVersionId af8a424d-fb75-4042-9fd3-30d0a4d07ada, artifact: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\6\assistive-model.json
{"timestamp":"2026-01-14T17:16:27.599Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Form Assist Plan extracted","formsCount":6,"totalFields":52,"totalUploads":0,"totalActions":0}
[L3] Assistive map generated for page 7: 0 images, 0 labels, 43 actions
[L3] Assistive map saved: DB pageVersionId 432d0a48-bb5c-47bb-a1fd-7af266c191f0, artifact: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\7\assistive-model.json
{"timestamp":"2026-01-14T17:16:27.953Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Skipping image candidate","selector":"img","reason":"Has meaningful alt text"}
{"timestamp":"2026-01-14T17:16:27.996Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Form Assist Plan extracted","formsCount":6,"totalFields":52,"totalUploads":0,"totalActions":0}
[L3] Assistive map generated for page 8: 0 images, 0 labels, 45 actions
[L3] Assistive map saved: DB pageVersionId 5c221d00-ca10-41e3-8a43-b54034f244e1, artifact: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\8\assistive-model.json
{"timestamp":"2026-01-14T17:16:28.322Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Skipping image candidate","selector":"img","reason":"Has meaningful alt text"}
{"timestamp":"2026-01-14T17:16:28.366Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Form Assist Plan extracted","formsCount":6,"totalFields":52,"totalUploads":0,"totalActions":0}
[L3] Assistive map generated for page 9: 0 images, 0 labels, 45 actions
[L3] Assistive map saved: DB pageVersionId 4798b402-213c-48ec-a0e7-7df7afad5c23, artifact: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\9\assistive-model.json
{"timestamp":"2026-01-14T17:16:28.698Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Skipping image candidate","selector":"img","reason":"Has meaningful alt text"}
{"timestamp":"2026-01-14T17:16:28.742Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Form Assist Plan extracted","formsCount":6,"totalFields":52,"totalUploads":0,"totalActions":0}
[L3] Assistive map generated for page 10: 0 images, 0 labels, 44 actions
[L3] Assistive map saved: DB pageVersionId 7077f4c3-9061-4394-abcc-92021e3ec714, artifact: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\10\assistive-model.json
{"timestamp":"2026-01-14T17:16:29.113Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Skipping image candidate","selector":"img","reason":"Has meaningful alt text"}
{"timestamp":"2026-01-14T17:16:29.157Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Form Assist Plan extracted","formsCount":6,"totalFields":52,"totalUploads":0,"totalActions":0}
[L3] Assistive map generated for page 11: 0 images, 0 labels, 44 actions
[L3] Assistive map saved: DB pageVersionId 46f38767-e93b-4ed6-bc5f-9c14c4195f82, artifact: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\11\assistive-model.json
{"timestamp":"2026-01-14T17:16:29.499Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Skipping image candidate","selector":"img","reason":"Has meaningful alt text"}
{"timestamp":"2026-01-14T17:16:29.541Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Form Assist Plan extracted","formsCount":6,"totalFields":52,"totalUploads":0,"totalActions":0}
[L3] Assistive map generated for page 12: 0 images, 0 labels, 44 actions
[L3] Assistive map saved: DB pageVersionId 648d432e-5864-47a2-9c2e-bc116ec84b73, artifact: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\12\assistive-model.json
{"timestamp":"2026-01-14T17:16:29.931Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Form Assist Plan extracted","formsCount":6,"totalFields":52,"totalUploads":0,"totalActions":0}
[L3] Assistive map generated for page 13: 0 images, 0 labels, 43 actions
[L3] Assistive map saved: DB pageVersionId 8f67f8b5-36ba-43c1-a2d3-fd3b1d41a7a5, artifact: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\13\assistive-model.json
{"timestamp":"2026-01-14T17:16:30.264Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Skipping image candidate","selector":"img","reason":"Has meaningful alt text"}
{"timestamp":"2026-01-14T17:16:30.307Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Form Assist Plan extracted","formsCount":6,"totalFields":52,"totalUploads":0,"totalActions":0}
[L3] Assistive map generated for page 14: 0 images, 0 labels, 44 actions
[L3] Assistive map saved: DB pageVersionId 54adea11-5857-4039-a08a-0b07535b766c, artifact: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\14\assistive-model.json
{"timestamp":"2026-01-14T17:16:30.654Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Skipping image candidate","selector":"img","reason":"Has meaningful alt text"}
{"timestamp":"2026-01-14T17:16:30.699Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Form Assist Plan extracted","formsCount":6,"totalFields":52,"totalUploads":0,"totalActions":0}
[L3] Assistive map generated for page 15: 0 images, 0 labels, 44 actions
[L3] Assistive map saved: DB pageVersionId b5f0d833-d5e7-4055-8558-91a70e7077fe, artifact: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\15\assistive-model.json
{"timestamp":"2026-01-14T17:16:31.064Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Skipping image candidate","selector":"img","reason":"Has meaningful alt text"}
{"timestamp":"2026-01-14T17:16:31.108Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Form Assist Plan extracted","formsCount":6,"totalFields":52,"totalUploads":0,"totalActions":0}
[L3] Assistive map generated for page 16: 0 images, 0 labels, 45 actions
[L3] Assistive map saved: DB pageVersionId aeebd66a-5698-4383-94bb-8efe363cd963, artifact: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\16\assistive-model.json
{"timestamp":"2026-01-14T17:16:31.437Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Skipping image candidate","selector":"img","reason":"Has meaningful alt text"}
{"timestamp":"2026-01-14T17:16:31.482Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Form Assist Plan extracted","formsCount":6,"totalFields":52,"totalUploads":0,"totalActions":0}
[L3] Assistive map generated for page 17: 0 images, 0 labels, 45 actions
[L3] Assistive map saved: DB pageVersionId e96b7860-803b-4121-9bfc-3ee62183f9b6, artifact: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\17\assistive-model.json
{"timestamp":"2026-01-14T17:16:31.824Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Skipping image candidate","selector":"img","reason":"Has meaningful alt text"}
{"timestamp":"2026-01-14T17:16:31.868Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Form Assist Plan extracted","formsCount":6,"totalFields":52,"totalUploads":0,"totalActions":0}
[L3] Assistive map generated for page 18: 0 images, 0 labels, 45 actions
[L3] Assistive map saved: DB pageVersionId 8ca4aa77-f6be-481d-9e0e-22f84e9bb2dc, artifact: D:\Waheed\RaawiX\apps\scanner\output\scan_1768410663440_se9bahd\pages\18\assistive-model.json
{"timestamp":"2026-01-14T17:16:31.901Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"State transition","oldStatus":"running","newStatus":"completed"}
{"timestamp":"2026-01-14T17:16:32.043Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Findings saved to database","count":180}
{"timestamp":"2026-01-14T17:16:32.046Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Report results saved to database"}
{"timestamp":"2026-01-14T17:16:32.048Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Scan status updated in database","status":"completed"}
{"timestamp":"2026-01-14T17:16:32.049Z","level":"info","scanId":"scan_1768410663440_se9bahd","message":"Scan completed successfully","pages":18,"durationMs":328605}
