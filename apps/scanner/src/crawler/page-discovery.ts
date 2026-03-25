/**
 * Lightweight page discovery - extracts links without full page capture
 * Used for Phase 1: Discovery (fast, no scanning)
 */

import { normalizeUrl, getHostname, isSameHostname, shouldIncludeUrl } from './url-utils.js';
import { scanEventEmitter } from '../events/scan-events.js';
import { chromium, Browser, Page } from 'playwright';

export interface DiscoveryResult {
  urls: string[];
  total: number;
}

export class PageDiscovery {
  private browser: Browser | null = null;
  private scanId?: string;
  private maxPages: number;
  private maxDepth: number;
  private seedUrl: string;
  private seedHostname: string;
  private includePatterns?: string[];
  private excludePatterns?: string[];
  private scanMode: 'domain' | 'single';
  private readonly primaryNavTimeoutMs = 30000;
  private readonly fallbackNavTimeoutMs = 15000;

  constructor(
    seedUrl: string,
    maxPages: number,
    maxDepth: number,
    includePatterns?: string[],
    excludePatterns?: string[],
    scanId?: string,
    scanMode: 'domain' | 'single' = 'domain'
  ) {
    this.scanId = scanId;
    this.maxPages = maxPages;
    this.maxDepth = maxDepth;
    this.seedUrl = seedUrl;
    this.seedHostname = getHostname(seedUrl);
    this.includePatterns = includePatterns;
    this.excludePatterns = excludePatterns;
    this.scanMode = scanMode;
    
    console.log(`[DISCOVERY] Initialized with mode: ${scanMode}, seedUrl: ${seedUrl}`);
  }

  async discover(): Promise<DiscoveryResult> {
    await this.initialize();

    const discoveredUrls: string[] = [];
    const visited = new Set<string>();
    const queue: Array<{ url: string; depth: number; parentUrl?: string }> = [];

    // Use the seed URL passed to constructor
    const normalizedSeed = normalizeUrl(this.seedUrl);
    queue.push({ url: normalizedSeed, depth: 0 });
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

    console.log(`[DISCOVERY] Starting discovery, seed: ${normalizedSeed}`);

    // Quick BFS to discover all pages
    while (queue.length > 0 && discoveredUrls.length < this.maxPages) {
      const item = queue.shift()!;

      if (item.depth > this.maxDepth) {
        continue;
      }

      try {
        const page = await this.browser!.newPage();
        
        try {
          // Some sites never reach domcontentloaded quickly (heavy scripts/anti-bot/CDN).
          // Try normal navigation first, then fall back to 'commit' so we can still parse anchors.
          await this.navigateForDiscovery(page, item.url);

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
          let addedCount = 0;
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

            if (item.depth + 1 > this.maxDepth) {
              continue;
            }

            if (!shouldIncludeUrl(normalizedLink, this.includePatterns, this.excludePatterns)) {
              continue;
            }

            // SCAN MODE: If in 'single' mode, only discover links that are children of seed URL
            if (this.scanMode === 'single') {
              try {
                const seedUrlObj = new URL(this.seedUrl);
                const linkUrlObj = new URL(normalizedLink);
                const seedPath = seedUrlObj.pathname.replace(/\/$/, ''); // Remove trailing slash
                const linkPath = linkUrlObj.pathname.replace(/\/$/, ''); // Remove trailing slash
                
                // Only allow links that start with the seed path (are children/subpages)
                // AND are not the exact same as the seed path
                if (!linkPath.startsWith(seedPath) || linkPath === seedPath) {
                  console.log(`[DISCOVERY] Skipping link (single mode, not a child of seed): ${normalizedLink}`);
                  continue;
                }
              } catch (e) {
                console.warn(`[DISCOVERY] Error checking scan mode for link: ${normalizedLink}`, e);
                continue;
              }
            }

            visited.add(normalizedLink);
            discoveredUrls.push(normalizedLink);
            queue.push({ url: normalizedLink, depth: item.depth + 1, parentUrl: item.url });
            addedCount++;

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

          console.log(`[DISCOVERY] ${item.url}: found ${links.length} links, added ${addedCount} new, total: ${discoveredUrls.length}`);
        } finally {
          await page.close();
        }
      } catch (error) {
        console.warn(`[DISCOVERY] Failed to discover links from ${item.url}:`, error instanceof Error ? error.message : 'Unknown error');
        // Continue with other pages
      }
    }

    await this.close();

    console.log(`[DISCOVERY] Discovery complete. Found ${discoveredUrls.length} pages`);
    console.log(`[DISCOVERY] Discovered URLs list:`, discoveredUrls.map(u => new URL(u).pathname));
    
    // Emit discovery_done event with full list of URLs
    if (this.scanId) {
      const event = {
        type: 'scan_done', // Reuse scan_done but with discovery flag
        scanId: this.scanId,
        totals: {
          pages: discoveredUrls.length,
          fails: 0,
          needsReview: 0,
          assistivePages: 0,
        },
        // Include all discovered URLs so frontend can verify and add missing ones
        discoveredUrls: discoveredUrls,
        timestamp: new Date().toISOString(),
      } as any;
      
      console.log(`[DISCOVERY] Emitting scan_done event with ${discoveredUrls.length} URLs`);
      scanEventEmitter.emitEvent(this.scanId, event);
    }

    return {
      urls: discoveredUrls,
      total: discoveredUrls.length,
    };
  }

  private async navigateForDiscovery(page: Page, url: string): Promise<void> {
    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: this.primaryNavTimeoutMs,
      });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[DISCOVERY] domcontentloaded timeout/error for ${url}, retrying with commit: ${message}`);
    }

    await page.goto(url, {
      waitUntil: 'commit',
      timeout: this.fallbackNavTimeoutMs,
    });
  }

  private async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }
  }

  private async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

