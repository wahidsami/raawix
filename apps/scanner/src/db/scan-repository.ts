import type { ScanRun, PageArtifact, RuleResult, VisionFinding } from '@raawi-x/core';
import { getPrismaClient } from './client.js';
import { StructuredLogger } from '../utils/logger.js';

type AuditMode = 'classic' | 'raawi-agent';

/**
 * Repository for scan persistence
 */
export class ScanRepository {
  private logger: StructuredLogger;

  constructor() {
    this.logger = new StructuredLogger();
  }

  /**
   * Create a new scan record
   */
  async createScan(
    scanId: string,
    seedUrl: string,
    maxPages: number,
    maxDepth: number,
    hostname: string,
    entityId?: string,
    propertyId?: string,
    auditMode: AuditMode = 'classic'
  ): Promise<void> {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return; // DB not enabled
    }

    try {
      await prisma.scan.upsert({
        where: { scanId },
        create: {
          scanId,
          seedUrl,
          status: 'queued',
          startedAt: new Date(),
          maxPages,
          maxDepth,
          hostname,
          auditMode,
          entityId: entityId || null,
          propertyId: propertyId || null,
        },
        update: {
          seedUrl,
          maxPages,
          maxDepth,
          hostname,
          auditMode,
          entityId: entityId || null,
          propertyId: propertyId || null,
        },
      });
      this.logger.info('Scan record ensured in database', { scanId, entityId, propertyId, auditMode });
    } catch (error) {
      this.logger.error('Failed to upsert scan in database', {
        scanId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - DB is optional
    }
  }

  /**
   * Update scan status
   */
  async updateScanStatus(
    scanId: string,
    status: 'queued' | 'running' | 'completed' | 'failed' | 'canceled' | 'discovering',
    completedAt?: Date
  ): Promise<void> {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return;
    }

    try {
      await prisma.scan.update({
        where: { scanId },
        data: {
          status,
          completedAt: completedAt || undefined,
          updatedAt: new Date(),
        },
      });
      this.logger.info('Scan status updated in database', { scanId, status });
    } catch (error) {
      this.logger.error('Failed to update scan status in database', {
        scanId,
        status,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get or create scan record (for cases where scan wasn't created upfront)
   */
  async getOrCreateScan(
    scanId: string,
    seedUrl: string,
    maxPages: number,
    maxDepth: number,
    hostname: string,
    entityId?: string,
    propertyId?: string,
    auditMode: AuditMode = 'classic'
  ): Promise<string | null> {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return null;
    }

    try {
      let scan = await prisma.scan.findUnique({
        where: { scanId },
        select: { id: true },
      });

      if (!scan) {
        // Create scan if it doesn't exist
        await this.createScan(scanId, seedUrl, maxPages, maxDepth, hostname, entityId, propertyId, auditMode);
        scan = await prisma.scan.findUnique({
          where: { scanId },
          select: { id: true },
        });
      }

      return scan?.id || null;
    } catch (error) {
      this.logger.error('Failed to get or create scan', {
        scanId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Upsert a page record
   */
  async upsertPage(
    scanId: string,
    page: PageArtifact
  ): Promise<string | null> {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return null;
    }

    try {
      // First, get the scan's DB ID
      const scan = await prisma.scan.findUnique({
        where: { scanId },
        select: { id: true },
      });

      if (!scan) {
        this.logger.warn('Scan not found in database for page upsert', { scanId });
        return null;
      }

      const pageRecord = await prisma.page.upsert({
        where: {
          scanId_pageNumber: {
            scanId: scan.id,
            pageNumber: page.pageNumber,
          },
        },
        create: {
          scanId: scan.id,
          pageNumber: page.pageNumber,
          url: page.url,
          title: page.title,
          finalUrl: page.finalUrl,
          canonicalUrl: page.canonicalUrl,
          pageFingerprintJson: page.pageFingerprint ? page.pageFingerprint : undefined,
          screenshotPath: page.screenshotPath,
          htmlPath: page.htmlPath,
          a11yPath: page.a11yPath,
          visionPath: page.visionPath,
          agentPath: page.agentPath,
          error: page.error,
        },
        update: {
          url: page.url,
          title: page.title,
          finalUrl: page.finalUrl,
          canonicalUrl: page.canonicalUrl,
          pageFingerprintJson: page.pageFingerprint ? page.pageFingerprint : undefined,
          screenshotPath: page.screenshotPath,
          htmlPath: page.htmlPath,
          a11yPath: page.a11yPath,
          visionPath: page.visionPath,
          agentPath: page.agentPath,
          error: page.error,
          updatedAt: new Date(),
        },
      });

      return pageRecord.id;
    } catch (error) {
      this.logger.error('Failed to upsert page in database', {
        scanId,
        pageNumber: page.pageNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Bulk insert findings and vision findings after report generation
   */
  async saveReportResults(
    scanId: string,
    scanRun: ScanRun,
    options?: { analysisAgent?: boolean; /** @deprecated prefer analysisAgent */ runOpenAiAnalyst?: boolean }
  ): Promise<void> {
    /** When false: skip loading interaction.json, skip OpenAI analyst, and do not insert agent findings. */
    const persistAnalysisAgent =
      options?.analysisAgent !== false && options?.runOpenAiAnalyst !== false;
    const prisma = await getPrismaClient();
    if (!prisma) {
      return;
    }

    try {
      let scan = await prisma.scan.findUnique({
        where: { scanId },
        select: { id: true },
      });

      if (!scan) {
        // Try to create scan if it doesn't exist (for legacy scans without entity/property)
        this.logger.warn('Scan not found in database for report results, attempting to create', { scanId });
        const seedUrl = scanRun.seedUrl;
        const hostname = new URL(seedUrl).hostname;
        await this.createScan(scanId, seedUrl, scanRun.pages.length, 2, hostname);
        // Retry getting scan
        const retryScan = await prisma.scan.findUnique({
          where: { scanId },
          select: { id: true },
        });
        if (!retryScan) {
          this.logger.error('Failed to create scan record', { scanId });
          return;
        }
        scan = retryScan;
      }

      // Get page IDs mapping
      const pages = await prisma.page.findMany({
        where: { scanId: scan.id },
        select: { id: true, pageNumber: true },
      });

      const pageIdMap = new Map<number, string>();
      for (const page of pages) {
        pageIdMap.set(page.pageNumber, page.id);
      }

      // Prepare findings
      const findingsData: Array<{
        scanId: string;
        pageId: string | null;
        ruleId: string;
        wcagId: string | null;
        level: string | null;
        status: string;
        confidence: string;
        message: string | null;
        evidenceJson: unknown;
        howToVerify: string;
      }> = [];

      // Import getFindingLevel to ensure level is set
      const { getFindingLevel } = await import('../utils/wcag-rule-registry.js');

      for (const pageResult of scanRun.results) {
        const pageId = pageIdMap.get(pageResult.pageNumber) || null;

        for (const ruleResult of pageResult.ruleResults) {
          // Skip vision findings (handled separately)
          if (ruleResult.ruleId.startsWith('vision-')) {
            continue;
          }

          // Ensure level is set - use ruleResult.level if available, otherwise infer from wcagId
          let level = ruleResult.level;
          if (!level && ruleResult.wcagId) {
            const inferredLevel = getFindingLevel(ruleResult.wcagId, ruleResult.ruleId, null);
            level = (inferredLevel === 'Heuristic' || inferredLevel === 'Review' || inferredLevel === null) ? undefined : inferredLevel;
          }

          findingsData.push({
            scanId: scan.id,
            pageId,
            ruleId: ruleResult.ruleId,
            wcagId: ruleResult.wcagId || null,
            level: level || null,
            status: ruleResult.status,
            confidence: ruleResult.confidence,
            message: ruleResult.message || null,
            evidenceJson: ruleResult.evidence,
            howToVerify: ruleResult.howToVerify,
          });
        }
      }

      // Prepare vision findings
      const visionFindingsData: Array<{
        scanId: string;
        pageId: string | null;
        kind: string;
        bboxJson: unknown;
        detectedText: string | null;
        confidence: string;
        correlatedSelector: string | null;
        evidenceJson: unknown;
        suggestedWcagIdsJson: unknown;
      }> = [];

      // Load vision findings from files
      for (const page of scanRun.pages) {
        if (!page.visionPath) {
          continue;
        }

        try {
          const { readFile } = await import('node:fs/promises');
          const visionContent = await readFile(page.visionPath!, 'utf-8');
          const visionFindings: VisionFinding[] = JSON.parse(visionContent);

          const pageId = pageIdMap.get(page.pageNumber) || null;

          for (const finding of visionFindings) {
            // Store evidenceJson which includes Gemini raw outputs
            const evidenceJsonData: any = {
              evidence: finding.evidence,
            };
            if (finding.evidenceJson) {
              evidenceJsonData.geminiTextExtraction = finding.evidenceJson.geminiTextExtraction;
              evidenceJsonData.geminiDescription = finding.evidenceJson.geminiDescription;
            }

            visionFindingsData.push({
              scanId: scan.id,
              pageId,
              kind: finding.kind,
              bboxJson: finding.bbox,
              detectedText: finding.detectedText || null,
              confidence: finding.confidence,
              correlatedSelector: finding.correlatedSelector || null,
              evidenceJson: evidenceJsonData, // Includes Gemini raw outputs
              suggestedWcagIdsJson: finding.suggestedWcagIds,
            });
          }
        } catch (error) {
          this.logger.warn('Failed to load vision findings for page', {
            scanId,
            pageNumber: page.pageNumber,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Agent findings + OpenAI analyst (entire block off when scanPipeline.analysisAgent is false)
      const agentFindingsData: Array<{
        scanId: string;
        pageId: string | null;
        kind: string;
        message: string | null;
        confidence: number;
        evidenceJson: unknown;
        howToVerify: string | null;
        suggestedWcagIdsJson: unknown;
        source: string;
      }> = [];

      const pagesForAnalyst: Array<{
        page: PageArtifact;
        artifact: import('../agent/interaction-agent.js').InteractionArtifact;
        pageId: string | null;
      }> = [];

      if (persistAnalysisAgent) {
        for (const page of scanRun.pages) {
          if (!page.agentPath) continue;
          try {
            const { readFile } = await import('node:fs/promises');
            const { validateAgentArtifact } = await import('../agent/interaction-agent.js');
            const raw = await readFile(page.agentPath, 'utf-8');
            let data: unknown;
            try {
              data = JSON.parse(raw);
            } catch (parseErr) {
              this.logger.warn('Failed to parse agent artifact JSON', {
                scanId,
                pageNumber: page.pageNumber,
                error: parseErr instanceof Error ? parseErr.message : 'Unknown error',
              });
              continue;
            }
            const artifact = validateAgentArtifact(data);
            if (!artifact) continue;
            const issues = artifact.issues;
            const pageId = pageIdMap.get(page.pageNumber) || null;
            for (const issue of issues) {
              if (!issue.kind) continue;
              const confidenceNum =
                typeof issue.confidence === 'number'
                  ? issue.confidence
                  : typeof issue.confidence === 'string'
                    ? parseFloat(issue.confidence)
                    : NaN;
              const confidence = Number.isFinite(confidenceNum)
                ? Math.max(0, Math.min(1, confidenceNum))
                : 0.5;
              agentFindingsData.push({
                scanId: scan.id,
                pageId,
                kind: issue.kind,
                message: issue.message ?? null,
                confidence,
                evidenceJson: issue.evidence ?? (issue as any).evidenceJson ?? {},
                howToVerify: issue.howToVerify ?? null,
                suggestedWcagIdsJson: issue.suggestedWcagIds ?? null,
                source: 'agent',
              });
            }
            const hasIssues = issues.length >= 1;
            const hasProbesAttempted =
              Array.isArray(artifact.probes) && artifact.probes.some((p) => p.attempted);
            if (hasIssues || hasProbesAttempted) {
              pagesForAnalyst.push({ page, artifact, pageId });
            }
          } catch (error) {
            this.logger.warn('Failed to load agent findings for page', {
              scanId,
              pageNumber: page.pageNumber,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }

      // OpenAI Analyst: enrich interaction artifacts (only when persistAnalysisAgent)
      try {
        const { config } = await import('../config.js');
        if (
          persistAnalysisAgent &&
          config.openai?.enabled &&
          config.agentAnalyst?.enabled &&
          config.openai.apiKey
        ) {
          try {
            const { scanEventEmitter } = await import('../events/scan-events.js');
            scanEventEmitter.emitEvent(scanId, {
              type: 'analyst_started',
              scanId,
              pagesPlanned: Math.min(config.agentAnalyst.maxPagesPerScan, pagesForAnalyst.length),
              timestamp: new Date().toISOString(),
            } as any);
          } catch {
            // Non-fatal
          }

          const {
            buildCompactInput,
            getStableCompactPayload,
            analyzeInteractionArtifact,
          } = await import('../agent/openai-analyst.js');
          const {
            agentAnalystCacheKey,
            getAgentAnalystCached,
            setAgentAnalystCached,
            setAgentAnalystCacheTtl,
          } = await import('../agent/agent-cache.js');
          setAgentAnalystCacheTtl(config.agentAnalyst.cacheTtlMs);
          const maxPages = Math.min(
            config.agentAnalyst.maxPagesPerScan,
            pagesForAnalyst.length
          );
          let analyzedPages = 0;
          let totalAdded = 0;
          for (let i = 0; i < maxPages; i++) {
            const { page, artifact, pageId } = pagesForAnalyst[i];
            const pageFingerprintStr =
              page.pageFingerprint != null
                ? JSON.stringify(page.pageFingerprint)
                : `${page.pageNumber}:${page.url}`;
            const compactInput = buildCompactInput(
              artifact,
              page.title,
              config.agentAnalyst.maxIssuesPerPage
            );
            const stablePayload = getStableCompactPayload(compactInput);
            const key = agentAnalystCacheKey(
              pageFingerprintStr,
              stablePayload,
              config.openai.model
            );
            let enriched: any[] | null = getAgentAnalystCached(key);
            if (enriched === null) {
              const result = await analyzeInteractionArtifact(compactInput, {
                apiKey: config.openai.apiKey,
                model: config.openai.model,
              });
              enriched = result.enrichedFindings;
              setAgentAnalystCached(key, enriched);
            }
            analyzedPages++;
            for (const f of enriched || []) {
              totalAdded++;
              agentFindingsData.push({
                scanId: scan.id,
                pageId,
                kind: f.kind,
                message: f.message ?? null,
                confidence: f.confidence,
                evidenceJson: {
                  source: 'openai',
                  ...(typeof f.evidence === 'object' && f.evidence !== null
                    ? (f.evidence as Record<string, unknown>)
                    : {}),
                },
                howToVerify: f.howToVerify ?? null,
                suggestedWcagIdsJson: f.suggestedWcagIds ?? null,
                source: 'openai',
              });
            }
          }

          try {
            const { scanEventEmitter } = await import('../events/scan-events.js');
            scanEventEmitter.emitEvent(scanId, {
              type: 'analyst_done',
              scanId,
              pagesAnalyzed: analyzedPages,
              findingsAdded: totalAdded,
              timestamp: new Date().toISOString(),
            } as any);
          } catch {
            // Non-fatal
          }
        }
      } catch (analystErr) {
        this.logger.warn('OpenAI analyst failed (non-fatal)', {
          scanId,
          error: analystErr instanceof Error ? analystErr.message : 'Unknown error',
        });
      }

      // Bulk insert findings
      if (findingsData.length > 0) {
        await prisma.finding.createMany({
          data: findingsData,
          skipDuplicates: true,
        });
        this.logger.info('Findings saved to database', {
          scanId,
          count: findingsData.length,
        });
      }

      // Bulk insert vision findings
      if (visionFindingsData.length > 0) {
        await prisma.visionFinding.createMany({
          data: visionFindingsData,
          skipDuplicates: true,
        });
        this.logger.info('Vision findings saved to database', {
          scanId,
          count: visionFindingsData.length,
        });
      }

      if (agentFindingsData.length > 0) {
        await prisma.agentFinding.createMany({
          data: agentFindingsData,
          skipDuplicates: true,
        });
        this.logger.info('Agent findings saved to database', { scanId, count: agentFindingsData.length });
      }

      // Calculate compliance scores
      const { calculateComplianceScores } = await import('../utils/compliance-scoring.js');
      const ruleResults = findingsData.map((f) => ({
        level: (f.level as 'A' | 'AA' | 'AAA' | null) || null,
        status: f.status as 'pass' | 'fail' | 'needs_review' | 'na',
      }));
      const scores = calculateComplianceScores(ruleResults);

      // Update scan with summary AND scores
      await prisma.scan.update({
        where: { id: scan.id },
        data: {
          summaryJson: scanRun.summary,
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
          // Save compliance scores
          scoreA: scores.scoreA,
          scoreAA: scores.scoreAA,
          scoreAAA: (scores as any).scoreAAA,
          needsReviewRate: scores.needsReviewRate,
        },
      });

      this.logger.info('Report results saved to database', {
        scanId,
        scores: { scoreA: scores.scoreA, scoreAA: scores.scoreAA, scoreAAA: (scores as any).scoreAAA }
      });
    } catch (error) {
      this.logger.error('Failed to save report results to database', {
        scanId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get scan by scanId
   */
  async getScan(scanId: string) {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return null;
    }

    try {
      return await prisma.scan.findUnique({
        where: { scanId },
        include: {
          pages: {
            orderBy: { pageNumber: 'asc' },
          },
          findings: true,
          visionFindings: true,
          agentFindings: true,
        },
      });
    } catch (error) {
      this.logger.error('Failed to get scan from database', {
        scanId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Get latest completed scan for a hostname
   */
  async getLatestScanForHostname(hostname: string) {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return null;
    }

    try {
      return await prisma.scan.findFirst({
        where: {
          hostname,
          status: 'completed',
        },
        orderBy: {
          completedAt: 'desc',
        },
        include: {
          pages: {
            orderBy: { pageNumber: 'asc' },
          },
        },
      });
    } catch (error) {
      this.logger.error('Failed to get latest scan for hostname from database', {
        hostname,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }
}

export const scanRepository = new ScanRepository();
