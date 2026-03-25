import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve, normalize } from 'node:path';
import type { PageScanResult } from '@raawi-x/core';
import { validateUrl } from '../security/ssrf.js';
import { checkUrlPolicy, checkRedirectSafety } from '../security/url-policy.js';
import { config } from '../config.js';
import { VisionAnalyzer } from '../vision/analyzer.js';
import { computeCanonicalUrl } from './url-utils.js';
import { computePageFingerprint } from './page-fingerprint.js';
import { PageStabilizer, type StabilizationConfig } from './page-stabilizer.js';
import { scanEventEmitter } from '../events/scan-events.js';

export interface CaptureOptions {
  timeout?: number;
  waitForNetworkIdle?: boolean;
  stabilization?: StabilizationConfig;
}

export class PageCapture {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private scanId?: string;
  private storageStatePath?: string;

  constructor(scanId?: string, storageStatePath?: string) {
    this.scanId = scanId;
    this.storageStatePath = storageStatePath;
  }

  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
      });
    }

    // Create context with storage state if provided (for authenticated sessions)
    if (this.storageStatePath && !this.context) {
      const { loadStorageState } = await import('./auth-helper.js');
      this.context = await loadStorageState(this.storageStatePath, this.browser);
      if (!this.context) {
        // Fallback to new context if storage state loading failed
        this.context = await this.browser.newContext();
      }
    } else if (!this.context) {
      this.context = await this.browser.newContext();
    }
  }

  async capturePage(
    url: string,
    outputDir: string,
    pageNumber: number,
    options: CaptureOptions = {}
  ): Promise<PageScanResult> {
    const timeout = options.timeout || 20000;
    const waitForNetworkIdle = options.waitForNetworkIdle !== false;

    if (!this.browser) {
      await this.initialize();
    }

    // Use authenticated context if available, otherwise create new page from browser
    const page = this.context ? await this.context.newPage() : await this.browser!.newPage();
    const result: PageScanResult = {
      pageNumber,
      url,
      status: 'success',
    };

    try {
      // SECURITY: Validate URL with SSRF protections BEFORE Playwright goto
      await validateUrl(url, config.allowedPorts);

      // SECURITY: Check URL policy BEFORE network navigation
      // Note: seedHostname should be passed, but for now we'll do basic check
      const urlObj = new URL(url);
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        throw new Error(`Invalid protocol: ${urlObj.protocol}. Only http/https allowed.`);
      }

      // SECURITY: Prevent file:// and other dangerous protocols
      if (url.startsWith('file://') || url.startsWith('ftp://') || url.startsWith('gopher://')) {
        throw new Error('Dangerous protocol detected. Only http/https allowed.');
      }

      // Navigate to page (security checks passed)
      console.log(`[WAIT] Navigation start: ${url}`);
      const response = await page.goto(url, {
        waitUntil: options.stabilization?.waitUntil || 'domcontentloaded',
        timeout,
      });
      console.log(`[WAIT] Navigation end: ${url}`);

      // Check if redirect occurred and validate redirect URL
      const finalUrl = page.url();
      if (finalUrl !== url) {
        const redirectCheck = await checkRedirectSafety(finalUrl);
        if (!redirectCheck.allowed) {
          throw new Error(redirectCheck.reason || 'Redirect to unsafe URL blocked');
        }
      }

      // A1) Wait for page stabilization (SPA-safe)
      if ((options.stabilization as any) !== false) {
        const stabilizationConfig = options.stabilization || {
          waitUntil: 'domcontentloaded',
          networkIdleMs: 800,
          stableDomMs: 600,
          maxWaitMs: 15000,
          useReadyMarker: true,
        };

        const stabilizationResult = await PageStabilizer.waitForStable(page, stabilizationConfig);

        // Log stabilization results
        if (stabilizationResult.readyMarkerHit) {
          console.log('[WAIT] Ready marker hit (true)');
        } else {
          console.log('[WAIT] Ready marker hit (false)');
        }
        if (stabilizationResult.networkIdleAchieved) {
          console.log('[WAIT] Network idle achieved');
        }
        if (stabilizationResult.domStableAchieved) {
          console.log('[WAIT] DOM stable achieved');
        }
        if (stabilizationResult.timeoutReached) {
          console.log('[WAIT] Fallback due to timeout');
        }
      } else {
        // Fallback to old behavior if stabilization disabled
        if (waitForNetworkIdle) {
          try {
            await page.waitForLoadState('networkidle', { timeout });
          } catch {
            // Network idle timeout is not critical, continue
          }
        }
      }

      // Get page metadata
      result.title = await page.title();
      result.finalUrl = finalUrl;

      // Compute canonical URL
      result.canonicalUrl = computeCanonicalUrl(finalUrl);

      // Compute page fingerprint
      const html = await page.content();
      result.pageFingerprint = computePageFingerprint(result.title, html);

      // LAYER 1: Detect Accessibility Barriers (disabled tools, blocked features)
      console.log('[L1] Checking for accessibility barriers (disabled tools)...');
      const { detectAccessibilityBarriers } = await import('../rules/accessibility-barriers.js');
      const accessibilityBarriers = await detectAccessibilityBarriers(page);
      if (accessibilityBarriers.length > 0) {
        console.log(`[L1] Found ${accessibilityBarriers.length} accessibility barriers`);
        (result as any).accessibilityBarriers = accessibilityBarriers;
      }

      // SECURITY: Ensure output directory path safety (no traversal)
      const sanitizedPageNumber = String(pageNumber).replace(/[\/\\\.\.]/g, '').replace(/[^0-9]/g, '');
      if (sanitizedPageNumber !== String(pageNumber)) {
        throw new Error('Invalid page number - path traversal attempt detected');
      }

      // SECURITY: Validate output directory is within base directory
      const baseOutputDir = resolve(normalize(outputDir));
      const pageDir = resolve(normalize(join(outputDir, 'pages', sanitizedPageNumber)));

      if (!pageDir.startsWith(baseOutputDir)) {
        throw new Error('Path traversal detected in output directory');
      }

      await mkdir(pageDir, { recursive: true });

      // A2) Capture screenshot after stabilization (same point as Layer1)
      console.log('[L2] Screenshot start');

      const titleForEvents = result.title?.trim() || undefined;

      // B1) Emit L2 running status
      if (this.scanId) {
        scanEventEmitter.emitEvent(this.scanId, {
          type: 'layer_status',
          scanId: this.scanId,
          url,
          pageNumber,
          layer: 'L2',
          status: 'running',
          ...(titleForEvents ? { meta: { title: titleForEvents } } : {}),
          timestamp: new Date().toISOString(),
        });
      }

      const screenshotPath = join(pageDir, 'screenshot.png');
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      });
      result.screenshotPath = screenshotPath;
      console.log('[L2] Screenshot end');

      // A2) Capture HTML after stabilization
      console.log('[L1] Capture start');

      // B1) Emit L1 running status
      if (this.scanId) {
        scanEventEmitter.emitEvent(this.scanId, {
          type: 'layer_status',
          scanId: this.scanId,
          url,
          pageNumber,
          layer: 'L1',
          status: 'running',
          ...(titleForEvents ? { meta: { title: titleForEvents } } : {}),
          timestamp: new Date().toISOString(),
        });
      }

      // Re-get HTML after stabilization to ensure it's the final rendered state
      const finalHtml = await page.content();
      const htmlPath = join(pageDir, 'page.html');
      await writeFile(htmlPath, finalHtml, 'utf-8');
      result.htmlPath = htmlPath;
      // Update fingerprint with final HTML
      result.pageFingerprint = computePageFingerprint(result.title, finalHtml);
      console.log(`[L1] Capture end: DOM/HTML for page ${pageNumber}: ${url}`);

      // Extract links from the live DOM (before closing page) - works for React Router too
      try {
        const extractedLinks = await page.evaluate((baseUrl) => {
          const links: string[] = [];
          const seen = new Set<string>();

          // Get all <a> tags with href
          const anchors = document.querySelectorAll('a[href]');
          console.log(`[CRAWL-DOM] Found ${anchors.length} <a> tags with href in DOM`);

          anchors.forEach((anchor) => {
            const href = anchor.getAttribute('href');
            if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !href.startsWith('mailto:')) {
              try {
                // Resolve relative URLs
                const absoluteUrl = new URL(href, baseUrl).toString();
                if (!seen.has(absoluteUrl)) {
                  links.push(absoluteUrl);
                  seen.add(absoluteUrl);
                  console.log(`[CRAWL-DOM] Found link: ${href} -> ${absoluteUrl}`);
                }
              } catch (e) {
                console.log(`[CRAWL-DOM] Skipped invalid URL: ${href}`, e);
              }
            }
          });

          console.log(`[CRAWL-DOM] Total unique links extracted: ${links.length}`);
          return links;
        }, url);

        // Store links in result for use by crawler
        (result as any).extractedLinks = extractedLinks;
        console.log(`[CRAWL] Extracted ${extractedLinks.length} links from live DOM for ${url}`);
        if (extractedLinks.length > 0) {
          console.log(`[CRAWL] Sample links: ${extractedLinks.slice(0, 5).join(', ')}`);
        }
      } catch (error) {
        console.error(`[CRAWL] Failed to extract links from live DOM for ${url}:`, error);
        (result as any).extractedLinks = [];
      }

      // B1) Emit L1 done status
      if (this.scanId) {
        scanEventEmitter.emitEvent(this.scanId, {
          type: 'layer_status',
          scanId: this.scanId,
          url,
          pageNumber,
          layer: 'L1',
          status: 'done',
          timestamp: new Date().toISOString(),
        });
      }

      // Capture accessibility snapshot
      try {
        // Use evaluate to get accessibility tree
        const a11ySnapshot = await page.evaluate(() => {
          // Best-effort accessibility snapshot
          const elements = document.querySelectorAll('*');
          const a11yData: any[] = [];
          elements.forEach((el) => {
            const computed = window.getComputedStyle(el);
            if (computed.display !== 'none' && computed.visibility !== 'hidden') {
              a11yData.push({
                tag: el.tagName,
                id: el.id || undefined,
                class: el.className || undefined,
                role: el.getAttribute('role') || undefined,
                ariaLabel: el.getAttribute('aria-label') || undefined,
                ariaLabelledBy: el.getAttribute('aria-labelledby') || undefined,
                text: el.textContent?.substring(0, 100) || undefined,
              });
            }
          });
          return a11yData;
        });
        const a11yPath = join(pageDir, 'a11y.json');
        await writeFile(a11yPath, JSON.stringify(a11ySnapshot, null, 2), 'utf-8');
        result.a11yPath = a11yPath;
      } catch (error) {
        // Accessibility snapshot is best-effort, don't fail if it errors
        console.warn(`Failed to capture a11y snapshot for ${url}:`, error);
      }

      // VISION: Run vision analysis (while page context is available)
      let visionPath: string | undefined;
      let visionCount = 0;
      if (config.vision.enabled) {
        try {
          const visionAnalyzer = new VisionAnalyzer();
          const visionFindings = await visionAnalyzer.analyzePage(
            page,
            pageNumber,
            finalUrl,
            outputDir
          );

          visionCount = visionFindings.length;
          if (visionFindings.length > 0) {
            visionPath = await visionAnalyzer.saveFindings(visionFindings, pageNumber, outputDir);
            result.visionPath = visionPath;
            console.log(`[L2] Vision complete for page ${pageNumber}: ${visionFindings.length} findings, screenshot: ${result.screenshotPath}`);
          } else {
            console.log(`[L2] Vision complete for page ${pageNumber}: 0 findings, screenshot: ${result.screenshotPath}`);
          }
        } catch (error) {
          // Vision analysis failure should not break page capture
          console.warn(`Vision analysis failed for page ${pageNumber}:`, error);
        }
      }

      // B1) Emit L2 done status
      if (this.scanId) {
        scanEventEmitter.emitEvent(this.scanId, {
          type: 'layer_status',
          scanId: this.scanId,
          url,
          pageNumber,
          layer: 'L2',
          status: 'done',
          meta: {
            visionCount,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Interaction Agent v1: keyboard-only focus trace and detectors (best-effort, bounded)
      if (config.agent.enabled) {
        try {
          const { runInteractionAgent } = await import('../agent/interaction-agent.js');
          if (this.scanId) {
            scanEventEmitter.emitEvent(this.scanId, {
              type: 'agent_started',
              scanId: this.scanId,
              url: finalUrl,
              pageNumber,
              timestamp: new Date().toISOString(),
            } as any);
          }
          const artifact = await runInteractionAgent(
            page,
            { url: finalUrl, pageNumber },
            {
              maxSteps: config.agent.maxSteps,
              maxMs: config.agent.maxMs,
              probesEnabled: config.agent.probesEnabled,
              onProgress: (stepIndex: number, maxSteps: number) => {
                if (!this.scanId) return;
                scanEventEmitter.emitEvent(this.scanId, {
                  type: 'agent_progress',
                  scanId: this.scanId,
                  url: finalUrl,
                  pageNumber,
                  stepIndex,
                  maxSteps,
                  timestamp: new Date().toISOString(),
                } as any);
              },
            }
          );
          const interactionDir = join(pageDir, 'interaction');
          await mkdir(interactionDir, { recursive: true });
          const interactionPath = join(interactionDir, 'interaction.json');
          await writeFile(interactionPath, JSON.stringify(artifact, null, 2), 'utf-8');
          result.agentPath = interactionPath;

          if (this.scanId) {
            scanEventEmitter.emitEvent(this.scanId, {
              type: 'agent_done',
              scanId: this.scanId,
              url: finalUrl,
              pageNumber,
              issuesCount: Array.isArray((artifact as any).issues) ? (artifact as any).issues.length : 0,
              timestamp: new Date().toISOString(),
            } as any);
          }
        } catch (agentErr) {
          console.warn(`[Agent] Interaction agent failed for page ${pageNumber}:`, agentErr);
        }
      }

      // Save metadata
      const metadata = {
        pageNumber,
        url,
        finalUrl: result.finalUrl,
        canonicalUrl: result.canonicalUrl,
        title: result.title,
        pageFingerprint: result.pageFingerprint,
        capturedAt: new Date().toISOString(),
        screenshotPath: result.screenshotPath,
        htmlPath: result.htmlPath,
        a11yPath: result.a11yPath,
        visionPath: result.visionPath,
        agentPath: result.agentPath,
      };
      const metadataPath = join(pageDir, 'page.json');
      await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
      result.metadataPath = metadataPath;
    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[CRAWL] Page capture failed for ${url}:`, error);
      if (error instanceof Error) {
        console.error(`[CRAWL] Error stack:`, error.stack);
      }

      // Still save metadata with error (with path safety)
      try {
        const sanitizedPageNumber = String(pageNumber).replace(/[\/\\\.\.]/g, '').replace(/[^0-9]/g, '');
        const baseOutputDir = resolve(normalize(outputDir));
        const pageDir = resolve(normalize(join(outputDir, 'pages', sanitizedPageNumber)));

        if (!pageDir.startsWith(baseOutputDir)) {
          // Path traversal detected, skip saving
          return result;
        }

        await mkdir(pageDir, { recursive: true });
        const metadata = {
          pageNumber,
          url,
          status: 'failed',
          error: result.error,
          capturedAt: new Date().toISOString(),
        };
        const metadataPath = join(pageDir, 'page.json');
        await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
        result.metadataPath = metadataPath;
      } catch {
        // If we can't save metadata, that's okay
      }
    } finally {
      await page.close();
    }

    return result;
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

