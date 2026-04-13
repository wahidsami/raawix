import type { ManualCheckpoint, ScanRequest, ScanRun, PageArtifact, PageScanResult } from '@raawi-x/core';
import { generateScanId } from '@raawi-x/core';
import { config } from './config.js';
import { validateUrl } from './security/ssrf.js';
import { checkUrlPolicy } from './security/url-policy.js';
import { SecureStorage } from './security/storage.js';
import { BFSCrawler } from './crawler/bfs-crawler.js';
import { PageCapture } from './crawler/page-capture.js';
import { ReportGenerator } from './runner/report-generator.js';
import { auditLogger } from './audit/logger.js';
import { StructuredLogger } from './utils/logger.js';
import { scanRepository } from './db/scan-repository.js';
import { getHostname } from './crawler/url-utils.js';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { resolveScanPipeline, defaultScanPipeline } from './scan-pipeline.js';

/**
 * Strict scan state machine: queued -> running -> paused|completed|failed|canceled
 */
export type ScanStatus = 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'canceled';

interface Job {
  id: string;
  request: ScanRequest;
  status: ScanStatus;
  scanRun?: ScanRun;
  manualCheckpoint?: ManualCheckpoint;
  remainingSelectedUrls?: string[];
  startedAt?: string;
  completedAt?: string;
  canceledAt?: string;
  ttl?: number; // Time to live (timestamp when job should be considered stale)
}

export class JobQueue {
  private queue: Job[] = [];
  private running: Set<string> = new Set();
  private canceled: Set<string> = new Set();
  private activePageCaptures: Map<string, any> = new Map(); // Store pageCapture instances for cancellation
  private storage: SecureStorage;
  private reportGenerator: ReportGenerator;
  private logger: StructuredLogger;

  constructor() {
    this.storage = new SecureStorage(config.outputDir);
    this.reportGenerator = new ReportGenerator(config.outputDir);
    this.logger = new StructuredLogger();
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
    let timeoutHandle: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        const error = new Error(message);
        error.name = 'ScanTimeoutError';
        reject(error);
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    });
  }

  private async saveFailedPageArtifact(
    outputDir: string,
    pageNumber: number,
    url: string,
    error: string,
    timings?: PageScanResult['timings']
  ): Promise<void> {
    const pageDir = join(outputDir, 'pages', String(pageNumber));
    await mkdir(pageDir, { recursive: true });
    const metadataPath = join(pageDir, 'page.json');
    await writeFile(
      metadataPath,
      JSON.stringify(
        {
          pageNumber,
          url,
          status: 'failed',
          error,
          capturedAt: new Date().toISOString(),
          timings,
        },
        null,
        2
      ),
      'utf-8'
    );
  }

  private async saveManualCheckpointArtifact(
    outputDir: string,
    checkpoint: ManualCheckpoint
  ): Promise<void> {
    const checkpointPath = join(outputDir, 'manual-checkpoint.json');
    await writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2), 'utf-8');
  }

  private async runSequentialPages(
    scanId: string,
    pageCapture: PageCapture,
    outputDir: string,
    urls: string[],
    startingPageNumber: number,
    logger: StructuredLogger,
    pipeline: ReturnType<typeof resolveScanPipeline>,
    storageStatePath?: string
  ): Promise<{ pages: PageScanResult[]; manualCheckpoint: ManualCheckpoint | null }> {
    const { scanEventEmitter } = await import('./events/scan-events.js');
    const pages: PageScanResult[] = [];
    let manualCheckpoint: ManualCheckpoint | null = null;
    let pageCounter = startingPageNumber - 1;

    for (const url of urls) {
      if (this.canceled.has(scanId)) {
        logger.info('Job canceled during sequential scan', { scanId });
        break;
      }

      try {
        pageCounter++;
        logger.info(`Scanning page ${pageCounter}/${startingPageNumber - 1 + urls.length}: ${url}`, { scanId });

        scanEventEmitter.emitEvent(scanId, {
          type: 'page_started',
          scanId,
          url,
          pageNumber: pageCounter,
          timestamp: new Date().toISOString(),
        });

        for (const layer of ['L1', 'L2', 'L3'] as const) {
          scanEventEmitter.emitEvent(scanId, {
            type: 'layer_status',
            scanId,
            url,
            pageNumber: pageCounter,
            layer,
            status: 'pending',
            timestamp: new Date().toISOString(),
          });
        }

        const pageStartedAt = Date.now();
        const pageResult = await this.withTimeout(
          pageCapture.capturePage(url, outputDir, pageCounter, {
            timeout: 20000,
            waitForNetworkIdle: true,
            stabilization: {
              waitUntil: 'domcontentloaded',
              networkIdleMs: 800,
              stableDomMs: 600,
              maxWaitMs: 15000,
              useReadyMarker: true,
            },
            pipeline,
          }),
          config.quotas.sequentialPageTimeoutMs,
          `Page ${pageCounter} exceeded selected-page timeout of ${config.quotas.sequentialPageTimeoutMs}ms`
        );

        pages.push(pageResult);

        if (scanId) {
          try {
            await scanRepository.upsertPage(scanId, {
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
            logger.warn('Failed to upsert page in database', {
              scanId,
              url,
              error: error instanceof Error ? error.message : 'Unknown',
            });
          }
        }

        scanEventEmitter.emitEvent(scanId, {
          type: 'page_done',
          scanId,
          url,
          pageNumber: pageCounter,
          summary: {
            findingsCount: 0,
            visionCount: 0,
            timings: pageResult.timings,
          },
          timestamp: new Date().toISOString(),
        } as any);
        logger.info('Sequential page scan finished', {
          scanId,
          url,
          pageNumber: pageCounter,
          durationMs: Date.now() - pageStartedAt,
          timings: pageResult.timings,
        });

        if (pageResult.manualCheckpoint) {
          manualCheckpoint = pageResult.manualCheckpoint;
          logger.info('Manual checkpoint detected during sequential scan', {
            scanId,
            pageNumber: pageCounter,
            url,
            checkpoint: manualCheckpoint,
          });
          break;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        const timedOut = error instanceof Error && error.name === 'ScanTimeoutError';
        logger.error(`Failed to scan page ${url}:`, {
          error: errorMessage,
          stack: errorStack,
          url,
          pageNumber: pageCounter,
          timedOut,
        });
        const failedPage: PageScanResult = {
          pageNumber: pageCounter,
          url,
          status: 'failed',
          error: errorMessage,
          timings: { totalMs: config.quotas.sequentialPageTimeoutMs },
        };
        pages.push(failedPage);
        await this.saveFailedPageArtifact(outputDir, pageCounter, url, errorMessage, failedPage.timings);

        try {
          await scanRepository.upsertPage(scanId, {
            pageNumber: failedPage.pageNumber,
            url: failedPage.url,
            error: failedPage.error,
          });
        } catch (dbError) {
          logger.warn('Failed to upsert failed page in database', {
            scanId,
            url,
            error: dbError instanceof Error ? dbError.message : 'Unknown',
          });
        }

        for (const layer of ['L1', 'L2', 'L3'] as const) {
          scanEventEmitter.emitEvent(scanId, {
            type: 'layer_status',
            scanId,
            url,
            pageNumber: pageCounter,
            layer,
            status: 'failed',
            meta: { error: errorMessage },
            timestamp: new Date().toISOString(),
          } as any);
        }
        scanEventEmitter.emitEvent(scanId, {
          type: 'error',
          scanId,
          url,
          message: errorMessage,
          timestamp: new Date().toISOString(),
        });
        scanEventEmitter.emitEvent(scanId, {
          type: 'page_done',
          scanId,
          url,
          pageNumber: pageCounter,
          summary: {
            findingsCount: 0,
            visionCount: 0,
            failed: true,
            error: errorMessage,
          },
          timestamp: new Date().toISOString(),
        } as any);

        if (timedOut) {
          logger.warn('Restarting page capture browser after page timeout', { scanId, pageNumber: pageCounter, url });
          try {
            await pageCapture.close();
          } catch (closeError) {
            logger.warn('Failed to close timed-out page capture browser', {
              scanId,
              error: closeError instanceof Error ? closeError.message : 'Unknown',
            });
          }
          pageCapture = new PageCapture(scanId, storageStatePath);
          await pageCapture.initialize();
          this.activePageCaptures.set(scanId, pageCapture);
        }
      }
    }

    return { pages, manualCheckpoint };
  }

  async addJob(request: ScanRequest): Promise<string> {
    // Normalize request - support both new and legacy format
    const normalizedRequest: ScanRequest = {
      seedUrl: request.seedUrl || request.url || '',
      maxPages: Math.min(request.maxPages || 25, config.quotas.maxPagesHardLimit),
      maxDepth: Math.min(request.maxDepth || 2, 5),
      auditMode: request.auditMode || 'classic',
      includePatterns: request.includePatterns,
      excludePatterns: request.excludePatterns,
      scanPipeline: request.scanPipeline,
      // Keep legacy fields for compatibility
      url: request.url || request.seedUrl,
      options: request.options,
    };

    // Validate seed URL with SSRF protections and URL policy
    const seedUrl = normalizedRequest.seedUrl || normalizedRequest.url;
    if (!seedUrl) {
      throw new Error('seedUrl or url is required');
    }

    await validateUrl(seedUrl, config.allowedPorts);

    // Check URL policy
    const policyCheck = await checkUrlPolicy(seedUrl);
    if (!policyCheck.allowed) {
      throw new Error(policyCheck.reason || 'URL not allowed by policy');
    }

    const scanId = generateScanId();
    const logger = new StructuredLogger(scanId);

    // Check if report.json already exists (idempotency)
    const reportPath = join(config.outputDir, scanId, 'report.json');
    if (existsSync(reportPath)) {
      logger.info('Report.json already exists, loading existing scan', { scanId });
      try {
        const existingReport = JSON.parse(await readFile(reportPath, 'utf-8')) as ScanRun;
        logger.info('Existing scan found, short-circuiting to completed', { scanId, pages: existingReport.pages.length });

        const job: Job = {
          id: scanId,
          request: normalizedRequest,
          status: 'completed',
          scanRun: existingReport,
          startedAt: existingReport.startedAt,
          completedAt: existingReport.completedAt,
        };

        this.queue.push(job);
        auditLogger.logScanComplete(scanId, existingReport.pages.length, 0);
        return scanId;
      } catch (error) {
        logger.warn('Failed to load existing report, will restart scan', { scanId, error: error instanceof Error ? error.message : 'Unknown' });
        // Fall through to create new job
      }
    }

    const job: Job = {
      id: scanId,
      request: normalizedRequest,
      status: 'queued',
      // Set TTL: job expires after maxRuntimeMs + 5 minutes buffer
      ttl: Date.now() + config.quotas.maxRuntimeMs + 5 * 60 * 1000,
    };

    this.queue.push(job);

    // Create scan record in database (always create, entityId/propertyId optional)
    const entityId = (request as any).entityId;
    const propertyId = (request as any).propertyId;

    // Extract hostname from seedUrl
    let hostname: string;
    try {
      hostname = getHostname(seedUrl);
    } catch (error) {
      throw new Error(`Invalid seed URL: ${seedUrl}. ${error instanceof Error ? error.message : 'Failed to extract hostname'}`);
    }

    await scanRepository.createScan(
      scanId,
      seedUrl,
      normalizedRequest.maxPages!,
      normalizedRequest.maxDepth!,
      hostname,
      entityId,
      propertyId,
      normalizedRequest.auditMode
    );

    // Log scan created
    logger.info('Scan job created', { scanId, seedUrl, maxPages: normalizedRequest.maxPages, maxDepth: normalizedRequest.maxDepth, auditMode: normalizedRequest.auditMode, entityId, propertyId });
    auditLogger.logScanCreated(scanId, seedUrl, {
      maxPages: normalizedRequest.maxPages,
      maxDepth: normalizedRequest.maxDepth,
      dryRun: (request as any).dryRun || false,
      entityId,
      propertyId,
    });

    // If dry run, validate only and return immediately
    if ((request as any).dryRun) {
      this.transitionState(job, 'completed', logger);
      job.startedAt = new Date().toISOString();
      job.completedAt = new Date().toISOString();

      // Create minimal ScanRun for dry run
      job.scanRun = {
        scanId,
        seedUrl,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        pages: [],
        results: [],
        summary: {
          totalPages: 0,
          totalRules: 0,
          byLevel: {
            A: { pass: 0, fail: 0, needs_review: 0, na: 0, total: 0 },
            AA: { pass: 0, fail: 0, needs_review: 0, na: 0, total: 0 },
          },
          byStatus: { pass: 0, fail: 0, needs_review: 0, na: 0 },
        },
      };

      auditLogger.logScanComplete(scanId, 0, 0);
      return scanId;
    }

    this.processQueue();

    return scanId;
  }

  getJob(scanId: string): Job | undefined {
    return this.queue.find((job) => job.id === scanId);
  }

  /**
   * Add job for existing scan (from discovery phase)
   * This is called when user clicks "Start Scanning" after discovery
   */
  async addJobForExistingScan(scanId: string, request: ScanRequest): Promise<void> {
    // Check if job already exists
    if (this.getJob(scanId)) {
      const logger = new StructuredLogger(scanId);
      logger.warn('Job already exists for scanId', { scanId });
      return; // Job already exists, don't create duplicate
    }

    // Normalize request
    const normalizedRequest: ScanRequest = {
      seedUrl: request.seedUrl || request.url || '',
      maxPages: Math.min(request.maxPages || 25, config.quotas.maxPagesHardLimit),
      maxDepth: Math.min(request.maxDepth || 2, 5),
      auditMode: request.auditMode || 'classic',
      includePatterns: request.includePatterns,
      excludePatterns: request.excludePatterns,
      url: request.url || request.seedUrl,
      options: request.options,
      selectedUrls: (request as any).selectedUrls, // Include selectedUrls for sequential scanning
      scanPipeline: request.scanPipeline,
    };

    // Validate seed URL
    const seedUrl = normalizedRequest.seedUrl || normalizedRequest.url;
    if (!seedUrl) {
      throw new Error('seedUrl or url is required');
    }

    await validateUrl(seedUrl, config.allowedPorts);

    // Check URL policy
    const policyCheck = await checkUrlPolicy(seedUrl);
    if (!policyCheck.allowed) {
      throw new Error(policyCheck.reason || 'URL not allowed by policy');
    }

    const logger = new StructuredLogger(scanId);

    // Create job with existing scanId
    const job: Job = {
      id: scanId,
      request: normalizedRequest,
      status: 'queued',
      ttl: Date.now() + config.quotas.maxRuntimeMs + 5 * 60 * 1000,
    };

    this.queue.push(job);

    logger.info('Job added for existing scan', { scanId, selectedUrls: normalizedRequest.selectedUrls?.length || 0, auditMode: normalizedRequest.auditMode });

    // Process queue to start the job
    this.processQueue();
  }

  /**
   * Cancel a scan job
   */
  async cancelJob(scanId: string): Promise<boolean> {
    const job = this.getJob(scanId);
    const logger = new StructuredLogger(scanId);

    // Mark as canceled regardless of whether job exists in queue
    // (Job might not exist if it's still in discovery phase)
    this.canceled.add(scanId);

    if (!job) {
      // Job not in queue - might be in discovery phase or already completed
      logger.info('Cancel requested for scan not in queue (may be in discovery phase)', { scanId });
      return true; // Still return true - we marked it as canceled
    }

    if (job.status === 'completed' || job.status === 'failed' || job.status === 'canceled') {
      logger.warn('Cannot cancel job in final state', { scanId, status: job.status });
      return false;
    }

    // Stop active browser/pageCapture operations
    const pageCapture = this.activePageCaptures.get(scanId);
    if (pageCapture) {
      try {
        logger.info('Closing browser/pageCapture for canceled scan', { scanId });
        await pageCapture.close();
        this.activePageCaptures.delete(scanId);
      } catch (error) {
        logger.warn('Error closing pageCapture during cancel', { scanId, error: error instanceof Error ? error.message : 'Unknown' });
      }
    }

    if (job.status === 'running') {
      // Mark as canceled and clean up
      this.transitionState(job, 'canceled', logger);
      job.canceledAt = new Date().toISOString();
      this.running.delete(scanId);

      logger.info('Scan job canceled', { scanId });
      auditLogger.logScanFailed(scanId, 'Scan canceled by user', { canceled: true });

      // Process next job
      this.processQueue();
    } else if (job.status === 'queued' || job.status === 'paused') {
      // Remove from queue
      this.transitionState(job, 'canceled', logger);
      job.canceledAt = new Date().toISOString();
      const index = this.queue.findIndex((j) => j.id === scanId);
      if (index >= 0) {
        this.queue.splice(index, 1);
      }

      logger.info('Queued scan job canceled', { scanId });
    }

    return true;
  }

  async resumePausedScan(scanId: string, verificationCode: string): Promise<{ ok: boolean; message: string }> {
    const job = this.getJob(scanId);
    const logger = new StructuredLogger(scanId);

    if (!job || job.status !== 'paused' || !job.manualCheckpoint) {
      return { ok: false, message: 'Paused scan with manual checkpoint not found.' };
    }

    if (this.running.size >= config.maxConcurrentScans) {
      return { ok: false, message: 'Scanner is busy right now. Please retry resuming in a moment.' };
    }

    const pageCapture = this.activePageCaptures.get(scanId) as PageCapture | undefined;
    if (!pageCapture) {
      return { ok: false, message: 'Paused scan session is no longer active. Start a fresh scan to continue.' };
    }

    const remainingUrls = job.remainingSelectedUrls ?? [];
    const seedUrl = job.request.seedUrl || job.request.url || job.manualCheckpoint.pageUrl;
    const pipeline = resolveScanPipeline(job.request);
    const outputDir = join(config.outputDir, scanId);

    const resumeResult = await pageCapture.resumeManualCheckpoint(verificationCode);
    if (!resumeResult.success || !resumeResult.resolved) {
      return { ok: false, message: resumeResult.message };
    }

    this.transitionState(job, 'running', logger);
    this.running.add(scanId);
    job.manualCheckpoint = undefined;
    job.remainingSelectedUrls = [];
    await scanRepository.updateScanStatus(scanId, 'running', undefined);

    void (async () => {
      try {
        const startPageNumber = (await readFile(join(outputDir, 'report.json'), 'utf-8')
          .then((raw) => {
            const parsed = JSON.parse(raw) as ScanRun;
            return (parsed.pages?.length ?? 0) + 1;
          })
          .catch(() => (job.scanRun?.pages?.length ?? 0) + 1));

        const sequentialResult = await this.runSequentialPages(
          scanId,
          pageCapture,
          outputDir,
          remainingUrls,
          startPageNumber,
          logger,
          pipeline,
          undefined
        );

        if (sequentialResult.manualCheckpoint) {
          job.manualCheckpoint = sequentialResult.manualCheckpoint;
          job.remainingSelectedUrls = remainingUrls.slice(Math.max(0, sequentialResult.manualCheckpoint.pageNumber - startPageNumber + 1));
          this.transitionState(job, 'paused', logger);
          this.running.delete(scanId);
          await this.flushPartialResultsAfterPause(
            scanId,
            seedUrl,
            job.startedAt,
            sequentialResult.manualCheckpoint,
            logger,
            pageCapture,
            outputDir
          );
          return;
        }

        const finalScanRun = await this.reportGenerator.generateReport(
          scanId,
          seedUrl,
          job.startedAt || new Date().toISOString(),
          new Date().toISOString(),
          { generateAssistiveMap: pipeline.layer3 }
        );
        finalScanRun.completedAt = new Date().toISOString();
        job.scanRun = finalScanRun;
        this.transitionState(job, 'completed', logger);
        job.completedAt = finalScanRun.completedAt;

        await this.reportGenerator.saveReport(scanId, finalScanRun);
        await this.storage.saveScanResult(scanId, finalScanRun);
        await scanRepository.saveReportResults(scanId, finalScanRun, {
          analysisAgent: pipeline.analysisAgent,
        });
        await scanRepository.updateScanStatus(scanId, 'completed', new Date());

        this.running.delete(scanId);
        this.activePageCaptures.delete(scanId);
        await pageCapture.close().catch(() => {});

        const { scanEventEmitter } = await import('./events/scan-events.js');
        const fails = finalScanRun.summary.byStatus.fail;
        const needsReview = finalScanRun.summary.byStatus.needs_review;
        const assistivePages = finalScanRun.pages.filter((p: any) => p.assistiveMapPath).length;
        scanEventEmitter.emitEvent(scanId, {
          type: 'scan_done',
          scanId,
          totals: {
            pages: finalScanRun.pages.length,
            fails,
            needsReview,
            assistivePages,
          },
          timestamp: new Date().toISOString(),
        } as any);
      } catch (error) {
        logger.error('Failed to resume paused scan', {
          scanId,
          error: error instanceof Error ? error.message : 'Unknown',
        });
        this.running.delete(scanId);
        this.transitionState(job, 'failed', logger);
        job.completedAt = new Date().toISOString();
        await scanRepository.updateScanStatus(scanId, 'failed', new Date());
      }
    })();

    return { ok: true, message: resumeResult.message };
  }

  private async persistPartialReportForCanceledScan(
    scanId: string,
    seedUrl: string,
    startedAt: string,
    logger: StructuredLogger
  ): Promise<void> {
    try {
      logger.info('Generating partial report for canceled scan', { scanId });
      const jobRef = this.getJob(scanId);
      const pipeline = jobRef ? resolveScanPipeline(jobRef.request) : defaultScanPipeline();
      const scanRun = await this.reportGenerator.generateReport(
        scanId,
        seedUrl,
        startedAt,
        new Date().toISOString(),
        { generateAssistiveMap: pipeline.layer3 }
      );
      scanRun.completedAt = new Date().toISOString();

      await this.reportGenerator.saveReport(scanId, scanRun);
      await this.storage.saveScanResult(scanId, scanRun);
      await scanRepository.saveReportResults(scanId, scanRun, {
        analysisAgent: pipeline.analysisAgent,
      });
      await scanRepository.updateScanStatus(scanId, 'canceled', new Date());

      const { scanEventEmitter } = await import('./events/scan-events.js');
      const fails = scanRun.summary.byStatus.fail;
      const needsReview = scanRun.summary.byStatus.needs_review;
      const assistivePages = scanRun.pages.filter((p: any) => p.assistiveMapPath).length;

      scanEventEmitter.emitEvent(scanId, {
        type: 'scan_canceled',
        scanId,
        message: 'Scan canceled by user',
        totals: {
          pages: scanRun.pages.length,
          fails,
          needsReview,
          assistivePages,
        },
        timestamp: new Date().toISOString(),
      } as any);
    } catch (error) {
      logger.warn('Failed to persist partial report for canceled scan', {
        scanId,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      // Still emit canceled so UI stops cleanly
      try {
        const { scanEventEmitter } = await import('./events/scan-events.js');
        scanEventEmitter.emitEvent(scanId, {
          type: 'scan_canceled',
          scanId,
          message: 'Scan canceled by user',
          timestamp: new Date().toISOString(),
        } as any);
      } catch {
        // ignore
      }
    }
  }

  private async persistPartialReportForPausedScan(
    scanId: string,
    seedUrl: string,
    startedAt: string,
    checkpoint: ManualCheckpoint,
    logger: StructuredLogger
  ): Promise<void> {
    try {
      logger.info('Generating partial report for paused scan', { scanId, checkpoint });
      const jobRef = this.getJob(scanId);
      const pipeline = jobRef ? resolveScanPipeline(jobRef.request) : defaultScanPipeline();
      const scanRun = await this.reportGenerator.generateReport(
        scanId,
        seedUrl,
        startedAt,
        new Date().toISOString(),
        { generateAssistiveMap: pipeline.layer3 }
      );
      scanRun.completedAt = new Date().toISOString();
      scanRun.manualCheckpoint = checkpoint;

      await this.reportGenerator.saveReport(scanId, scanRun);
      await this.storage.saveScanResult(scanId, scanRun);
      await scanRepository.saveReportResults(scanId, scanRun, {
        analysisAgent: pipeline.analysisAgent,
      });
      await scanRepository.updateScanStatus(scanId, 'paused', undefined);

      const { scanEventEmitter } = await import('./events/scan-events.js');
      scanEventEmitter.emitEvent(scanId, {
        type: 'manual_checkpoint',
        scanId,
        url: checkpoint.pageUrl,
        pageNumber: checkpoint.pageNumber,
        message: checkpoint.message,
        checkpoint: {
          kind: checkpoint.kind,
          source: checkpoint.source,
          formPurpose: checkpoint.formPurpose,
          checkpointHeading: checkpoint.checkpointHeading,
          otpLikeFields: checkpoint.otpLikeFields,
          hasResendCode: checkpoint.hasResendCode,
          hasForgotPassword: checkpoint.hasForgotPassword,
        },
        totals: {
          pages: scanRun.pages.length,
          scanned: scanRun.pages.length,
        },
        timestamp: new Date().toISOString(),
      } as any);
    } catch (error) {
      logger.warn('Failed to persist partial report for paused scan', {
        scanId,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      try {
        const { scanEventEmitter } = await import('./events/scan-events.js');
        scanEventEmitter.emitEvent(scanId, {
          type: 'manual_checkpoint',
          scanId,
          url: checkpoint.pageUrl,
          pageNumber: checkpoint.pageNumber,
          message: checkpoint.message,
          checkpoint: {
            kind: checkpoint.kind,
            source: checkpoint.source,
            formPurpose: checkpoint.formPurpose,
            checkpointHeading: checkpoint.checkpointHeading,
            otpLikeFields: checkpoint.otpLikeFields,
            hasResendCode: checkpoint.hasResendCode,
            hasForgotPassword: checkpoint.hasForgotPassword,
          },
          timestamp: new Date().toISOString(),
        } as any);
      } catch {
        // ignore
      }
    }
  }

  /**
   * Close browser if needed, then write report.json + findings/summary to DB (partial/canceled).
   */
  private async flushPartialResultsAfterCancel(
    scanId: string,
    seedUrl: string,
    startedAt: string | undefined,
    logger: StructuredLogger,
    pageCapture: PageCapture | null
  ): Promise<void> {
    if (pageCapture) {
      try {
        await pageCapture.close();
      } catch {
        // ignore
      }
      this.activePageCaptures.delete(scanId);
    }
    const started = startedAt ?? new Date().toISOString();
    await this.persistPartialReportForCanceledScan(scanId, seedUrl, started, logger);
  }

  private async flushPartialResultsAfterPause(
    scanId: string,
    seedUrl: string,
    startedAt: string | undefined,
    checkpoint: ManualCheckpoint,
    logger: StructuredLogger,
    pageCapture: PageCapture | null,
    outputDir: string
  ): Promise<void> {
    try {
      await this.saveManualCheckpointArtifact(outputDir, checkpoint);
    } catch (error) {
      logger.warn('Failed to save manual checkpoint artifact', {
        scanId,
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }
    const started = startedAt ?? new Date().toISOString();
    await this.persistPartialReportForPausedScan(scanId, seedUrl, started, checkpoint, logger);
  }

  /**
   * Strict state machine transition
   */
  private transitionState(job: Job, newStatus: ScanStatus, logger: StructuredLogger): void {
    const oldStatus = job.status;

    if (oldStatus === newStatus) {
      logger.info('State transition no-op (already)', { scanId: job.id, status: newStatus });
      return;
    }

    // Validate state transition
    const validTransitions: Record<ScanStatus, ScanStatus[]> = {
      queued: ['running', 'completed', 'canceled'],
      running: ['paused', 'completed', 'failed', 'canceled'],
      paused: ['running', 'failed', 'canceled'],
      completed: [], // Terminal state
      failed: [], // Terminal state
      canceled: [], // Terminal state
    };

    if (!validTransitions[oldStatus]?.includes(newStatus)) {
      logger.error('Invalid state transition', {
        scanId: job.id,
        oldStatus,
        newStatus,
        validTransitions: validTransitions[oldStatus],
      });
      throw new Error(`Invalid state transition: ${oldStatus} -> ${newStatus}`);
    }

    job.status = newStatus;
    logger.info('State transition', { scanId: job.id, oldStatus, newStatus });
  }

  private async processQueue(): Promise<void> {
    // Check if we can start a new job
    if (this.running.size >= config.maxConcurrentScans) {
      return;
    }

    // Clean up stale jobs (exceeded TTL)
    await this.cleanupStaleJobs();

    // Only process jobs that are in the queue AND not canceled
    // Jobs created via /api/scans/:scanId/init are NOT in the queue, so they won't start automatically
    const pendingJob = this.queue.find((job) => job.status === 'queued' && !this.canceled.has(job.id));
    if (!pendingJob) {
      return;
    }

    // Check if job has expired
    if (pendingJob.ttl && Date.now() > pendingJob.ttl) {
      const logger = new StructuredLogger(pendingJob.id);
      logger.warn('Job TTL exceeded, marking as failed', { scanId: pendingJob.id, ttl: pendingJob.ttl });
      this.transitionState(pendingJob, 'failed', logger);
      pendingJob.completedAt = new Date().toISOString();
      auditLogger.logScanTimeout(pendingJob.id, Date.now() - (pendingJob.ttl - config.quotas.maxRuntimeMs - 5 * 60 * 1000));
      this.processQueue(); // Try next job
      return;
    }

    this.running.add(pendingJob.id);
    const logger = new StructuredLogger(pendingJob.id);
    this.transitionState(pendingJob, 'running', logger);
    pendingJob.startedAt = new Date().toISOString();

    // Keep Prisma row in sync (was often left `queued` until completion, which broke status-based UX)
    void scanRepository.updateScanStatus(pendingJob.id, 'running', undefined).catch((err) => {
      logger.warn('Failed to update scan status to running in database', {
        scanId: pendingJob.id,
        error: err instanceof Error ? err.message : String(err),
      });
    });

    // Log scan started
    const seedUrl = pendingJob.request.seedUrl || pendingJob.request.url || 'unknown';
    logger.info('Scan execution started', { scanId: pendingJob.id, seedUrl, maxPages: pendingJob.request.maxPages, maxDepth: pendingJob.request.maxDepth });
    auditLogger.logScanStart(pendingJob.id, seedUrl, {
      maxPages: pendingJob.request.maxPages,
      maxDepth: pendingJob.request.maxDepth,
    });

    // Process job asynchronously
    this.executeJob(pendingJob, logger).catch((error) => {
      logger.error('Job execution failed', { scanId: pendingJob.id, error: error instanceof Error ? error.message : 'Unknown error' });
      // Error handling is done in executeJob, just clean up here
      this.running.delete(pendingJob.id);
      this.processQueue(); // Try to process next job
    });
  }

  /**
   * Clean up stale jobs (exceeded TTL)
   */
  private async cleanupStaleJobs(): Promise<void> {
    const now = Date.now();
    for (const job of this.queue) {
      if (job.ttl && now > job.ttl && (job.status === 'queued' || job.status === 'running')) {
        const logger = new StructuredLogger(job.id);
        logger.warn('Cleaning up stale job', { scanId: job.id, status: job.status, ttl: job.ttl });

        if (job.status === 'running') {
          this.running.delete(job.id);
        }

        this.transitionState(job, 'failed', logger);
        job.completedAt = new Date().toISOString();
        auditLogger.logScanTimeout(job.id, config.quotas.maxRuntimeMs);
      }
    }
  }

  /**
   * Pure orchestrator: coordinates crawling, rule evaluation, and report generation
   * Idempotent: if report.json exists, short-circuit to completed
   */
  private async executeJob(job: Job, logger: StructuredLogger): Promise<void> {
    const scanId = job.id;
    const seedUrl = job.request.seedUrl || job.request.url || 'unknown';

    // Check if job was canceled
    if (this.canceled.has(scanId)) {
      logger.info('Job canceled before execution', { scanId });
      this.transitionState(job, 'canceled', logger);
      job.canceledAt = new Date().toISOString();
      this.running.delete(scanId);
      await this.flushPartialResultsAfterCancel(scanId, seedUrl, job.startedAt, logger, null);
      return;
    }

    // SECURITY: Ensure output directory path safety (no traversal)
    const sanitizedScanId = scanId.replace(/[\/\\\.\.]/g, '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (sanitizedScanId !== scanId) {
      throw new Error('Invalid scan ID - path traversal attempt detected');
    }

    const outputDir = join(config.outputDir, sanitizedScanId);
    const reportPath = join(outputDir, 'report.json');

    // IDEMPOTENCY: Check if report.json already exists
    if (existsSync(reportPath)) {
      logger.info('Report.json exists, loading existing scan', { scanId });
      try {
        const existingReport = JSON.parse(await readFile(reportPath, 'utf-8')) as ScanRun;
        logger.info('Existing scan found, short-circuiting to completed', { scanId, pages: existingReport.pages.length });

        this.transitionState(job, 'completed', logger);
        job.scanRun = existingReport;
        job.completedAt = existingReport.completedAt || new Date().toISOString();
        this.running.delete(scanId);

        auditLogger.logScanComplete(scanId, existingReport.pages.length, 0);
        this.processQueue();
        return;
      } catch (error) {
        logger.warn('Failed to load existing report, will restart scan', { scanId, error: error instanceof Error ? error.message : 'Unknown' });
        // Fall through to restart scan
      }
    }

    // IDEMPOTENCY: If artifacts partially exist, restart cleanly (remove old artifacts)
    const pagesDir = join(outputDir, 'pages');
    if (existsSync(pagesDir)) {
      logger.info('Partial artifacts found, cleaning up for restart', { scanId });
      try {
        await rm(pagesDir, { recursive: true, force: true });
        logger.info('Partial artifacts cleaned up', { scanId });
      } catch (error) {
        logger.warn('Failed to clean up partial artifacts', { scanId, error: error instanceof Error ? error.message : 'Unknown' });
        // Continue anyway - new artifacts will overwrite
      }
    }

    const startTime = Date.now();
    let timeoutHandle: NodeJS.Timeout | null = null;
    let pageCapture: PageCapture | null = null;
    let storageStatePath: string | undefined = undefined;

    // Calculate timeout based on scan mode
    // Sequential scanning: 60 seconds per page (includes L1+L2+L3)
    // BFS crawling: use default config timeout
    const selectedUrls = (job.request as any).selectedUrls as string[] | undefined;
    const isSequentialScan = selectedUrls && selectedUrls.length > 0;
    const timeoutMs = isSequentialScan
      ? Math.max(
          selectedUrls.length * config.quotas.sequentialPageTimeoutMs + 120000,
          config.quotas.sequentialScanMinRuntimeMs
        )
      : config.quotas.maxRuntimeMs;

    console.log(`[JOB-QUEUE] Timeout set to ${timeoutMs}ms (${Math.round(timeoutMs / 60000)} minutes) for ${isSequentialScan ? 'sequential' : 'BFS'} scan`);
    logger.info('Scan timeout configured', {
      scanId,
      timeoutMs,
      isSequentialScan,
      pageCount: selectedUrls?.length || 0,
      sequentialPageTimeoutMs: config.quotas.sequentialPageTimeoutMs,
    });

    // Set up per-scan timeout (job TTL)
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`Scan exceeded maximum runtime of ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      // Check if canceled during setup
      if (this.canceled.has(scanId)) {
        logger.info('Job canceled during setup', { scanId });
        this.transitionState(job, 'canceled', logger);
        job.canceledAt = new Date().toISOString();
        this.running.delete(scanId);
        await this.flushPartialResultsAfterCancel(scanId, seedUrl, job.startedAt, logger, null);
        return;
      }

      // Step 1: Create initial ScanRun record (queued/running state)
      const scanRun: ScanRun = {
        scanId,
        seedUrl,
        startedAt: job.startedAt!,
        pages: [],
        results: [],
        summary: {
          totalPages: 0,
          totalRules: 0,
          byLevel: {
            A: { pass: 0, fail: 0, needs_review: 0, na: 0, total: 0 },
            AA: { pass: 0, fail: 0, needs_review: 0, na: 0, total: 0 },
          },
          byStatus: { pass: 0, fail: 0, needs_review: 0, na: 0 },
        },
      };
      job.scanRun = scanRun;

      // AUTHENTICATED SCANNING: Load auth profile and perform login if needed
      // Note: authProfileId in request refers to propertyId (one-to-one relationship)
      const authProfileId = (job.request as any).authProfileId;
      const propertyId = (job.request as any).propertyId || authProfileId;
      if (propertyId) {
        try {
          const { authProfileRepository } = await import('./db/auth-profile-repository.js');
          const authProfile = await authProfileRepository.getByPropertyId(propertyId);

          if (authProfile && authProfile.authType === 'scripted_login' && authProfile.isActive) {
            logger.info('Authenticated scan detected, performing login', { scanId, propertyId });

            const { performLoginAndSaveState } = await import('./crawler/auth-helper.js');
            const loginResult = await performLoginAndSaveState(authProfile, outputDir, scanId);

            if (loginResult.success && loginResult.storageStatePath) {
              storageStatePath = loginResult.storageStatePath;
              logger.info('Login successful, storage state saved', { scanId, storageStatePath });

              // Emit event for UI
              const { scanEventEmitter } = await import('./events/scan-events.js');
              scanEventEmitter.emitEvent(scanId, {
                type: 'layer_status',
                scanId,
                url: seedUrl,
                pageNumber: 0,
                layer: 'L1',
                status: 'running',
                timestamp: new Date().toISOString(),
              });
            } else {
              logger.warn('Login failed, continuing without authentication', { scanId, error: loginResult.error });
            }
          }
        } catch (error) {
          logger.warn('Failed to load auth profile, continuing without authentication', {
            scanId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Step 2: Run BFS crawler + Playwright capture to produce artifacts
      // Concurrency is enforced at crawler level (2 pages at a time)
      pageCapture = new PageCapture(scanId, storageStatePath);
      // Store reference for cancellation
      this.activePageCaptures.set(scanId, pageCapture);

      // Pass auth profile to crawler if available (for post-login seed paths)
      let authProfile = null;
      if (propertyId) {
        try {
          const { authProfileRepository } = await import('./db/auth-profile-repository.js');
          authProfile = await authProfileRepository.getByPropertyId(propertyId);
        } catch (error) {
          // Non-fatal, continue without auth profile
        }
      }

      const crawlerRequest = { ...job.request };
      if (authProfile) {
        (crawlerRequest as any).authProfile = authProfile;
      }

      const pipeline = resolveScanPipeline(job.request);
      const pageCaptureBaseOpts = {
        timeout: 20000,
        waitForNetworkIdle: true,
        stabilization: {
          waitUntil: 'domcontentloaded' as const,
          networkIdleMs: 800,
          stableDomMs: 600,
          maxWaitMs: 15000,
          useReadyMarker: true,
        },
        pipeline,
      };

      // Check if selectedUrls provided (Phase 3: Sequential scanning of selected pages)
      const selectedUrls = (job.request as any).selectedUrls as string[] | undefined;

      console.log('[JOB-QUEUE] Checking selectedUrls:', {
        hasSelectedUrls: !!selectedUrls,
        length: selectedUrls?.length || 0,
        selectedUrls: selectedUrls
      });
      logger.info('[JOB-QUEUE] Checking selectedUrls', { hasSelectedUrls: !!selectedUrls, length: selectedUrls?.length || 0 });

      let crawlResult;
      let manualCheckpoint: ManualCheckpoint | null = null;
      if (selectedUrls && selectedUrls.length > 0) {
        // Sequential scanning mode: scan selected URLs one by one
        console.log('[JOB-QUEUE] Using SEQUENTIAL SCANNING mode for', selectedUrls.length, 'pages');
        logger.info('Starting sequential scan of selected pages', { scanId, count: selectedUrls.length });
        const sequentialResult = await this.runSequentialPages(
          scanId,
          pageCapture,
          outputDir,
          selectedUrls,
          1,
          logger,
          pipeline,
          storageStatePath
        );
        manualCheckpoint = sequentialResult.manualCheckpoint;
        if (manualCheckpoint) {
          job.manualCheckpoint = manualCheckpoint;
          const pausedIndex = manualCheckpoint.pageNumber;
          job.remainingSelectedUrls = selectedUrls.slice(pausedIndex);
        } else {
          job.remainingSelectedUrls = [];
        }

        crawlResult = {
          pages: sequentialResult.pages,
          totalPages: sequentialResult.pages.length,
          successfulPages: sequentialResult.pages.filter(p => p.status === 'success').length,
          failedPages: sequentialResult.pages.filter(p => p.status === 'failed').length,
        };
      } else {
        // Normal BFS crawl mode
        console.log('[JOB-QUEUE] No selectedUrls provided, falling back to BFS CRAWLER');
        logger.info('No selectedUrls provided, using BFS crawler', { scanId });
        const crawler = new BFSCrawler(crawlerRequest, outputDir, pageCapture, scanId);
        logger.info('Starting crawl', { scanId, maxPages: job.request.maxPages, maxDepth: job.request.maxDepth });
        const crawlPromise = crawler.crawl();
        crawlResult = await Promise.race([crawlPromise, timeoutPromise]);
      }

      // Clear timeout if we got here
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      // Check if canceled during crawl
      if (this.canceled.has(scanId)) {
        logger.info('Job canceled during crawl', { scanId });
        this.transitionState(job, 'canceled', logger);
        job.canceledAt = new Date().toISOString();
        this.running.delete(scanId);
        await this.flushPartialResultsAfterCancel(scanId, seedUrl, job.startedAt, logger, pageCapture);
        return;
      }

      if (manualCheckpoint) {
        logger.info('Pausing scan for manual checkpoint', { scanId, checkpoint: manualCheckpoint });
        this.transitionState(job, 'paused', logger);
        this.running.delete(scanId);
        await this.flushPartialResultsAfterPause(
          scanId,
          seedUrl,
          job.startedAt,
          manualCheckpoint,
          logger,
          pageCapture,
          outputDir
        );
        return;
      }

      logger.info('Crawl completed', { scanId, pages: crawlResult.pages.length, successful: crawlResult.successfulPages, failed: crawlResult.failedPages });

      // Step 3: Invoke canonical rule engine via ReportGenerator
      // ReportGenerator loads artifacts and runs rules
      logger.info('Generating report', { scanId });
      const finalScanRun = await this.reportGenerator.generateReport(
        scanId,
        seedUrl,
        job.startedAt!,
        new Date().toISOString(),
        { generateAssistiveMap: pipeline.layer3 }
      );

      // Check if canceled before saving
      if (this.canceled.has(scanId)) {
        logger.info('Job canceled before saving results - persisting partial results', { scanId });
        this.transitionState(job, 'canceled', logger);
        job.canceledAt = new Date().toISOString();
        this.running.delete(scanId);
        // Persist report.json + DB even if canceled (partial report)
        finalScanRun.completedAt = new Date().toISOString();
        await this.reportGenerator.saveReport(scanId, finalScanRun);
        await this.storage.saveScanResult(scanId, finalScanRun);
        await scanRepository.saveReportResults(scanId, finalScanRun, {
          analysisAgent: pipeline.analysisAgent,
        });
        await scanRepository.updateScanStatus(scanId, 'canceled', new Date());

        const { scanEventEmitter } = await import('./events/scan-events.js');
        const fails = finalScanRun.summary.byStatus.fail;
        const needsReview = finalScanRun.summary.byStatus.needs_review;
        const assistivePages = finalScanRun.pages.filter((p: any) => p.assistiveMapPath).length;
        scanEventEmitter.emitEvent(scanId, {
          type: 'scan_canceled',
          scanId,
          message: 'Scan canceled by user',
          totals: {
            pages: finalScanRun.pages.length,
            fails,
            needsReview,
            assistivePages,
          },
          timestamp: new Date().toISOString(),
        } as any);

        this.activePageCaptures.delete(scanId);
        return;
      }

      // Step 4: Persist final ScanRun
      finalScanRun.completedAt = new Date().toISOString();
      job.scanRun = finalScanRun;
      this.transitionState(job, 'completed', logger);
      job.completedAt = finalScanRun.completedAt;

      // Save canonical report.json
      await this.reportGenerator.saveReport(scanId, finalScanRun);

      // Also save to storage for API responses (legacy compatibility)
      await this.storage.saveScanResult(scanId, finalScanRun);

      // Save to database
      await scanRepository.saveReportResults(scanId, finalScanRun, {
        analysisAgent: pipeline.analysisAgent,
      });
      await scanRepository.updateScanStatus(scanId, 'completed', new Date());

      // Clean up pageCapture reference
      this.activePageCaptures.delete(scanId);

      const durationMs = Date.now() - startTime;

      logger.info('Scan completed successfully', { scanId, pages: finalScanRun.pages.length, durationMs });
      auditLogger.logScanComplete(scanId, finalScanRun.pages.length, durationMs);

      // B1) Emit scan_done event
      const { scanEventEmitter } = await import('./events/scan-events.js');
      const fails = finalScanRun.summary.byStatus.fail;
      const needsReview = finalScanRun.summary.byStatus.needs_review;
      const assistivePages = finalScanRun.pages.filter((p: any) => p.assistiveMapPath).length;

      scanEventEmitter.emitEvent(scanId, {
        type: 'scan_done',
        scanId,
        totals: {
          pages: finalScanRun.pages.length,
          fails,
          needsReview,
          assistivePages,
        },
        timestamp: new Date().toISOString(),
      });

      // Clear stored events after a delay (allow SSE clients to catch up)
      setTimeout(() => {
        scanEventEmitter.clearScan(scanId);
      }, 60000); // Keep for 1 minute after completion

    } catch (error) {
      // Check if canceled
      if (this.canceled.has(scanId)) {
        logger.info('Job canceled during execution', { scanId });
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        this.transitionState(job, 'canceled', logger);
        job.canceledAt = new Date().toISOString();
        this.running.delete(scanId);
        await this.flushPartialResultsAfterCancel(scanId, seedUrl, job.startedAt, logger, pageCapture);
        return;
      }

      // Clear timeout if still set
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      const runtimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isTimeout = errorMessage.includes('exceeded maximum runtime');

      logger.error('Scan execution failed', { scanId, error: errorMessage, runtimeMs, isTimeout });

      // Check if canceled - if so, mark as canceled instead of failed
      if (this.canceled.has(scanId)) {
        logger.info('Job was canceled, marking as canceled instead of failed', { scanId });
        this.transitionState(job, 'canceled', logger);
        job.canceledAt = new Date().toISOString();
        this.running.delete(scanId);
        await this.flushPartialResultsAfterCancel(scanId, seedUrl, job.startedAt, logger, pageCapture);
        return;
      }

      // Mark scan as failed
      this.transitionState(job, 'failed', logger);
      job.completedAt = new Date().toISOString();

      // Update scan status in database (only if not canceled)
      await scanRepository.updateScanStatus(scanId, 'failed', new Date());

      // Emit error event to UI
      try {
        const { scanEventEmitter } = await import('./events/scan-events.js');
        scanEventEmitter.emitEvent(scanId, {
          type: 'error',
          scanId,
          error: errorMessage,
          isTimeout,
          timestamp: new Date().toISOString(),
        } as any);

        // Clear stored events after a delay
        setTimeout(() => {
          scanEventEmitter.clearScan(scanId);
        }, 60000);
      } catch (emitError) {
        logger.warn('Failed to emit error event', { scanId, error: emitError });
      }

      // Update ScanRun with error
      if (job.scanRun) {
        job.scanRun.completedAt = job.completedAt;
        job.scanRun.error = errorMessage;
      } else {
        // Create failed ScanRun if we didn't get far enough
        job.scanRun = {
          scanId,
          seedUrl,
          startedAt: job.startedAt!,
          completedAt: job.completedAt,
          error: errorMessage,
          pages: [],
          results: [],
          summary: {
            totalPages: 0,
            totalRules: 0,
            byLevel: {
              A: { pass: 0, fail: 0, needs_review: 0, na: 0, total: 0 },
              AA: { pass: 0, fail: 0, needs_review: 0, na: 0, total: 0 },
            },
            byStatus: { pass: 0, fail: 0, needs_review: 0, na: 0 },
          },
        };
      }

      // Save failed result (only if not canceled)
      if (!this.canceled.has(scanId) && job.scanRun) {
        await this.reportGenerator.saveReport(scanId, job.scanRun);
        await this.storage.saveScanResult(scanId, job.scanRun);
      }

      // Clean up pageCapture reference
      this.activePageCaptures.delete(scanId);

      // Log failure
      if (isTimeout) {
        auditLogger.logScanTimeout(scanId, runtimeMs);
      } else {
        auditLogger.logScanFailed(scanId, errorMessage, { runtimeMs });
      }

      // Re-throw for queue processing
      throw error;
    } finally {
      // Cleanup
      if (pageCapture) {
        await pageCapture.close();
      }
      // Clean up pageCapture reference
      this.activePageCaptures.delete(scanId);
      this.running.delete(job.id);
      this.processQueue(); // Process next job
    }
  }
}
