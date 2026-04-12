import { PageCapture, type CaptureOptions } from './page-capture.js';
import {
  normalizeUrl,
  getHostname,
  isSameHostname,
  shouldIncludeUrl,
  extractLinks,
} from './url-utils.js';
import type { PageScanResult, ScanRequest } from '@raawi-x/core';
import { validateUrl } from '../security/ssrf.js';
import { checkUrlPolicy, checkRedirectSafety } from '../security/url-policy.js';
import { auditLogger } from '../audit/logger.js';
import { config } from '../config.js';
import { resolve, normalize } from 'node:path';
import { scanEventEmitter } from '../events/scan-events.js';
import { resolveScanPipeline } from '../scan-pipeline.js';
import type { ResolvedScanPipeline } from '@raawi-x/core';

export interface CrawlResult {
  pages: PageScanResult[];
  totalPages: number;
  successfulPages: number;
  failedPages: number;
}

export class BFSCrawler {
  private pageCapture: PageCapture;
  private visited: Set<string> = new Set();
  private queue: Array<{ url: string; depth: number; source?: 'seed' | 'crawl' | 'sitemap' | 'post_login_seed' }> = [];
  private maxPages: number;
  private maxDepth: number;
  private includePatterns?: string[];
  private excludePatterns?: string[];
  private seedHostname: string;
  private outputDir: string;
  // SECURITY: Concurrency limit at page crawl level (enforced in crawl loop)
  private concurrency: number = 2; // Max 2 pages at a time
  private pages: PageScanResult[] = [];
  private pageCounter: number = 0;
  private scanId?: string; // For audit logging
  private scanMode: 'domain' | 'single'; // Scan mode: full domain or single page/section
  private seedUrl: string; // Store seed URL for single mode comparison
  private request: ScanRequest;
  private pipeline: ResolvedScanPipeline;

  constructor(
    request: ScanRequest,
    outputDir: string,
    pageCapture: PageCapture,
    scanId?: string
  ) {
    this.pageCapture = pageCapture;
    this.scanId = scanId;
    this.request = request; // Store request for async operations
    this.pipeline = resolveScanPipeline(request);

    // SECURITY: Enforce hard caps regardless of user input
    this.maxPages = Math.min(request.maxPages || 25, config.quotas.maxPagesHardLimit);
    // Default maxDepth is 3 for better discovery, but allow up to hard limit
    const defaultMaxDepth = 3; // Increased from 2 for better depth coverage
    this.maxDepth = Math.min(request.maxDepth || defaultMaxDepth, config.quotas.maxDepthHardLimit);

    this.includePatterns = request.includePatterns;
    this.excludePatterns = request.excludePatterns;

    // Support both new and legacy format
    const seedUrl = request.seedUrl || request.url || '';
    this.seedUrl = seedUrl;
    this.seedHostname = getHostname(seedUrl);
    this.outputDir = outputDir;

    // Get scan mode from request (default to 'domain' for backward compatibility)
    this.scanMode = (request as any).scanMode || 'domain';

    // SECURITY: Validate output directory path safety
    const resolvedOutputDir = resolve(normalize(outputDir));
    const baseOutputDir = resolve(normalize(config.outputDir));
    if (!resolvedOutputDir.startsWith(baseOutputDir)) {
      throw new Error('Output directory path traversal detected');
    }

    // Normalize and add seed URL to queue
    const normalizedSeed = normalizeUrl(seedUrl);
    this.queue.push({ url: normalizedSeed, depth: 0, source: 'seed' as const });

    // Emit crawl_discovered for seed URL so it appears in the tree
    if (this.scanId) {
      scanEventEmitter.emitEvent(this.scanId, {
        type: 'crawl_discovered',
        scanId: this.scanId,
        url: normalizedSeed,
        parentUrl: undefined,
        depth: 0,
        timestamp: new Date().toISOString(),
      });
    }

    // ROUTE SEEDING: Add seedUrls if provided (for SPA route seeding)
    const seedUrls = (request as any).seedUrls as string[] | undefined;
    if (seedUrls && Array.isArray(seedUrls)) {
      for (const seedUrlItem of seedUrls) {
        try {
          const normalized = normalizeUrl(seedUrlItem, seedUrl);
          if (!this.visited.has(normalized) && isSameHostname(normalized, this.seedHostname)) {
            this.queue.push({ url: normalized, depth: 0, source: 'seed' as const });
            this.visited.add(normalized);

            if (this.scanId) {
              scanEventEmitter.emitEvent(this.scanId, {
                type: 'crawl_discovered',
                scanId: this.scanId,
                url: normalized,
                parentUrl: undefined,
                depth: 0,
                timestamp: new Date().toISOString(),
                source: 'seed', // Add source directly to event
                metadata: { source: 'seed' },
              } as any);
            }
          }
        } catch (error) {
          console.warn(`[CRAWL] Failed to normalize seed URL: ${seedUrlItem}`, error);
        }
      }
    }

    // POST-LOGIN SEED PATHS: If auth profile has postLoginSeedPaths, add them
    const authProfile = (request as any).authProfile as any;
    if (authProfile?.postLoginSeedPaths && Array.isArray(authProfile.postLoginSeedPaths)) {
      for (const path of authProfile.postLoginSeedPaths) {
        try {
          // Convert relative path to absolute URL
          const baseUrl = new URL(seedUrl);
          const absoluteUrl = new URL(path, baseUrl.origin).toString();
          const normalized = normalizeUrl(absoluteUrl);

          if (!this.visited.has(normalized) && isSameHostname(normalized, this.seedHostname)) {
            // Add at depth 0 with high priority (add to front of queue)
            this.queue.unshift({ url: normalized, depth: 0, source: 'post_login_seed' as const });
            this.visited.add(normalized);

            if (this.scanId) {
              scanEventEmitter.emitEvent(this.scanId, {
                type: 'crawl_discovered',
                scanId: this.scanId,
                url: normalized,
                parentUrl: undefined,
                depth: 0,
                timestamp: new Date().toISOString(),
                source: 'seed', // Add source directly to event
                metadata: { source: 'seed' },
              } as any);
            }
          }
        } catch (error) {
          console.warn(`[CRAWL] Failed to normalize post-login seed path: ${path}`, error);
        }
      }
    }

    // Note: Sitemap parsing is done in crawl() method (async context)
  }

  async crawl(): Promise<CrawlResult> {
    await this.pageCapture.initialize();

    // SITEMAP PARSING: If sitemapUrl provided, parse and enqueue URLs (must be async)
    const sitemapUrl = (this.request as any)?.sitemapUrl as string | undefined;
    if (sitemapUrl) {
      try {
        const { parseSitemap } = await import('./sitemap-parser.js');
        const sitemapUrls = await parseSitemap(sitemapUrl, this.seedHostname, this.maxPages);

        for (const sitemapUrlItem of sitemapUrls) {
          const normalized = normalizeUrl(sitemapUrlItem);
          if (!this.visited.has(normalized) && isSameHostname(normalized, this.seedHostname)) {
            this.queue.push({ url: normalized, depth: 0, source: 'sitemap' as const });
            this.visited.add(normalized);

            if (this.scanId) {
              scanEventEmitter.emitEvent(this.scanId, {
                type: 'crawl_discovered',
                scanId: this.scanId,
                url: normalized,
                parentUrl: undefined,
                depth: 0,
                timestamp: new Date().toISOString(),
                source: 'sitemap', // Add source directly to event
                metadata: { source: 'sitemap' },
              } as any);
            }
          }
        }
        console.log(`[CRAWL] Added ${sitemapUrls.length} URLs from sitemap`);
      } catch (error) {
        console.warn(`[CRAWL] Failed to parse sitemap: ${sitemapUrl}`, error);
      }
    }

    console.log(`[CRAWL] Starting crawl with queue size: ${this.queue.length}, maxPages: ${this.maxPages}, maxDepth: ${this.maxDepth}`);
    console.log(`[CRAWL] Depth limits: Will crawl up to depth ${this.maxDepth} (0 = seed, 1 = one click away, etc.)`);

    // Process queue with BFS
    // Enforce maxPages hard cap
    while (this.queue.length > 0 && this.pages.length < this.maxPages) {
      console.log(`[CRAWL] Queue: ${this.queue.length} pages, Processed: ${this.pages.length}/${this.maxPages}`);

      // Process up to concurrency pages at a time
      const batch: Array<{ url: string; depth: number; source?: 'seed' | 'crawl' | 'sitemap' | 'post_login_seed' }> = [];
      while (batch.length < this.concurrency && this.queue.length > 0) {
        const item = this.queue.shift();
        if (item && !this.visited.has(item.url)) {
          this.visited.add(item.url);
          batch.push(item);
          console.log(`[CRAWL] Added to batch: ${item.url} (depth: ${item.depth})`);
        } else if (item) {
          console.log(`[CRAWL] Skipping already visited: ${item.url}`);
        }
      }

      if (batch.length === 0) {
        console.log(`[CRAWL] No items in batch, breaking`);
        break;
      }

      console.log(`[CRAWL] Processing batch of ${batch.length} pages`);

      // Process batch in parallel
      const batchPromises = batch.map((item) =>
        this.processPage(item.url, item.depth, item.source)
      );

      await Promise.allSettled(batchPromises);

      console.log(`[CRAWL] Batch complete. Queue now: ${this.queue.length}, Pages: ${this.pages.length}`);
    }

    console.log(`[CRAWL] Crawl complete. Total pages: ${this.pages.length}, Queue remaining: ${this.queue.length}`);
    await this.pageCapture.close();

    const successfulPages = this.pages.filter((p) => p.status === 'success').length;
    const failedPages = this.pages.filter((p) => p.status === 'failed').length;

    return {
      pages: this.pages,
      totalPages: this.pages.length,
      successfulPages,
      failedPages,
    };
  }

  /**
   * Discovery-only mode: Quick link extraction without page capture
   * Used in Phase 1 to discover all pages before scanning
   */
  async discoverPages(): Promise<string[]> {
    await this.pageCapture.initialize();

    const discoveredUrls: string[] = [];
    const visited = new Set<string>();

    // Add seed URL
    const seedUrl = this.request.seedUrl || this.request.url || '';
    const normalizedSeed = normalizeUrl(seedUrl);
    const queue: Array<{ url: string; depth: number }> = [{ url: normalizedSeed, depth: 0 }];
    visited.add(normalizedSeed);
    discoveredUrls.push(normalizedSeed);

    // Emit seed URL discovery
    if (this.scanId) {
      scanEventEmitter.emitEvent(this.scanId, {
        type: 'crawl_discovered',
        scanId: this.scanId,
        url: normalizedSeed,
        parentUrl: undefined,
        depth: 0,
        timestamp: new Date().toISOString(),
        source: 'seed',
        metadata: { source: 'seed' },
      } as any);
    }

    console.log(`[DISCOVERY] Starting discovery mode, seed: ${normalizedSeed}`);

    // Quick BFS to discover all pages (just extract links, no capture)
    // For discovery phase, we can be more aggressive with depth
    // Use the configured maxDepth, but allow up to the hard limit for discovery
    const discoveryMaxDepth = Math.max(this.maxDepth, Math.min(5, config.quotas.maxDepthHardLimit)); // Allow deeper discovery up to hard limit
    console.log(`[DISCOVERY] Discovery mode: maxDepth=${discoveryMaxDepth}, maxPages=${this.maxPages}`);

    while (queue.length > 0 && discoveredUrls.length < this.maxPages) {
      const item = queue.shift()!;

      if (item.depth > discoveryMaxDepth) {
        console.log(`[DISCOVERY] Skipping ${item.url} - depth ${item.depth} exceeds max ${discoveryMaxDepth}`);
        continue;
      }

      try {
        // Quick navigation just to extract links (minimal wait)
        const page = this.pageCapture['context']
          ? await this.pageCapture['context'].newPage()
          : await this.pageCapture['browser']!.newPage();

        try {
          await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 10000 });

          // Extract links from live DOM
          const links = await page.evaluate((baseUrl) => {
            const linkSet = new Set<string>();
            const anchors = document.querySelectorAll('a[href]');

            anchors.forEach((anchor) => {
              const href = anchor.getAttribute('href');
              if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !href.startsWith('mailto:')) {
                try {
                  const absoluteUrl = new URL(href, baseUrl).toString();
                  linkSet.add(absoluteUrl);
                } catch (e) {
                  // Skip invalid URLs
                }
              }
            });

            return Array.from(linkSet);
          }, item.url);

          // Process discovered links
          for (const link of links) {
            const normalizedLink = normalizeUrl(link, item.url);

            if (!isSameHostname(normalizedLink, item.url)) {
              continue;
            }

            if (visited.has(normalizedLink)) {
              continue;
            }

            if (discoveredUrls.length >= this.maxPages) {
              break;
            }

            if (item.depth + 1 > discoveryMaxDepth) {
              console.log(`[DISCOVERY] Skipping link at depth ${item.depth + 1} (max: ${discoveryMaxDepth}): ${normalizedLink}`);
              continue;
            }

            if (!shouldIncludeUrl(normalizedLink, this.includePatterns, this.excludePatterns)) {
              continue;
            }

            visited.add(normalizedLink);
            discoveredUrls.push(normalizedLink);
            queue.push({ url: normalizedLink, depth: item.depth + 1 });

            // Emit discovery event
            if (this.scanId) {
              scanEventEmitter.emitEvent(this.scanId, {
                type: 'crawl_discovered',
                scanId: this.scanId,
                url: normalizedLink,
                parentUrl: item.url,
                depth: item.depth + 1,
                timestamp: new Date().toISOString(),
                source: 'crawl',
                metadata: { source: 'crawl' },
              } as any);
            }
          }

          console.log(`[DISCOVERY] Discovered ${links.length} links from ${item.url}, total: ${discoveredUrls.length}`);
        } finally {
          await page.close();
        }
      } catch (error) {
        console.warn(`[DISCOVERY] Failed to discover links from ${item.url}:`, error);
        // Continue with other pages
      }
    }

    console.log(`[DISCOVERY] Discovery complete. Found ${discoveredUrls.length} pages`);
    return discoveredUrls;
  }

  private async processPage(url: string, depth: number, source?: 'seed' | 'crawl' | 'sitemap' | 'post_login_seed'): Promise<void> {
    // SECURITY: Enforce maxPages hard cap (defense in depth)
    if (this.pages.length >= this.maxPages) {
      return;
    }

    // SECURITY: Enforce maxDepth hard cap
    if (depth > this.maxDepth) {
      return;
    }

    // SECURITY: Enforce include/exclude regex rules
    if (!shouldIncludeUrl(url, this.includePatterns, this.excludePatterns)) {
      return;
    }

    // SECURITY: Validate URL with SSRF protections BEFORE any network navigation
    try {
      await validateUrl(url, config.allowedPorts);
    } catch (error) {
      // Invalid URL, skip it (SSRF protection)
      this.pages.push({
        pageNumber: ++this.pageCounter,
        url,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Invalid URL - SSRF protection',
      });
      return;
    }

    // SECURITY: Check URL policy (same-origin, etc.) BEFORE network navigation
    const policyCheck = await checkUrlPolicy(url, this.seedHostname);
    if (!policyCheck.allowed) {
      const errorMsg = policyCheck.reason || 'URL not allowed by policy';
      this.pages.push({
        pageNumber: ++this.pageCounter,
        url,
        status: 'failed',
        error: errorMsg,
      });
      // Log policy block
      if (this.scanId) {
        auditLogger.logBlockedByPolicy(this.scanId, url, errorMsg);
      }
      return;
    }

    // SECURITY: Enforce same-hostname crawling (defense in depth)
    const urlHostname = getHostname(url);
    if (urlHostname !== this.seedHostname) {
      // Check if origin is in allowed list (if same-origin policy is enabled)
      // This is already checked in checkUrlPolicy, but adding explicit check here
      this.pages.push({
        pageNumber: ++this.pageCounter,
        url,
        status: 'failed',
        error: `URL hostname ${urlHostname} does not match seed hostname ${this.seedHostname}`,
      });
      return;
    }

    // B1) Emit page_started event
    const pageNumber = ++this.pageCounter;
    if (this.scanId) {
      scanEventEmitter.emitEvent(this.scanId, {
        type: 'page_started',
        scanId: this.scanId,
        url,
        pageNumber,
        timestamp: new Date().toISOString(),
      });

      // Emit L1/L2/L3 pending status
      for (const layer of ['L1', 'L2', 'L3'] as const) {
        scanEventEmitter.emitEvent(this.scanId, {
          type: 'layer_status',
          scanId: this.scanId,
          url,
          pageNumber,
          layer,
          status: 'pending',
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Capture the page
    const pageResult = await this.pageCapture.capturePage(
      url,
      this.outputDir,
      pageNumber,
      {
        timeout: 20000,
        waitForNetworkIdle: true,
        stabilization: {
          waitUntil: 'domcontentloaded',
          networkIdleMs: 800,
          stableDomMs: 600,
          maxWaitMs: 15000,
          useReadyMarker: true,
        },
        pipeline: this.pipeline,
      }
    );

    this.pages.push(pageResult);

    // Upsert page in database
    if (this.scanId && pageResult.status === 'success') {
      try {
        const { scanRepository } = await import('../db/scan-repository.js');
        await scanRepository.upsertPage(this.scanId, {
          pageNumber: pageResult.pageNumber,
          url: pageResult.url,
          title: pageResult.title,
          finalUrl: pageResult.finalUrl,
          canonicalUrl: pageResult.canonicalUrl,
          pageFingerprint: pageResult.pageFingerprint,
          screenshotPath: pageResult.screenshotPath,
          htmlPath: pageResult.htmlPath,
          a11yPath: pageResult.a11yPath,
          visionPath: pageResult.visionPath,
          agentPath: pageResult.agentPath,
          error: pageResult.error,
        });
      } catch (error) {
        // Non-fatal - continue crawling
        console.warn(`Failed to upsert page in database:`, error);
      }
    }

    // If page was successful and we haven't reached max depth, extract links
    if (
      pageResult.status === 'success' &&
      depth < this.maxDepth &&
      this.pages.length < this.maxPages
    ) {
      try {
        // Prefer links extracted from live DOM (works for React Router)
        // Fallback to HTML parsing if live DOM extraction wasn't available
        let links: string[] = [];

        if ((pageResult as any).extractedLinks && Array.isArray((pageResult as any).extractedLinks)) {
          links = (pageResult as any).extractedLinks;
          console.log(`[CRAWL] Using ${links.length} links from live DOM extraction for ${url}`);
        } else if (pageResult.htmlPath) {
          // Fallback to HTML parsing
          const { readFile } = await import('node:fs/promises');
          const html = await readFile(pageResult.htmlPath, 'utf-8');
          links = extractLinks(html, url);
          console.log(`[CRAWL] Extracted ${links.length} links from HTML for ${url}`);
        }

        if (links.length === 0) {
          console.warn(`[CRAWL] No links found in ${url} - might be a SPA with client-side routing or no navigation links`);
        }

        // Add valid links to queue
        let addedCount = 0;
        for (const link of links) {
          const normalizedLink = normalizeUrl(link, url);

          // SECURITY: Enforce same-hostname crawling (defense in depth)
          if (!isSameHostname(normalizedLink, url)) {
            console.log(`[CRAWL] Skipping link (different hostname): ${normalizedLink}`);
            continue;
          }

          // SCAN MODE: If in 'single' mode, only crawl links that are children of seed URL
          if (this.scanMode === 'single') {
            const seedUrlObj = new URL(this.seedUrl);
            const linkUrlObj = new URL(normalizedLink);
            const seedPath = seedUrlObj.pathname.replace(/\/$/, ''); // Remove trailing slash
            const linkPath = linkUrlObj.pathname.replace(/\/$/, ''); // Remove trailing slash

            // Only allow links that start with the seed path (are children/subpages)
            if (!linkPath.startsWith(seedPath) || linkPath === seedPath) {
              console.log(`[CRAWL] Skipping link (single mode, not a child of seed): ${normalizedLink}`);
              continue;
            }
          }

          // SECURITY: Enforce maxPages hard cap
          if (this.pages.length + this.queue.length >= this.maxPages) {
            console.log(`[CRAWL] Max pages reached, stopping link discovery`);
            break;
          }

          // SECURITY: Enforce maxDepth hard cap
          if (depth + 1 > this.maxDepth) {
            console.log(`[CRAWL] Max depth reached (${depth + 1} > ${this.maxDepth}) for ${normalizedLink} - skipping`);
            continue;
          }

          // Only add if not already visited or queued
          if (
            !this.visited.has(normalizedLink) &&
            !this.queue.some((q) => q.url === normalizedLink)
          ) {
            this.queue.push({ url: normalizedLink, depth: depth + 1, source: 'crawl' });
            addedCount++;

            // B1) Emit crawl_discovered event
            if (this.scanId) {
              scanEventEmitter.emitEvent(this.scanId, {
                type: 'crawl_discovered',
                scanId: this.scanId,
                url: normalizedLink,
                parentUrl: url,
                depth: depth + 1,
                timestamp: new Date().toISOString(),
                source: 'crawl', // Add source directly to event (for compatibility)
                metadata: { source: 'crawl' },
              } as any);
            }
          } else {
            console.log(`[CRAWL] Skipping link (already visited/queued): ${normalizedLink}`);
          }
        }

        console.log(`[CRAWL] Added ${addedCount} new links to queue from ${url} (total in queue: ${this.queue.length})`);
      } catch (error) {
        // Failed to extract links, continue with other pages
        console.error(`[CRAWL] Failed to extract links from ${url}:`, error);
      }
    } else {
      if (pageResult.status !== 'success') {
        console.log(`[CRAWL] Page ${url} failed with status: ${pageResult.status}, not extracting links`);
      } else if (depth >= this.maxDepth) {
        console.log(`[CRAWL] Max depth reached (${depth} >= ${this.maxDepth}) for ${url}, not extracting links`);
      } else if (this.pages.length >= this.maxPages) {
        console.log(`[CRAWL] Max pages reached, not extracting links from ${url}`);
      }
    }

    // B2) Emit page_done event after processing
    if (this.scanId) {
      scanEventEmitter.emitEvent(this.scanId, {
        type: 'page_done',
        scanId: this.scanId,
        url,
        pageNumber,
        summary: {
          findingsCount: 0, // Will be calculated later in report generation
          visionCount: 0,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
}

