import { Router, Request, Response } from 'express';
import { getPrismaClient } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';
import { dbScanToApiResponse } from './db-adapter.js';
import { calculateComplianceScores, aggregateScores, type ComplianceScores } from '../utils/compliance-scoring.js';

const router: Router = Router();

/**
 * GET /api/scans
 * List all scans with optional filters
 * Query params: status, hostname, dateFrom, dateTo, limit, offset
 */
router.get('/scans', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const {
      status,
      hostname,
      dateFrom,
      dateTo,
      limit = '50',
      offset = '0',
    } = req.query;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (hostname) {
      where.hostname = { contains: hostname as string, mode: 'insensitive' };
    }

    // Support entityId filter
    const entityId = req.query.entityId as string | undefined;
    if (entityId) {
      where.entityId = entityId;
    }

    // Support propertyId filter
    const propertyId = req.query.propertyId as string | undefined;
    if (propertyId) {
      where.propertyId = propertyId;
    }

    if (dateFrom || dateTo) {
      where.startedAt = {};
      if (dateFrom) {
        where.startedAt.gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        where.startedAt.lte = new Date(dateTo as string);
      }
    }

    const [scans, total] = await Promise.all([
      prisma.scan.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
        include: {
          pages: {
            select: {
              pageNumber: true,
              url: true,
              title: true,
            },
          },
          _count: {
            select: {
              findings: true,
              visionFindings: true,
            },
          },
        },
      }),
      prisma.scan.count({ where }),
    ]);

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const scansWithSummary = await Promise.all(
      scans.map(async (scan: any) => {
        // Calculate summary from summaryJson if available
        let summary: any = {
          totalPages: scan.pages.length,
          aFailures: 0,
          aaFailures: 0,
        };

        if (scan.summaryJson) {
          const summaryData = scan.summaryJson as any;
          summary = {
            totalPages: scan.pages.length,
            aFailures: summaryData.byLevel?.A?.fail || 0,
            aaFailures: summaryData.byLevel?.AA?.fail || 0,
            needsReview: summaryData.byStatus?.needs_review || 0,
          };
        }

        return {
          scanId: scan.scanId,
          seedUrl: scan.seedUrl,
          status: scan.status,
          startedAt: scan.startedAt.toISOString(),
          completedAt: scan.completedAt?.toISOString(),
          hostname: scan.hostname,
          entityId: scan.entityId,
          propertyId: scan.propertyId,
          entity: scan.entity,
          property: scan.property,
          summary,
        };
      })
    );

    res.json({
      scans: scansWithSummary,
      total,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    });
  } catch (error) {
    console.error('[DASHBOARD] Error fetching scans:', error);
    res.status(500).json({ error: 'Failed to fetch scans' });
  }
});

/**
 * GET /api/sites
 * List all sites with scan statistics
 */
router.get('/sites', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const sites = await prisma.site.findMany({
      include: {
        _count: {
          select: {
            pageVersions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const sitesWithStats = await Promise.all(
      sites.map(async (site: any) => {
        // Get scan count for this site
        const scanCount = await prisma.scan.count({
          where: { hostname: site.domain },
        });

        // Get latest scan
        const latestScan = await prisma.scan.findFirst({
          where: {
            hostname: site.domain,
            status: 'completed',
          },
          orderBy: {
            completedAt: 'desc',
          },
          include: {
            pages: {
              select: {
                pageNumber: true,
              },
            },
            _count: {
              select: {
                findings: true,
              },
            },
          },
        });

        // Calculate issue summary from latest scan using summaryJson
        let issueSummary = { total: 0, critical: 0, important: 0 };
        if (latestScan) {
          const summaryData = latestScan.summaryJson as any;
          const aFails = summaryData?.byLevel?.A?.fail || 0;
          const aaFails = summaryData?.byLevel?.AA?.fail || 0;
          issueSummary = {
            total: latestScan._count.findings,
            critical: aFails,    // Level A failures are most critical
            important: aaFails,  // Level AA failures are important
          };
        }

        return {
          id: site.id,
          domain: site.domain,
          createdAt: site.createdAt.toISOString(),
          lastScan: latestScan
            ? {
              scanId: latestScan.scanId,
              completedAt: latestScan.completedAt?.toISOString(),
              totalPages: latestScan.pages?.length || 0,
              aFailures: (latestScan.summaryJson as any)?.byLevel?.A?.fail || 0,
              aaFailures: (latestScan.summaryJson as any)?.byLevel?.AA?.fail || 0,
            }
            : undefined,
          totalScans: scanCount,
          issueSummary,
        };
      })
    );

    res.json({ sites: sitesWithStats });
  } catch (error) {
    console.error('[DASHBOARD] Error fetching sites:', error);
    res.status(500).json({ error: 'Failed to fetch sites' });
  }
});

/**
 * GET /api/findings
 * List all findings with optional filters
 * Query params: site, scanId, wcagId, status, confidence, limit, offset
 */
router.get('/findings', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const {
      site,
      scanId,
      wcagId,
      status,
      confidence,
      limit = '100',
      offset = '0',
    } = req.query;

    const where: any = {};

    if (scanId) {
      const scan = await prisma.scan.findUnique({
        where: { scanId: scanId as string },
        select: { id: true },
      });
      if (scan) {
        where.scanId = scan.id;
      } else {
        return res.json({ findings: [], total: 0 });
      }
    }

    if (site) {
      const scans = await prisma.scan.findMany({
        where: { hostname: site as string },
        select: { id: true },
      });
      if (scans.length > 0) {
        where.scanId = { in: scans.map((s: any) => s.id) };
      } else {
        return res.json({ findings: [], total: 0 });
      }
    }

    if (wcagId) {
      where.wcagId = wcagId as string;
    }

    if (status) {
      where.status = status;
    }

    if (confidence) {
      where.confidence = confidence;
    }

    const [findings, total] = await Promise.all([
      prisma.finding.findMany({
        where,
        include: {
          scan: {
            select: {
              scanId: true,
              hostname: true,
            },
          },
          page: {
            select: {
              url: true,
              pageNumber: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      }),
      prisma.finding.count({ where }),
    ]);

    const findingsFormatted = findings.map((finding: any) => ({
      id: finding.id,
      ruleId: finding.ruleId,
      wcagId: finding.wcagId,
      level: finding.level,
      status: finding.status,
      confidence: finding.confidence,
      message: finding.message,
      howToVerify: finding.howToVerify,
      evidence: finding.evidenceJson ? (typeof finding.evidenceJson === 'string' ? JSON.parse(finding.evidenceJson) : finding.evidenceJson) : [],
      site: finding.scan.hostname,
      scanId: finding.scan.scanId,
      pageUrl: finding.page?.url,
      pageNumber: finding.page?.pageNumber,
    }));

    res.json({
      findings: findingsFormatted,
      total,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    });
  } catch (error) {
    console.error('[DASHBOARD] Error fetching findings:', error);
    res.status(500).json({ error: 'Failed to fetch findings' });
  }
});

/**
 * GET /api/overview
 * Get dashboard overview statistics and KPIs
 */
router.get('/overview', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    // Get total counts
    const [totalSites, totalScans, totalPages, totalFindings] = await Promise.all([
      prisma.site.count(),
      prisma.scan.count(),
      prisma.page.count(),
      prisma.finding.count(),
    ]);

    // Get WCAG failure counts
    const [aFailures, aaFailures, needsReview, visionFindings] = await Promise.all([
      prisma.finding.count({
        where: {
          level: 'A',
          status: 'fail',
        },
      }),
      prisma.finding.count({
        where: {
          level: 'AA',
          status: 'fail',
        },
      }),
      prisma.finding.count({
        where: {
          status: 'needs_review',
        },
      }),
      prisma.visionFinding.count(),
    ]);

    // Scans over last N days (UTC), then fill every calendar day so charts always have a series
    const scanWindowDays = 90;
    const windowStart = new Date();
    windowStart.setUTCDate(windowStart.getUTCDate() - scanWindowDays);

    const recentScans = await prisma.scan.findMany({
      where: {
        startedAt: {
          gte: windowStart,
        },
      },
      select: {
        startedAt: true,
        status: true,
      },
      orderBy: {
        startedAt: 'asc',
      },
    });

    const scansByDate = new Map<string, number>();
    recentScans.forEach((scan: any) => {
      const date = scan.startedAt.toISOString().split('T')[0];
      scansByDate.set(date, (scansByDate.get(date) || 0) + 1);
    });

    const scansOverTime: Array<{ date: string; count: number }> = [];
    const todayUtc = new Date();
    for (let i = scanWindowDays - 1; i >= 0; i--) {
      const d = new Date(
        Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), todayUtc.getUTCDate() - i)
      );
      const key = d.toISOString().split('T')[0];
      scansOverTime.push({ date: key, count: scansByDate.get(key) || 0 });
    }

    // Chart: open issues per WCAG level (fail + needs_review — matches how scans store Gemini/heuristic output)
    const openIssueStatuses = ['fail', 'needs_review'] as const;
    const [aOpen, aaOpen, aaaOpen, otherOpen] = await Promise.all([
      prisma.finding.count({
        where: { level: 'A', status: { in: [...openIssueStatuses] } },
      }),
      prisma.finding.count({
        where: { level: 'AA', status: { in: [...openIssueStatuses] } },
      }),
      prisma.finding.count({
        where: { level: 'AAA', status: { in: [...openIssueStatuses] } },
      }),
      prisma.finding.count({
        where: {
          status: { in: [...openIssueStatuses] },
          OR: [
            { level: { equals: null } },
            { level: { notIn: ['A', 'AA', 'AAA'] } },
          ],
        },
      }),
    ]);

    const failuresByLevel = [
      { level: 'A', failures: aOpen },
      { level: 'AA', failures: aaOpen },
      { level: 'AAA', failures: aaaOpen },
      { level: 'Other', failures: otherOpen },
    ];

    // Top rules: prefer wcagId; fall back to ruleId when wcagId is null (heuristics, etc.)
    const [topByWcagRaw, topByRuleRaw] = await Promise.all([
      prisma.finding.groupBy({
        by: ['wcagId'],
        where: {
          status: { in: [...openIssueStatuses] },
          wcagId: { not: { equals: null } },
        },
        _count: { wcagId: true },
      }),
      prisma.finding.groupBy({
        by: ['ruleId'],
        where: {
          status: { in: [...openIssueStatuses] },
          wcagId: { equals: null },
        },
        _count: { ruleId: true },
      }),
    ]);
    const topByWcag = [...topByWcagRaw]
      .sort((a, b) => (b._count.wcagId ?? 0) - (a._count.wcagId ?? 0))
      .slice(0, 25);
    const topByRule = [...topByRuleRaw]
      .sort((a, b) => (b._count.ruleId ?? 0) - (a._count.ruleId ?? 0))
      .slice(0, 25);

    const ruleIssueCounts = new Map<string, number>();
    for (const row of topByWcag) {
      if (row.wcagId) {
        ruleIssueCounts.set(row.wcagId, row._count.wcagId);
      }
    }
    for (const row of topByRule) {
      const prev = ruleIssueCounts.get(row.ruleId) ?? 0;
      ruleIssueCounts.set(row.ruleId, prev + row._count.ruleId);
    }

    const topFailingRulesFormatted = Array.from(ruleIssueCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([rule, failures]) => ({ rule, failures }));

    // Top hostnames by open issues — avoid orderBy/take on _count._all (runtime issues on some Prisma/DB combos)
    const issuesByScanRaw = await prisma.finding.groupBy({
      by: ['scanId'],
      where: { status: { in: [...openIssueStatuses] } },
      _count: { _all: true },
    });
    const issuesByScan = [...issuesByScanRaw]
      .sort((a, b) => (b._count._all ?? 0) - (a._count._all ?? 0))
      .slice(0, 100);

    let topAffectedSitesFormatted: Array<{ domain: string; issues: number }> = [];
    if (issuesByScan.length > 0) {
      const scanRows = await prisma.scan.findMany({
        where: { id: { in: issuesByScan.map((r: { scanId: string }) => r.scanId) } },
        select: { id: true, hostname: true },
      });
      const scanIdToHost = new Map<string, string>(
        scanRows.map((s: { id: string; hostname: string }) => [s.id, s.hostname])
      );
      const hostTotals = new Map<string, number>();
      for (const row of issuesByScan) {
        const host = scanIdToHost.get(row.scanId);
        if (!host) continue;
        hostTotals.set(host, (hostTotals.get(host) ?? 0) + row._count._all);
      }
      topAffectedSitesFormatted = Array.from(hostTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([domain, issues]) => ({ domain, issues }));
    }

    res.json({
      kpis: {
        totalSites,
        totalScans,
        pagesScanned: totalPages,
        wcagAFailures: aFailures,
        wcagAAFailures: aaFailures,
        needsReview,
        visionFindings,
      },
      charts: {
        scansOverTime,
        failuresByLevel,
        topFailingRules: topFailingRulesFormatted,
        topAffectedSites: topAffectedSitesFormatted,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[DASHBOARD] Error fetching overview:', message, error);
    res.status(500).json({ error: 'Failed to fetch overview data' });
  }
});

/**
 * GET /api/analytics/widget
 * Get widget usage analytics
 */
router.get('/analytics/widget', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    // Check if WidgetEvent table exists and has data
    let uniqueSessions: any[] = [];
    let widgetOpens = 0;
    let voiceEvents = 0;
    let topPages: any[] = [];
    let dailyUsage: Array<{ date: string; sessions: number; opens: number }> = [];
    let commandUsage: any[] = [];

    try {
      // Get unique sessions from daily aggregates (sum of uniqueSessions)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const dailyAggregates = await prisma.widgetDailyAggregate.findMany({
        where: {
          date: {
            gte: thirtyDaysAgo,
          },
        },
      });

      // Sum unique sessions from aggregates (approximate)
      const totalUniqueSessions = dailyAggregates.reduce((sum: any, agg: any) => sum + agg.uniqueSessions, 0);

      // For display, we'll use the count of distinct pageUrl + date combinations as a proxy
      const pageViewEvents = await prisma.widgetEvent.findMany({
        where: {
          eventType: 'page_view',
        },
        select: {
          pageUrl: true,
          createdAt: true,
        },
      });

      // Group by pageUrl and date to approximate unique sessions
      const sessionSet = new Set<string>();
      pageViewEvents.forEach((event: any) => {
        const date = event.createdAt.toISOString().split('T')[0];
        const key = `${event.pageUrl}_${date}`;
        sessionSet.add(key);
      });

      uniqueSessions = Array.from(sessionSet).map((key) => ({ sessionId: key }));

      // Get widget opens
      widgetOpens = await prisma.widgetEvent.count({
        where: {
          eventType: 'widget_open',
        },
      });

      // Get voice usage
      voiceEvents = await prisma.widgetEvent.count({
        where: {
          eventType: 'voice_enabled',
        },
      });

      // Get top pages
      topPages = await prisma.widgetEvent.groupBy({
        by: ['pageUrl'],
        where: {
          eventType: 'page_view',
        },
        _count: {
          pageUrl: true,
        },
        orderBy: {
          _count: {
            pageUrl: 'desc',
          },
        },
        take: 10,
      });

      // dailyUsage already populated from dailyAggregates above
      dailyUsage = dailyAggregates.map((agg: any) => ({
        date: agg.date.toISOString().split('T')[0],
        sessions: agg.uniqueSessions,
        opens: agg.widgetOpens,
      }));

      // Get command usage distribution
      commandUsage = await prisma.widgetEvent.groupBy({
        by: ['eventType'],
        where: {
          eventType: {
            startsWith: 'command_',
          },
        },
        _count: {
          eventType: true,
        },
        orderBy: {
          _count: {
            eventType: 'desc',
          },
        },
      });
    } catch (dbError) {
      // If tables don't exist or are empty, return empty data
      console.warn('[DASHBOARD] Widget analytics tables may be empty or not exist:', dbError);
    }

    const voiceUsage = uniqueSessions.length > 0
      ? Math.round((voiceEvents / uniqueSessions.length) * 100)
      : 0;

    res.json({
      uniqueSessions: uniqueSessions.length,
      widgetOpens,
      voiceUsage,
      topPages: topPages.map((p) => ({
        url: p.pageUrl || 'unknown',
        count: p._count.pageUrl,
      })),
      dailyUsage,
      commandUsage: commandUsage.map((c) => ({
        command: c.eventType.replace('command_', ''),
        count: c._count.eventType,
      })),
    });
  } catch (error) {
    console.error('[DASHBOARD] Error fetching widget analytics:', error);
    res.status(500).json({ error: 'Failed to fetch widget analytics' });
  }
});

/**
 * GET /api/assistive-maps
 * List all assistive maps
 */
router.get('/assistive-maps', requireAuth, async (req: Request, res: Response) => {
  try {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    // Get all assistive maps with related data
    const assistiveMaps = await prisma.assistiveMap.findMany({
      include: {
        pageVersion: {
          include: {
            site: {
              select: {
                domain: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const mapsFormatted = assistiveMaps.map((map: any) => {
      const confidenceSummary = map.confidenceSummary as any || {
        labelOverrides: { high: 0, medium: 0, low: 0 },
        imageDescriptions: { high: 0, medium: 0, low: 0 },
        actionIntents: { high: 0, medium: 0, low: 0 },
      };

      // Aggregate confidence counts across all categories
      const high = (confidenceSummary.labelOverrides?.high || 0) +
        (confidenceSummary.imageDescriptions?.high || 0) +
        (confidenceSummary.actionIntents?.high || 0);
      const medium = (confidenceSummary.labelOverrides?.medium || 0) +
        (confidenceSummary.imageDescriptions?.medium || 0) +
        (confidenceSummary.actionIntents?.medium || 0);
      const low = (confidenceSummary.labelOverrides?.low || 0) +
        (confidenceSummary.imageDescriptions?.low || 0) +
        (confidenceSummary.actionIntents?.low || 0);

      return {
        id: map.id,
        siteId: map.pageVersion.siteId,
        domain: map.pageVersion.site.domain,
        canonicalUrl: map.pageVersion.canonicalUrl,
        generatedAt: map.pageVersion.generatedAt.toISOString(),
        confidenceSummary: {
          high,
          medium,
          low,
        },
        pageVersionId: map.pageVersionId,
      };
    });

    res.json({ maps: mapsFormatted });
  } catch (error) {
    console.error('[DASHBOARD] Error fetching assistive maps:', error);
    res.status(500).json({ error: 'Failed to fetch assistive maps' });
  }
});

export default router;

