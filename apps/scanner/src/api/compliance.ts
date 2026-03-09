/**
 * Compliance Scoring API Endpoints
 * 
 * Provides compliance scores at Scan, Property, and Entity levels
 */

import { Router, Request, Response } from 'express';
import { getPrismaClient } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';
import { calculateComplianceScores, aggregateScores, type ComplianceScores } from '../utils/compliance-scoring.js';
import { getFindingLevel } from '../utils/wcag-rule-registry.js';

const router: Router = Router();

/**
 * GET /api/compliance/scan/:scanId
 * Get compliance scores for a specific scan
 */
router.get('/scan/:scanId', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { scanId } = req.params;
    const scan = await prisma.scan.findUnique({
      where: { scanId },
      include: {
        pages: {
          select: {
            id: true,
            pageNumber: true,
          },
        },
        findings: {
          select: {
            level: true,
            status: true,
            wcagId: true,
            ruleId: true,
          },
        },
      },
    });

    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    // Convert findings to rule results format
    // Use rule registry to get level from wcagId if level is missing
    const ruleResults = scan.findings.map((f: any) => {
      const level = getFindingLevel(f.wcagId, null, f.level);
      // Normalize status
      let status: 'pass' | 'fail' | 'needs_review' | 'na' = f.status as 'pass' | 'fail' | 'needs_review' | 'na';
      if (!['pass', 'fail', 'needs_review', 'na'].includes(status)) {
        status = 'na'; // Default to na if invalid status
      }
      return {
        level: level === 'Heuristic' || level === 'Review' ? null : level,
        status,
      };
    });

    const scores = calculateComplianceScores(ruleResults);

    res.json({
      scanId: scan.scanId,
      scores,
      pageCount: scan.pages.length,
      disclaimer: 'Scores reflect scanned pages and crawl scope; this is not a certification.',
    });
  } catch (error) {
    console.error('[COMPLIANCE] Error calculating scan scores:', error);
    res.status(500).json({ error: 'Failed to calculate compliance scores' });
  }
});

/**
 * GET /api/compliance/property/:propertyId
 * Get compliance scores for a property (latest scan)
 */
router.get('/property/:propertyId', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { propertyId } = req.params;
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        scans: {
          where: { status: 'completed' },
          orderBy: { completedAt: 'desc' },
          take: 1,
          include: {
            pages: {
              select: { id: true },
            },
            findings: {
              select: {
                level: true,
                status: true,
                wcagId: true,
                ruleId: true,
              },
            },
          },
        },
      },
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (property.scans.length === 0) {
      return res.json({
        propertyId: property.id,
        propertyDomain: property.domain,
        scores: null,
        latestScanId: null,
        message: 'No completed scans found for this property.',
        disclaimer: 'Scores reflect scanned pages and crawl scope; this is not a certification.',
      });
    }

    const latestScan = property.scans[0];
    const ruleResults = latestScan.findings.map((f: any) => {
      const level = getFindingLevel(f.wcagId, f.ruleId, f.level);
      let status: 'pass' | 'fail' | 'needs_review' | 'na' = f.status as 'pass' | 'fail' | 'needs_review' | 'na';
      if (!['pass', 'fail', 'needs_review', 'na'].includes(status)) {
        status = 'na';
      }
      return {
        level: level === 'Heuristic' || level === 'Review' ? null : level,
        status,
      };
    });

    const scores = calculateComplianceScores(ruleResults);

    res.json({
      propertyId: property.id,
      propertyDomain: property.domain,
      scores,
      latestScanId: latestScan.scanId,
      latestScanDate: latestScan.completedAt,
      pageCount: latestScan.pages.length,
      disclaimer: 'Scores reflect scanned pages and crawl scope; this is not a certification.',
    });
  } catch (error) {
    console.error('[COMPLIANCE] Error calculating property scores:', error);
    res.status(500).json({ error: 'Failed to calculate compliance scores' });
  }
});

/**
 * GET /api/compliance/entity/:entityId
 * Get aggregated compliance scores for an entity (across all properties)
 */
router.get('/entity/:entityId', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { entityId } = req.params;
    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
      include: {
        properties: {
          include: {
            scans: {
              where: { status: 'completed' },
              orderBy: { completedAt: 'desc' },
              take: 1, // Latest scan per property
              include: {
                pages: {
                  select: { id: true },
                },
                findings: {
                  select: {
                    level: true,
                    status: true,
                    wcagId: true,
                    ruleId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    // Collect scores from latest scan of each property
    const scanScores: Array<{ scores: ComplianceScores; pageCount: number }> = [];

    for (const property of entity.properties) {
      if (property.scans.length > 0) {
        const latestScan = property.scans[0];
        const ruleResults = latestScan.findings.map((f: any) => {
          const level = getFindingLevel(f.wcagId, f.ruleId, f.level);
          let status: 'pass' | 'fail' | 'needs_review' | 'na' = f.status as 'pass' | 'fail' | 'needs_review' | 'na';
          if (!['pass', 'fail', 'needs_review', 'na'].includes(status)) {
            status = 'na';
          }
          return {
            level: level === 'Heuristic' || level === 'Review' ? null : level,
            status,
          };
        });

        const scores = calculateComplianceScores(ruleResults);
        scanScores.push({
          scores,
          pageCount: latestScan.pages.length,
        });
      }
    }

    if (scanScores.length === 0) {
      return res.json({
        entityId: entity.id,
        entityCode: entity.code,
        scores: null,
        message: 'No completed scans found for any property.',
        disclaimer: 'Scores reflect scanned pages and crawl scope; this is not a certification.',
      });
    }

    // Aggregate scores (weighted by pages scanned)
    const aggregatedScores = aggregateScores(scanScores);

    res.json({
      entityId: entity.id,
      entityCode: entity.code,
      entityName: entity.nameEn,
      scores: aggregatedScores,
      propertyCount: entity.properties.length,
      scannedPropertyCount: scanScores.length,
      totalPagesScanned: scanScores.reduce((sum, s) => sum + s.pageCount, 0),
      disclaimer: 'Scores reflect scanned pages and crawl scope; this is not a certification.',
    });
  } catch (error) {
    console.error('[COMPLIANCE] Error calculating entity scores:', error);
    res.status(500).json({ error: 'Failed to calculate compliance scores' });
  }
});

export default router;

