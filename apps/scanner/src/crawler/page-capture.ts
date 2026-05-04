import type { Browser, BrowserContext, Page } from 'playwright';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { join, resolve, normalize } from 'node:path';
import type { ManualCheckpoint, PageScanResult, ResolvedScanPipeline } from '@raawi-x/core';
import { buildSemanticModel } from '@raawi-x/semantic-engine';
import { validateUrl } from '../security/ssrf.js';
import { checkUrlPolicy, checkRedirectSafety } from '../security/url-policy.js';
import { config } from '../config.js';
import { VisionAnalyzer } from '../vision/analyzer.js';
import { computeCanonicalUrl } from './url-utils.js';
import { computePageFingerprint } from './page-fingerprint.js';
import { PageStabilizer, type StabilizationConfig } from './page-stabilizer.js';
import { scanEventEmitter } from '../events/scan-events.js';
import { launchChromium } from './browser-launch.js';
import { RaawiAgent } from '@raawi-x/agent-runtime';
import { createPlaywrightActionBindings } from '../agent/playwright-action-bindings.js';

export interface CaptureOptions {
  timeout?: number;
  waitForNetworkIdle?: boolean;
  stabilization?: StabilizationConfig;
  /** Resolved per-scan pipeline; if omitted, full pipeline runs. */
  pipeline?: ResolvedScanPipeline;
  /** When true with pipeline.layer1 false, still write HTML + extract links (BFS crawl). */
  crawlLinkDiscovery?: boolean;
}

function extractManualCheckpoint(
  artifact: {
    issues?: Array<{ kind?: string; message?: string; evidence?: unknown }>;
    probes?: Array<{ name?: string; evidence?: unknown }>;
  } | null | undefined,
  pageUrl: string,
  pageNumber: number
): ManualCheckpoint | undefined {
  if (!artifact) return undefined;

  const checkpointIssue = artifact.issues?.find((issue) => issue.kind === 'verification_checkpoint_requires_manual_input');
  if (!checkpointIssue) return undefined;

  const issueEvidence =
    checkpointIssue.evidence && typeof checkpointIssue.evidence === 'object'
      ? (checkpointIssue.evidence as Record<string, unknown>)
      : {};
  const probeEvidence = artifact.probes
    ?.find((probe) => probe.name === 'form_validation_probe')
    ?.evidence;
  const probeCheckpoint =
    probeEvidence && typeof probeEvidence === 'object' && (probeEvidence as Record<string, unknown>).verificationCheckpoint
      ? ((probeEvidence as Record<string, unknown>).verificationCheckpoint as Record<string, unknown>)
      : {};

  const formPurpose = typeof issueEvidence.formPurpose === 'string' ? issueEvidence.formPurpose : undefined;
  return {
    kind: 'verification_code',
    pageNumber,
    pageUrl,
    message:
      checkpointIssue.message ||
      'Verification-code checkpoint detected; manual user input is required to continue this flow.',
    source: 'analysis-agent',
    ...(formPurpose ? { formPurpose: formPurpose as ManualCheckpoint['formPurpose'] } : {}),
    checkpointHeading:
      typeof probeCheckpoint.heading === 'string'
        ? probeCheckpoint.heading
        : typeof issueEvidence.checkpointHeading === 'string'
          ? issueEvidence.checkpointHeading
          : null,
    otpLikeFields:
      typeof probeCheckpoint.otpLikeFields === 'number'
        ? probeCheckpoint.otpLikeFields
        : typeof issueEvidence.otpLikeFields === 'number'
          ? issueEvidence.otpLikeFields
          : undefined,
    hasResendCode:
      typeof probeCheckpoint.hasResendCode === 'boolean'
        ? probeCheckpoint.hasResendCode
        : typeof issueEvidence.hasResendCode === 'boolean'
          ? issueEvidence.hasResendCode
          : undefined,
    hasForgotPassword:
      typeof probeCheckpoint.hasForgotPassword === 'boolean'
        ? probeCheckpoint.hasForgotPassword
        : typeof issueEvidence.hasForgotPassword === 'boolean'
          ? issueEvidence.hasForgotPassword
          : undefined,
  };
}

async function detectVerificationCheckpoint(page: Page): Promise<{
  detected: boolean;
  otpLikeFields: number;
  hasResendCode: boolean;
  hasForgotPassword: boolean;
  heading: string | null;
}> {
  return page.evaluate(() => {
    const text = (document.body?.innerText ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
    const fields = Array.from(document.querySelectorAll('input, textarea, select'));
    const otpLikeFields = fields.filter((field) => {
      const input = field as HTMLInputElement | HTMLTextAreaElement;
      const signature = `${field.getAttribute('aria-label') ?? ''} ${field.getAttribute('name') ?? ''} ${field.getAttribute('id') ?? ''} ${field.getAttribute('autocomplete') ?? ''}`.toLowerCase();
      return input.inputMode === 'numeric' || /otp|verification|code|token|رمز|كود/.test(signature);
    }).length;
    const hasResendCode = /resend code|send again|إعادة إرسال|إرسال مرة أخرى/.test(text);
    const hasForgotPassword = /forgot password|reset password|نسيت كلمة المرور|استعادة كلمة المرور/.test(text);
    const heading =
      document.querySelector('h1, h2, [role="heading"]')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 120) ?? null;
    return {
      detected: otpLikeFields > 0 || hasResendCode,
      otpLikeFields,
      hasResendCode,
      hasForgotPassword,
      heading,
    };
  });
}

async function detectRaawiTasks(page: Page): Promise<{
  likelyLogin: boolean;
  likelySearch: boolean;
  likelyContactFlow: boolean;
}> {
  return page.evaluate(() => {
    const hasPassword = !!document.querySelector('input[type="password"]');
    const hasSubmit =
      !!document.querySelector('button[type="submit"], input[type="submit"]') ||
      !!Array.from(document.querySelectorAll('button,a,[role="button"]')).find((el) => {
        const text = `${el.getAttribute('aria-label') ?? ''} ${(el.textContent ?? '').trim()}`.toLowerCase();
        return /login|log in|sign in|submit|continue|دخول|تسجيل/.test(text);
      });
    const likelyLogin = hasPassword && hasSubmit;

    const likelySearch =
      !!document.querySelector(
        'input[type="search"], input[name*="search" i], input[aria-label*="search" i], form[role="search"] input'
      ) || /search|find|ابحث/.test((document.body?.innerText ?? '').toLowerCase());

    const likelyContactFlow =
      !!document.querySelector(
        'form input[name*="email" i], form input[type="email"], form textarea, form input[name*="message" i]'
      ) || /contact|support|feedback|تواصل|اتصل/.test((document.body?.innerText ?? '').toLowerCase());

    return { likelyLogin, likelySearch, likelyContactFlow };
  });
}

export class PageCapture {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private scanId?: string;
  private storageStatePath?: string;
  private pausedPage: Page | null = null;
  private pausedCheckpoint: ManualCheckpoint | null = null;

  constructor(scanId?: string, storageStatePath?: string) {
    this.scanId = scanId;
    this.storageStatePath = storageStatePath;
  }

  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await launchChromium();
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
    const captureStartedAt = Date.now();
    const timings: NonNullable<PageScanResult['timings']> = {};
    const recordTiming = <T>(name: keyof NonNullable<PageScanResult['timings']>, startedAt: number, value: T): T => {
      timings[name] = Date.now() - startedAt;
      return value;
    };

    try {
      // SECURITY: Validate URL with SSRF protections BEFORE Playwright goto
      const validationStartedAt = Date.now();
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
      timings.validationMs = Date.now() - validationStartedAt;

      // Navigate to page (security checks passed)
      console.log(`[WAIT] Navigation start: ${url}`);
      const navigationStartedAt = Date.now();
      const response = await page.goto(url, {
        waitUntil: options.stabilization?.waitUntil || 'domcontentloaded',
        timeout,
      });
      recordTiming('navigationMs', navigationStartedAt, response);
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

        const stabilizationStartedAt = Date.now();
        const stabilizationResult = await PageStabilizer.waitForStable(page, stabilizationConfig);
        recordTiming('stabilizationMs', stabilizationStartedAt, stabilizationResult);

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

      const pl: ResolvedScanPipeline =
        options.pipeline ?? {
          layer1: true,
          layer2: true,
          layer3: true,
          analysisAgent: true,
          screenshotMode: 'full',
        };
      const crawlLinkDiscovery = options.crawlLinkDiscovery === true;
      const writeDomArtifacts = pl.layer1 || crawlLinkDiscovery;

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

      // Capture lightweight metadata first so live events can carry a title even before DOM serialization.
      const metadataStartedAt = Date.now();
      result.title = await page.title();
      result.finalUrl = finalUrl;
      result.canonicalUrl = computeCanonicalUrl(finalUrl);
      timings.metadataMs = Date.now() - metadataStartedAt;
      const titleForEvents = result.title?.trim() || undefined;

      if (!writeDomArtifacts && this.scanId) {
        scanEventEmitter.emitEvent(this.scanId, {
          type: 'layer_status',
          scanId: this.scanId,
          url,
          pageNumber,
          layer: 'L1',
          status: 'done',
          meta: { skipped: true },
          timestamp: new Date().toISOString(),
        });
      }

      let visionPath: string | undefined;
      let visionCount = 0;

      // LAYER 2: capture the full-page screenshot as early as possible so live previews are available
      // even when later DOM or accessibility steps fail for the current page.
      if (pl.layer2) {
        console.log('[L2] Screenshot start');
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
        const fullPage = pl.screenshotMode === 'full';
        const screenshotStartedAt = Date.now();
        await page.screenshot({
          path: screenshotPath,
          fullPage,
        });
        timings.screenshotMs = Date.now() - screenshotStartedAt;
        result.screenshotPath = screenshotPath;
        console.log('[L2] Screenshot end');

        if (this.scanId) {
          scanEventEmitter.emitEvent(this.scanId, {
            type: 'screenshot_ready',
            scanId: this.scanId,
            url,
            pageNumber,
            timestamp: new Date().toISOString(),
          });
        }
      } else if (this.scanId) {
        scanEventEmitter.emitEvent(this.scanId, {
          type: 'layer_status',
          scanId: this.scanId,
          url,
          pageNumber,
          layer: 'L2',
          status: 'done',
          meta: { skipped: true, visionCount: 0 },
          timestamp: new Date().toISOString(),
        });
      }

      const html = await page.content();
      result.pageFingerprint = computePageFingerprint(result.title, html);

      // LAYER 1 (optional): accessibility barriers
      if (pl.layer1) {
        console.log('[L1] Checking for accessibility barriers (disabled tools)...');
        const accessibilityBarrierStartedAt = Date.now();
        const { detectAccessibilityBarriers } = await import('../rules/accessibility-barriers.js');
        const accessibilityBarriers = await detectAccessibilityBarriers(page);
        timings.accessibilityBarrierMs = Date.now() - accessibilityBarrierStartedAt;
        if (accessibilityBarriers.length > 0) {
          console.log(`[L1] Found ${accessibilityBarriers.length} accessibility barriers`);
          (result as any).accessibilityBarriers = accessibilityBarriers;
        }
      }

      // DOM/HTML + links + a11y (Layer 1 artifacts; required for crawl link discovery)
      if (writeDomArtifacts) {
        console.log('[L1] Capture start');
        const domCaptureStartedAt = Date.now();
        if (pl.layer1 && this.scanId) {
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

        const finalHtml = await page.content();
        const htmlPath = join(pageDir, 'page.html');
        await writeFile(htmlPath, finalHtml, 'utf-8');
        result.htmlPath = htmlPath;
        result.pageFingerprint = computePageFingerprint(result.title, finalHtml);
        timings.domCaptureMs = Date.now() - domCaptureStartedAt;
        console.log(`[L1] Capture end: DOM/HTML for page ${pageNumber}: ${url}`);

        try {
          const linkExtractionStartedAt = Date.now();
          const extractedLinks = await page.evaluate((baseUrl) => {
            const links: string[] = [];
            const seen = new Set<string>();
            const anchors = document.querySelectorAll('a[href]');
            anchors.forEach((anchor) => {
              const href = anchor.getAttribute('href');
              if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !href.startsWith('mailto:')) {
                try {
                  const absoluteUrl = new URL(href, baseUrl).toString();
                  if (!seen.has(absoluteUrl)) {
                    links.push(absoluteUrl);
                    seen.add(absoluteUrl);
                  }
                } catch {
                  /* skip */
                }
              }
            });
            return links;
          }, url);
          timings.linkExtractionMs = Date.now() - linkExtractionStartedAt;
          (result as any).extractedLinks = extractedLinks;
          console.log(`[CRAWL] Extracted ${extractedLinks.length} links from live DOM for ${url}`);
        } catch (error) {
          console.error(`[CRAWL] Failed to extract links from live DOM for ${url}:`, error);
          (result as any).extractedLinks = [];
        }

        if (pl.layer1 && this.scanId) {
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

        if (pl.layer1) {
          try {
            const a11ySnapshotStartedAt = Date.now();
            const a11ySnapshot = await page.evaluate(() => {
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
            timings.a11ySnapshotMs = Date.now() - a11ySnapshotStartedAt;
            result.a11yPath = a11yPath;
          } catch (error) {
            console.warn(`Failed to capture a11y snapshot for ${url}:`, error);
          }
        }
      }

      if (pl.layer2 && config.vision.enabled) {
        try {
          const visionStartedAt = Date.now();
          const visionAnalyzer = new VisionAnalyzer();
          const visionFindings = await visionAnalyzer.analyzePage(page, pageNumber, finalUrl, outputDir);
          timings.visionMs = Date.now() - visionStartedAt;
          visionCount = visionFindings.length;
          if (visionFindings.length > 0) {
            visionPath = await visionAnalyzer.saveFindings(visionFindings, pageNumber, outputDir);
            result.visionPath = visionPath;
            console.log(`[L2] Vision complete for page ${pageNumber}: ${visionFindings.length} findings`);
          } else {
            console.log(`[L2] Vision complete for page ${pageNumber}: 0 findings`);
          }
        } catch (error) {
          console.warn(`Vision analysis failed for page ${pageNumber}:`, error);
        }
      }

      if (pl.layer2 && this.scanId) {
        scanEventEmitter.emitEvent(this.scanId, {
          type: 'layer_status',
          scanId: this.scanId,
          url,
          pageNumber,
          layer: 'L2',
          status: 'done',
          meta: { visionCount },
          timestamp: new Date().toISOString(),
        });
      }

      // Analysis AI agent (keyboard interaction trace) — optional per scan
      if (pl.analysisAgent && config.agent.enabled) {
        try {
          const agentStartedAt = Date.now();
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
          const manualCheckpoint = extractManualCheckpoint(artifact as any, finalUrl, pageNumber);
          if (manualCheckpoint) {
            result.manualCheckpoint = manualCheckpoint;
          }
          timings.agentMs = Date.now() - agentStartedAt;

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
      } else if (this.scanId) {
        scanEventEmitter.emitEvent(this.scanId, {
          type: 'agent_done',
          scanId: this.scanId,
          url: finalUrl,
          pageNumber,
          issuesCount: 0,
          skipped: true,
          timestamp: new Date().toISOString(),
        } as any);
      }

      try {
        const semanticHtml = result.htmlPath ? await readFile(result.htmlPath, 'utf-8') : await page.content();
        const semanticA11y = result.a11yPath
          ? JSON.parse(await readFile(result.a11yPath, 'utf-8'))
          : undefined;
        const semanticModel = buildSemanticModel({
          html: semanticHtml,
          url: finalUrl,
          pageNumber,
          title: result.title,
          a11y: semanticA11y,
        });
        const semanticPath = join(pageDir, 'semantic.json');
        await writeFile(semanticPath, JSON.stringify(semanticModel, null, 2), 'utf-8');
        result.semanticPath = semanticPath;

        if (config.raawi.execution.enabled) {
          const probes = await detectRaawiTasks(page);
          const agent = new RaawiAgent({ verbose: false });
          const bindings = createPlaywrightActionBindings(page);
          const username = config.raawi.execution.loginUsername;
          const password = config.raawi.execution.loginPassword;
          const hasCredentials = Boolean(username && password);

          const tasks: Array<{ goal: 'login' | 'search' | 'navigate' | 'fill-form'; description: string; context: Record<string, unknown> }> = [];
          if (probes.likelyLogin) {
            tasks.push({
              goal: 'login',
              description: 'Complete login flow on detected login page',
              context: hasCredentials ? { username, password } : {},
            });
          }
          if (config.raawi.execution.enableNonLoginGoals) {
            if (probes.likelySearch) {
              tasks.push({
                goal: 'search',
                description: 'Run a search flow on detected search UI',
                context: { query: config.raawi.execution.searchQuery },
              });
            }
            tasks.push({
              goal: 'navigate',
              description: 'Navigate to a likely contact/help page',
              context: { target: config.raawi.execution.navigateTarget },
            });
            if (probes.likelyContactFlow) {
              tasks.push({
                goal: 'fill-form',
                description: 'Fill a likely contact/support form with safe defaults',
                context: { ...config.raawi.execution.formDefaults },
              });
            }
          }

          if (tasks.length > 0) {
            const raawiDir = join(pageDir, 'raawi-agent');
            await mkdir(raawiDir, { recursive: true });
            const outputs: Array<{ goal: string; task: unknown; plan: unknown; execution: unknown }> = [];

            for (const task of tasks) {
              const dryRun = task.goal === 'login' ? !hasCredentials : false;
              const plan = await agent.getPlan({
                model: semanticModel as any,
                task,
                dryRun,
              });
              const executionResult = await agent.execute({
                model: semanticModel as any,
                task,
                dryRun,
                bindings,
                timeout: 20000,
              });
              outputs.push({ goal: task.goal, task, plan, execution: executionResult });
            }

            await writeFile(join(raawiDir, 'plan.json'), JSON.stringify(outputs.map((o) => ({ goal: o.goal, task: o.task, plan: o.plan })), null, 2), 'utf-8');
            await writeFile(
              join(raawiDir, 'execution.json'),
              JSON.stringify(
                {
                  generatedAt: new Date().toISOString(),
                  pageUrl: finalUrl,
                  runs: outputs.map((o) => ({ goal: o.goal, execution: o.execution })),
                },
                null,
                2
              ),
              'utf-8'
            );
            (result as any).raawiExecutionPath = join(raawiDir, 'execution.json');
          }
        }
      } catch (semanticError) {
        console.warn(`[Semantic] Failed to build semantic model for page ${pageNumber}:`, semanticError);
      }

      // Save metadata
      timings.totalMs = Date.now() - captureStartedAt;
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
        semanticPath: result.semanticPath,
        visionPath: result.visionPath,
        agentPath: result.agentPath,
        raawiExecutionPath: (result as any).raawiExecutionPath,
        manualCheckpoint: result.manualCheckpoint,
        timings,
      };
      const metadataWriteStartedAt = Date.now();
      const metadataPath = join(pageDir, 'page.json');
      await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
      timings.metadataWriteMs = Date.now() - metadataWriteStartedAt;
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
        timings.totalMs = Date.now() - captureStartedAt;
        const metadata = {
          pageNumber,
          url,
          status: 'failed',
          error: result.error,
          capturedAt: new Date().toISOString(),
          timings,
        };
        const metadataPath = join(pageDir, 'page.json');
        await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
        result.metadataPath = metadataPath;
      } catch {
        // If we can't save metadata, that's okay
      }
    } finally {
      timings.totalMs = Date.now() - captureStartedAt;
      result.timings = timings;
      console.log('[TIMING] Page capture', {
        scanId: this.scanId,
        pageNumber,
        url,
        status: result.status,
        ...timings,
      });
      if (result.manualCheckpoint) {
        this.pausedPage = page;
        this.pausedCheckpoint = result.manualCheckpoint;
      } else {
        await page.close();
      }
    }

    return result;
  }

  async close(): Promise<void> {
    if (this.pausedPage) {
      await this.pausedPage.close().catch(() => {});
      this.pausedPage = null;
      this.pausedCheckpoint = null;
    }
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  getManualCheckpoint(): ManualCheckpoint | null {
    return this.pausedCheckpoint;
  }

  async resumeManualCheckpoint(code: string): Promise<{
    success: boolean;
    message: string;
    resolved: boolean;
    currentUrl?: string;
  }> {
    if (!this.pausedPage || !this.pausedCheckpoint) {
      return {
        success: false,
        resolved: false,
        message: 'No paused manual checkpoint is available for this scan session.',
      };
    }

    const page = this.pausedPage;
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      return {
        success: false,
        resolved: false,
        message: 'Verification code is required.',
      };
    }

    try {
      const otpTargets = await page.evaluate(() => {
        const selectorFor = (el: Element): string => {
          const htmlEl = el as HTMLElement;
          if (htmlEl.id) return `#${htmlEl.id}`;
          const name = el.getAttribute('name');
          if (name) return `${el.tagName}[name="${name}"]`;
          const className = htmlEl.className ? String(htmlEl.className).split(/\s+/).slice(0, 2).join('.') : '';
          return `${el.tagName}${className ? `.${className}` : ''}`;
        };
        const isVisible = (el: Element): boolean => {
          const htmlEl = el as HTMLElement;
          const style = window.getComputedStyle(htmlEl);
          const rect = htmlEl.getBoundingClientRect();
          return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
        };
        return Array.from(document.querySelectorAll('input, textarea'))
          .filter((field) => {
            if (!isVisible(field)) return false;
            const input = field as HTMLInputElement | HTMLTextAreaElement;
            const signature = `${field.getAttribute('aria-label') ?? ''} ${field.getAttribute('name') ?? ''} ${field.getAttribute('id') ?? ''} ${field.getAttribute('autocomplete') ?? ''}`.toLowerCase();
            return input.inputMode === 'numeric' || /otp|verification|code|token|رمز|كود/.test(signature);
          })
          .slice(0, 8)
          .map((field) => {
            const input = field as HTMLInputElement | HTMLTextAreaElement;
            return {
              selector: selectorFor(field),
              maxLength: typeof input.maxLength === 'number' ? input.maxLength : -1,
              value: input.value ?? '',
            };
          });
      });

      if (otpTargets.length === 0) {
        return {
          success: false,
          resolved: false,
          message: 'No OTP/code field was found on the paused page.',
          currentUrl: page.url(),
        };
      }

      const splitAcrossInputs =
        otpTargets.length > 1 &&
        trimmedCode.length >= otpTargets.length &&
        otpTargets.every((target) => target.maxLength === 1 || target.maxLength === -1);

      for (let i = 0; i < otpTargets.length; i++) {
        const target = otpTargets[i];
        const locator = page.locator(target.selector).first();
        await locator.focus();
        if (splitAcrossInputs) {
          await locator.fill(trimmedCode[i] ?? '');
        } else if (i === 0) {
          await locator.fill(trimmedCode);
        }
      }

      const submitCandidate = await page.evaluate(() => {
        const selectorFor = (el: Element): string => {
          const htmlEl = el as HTMLElement;
          if (htmlEl.id) return `#${htmlEl.id}`;
          const name = el.getAttribute('name');
          if (name) return `${el.tagName}[name="${name}"]`;
          const className = htmlEl.className ? String(htmlEl.className).split(/\s+/).slice(0, 2).join('.') : '';
          return `${el.tagName}${className ? `.${className}` : ''}`;
        };
        const candidates = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]'));
        const preferred = candidates.find((candidate) => {
          const text = `${candidate.getAttribute('aria-label') ?? ''} ${(candidate.textContent ?? '').trim()} ${candidate.getAttribute('value') ?? ''}`.toLowerCase();
          return /verify|continue|submit|next|confirm|تحقق|متابعة|تأكيد|إرسال/.test(text);
        });
        return preferred ? selectorFor(preferred) : null;
      });

      if (submitCandidate) {
        await page.locator(submitCandidate).first().click();
      } else {
        await page.keyboard.press('Enter');
      }

      await page.waitForTimeout(1500);
      const checkpointAfter = await detectVerificationCheckpoint(page);

      if (this.context && this.storageStatePath) {
        try {
          const storageState = await this.context.storageState();
          await writeFile(this.storageStatePath, JSON.stringify(storageState, null, 2), 'utf-8');
        } catch (error) {
          console.warn('[PageCapture] Failed to persist storage state after manual checkpoint resume:', error);
        }
      }

      if (checkpointAfter.detected) {
        return {
          success: false,
          resolved: false,
          message: 'Verification checkpoint is still present after submitting the code. The code may be invalid or another step is required.',
          currentUrl: page.url(),
        };
      }

      const currentUrl = page.url();
      await page.close().catch(() => {});
      this.pausedPage = null;
      this.pausedCheckpoint = null;

      return {
        success: true,
        resolved: true,
        message: 'Verification code accepted. Scan session resumed.',
        currentUrl,
      };
    } catch (error) {
      return {
        success: false,
        resolved: false,
        message: error instanceof Error ? error.message : 'Failed to resume manual checkpoint.',
        currentUrl: page.url(),
      };
    }
  }
}
