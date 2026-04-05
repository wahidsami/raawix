/**
 * Scan Detail API Endpoint
 * 
 * Returns comprehensive scan data including Layer 1 (DOM/WCAG), Layer 2 (Vision), Layer 3 (Assistive Map)
 */

import { Router, Request, Response } from 'express';
import { getPrismaClient } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';
import { dbScanToApiResponse } from './db-adapter.js';
import {
  calculateComplianceScores,
  complianceScoresFromScanRunSummary,
} from '../utils/compliance-scoring.js';
import type { ScanRunSummary } from '@raawi-x/core';
import { getFindingLevel } from '../utils/wcag-rule-registry.js';
import { config } from '../config.js';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { getHostname } from '../crawler/url-utils.js';
import * as AMG from '../assistive/assistive-map-generator.js';

const router: Router = Router();

// Import jobQueue - we'll need to get it from the main app
// For now, we'll use a function that gets it from the module
let getJobQueue: (() => any) | null = null;
export function setJobQueueGetter(fn: () => any) {
  getJobQueue = fn;
}

/**
 * GET /api/scans/:scanId/detail
 * Get comprehensive scan detail with Layer 1/2/3 breakdown
 */
router.get('/:scanId/detail', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { scanId } = req.params;
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Get scan with all relations
    const scan = await prisma.scan.findUnique({
      where: { scanId },
      include: {
        entity: {
          select: {
            id: true,
            code: true,
            nameEn: true,
            nameAr: true,
          },
        },
        property: {
          select: {
            id: true,
            domain: true,
            displayNameEn: true,
            displayNameAr: true,
          },
        },
        pages: {
          include: {
            findings: {
              select: {
                id: true,
                wcagId: true,
                ruleId: true,
                level: true,
                status: true,
                confidence: true,
                message: true,
                evidenceJson: true,
                howToVerify: true,
              },
              orderBy: [
                { level: 'asc' },
                { status: 'asc' },
                { wcagId: 'asc' },
              ],
            },
            visionFindings: {
              orderBy: { confidence: 'desc' },
            },
            agentFindings: {
              orderBy: { confidence: 'desc' },
            },
          },
          orderBy: { pageNumber: 'asc' },
        },
        _count: {
          select: {
            pages: true,
            findings: true,
            visionFindings: true,
            agentFindings: true,
          },
        },
      },
    });

    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    // Calculate compliance scores
    // Use rule registry to get level from wcagId if level is missing
    const ruleResults = scan.pages.flatMap((page: any) =>
      page.findings.map((f: any) => {
        const level = getFindingLevel(f.wcagId, f.ruleId, f.level);
        let status: 'pass' | 'fail' | 'needs_review' | 'na' = f.status as 'pass' | 'fail' | 'needs_review' | 'na';
        if (!['pass', 'fail', 'needs_review', 'na'].includes(status)) {
          status = 'na'; // Default to na if invalid status
        }
        return {
          level: level === 'Heuristic' || level === 'Review' ? null : level,
          status,
        };
      })
    );
    let scores = calculateComplianceScores(ruleResults);

    if (ruleResults.length === 0 && scan.summaryJson) {
      try {
        const sj = scan.summaryJson as unknown as ScanRunSummary;
        if (sj?.byLevel?.A && sj?.byLevel?.AA) {
          scores = complianceScoresFromScanRunSummary(sj);
        }
      } catch {
        // keep scores from empty rule set
      }
    }

    if (scan.scoreA != null) scores.scoreA = scan.scoreA;
    if (scan.scoreAA != null) scores.scoreAA = scan.scoreAA;
    if (scan.needsReviewRate != null) scores.needsReviewRate = scan.needsReviewRate;

    const storedSummary = scan.summaryJson as unknown as ScanRunSummary | null;
    const totalPagesDisplay = Math.max(
      scan._count.pages,
      storedSummary && typeof storedSummary.totalPages === 'number' ? storedSummary.totalPages : 0
    );
    const totalFindingsDisplay =
      scan._count.findings > 0
        ? scan._count.findings
        : storedSummary && typeof storedSummary.totalRules === 'number'
          ? storedSummary.totalRules
          : 0;

    // Build pages with Layer 1/2/3 breakdown
    const pagesDetail = await Promise.all(
      scan.pages.map(async (page: any) => {
        // Layer 1: DOM/WCAG findings
        const layer1Findings = page.findings.map((f: any) => ({
          id: f.id,
          wcagId: f.wcagId,
          level: f.level,
          status: f.status,
          confidence: f.confidence,
          message: f.message,
          evidence: f.evidenceJson ? (typeof f.evidenceJson === 'string' ? JSON.parse(f.evidenceJson) : f.evidenceJson) : [],
          howToVerify: f.howToVerify,
        }));

        // Layer 2: Vision findings
        const layer2Findings = page.visionFindings.map((vf: any) => ({
          id: vf.id,
          kind: vf.kind,
          confidence: vf.confidence,
          status: (vf as any).status,
          detectedText: vf.detectedText,
          description: (vf as any).description,
          suggestedWcagIds: vf.suggestedWcagIdsJson ? (typeof vf.suggestedWcagIdsJson === 'string' ? JSON.parse(vf.suggestedWcagIdsJson) : vf.suggestedWcagIdsJson) : [],
          evidence: vf.evidenceJson ? (typeof vf.evidenceJson === 'string' ? JSON.parse(vf.evidenceJson) : vf.evidenceJson) : [],
          screenshotPath: (vf as any).screenshotPath,
        }));

        // Layer Agent: Interaction agent findings (source: "agent" | "openai" for filtering/badge)
        const layerAgentFindings = page.agentFindings.map((af: any) => ({
          id: af.id,
          kind: af.kind,
          message: af.message,
          confidence: af.confidence,
          evidence: af.evidenceJson ? (typeof af.evidenceJson === 'string' ? JSON.parse(af.evidenceJson) : af.evidenceJson) : {},
          howToVerify: af.howToVerify,
          suggestedWcagIds: af.suggestedWcagIdsJson ? (typeof af.suggestedWcagIdsJson === 'string' ? JSON.parse(af.suggestedWcagIdsJson) : af.suggestedWcagIdsJson) : [],
          source: af.source ?? undefined,
        }));

        // Layer 3: Assistive Map (lookup via AssistiveMapRepository)
        let assistiveMap = null;
        try {
          const { AssistiveMapRepository } = await import('../db/assistive-map-repository.js');
          const assistiveMapRepo = new AssistiveMapRepository();
          const pageVersionMatch = await assistiveMapRepo.findPageVersionByUrl(
            scan.hostname,
            page.url,
            page.canonicalUrl || page.url
          );

          if (pageVersionMatch) {
            const assistiveMapData = await assistiveMapRepo.getAssistiveMap(pageVersionMatch.pageVersionId);
            if (assistiveMapData) {
              assistiveMap = {
                id: pageVersionMatch.pageVersionId,
                map: assistiveMapData.map,
                confidenceSummary: assistiveMapData.confidenceSummary,
                generatedAt: new Date().toISOString(),
              };
            }
          }
        } catch (error) {
          // Non-fatal - continue without assistive map
          console.warn(`Failed to load assistive map for page ${page.pageNumber}:`, error);
        }

        return {
          pageNumber: page.pageNumber,
          url: page.url,
          canonicalUrl: page.canonicalUrl,
          finalUrl: page.finalUrl,
          title: page.title,
          screenshotPath: page.screenshotPath,
          layer1: {
            findings: layer1Findings,
            count: layer1Findings.length,
            passCount: layer1Findings.filter((f: any) => f.status === 'pass').length,
            failCount: layer1Findings.filter((f: any) => f.status === 'fail').length,
            needsReviewCount: layer1Findings.filter((f: any) => f.status === 'needs_review').length,
          },
          layer2: {
            findings: layer2Findings,
            count: layer2Findings.length,
            highConfidenceCount: layer2Findings.filter((f: any) => f.confidence === 'high').length,
            mediumConfidenceCount: layer2Findings.filter((f: any) => f.confidence === 'medium').length,
            lowConfidenceCount: layer2Findings.filter((f: any) => f.confidence === 'low').length,
          },
          layerAgent: {
            findings: layerAgentFindings,
            count: layerAgentFindings.length,
          },
          layer3: {
            assistiveMap,
            hasAssistiveMap: assistiveMap !== null,
          },
        };
      })
    );

    const analysisAgentFindings = pagesDetail.flatMap((p) =>
      (p.layerAgent?.findings || []).map((f: any) => ({
        pageNumber: p.pageNumber,
        pageUrl: p.url,
        kind: f.kind,
        message: f.message ?? '',
        confidence: f.confidence,
        source: f.source || 'agent',
        howToVerify: f.howToVerify ?? '',
        suggestedWcagIds: Array.isArray(f.suggestedWcagIds) ? f.suggestedWcagIds : [],
      }))
    );

    // Build response
    const response = {
      scanId: scan.scanId,
      seedUrl: scan.seedUrl,
      status: scan.status,
      startedAt: scan.startedAt.toISOString(),
      completedAt: scan.completedAt?.toISOString(),
      entity: scan.entity,
      property: scan.property,
      summary: {
        totalPages: totalPagesDisplay,
        totalFindings: totalFindingsDisplay,
        totalVisionFindings: scan._count.visionFindings,
        totalAgentFindings: scan._count.agentFindings,
        scores,
      },
      analysisAgent: {
        count: analysisAgentFindings.length,
        findings: analysisAgentFindings,
      },
      pages: pagesDetail,
      disclaimer: 'Scores reflect scanned pages and crawl scope; this is not a certification.',
    };

    res.json(response);
  } catch (error) {
    console.error('[SCAN-DETAIL] Error fetching scan detail:', error);
    res.status(500).json({ error: 'Failed to fetch scan detail' });
  }
});

/**
 * GET /api/scans/:scanId/debug
 * Get scan pipeline debug information
 */
router.get('/:scanId/debug', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { scanId } = req.params;
    const outputDir = resolve(config.outputDir);
    const scanDir = join(outputDir, scanId);

    // Get scan from database
    const scan = await prisma.scan.findUnique({
      where: { scanId },
      include: {
        pages: {
          include: {
            findings: {
              select: {
                id: true,
                status: true,
              },
            },
            visionFindings: {
              select: {
                id: true,
              },
            },
          },
          orderBy: { pageNumber: 'asc' },
        },
      },
    });

    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    // Check storage artifacts
    const reportPath = join(scanDir, 'report.json');
    const pagesDir = join(scanDir, 'pages');
    const hasReportJson = existsSync(reportPath);
    const hasPagesDir = existsSync(pagesDir);

    // Build pages debug info
    const pagesDebug = await Promise.all(
      scan.pages.map(async (page: any) => {
        // Layer 1: DOM/WCAG
        const findingsCount = {
          pass: page.findings.filter((f: any) => f.status === 'pass').length,
          fail: page.findings.filter((f: any) => f.status === 'fail').length,
          needsReview: page.findings.filter((f: any) => f.status === 'needs_review').length,
          na: page.findings.filter((f: any) => f.status === 'na').length,
        };

        // Check if HTML snapshot exists on disk
        const pageDir = join(pagesDir, String(page.pageNumber));
        const htmlPath = join(pageDir, 'page.html');
        const htmlStored = existsSync(htmlPath);

        // Layer 2: Vision
        const visionFindingsCount = page.visionFindings.length;
        const screenshotPath = page.screenshotPath || join(pageDir, 'screenshot.png');
        const screenshotStored = page.screenshotPath ? existsSync(page.screenshotPath) : existsSync(screenshotPath);

        // Check if Gemini was used (check assistive map for AI-generated notes)
        let geminiUsed = false;
        if (page.canonicalUrl) {
          try {
            const domain = getHostname(scan.seedUrl);
            const fingerprintHash = page.pageFingerprint
              ? AMG.AssistiveMapGenerator.computeFingerprintHash(page.pageFingerprint)
              : null;

            if (fingerprintHash) {
              const site = await prisma.site.findUnique({
                where: { domain },
              });

              if (site) {
                const pageVersion = await prisma.pageVersion.findFirst({
                  where: {
                    siteId: site.id,
                    canonicalUrl: page.canonicalUrl,
                    fingerprintHash,
                  },
                  include: {
                    assistiveMap: true,
                  },
                });

                if (pageVersion?.assistiveMap) {
                  const mapJson = pageVersion.assistiveMap.json as any;
                  // Check if any entry has AI-generated indicators
                  if (mapJson.imageDescriptions) {
                    for (const desc of Object.values(mapJson.imageDescriptions) as any[]) {
                      if (desc?.safetyNote?.includes('AI-generated') || desc?.safetyNote?.includes('Gemini')) {
                        geminiUsed = true;
                        break;
                      }
                    }
                  }
                }
              }
            }
          } catch (error) {
            // Non-fatal - continue
          }
        }

        // Layer 3: Assistive Map
        let assistiveMapStored = false;
        let assistiveMapId: string | null = null;
        let imageDescriptionsCount = 0;
        let labelOverridesCount = 0;
        let actionIntentsCount = 0;
        let formsCount = 0;
        let formsFieldsCount = 0;
        let formsUploadsCount = 0;
        let formsActionsCount = 0;
        let storedAt: string | null = null;

        if (page.canonicalUrl && page.pageFingerprint) {
          try {
            const domain = getHostname(scan.seedUrl);
            const fingerprintHash = AMG.AssistiveMapGenerator.computeFingerprintHash(page.pageFingerprint);

            const site = await prisma.site.findUnique({
              where: { domain },
            });

            if (site) {
              const pageVersion = await prisma.pageVersion.findFirst({
                where: {
                  siteId: site.id,
                  canonicalUrl: page.canonicalUrl,
                  fingerprintHash,
                },
                include: {
                  assistiveMap: true,
                },
              });

              if (pageVersion?.assistiveMap) {
                assistiveMapStored = true;
                assistiveMapId = pageVersion.assistiveMap.id;
                storedAt = pageVersion.assistiveMap.createdAt.toISOString();

                const mapJson = pageVersion.assistiveMap.json as any;
                if (mapJson.imageDescriptions) {
                  imageDescriptionsCount = Object.keys(mapJson.imageDescriptions).length;
                }
                if (mapJson.labelOverrides) {
                  labelOverridesCount = Object.keys(mapJson.labelOverrides).length;
                }
                if (mapJson.actionIntents) {
                  actionIntentsCount = Object.keys(mapJson.actionIntents).length;
                }

                // Form Assist Plan summary
                if (mapJson.forms && Array.isArray(mapJson.forms)) {
                  formsCount = mapJson.forms.length;
                  formsFieldsCount = mapJson.forms.reduce((sum: number, f: any) => sum + (f.fields?.length || 0), 0);
                  formsUploadsCount = mapJson.forms.reduce((sum: number, f: any) => sum + (f.uploads?.length || 0), 0);
                  formsActionsCount = mapJson.forms.reduce((sum: number, f: any) => sum + (f.actions?.length || 0), 0);
                }
              }
            }
          } catch (error) {
            // Non-fatal - continue
          }
        }

        // Check if assistive map artifact exists on disk
        const assistiveMapPath = join(pageDir, 'assistive-model.json');
        const assistiveMapArtifactExists = existsSync(assistiveMapPath);

        return {
          pageId: page.id,
          pageNumber: page.pageNumber,
          url: page.url,
          canonicalUrl: page.canonicalUrl,
          finalUrl: page.finalUrl,
          fingerprintHash: page.pageFingerprint
            ? AMG.AssistiveMapGenerator.computeFingerprintHash(page.pageFingerprint)
            : null,
          layer1: {
            htmlStored,
            findingsCount,
          },
          layer2: {
            screenshotStored,
            visionFindingsCount,
            geminiUsed,
          },
          layer3: {
            assistiveMapStored,
            assistiveMapId,
            assistiveMapArtifactExists,
            imageDescriptionsCount,
            labelOverridesCount,
            actionIntentsCount,
            formsCount,
            formsFieldsCount,
            formsUploadsCount,
            formsActionsCount,
            storedAt,
          },
        };
      })
    );

    res.json({
      scanId: scan.scanId,
      createdAt: scan.startedAt.toISOString(),
      status: scan.status,
      storage: {
        outputDir: scanDir,
        hasReportJson,
        hasPagesDir,
      },
      pages: pagesDebug,
    });
  } catch (error) {
    console.error('[SCAN-DEBUG] Error getting scan debug info:', error);
    res.status(500).json({ error: 'Failed to get scan debug information' });
  }
});

/**
 * POST /api/scans/:scanId/cancel
 * Cancel a running or queued scan
 */
router.post('/:scanId/cancel', requireAuth, async (req: Request, res: Response) => {
  try {
    const { scanId } = req.params;

    if (!getJobQueue) {
      return res.status(503).json({ error: 'Job queue not available' });
    }

    const jobQueue = getJobQueue();
    const canceled = await jobQueue.cancelJob(scanId);

    if (canceled) {
      // Persist terminal status immediately so dashboards and PDF export see "canceled"
      // (this route is registered before index.ts duplicates; it is the canonical /api/scans/:id/cancel handler).
      const { scanRepository } = await import('../db/scan-repository.js');
      await scanRepository.updateScanStatus(scanId, 'canceled', new Date());

      // Emit cancel event
      const { scanEventEmitter } = await import('../events/scan-events.js');
      scanEventEmitter.emitEvent(scanId, {
        type: 'scan_canceled',
        scanId,
        timestamp: new Date().toISOString(),
        message: 'Scan canceled by user',
      });

      res.json({ scanId, status: 'canceled', message: 'Scan canceled successfully' });
    } else {
      res.status(404).json({ error: 'Scan not found or cannot be canceled' });
    }
  } catch (error) {
    console.error('Error canceling scan:', error);
    res.status(500).json({ error: 'Failed to cancel scan' });
  }
});

/**
 * DELETE /api/scans/:scanId
 * Delete a scan and all related data (database records + files + assistive maps)
 */
router.delete('/:scanId', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { scanId } = req.params;

    // Get scan with pages to find PageVersions
    // We only need to check if pages exist - PageVersions are found by scanId
    const scan = await prisma.scan.findUnique({
      where: { scanId },
      select: {
        id: true,
        scanId: true,
        pages: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    // Step 1: Delete Assistive Maps linked via PageVersion
    // Find PageVersions created by this scan
    if (scan.pages.length > 0) {
      const pageVersions = await prisma.pageVersion.findMany({
        where: {
          scanId: scan.scanId, // PageVersion.scanId is text, matches Scan.scanId
        },
        include: {
          assistiveMap: true,
        },
      });

      // Delete Assistive Maps
      for (const pv of pageVersions) {
        if (pv.assistiveMap) {
          await prisma.assistiveMap.delete({
            where: { id: pv.assistiveMap.id },
          });
          console.log(`[DELETE] Deleted AssistiveMap ${pv.assistiveMap.id} for PageVersion ${pv.id}`);
        }
      }

      // Delete PageVersions (cascade will handle AssistiveMap, but we already deleted them)
      await prisma.pageVersion.deleteMany({
        where: {
          scanId: scan.scanId,
        },
      });
      console.log(`[DELETE] Deleted ${pageVersions.length} PageVersion(s) for scan ${scanId}`);
    }

    // Step 2: Delete all related database records
    // Prisma will cascade delete Pages, Findings, and VisionFindings when we delete the Scan
    // But let's be explicit for clarity and logging
    const scanDbId = scan.id;

    // Delete VisionFindings
    const visionFindingsDeleted = await prisma.visionFinding.deleteMany({
      where: {
        page: {
          scanId: scanDbId,
        },
      },
    });
    console.log(`[DELETE] Deleted ${visionFindingsDeleted.count} VisionFinding(s)`);

    // Delete AgentFindings
    const agentFindingsDeleted = await prisma.agentFinding.deleteMany({
      where: { scanId: scanDbId },
    });
    console.log(`[DELETE] Deleted ${agentFindingsDeleted.count} AgentFinding(s)`);

    // Delete Findings
    const findingsDeleted = await prisma.finding.deleteMany({
      where: {
        page: {
          scanId: scanDbId,
        },
      },
    });
    console.log(`[DELETE] Deleted ${findingsDeleted.count} Finding(s)`);

    // Delete Pages
    const pagesDeleted = await prisma.page.deleteMany({
      where: {
        scanId: scanDbId,
      },
    });
    console.log(`[DELETE] Deleted ${pagesDeleted.count} Page(s)`);

    // Delete Scan
    await prisma.scan.delete({
      where: { id: scanDbId },
    });
    console.log(`[DELETE] Deleted Scan ${scanId}`);

    // Step 3: Delete output directory files
    const outputDir = resolve(config.outputDir);
    const scanDir = join(outputDir, scanId);

    if (existsSync(scanDir)) {
      try {
        await rm(scanDir, { recursive: true, force: true });
        console.log(`[DELETE] Deleted output directory: ${scanDir}`);
      } catch (error) {
        console.warn(`[DELETE] Failed to delete output directory ${scanDir}:`, error);
        // Don't fail the request if file deletion fails - database is already cleaned
      }
    }

    res.json({
      message: 'Scan deleted successfully',
      deleted: {
        scan: 1,
        pages: pagesDeleted.count,
        findings: findingsDeleted.count,
        visionFindings: visionFindingsDeleted.count,
        agentFindings: agentFindingsDeleted.count,
      },
    });
  } catch (error) {
    console.error('[SCAN-DELETE] Error deleting scan:', error);
    res.status(500).json({ error: 'Failed to delete scan' });
  }
});

export default router;

