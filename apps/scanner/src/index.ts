// Load environment variables from .env file
import 'dotenv/config';

import { setDefaultResultOrder } from 'node:dns';
// Prefer IPv4 in Docker/VPS where IPv6 egress can fail while IPv4 works
setDefaultResultOrder('ipv4first');

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { readFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { join, resolve } from 'node:path';
import { existsSync, statSync } from 'node:fs';
import { config } from './config.js';
import { apiKeyAuth, requireAuth } from './middleware/auth.js';
import authRouter from './api/auth.js';
import dashboardRouter from './api/dashboard.js';
import entitiesRouter from './api/entities.js';
import complianceRouter from './api/compliance.js';
import scanDetailRouter, { setJobQueueGetter } from './api/scan-detail.js';
import pdfExportRouter from './api/pdf-export.js';
import excelExportRouter from './api/excel-export.js';
import scanEventsRouter from './api/scan-events.js';
import scannerConfigRouter from './api/scanner-config.js';
import authProfilesRouter from './api/auth-profiles.js';
import usersRouter from './api/users.js';
import settingsRouter from './api/settings.js';
import uploadRouter from './api/upload.js';
import { validateScanRequest } from './middleware/validation.js';
import { auditLogging } from './middleware/audit.js';
import { JobQueue } from './job-queue.js';
import { scanRunToApiResponse } from './api/response-adapter.js';
import { widgetService } from './api/widget-service.js';
import { normalizeUrl } from './crawler/url-utils.js';
import { retentionManager } from './utils/retention.js';
import { scanRepository } from './db/scan-repository.js';
import { disconnectPrisma } from './db/client.js';
import { dbScanToApiResponse } from './api/db-adapter.js';
import { GeminiTranslator } from './api/gemini-translator.js';
import { translationCache } from './api/translation-cache.js';
import { scanEventEmitter } from './events/scan-events.js';
import { z } from 'zod';
import type { ScanRun } from '@raawi-x/core';

const app = express();
const jobQueue = new JobQueue();

function assertAuditModeEnabled(auditMode: unknown): void {
  if (auditMode === 'raawi-agent' && !config.raawi.enabled) {
    throw new Error('Raawi agent mode is currently disabled by configuration.');
  }
}

function enforceProductionSecrets(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const weakJwtSecrets = new Set(['', 'dev-secret-change-in-production']);
  const weakApiKeys = new Set(['', 'dev-api-key-change-in-production']);

  if (weakJwtSecrets.has(config.jwtSecret)) {
    throw new Error('JWT_SECRET must be set to a strong non-default value in production');
  }
  if (weakApiKeys.has(config.apiKey)) {
    throw new Error('API_KEY must be set to a strong non-default value in production');
  }
}

enforceProductionSecrets();

// Coolify/Nginx runs scanner behind a reverse proxy.
// Trust first proxy so rate limiting and client IP detection work correctly.
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS - allow the report UI plus optional widget origins.
// Keep REPORT_UI_ORIGIN in the allow-list even when WIDGET_ORIGINS is configured.
const allowedOrigins = Array.from(
  new Set(
    [
      config.reportUiOrigin,
      ...(process.env.WIDGET_ORIGINS ? process.env.WIDGET_ORIGINS.split(',').map((s) => s.trim()) : []),
      'http://localhost:4173', // test-sites default port
      'http://localhost:4175', // test-sites alternate port
      'http://localhost:3000', // common dev port
    ].filter(Boolean)
  )
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }
      // In development, allow localhost on any port
      if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:')) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-API-Key', 'Authorization'],
    exposedHeaders: ['Content-Type'],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.',
});

// Translation rate limiting (stricter - 50 requests per 15 minutes)
const translationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many translation requests from this IP, please try again later.',
});

// Apply rate limiting to all API routes except auth (auth has its own limiter)
// This prevents rate limiting from blocking legitimate polling during scans
app.use('/api', (req, res, next) => {
  // Skip rate limiting for SSE endpoints (they're long-lived connections)
  if (req.path.includes('/events')) {
    return next();
  }
  // Skip rate limiting for auth endpoints (they have their own limiter)
  if (req.path.startsWith('/auth')) {
    return next();
  }
  limiter(req, res, next);
});

// Audit logging (after rate limiting, before routes)
app.use(auditLogging);

// Body parsing
app.use(express.json({ limit: '10mb' }));

// Health check (no auth required)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes (no auth required for login)
app.use('/api/auth', authRouter);

// Dashboard routes (require auth)
app.use('/api', dashboardRouter);

// Entities routes (require auth)
app.use('/api/entities', entitiesRouter);

// Compliance scoring routes (require auth)
app.use('/api/compliance', complianceRouter);

// Scan detail routes (require auth)
// Set job queue getter for scan-detail router
setJobQueueGetter(() => jobQueue);

app.use('/api/scans', scanDetailRouter);

// Scan events routes (SSE, require auth)
app.use('/api', scanEventsRouter);

// Scanner config routes (no auth - safe values only)
app.use('/api', scannerConfigRouter);

// Auth profiles routes (require auth)
app.use('/api', authProfilesRouter);

// Users routes (require auth + admin)
app.use('/api', usersRouter);

// Settings routes (require auth)
app.use('/api', settingsRouter);

// PDF export routes (require auth)
app.use('/api/reports', pdfExportRouter);

// Excel export routes (require auth)
app.use('/api/scans', excelExportRouter);

// Upload routes (require auth)
app.use('/api/upload', uploadRouter);

// Serve uploaded files (static)
app.use('/uploads', express.static(resolve('uploads')));

// API routes (require auth for dashboard, apiKeyAuth for external)
// Dashboard scan endpoint (requires JWT auth)
// If scanId is provided in body, it means we're starting an existing scan (from discovery phase)
// Otherwise, create a new scan job
app.post('/api/scans/start', requireAuth, validateScanRequest, async (req, res) => {
  try {
    const requestBody = req.body as any;
    const existingScanId = requestBody.scanId;
    assertAuditModeEnabled(requestBody.auditMode);

    let scanId: string;

    if (existingScanId) {
      // Starting an existing scan (from discovery phase)
      // Update the scan record and add job to queue
      scanId = existingScanId;
      console.log('[API] Starting existing scan:', {
        scanId,
        hasSelectedUrls: !!requestBody.selectedUrls,
        selectedUrlsCount: requestBody.selectedUrls?.length || 0,
        selectedUrls: requestBody.selectedUrls,
        fullBody: requestBody
      });

      // Check if scan exists in database
      const { getPrismaClient } = await import('./db/client.js');
      const prisma = await getPrismaClient();
      if (prisma) {
        const existingScan = await prisma.scan.findUnique({
          where: { scanId },
        });

        if (!existingScan) {
          res.status(404).json({ error: 'Scan not found. Please start discovery first.' });
          return;
        }

        // Update scan status to queued
        await prisma.scan.update({
          where: { scanId },
          data: {
            status: 'queued',
            auditMode: requestBody.auditMode === 'raawi-agent' ? 'raawi-agent' : 'classic',
            updatedAt: new Date(),
          },
        });
      }

      // Add job to queue (this will start the scan)
      await jobQueue.addJobForExistingScan(scanId, req.body);
    } else {
      // Creating a new scan (legacy flow)
      scanId = await jobQueue.addJob(req.body);
    }

    const isDryRun = requestBody.dryRun || false;
    res.status(202).json({
      scanId,
      status: isDryRun ? 'completed' : 'accepted',
      message: isDryRun ? 'Dry run validation completed' : 'Scan job queued',
    });
  } catch (error) {
    console.error('Error queuing scan:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to queue scan',
    });
  }
});

// External scan endpoint (requires API key)
app.post('/api/scan', apiKeyAuth, validateScanRequest, async (req, res) => {
  try {
    const scanId = await jobQueue.addJob(req.body);
    const isDryRun = (req.body as any).dryRun || false;
    res.status(202).json({
      scanId,
      status: isDryRun ? 'completed' : 'accepted',
      message: isDryRun ? 'Dry run validation completed' : 'Scan job queued',
    });
  } catch (error) {
    console.error('Error queuing scan:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to queue scan',
    });
  }
});

// Initialize scan endpoint (creates scan record without starting job)
app.post('/api/scans/:scanId/init', requireAuth, async (req, res) => {
  try {
    const { scanId } = req.params;
    const { seedUrl, entityId, propertyId, maxPages = 25, maxDepth = 5, auditMode = 'classic' } = req.body;
    assertAuditModeEnabled(auditMode);

    if (!seedUrl) {
      res.status(400).json({ error: 'seedUrl is required' });
      return;
    }

    // Create scan record with 'discovering' status (not queued - won't start automatically)
    const { scanRepository } = await import('./db/scan-repository.js');
    const { getHostname } = await import('./crawler/url-utils.js');

    const hostname = getHostname(seedUrl);
    const boundedMaxPages = Math.min(maxPages || 25, config.quotas.maxPagesHardLimit);
    const boundedMaxDepth = Math.min(maxDepth || 5, config.quotas.maxDepthHardLimit);
    try {
      await scanRepository.createScan(
        scanId,
        seedUrl,
        boundedMaxPages,
        boundedMaxDepth,
        hostname,
        entityId,
        propertyId,
        auditMode === 'raawi-agent' ? 'raawi-agent' : 'classic'
      );
    } catch (createError: any) {
      // Idempotency: if the same scanId is initialized twice, continue with existing record.
      if (createError?.code !== 'P2002') {
        throw createError;
      }
      console.warn(`[API] Duplicate init ignored for scanId=${scanId}`);
    }

    // Update status to 'discovering' (not queued - won't trigger job processing)
    await scanRepository.updateScanStatus(scanId, 'discovering', undefined);

    res.status(200).json({
      scanId,
      status: 'discovering',
      message: 'Scan initialized for discovery',
    });
  } catch (error) {
    console.error('Error initializing scan:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to initialize scan',
    });
  }
});

// Discovery endpoint (Phase 1: Discover pages only, no scanning)
app.post('/api/scans/:scanId/discover', requireAuth, async (req, res) => {
  try {
    const { scanId } = req.params;
    const { seedUrl, maxPages = 25, maxDepth = 5, includePatterns, excludePatterns, seedUrls, sitemapUrl, scanMode = 'domain' } = req.body; // Increased default depth for better discovery

    if (!seedUrl) {
      res.status(400).json({ error: 'seedUrl is required' });
      return;
    }

    const effectiveMaxPages = Math.min(maxPages, config.quotas.maxPagesHardLimit);
    const effectiveMaxDepth = Math.min(maxDepth, config.quotas.maxDepthHardLimit);
    const includeCount = Array.isArray(includePatterns) ? includePatterns.length : 0;
    const excludeCount = Array.isArray(excludePatterns) ? excludePatterns.length : 0;
    console.log(
      `[DISCOVERY] Request scanId=${scanId} seedUrl=${seedUrl} scanMode=${scanMode} ` +
        `maxPages=${effectiveMaxPages} (requested ${maxPages}, cap ${config.quotas.maxPagesHardLimit}) ` +
        `maxDepth=${effectiveMaxDepth} (requested ${maxDepth}, cap ${config.quotas.maxDepthHardLimit}) ` +
        `includePatterns=${includeCount} excludePatterns=${excludeCount}`
    );

    // Import PageDiscovery
    const { PageDiscovery } = await import('./crawler/page-discovery.js');

    const discovery = new PageDiscovery(
      seedUrl,
      effectiveMaxPages,
      effectiveMaxDepth,
      includePatterns,
      excludePatterns,
      scanId,
      scanMode as 'domain' | 'single' // Pass scan mode to discovery
    );

    // Start discovery in background (non-blocking)
    // IMPORTANT: This does NOT create a scan job - it only discovers pages
    discovery.discover().catch((error) => {
      console.error(`[DISCOVERY] Discovery failed for ${scanId}:`, error);
      scanEventEmitter.emitEvent(scanId, {
        type: 'error',
        scanId,
        message: `Discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      });
    });

    res.status(202).json({
      scanId,
      status: 'discovering',
      message: 'Discovery started',
    });
  } catch (error) {
    console.error('Error starting discovery:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to start discovery',
    });
  }
});

// POST /api/scans/:scanId/cancel is handled by scan-detail router (updates DB + job queue).

// Legacy cancel endpoint (for API key auth)
app.post('/api/scan/:id/cancel', apiKeyAuth, async (req, res) => {
  const scanId = req.params.id;

  // Sanitize scanId
  if (!/^scan_[a-zA-Z0-9_-]+$/.test(scanId)) {
    res.status(400).json({ error: 'Invalid scan ID' });
    return;
  }

  try {
    const canceled = await jobQueue.cancelJob(scanId);

    // Also update database status
    const { scanRepository } = await import('./db/scan-repository.js');
    await scanRepository.updateScanStatus(scanId, 'canceled', new Date());

    if (canceled) {
      res.json({ scanId, status: 'canceled', message: 'Scan canceled successfully' });
    } else {
      res.json({ scanId, status: 'canceled', message: 'Scan marked as canceled' });
    }
  } catch (error) {
    console.error('Error canceling scan:', error);
    res.status(500).json({ error: 'Failed to cancel scan' });
  }
});

app.get('/api/scan/:id', apiKeyAuth, async (req, res) => {
  const scanId = req.params.id;

  // Sanitize scanId to prevent path traversal
  if (!/^scan_[a-zA-Z0-9_-]+$/.test(scanId)) {
    res.status(400).json({ error: 'Invalid scan ID' });
    return;
  }

  const reportPath = join(config.outputDir, scanId, 'report.json');
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  try {
    // Always try to read from report.json first (source of truth)
    if (existsSync(reportPath)) {
      const reportData = await readFile(reportPath, 'utf-8');
      const scanRun: ScanRun = JSON.parse(reportData);

      // Convert to unified API response
      const response = scanRunToApiResponse(scanRun, baseUrl);
      res.json(response);
      return;
    }

    // If report.json doesn't exist, check job queue for in-progress scans
    const job = jobQueue.getJob(scanId);

    if (!job) {
      res.status(404).json({ error: 'Scan not found' });
      return;
    }

    // For queued/running scans, return minimal status
    if (job.status === 'queued' || job.status === 'running') {
      const seedUrl = job.request.seedUrl || job.request.url || 'unknown';
      const response: any = {
        scanId: job.id,
        seedUrl,
        status: job.status,
        startedAt: job.startedAt,
        summary: {
          totalPages: 0,
          totalRules: 0,
          aFailures: 0,
          aaFailures: 0,
          needsReview: 0,
          byStatus: { pass: 0, fail: 0, needs_review: 0, na: 0 },
        },
        pages: [],
        findings: [],
      };

      // If we have partial results, include them
      if (job.scanRun) {
        response.summary.totalPages = job.scanRun.pages?.length || 0;
        if (job.scanRun.summary) {
          response.summary.aFailures = job.scanRun.summary.byLevel.A.fail;
          response.summary.aaFailures = job.scanRun.summary.byLevel.AA.fail;
          response.summary.needsReview = job.scanRun.summary.byStatus.needs_review;
          response.summary.byStatus = job.scanRun.summary.byStatus;
        }

        // Convert partial scanRun to response format
        const partialResponse = scanRunToApiResponse(job.scanRun, baseUrl);
        response.pages = partialResponse.pages;
        response.findings = partialResponse.findings;
      }

      res.json(response);
      return;
    }

    // If job is completed/failed but report.json doesn't exist, that's an error
    res.status(500).json({ error: 'Scan result not available - report.json not found' });
  } catch (error) {
    console.error('Error reading scan result:', error);
    res.status(500).json({ error: 'Failed to read scan result' });
  }
});

// Serve raw report.json (canonical format)
// This endpoint returns the exact ScanRun structure from report.json
app.get('/api/scan/:id/report', apiKeyAuth, async (req, res) => {
  const scanId = req.params.id;
  const reportPath = join(config.outputDir, scanId, 'report.json');

  // Sanitize scanId to prevent path traversal
  if (!/^scan_[a-zA-Z0-9_-]+$/.test(scanId)) {
    res.status(400).json({ error: 'Invalid scan ID' });
    return;
  }

  try {
    if (!existsSync(reportPath)) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    const reportData = await readFile(reportPath, 'utf-8');
    res.json(JSON.parse(reportData));
  } catch (error) {
    console.error('Error reading report:', error);
    res.status(500).json({ error: 'Failed to read report' });
  }
});

// Serve screenshots and other artifacts
// Use a catch-all route pattern
// Support both API key (for external) and JWT (for dashboard)
app.get('/api/scan/:id/artifact/*', async (req, res, next) => {
  // Try JWT first (for dashboard), fallback to API key (for external)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Use JWT auth middleware
    requireAuth(req as any, res, next);
  } else {
    // Use API key auth middleware
    apiKeyAuth(req, res, next);
  }
}, async (req, res) => {
  const scanId = req.params.id;
  // Use pathname only (req.url can include query string; some proxies alter req.url)
  const pathname = (typeof req.path === 'string' && req.path.length > 0 ? req.path : req.url.split('?')[0]) || '';
  const match = pathname.match(/\/artifact\/(.+)$/);
  const artifactPath = match ? match[1] : '';

  // Sanitize scanId and artifactPath
  if (!/^scan_[a-zA-Z0-9_-]+$/.test(scanId)) {
    res.status(400).json({ error: 'Invalid scan ID' });
    return;
  }

  // Prevent path traversal in artifact path
  if (artifactPath.includes('..') || artifactPath.startsWith('/')) {
    res.status(400).json({ error: 'Invalid artifact path' });
    return;
  }

  const fullPath = join(config.outputDir, scanId, artifactPath);
  const resolvedPath = resolve(fullPath);

  // Ensure path is within output directory
  if (!resolvedPath.startsWith(resolve(config.outputDir))) {
    res.status(400).json({ error: 'Invalid artifact path' });
    return;
  }

  try {
    if (!existsSync(resolvedPath)) {
      res.status(404).json({ error: 'Artifact not found' });
      return;
    }

    // Determine content type
    if (resolvedPath.endsWith('.png')) {
      res.type('image/png');
    } else if (resolvedPath.endsWith('.html')) {
      res.type('text/html');
    } else if (resolvedPath.endsWith('.json')) {
      res.type('application/json');
    }

    // SECURITY: Add Cache-Control: no-store to prevent caching of artifacts
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    // Stream large files instead of loading into memory
    // For files > 5MB, use streaming to avoid memory issues
    const fileStats = statSync(resolvedPath);
    const fileSizeMB = fileStats.size / (1024 * 1024);

    if (fileSizeMB > 5) {
      // Stream large files
      const stream = createReadStream(resolvedPath);
      stream.on('error', (err) => {
        console.error('Error streaming artifact:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to read artifact' });
        }
      });
      stream.pipe(res);
    } else {
      // For smaller files, read into memory (faster for small files)
      const fileData = await readFile(resolvedPath);
      res.send(fileData);
    }
  } catch (error) {
    console.error('Error reading artifact:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to read artifact' });
    }
  }
});

// Widget endpoints (read-only, no auth required for public widget)
// GET /api/widget/guidance?url=...&scanId=...&lang=en
app.get('/api/widget/guidance', async (req, res) => {
  try {
    const url = req.query.url as string;
    const scanId = req.query.scanId as string | undefined;
    const lang = (req.query.lang as string) || 'en';

    if (!url) {
      res.status(400).json({ error: 'url parameter is required' });
      return;
    }

    // Get guidance (URL resolution happens inside service)
    const guidance = await widgetService.getPageGuidance(url, scanId);

    if (!guidance) {
      res.status(404).json({ error: 'Page guidance not found. This page may not have been scanned yet.' });
      return;
    }

    // Translate if needed (simplified - in production, use proper i18n)
    if (lang === 'ar') {
      // Basic Arabic translations (simplified)
      guidance.summary = translateToArabic(guidance.summary);
      guidance.landmarks = guidance.landmarks.map((l) => ({
        ...l,
        label: l.label ? translateToArabic(l.label) : undefined,
        description: l.description ? translateToArabic(l.description) : undefined,
      }));
      guidance.formSteps = guidance.formSteps.map((step) => ({
        ...step,
        label: translateToArabic(step.label),
        description: step.description ? translateToArabic(step.description) : undefined,
        fields: step.fields.map((f) => ({
          ...f,
          label: f.label ? translateToArabic(f.label) : undefined,
          description: f.description ? translateToArabic(f.description) : undefined,
        })),
      }));
      guidance.keyActions = guidance.keyActions.map((action) => ({
        ...action,
        label: translateToArabic(action.label),
        description: action.description ? translateToArabic(action.description) : undefined,
      }));
    }

    res.json(guidance);
  } catch (error) {
    console.error('Error fetching page guidance:', error);
    res.status(500).json({ error: 'Failed to fetch page guidance' });
  }
});

// GET /api/widget/issues?url=...&scanId=...&lang=en
app.get('/api/widget/issues', async (req, res) => {
  try {
    const url = req.query.url as string;
    const scanId = req.query.scanId as string | undefined;
    const lang = (req.query.lang as string) || 'en';

    if (!url) {
      res.status(400).json({ error: 'url parameter is required' });
      return;
    }

    // Get issues (URL resolution happens inside service)
    const issues = await widgetService.getPageIssues(url, scanId);

    if (!issues) {
      res.status(404).json({ error: 'Page issues not found. This page may not have been scanned yet.' });
      return;
    }

    // Translate if needed
    if (lang === 'ar') {
      issues.issues = issues.issues.map((issue) => ({
        ...issue,
        title: translateToArabic(issue.title),
        description: translateToArabic(issue.description),
        userImpact: translateToArabic(issue.userImpact),
        howToFix: issue.howToFix ? translateToArabic(issue.howToFix) : undefined,
      }));
    }

    res.json(issues);
  } catch (error) {
    console.error('Error fetching page issues:', error);
    res.status(500).json({ error: 'Failed to fetch page issues' });
  }
});

// GET /api/widget/config?scanId=...&domain=...
app.get('/api/widget/config', async (req, res) => {
  try {
    const scanId = req.query.scanId as string | undefined;
    const domain = req.query.domain as string | undefined;

    // Feature flags (can be extended)
    const featureFlags = {
      textSize: true,
      lineSpacing: true,
      contrastMode: true,
      focusHighlight: true,
      readingMode: true,
      pageGuidance: true,
      knownIssues: true,
      translation: GeminiTranslator.isEnabled(),
    };

    const config = {
      scanId,
      domain,
      language: (req.query.lang as string) || 'en',
      featureFlags,
      apiUrl: `${req.protocol}://${req.get('host')}`,
    };

    res.json(config);
  } catch (error) {
    console.error('Error fetching widget config:', error);
    res.status(500).json({ error: 'Failed to fetch widget config' });
  }
});

// Translation request schema
const translateSchema = z.object({
  text: z.string().min(1).max(10000), // Max 10k chars before truncation
  targetLang: z.enum(['ar', 'en']),
  sourceLang: z.enum(['ar', 'en']).optional(),
});

// POST /api/widget/translate
// Body: { text: string, targetLang: "ar"|"en", sourceLang?: string }
app.post('/api/widget/translate', translationLimiter, async (req, res) => {
  try {
    // Check if AI translation is enabled
    if (!GeminiTranslator.isEnabled()) {
      res.status(501).json({ error: 'Translation is disabled. Set OPENAI_ENABLED=true and OPENAI_API_KEY to enable.' });
      return;
    }

    // Validate input with zod
    const validationResult = translateSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.errors
      });
      return;
    }

    const { text, targetLang, sourceLang } = validationResult.data;

    // Truncate text to maxChars
    const maxChars = config.openai.maxChars;
    const truncatedText = text.length > maxChars ? text.substring(0, maxChars) : text;

    // Check cache
    const textHash = GeminiTranslator.hashText(truncatedText, targetLang);
    const cached = translationCache.get(textHash, targetLang);

    if (cached) {
      res.json({ translatedText: cached });
      return;
    }

    // Translate using OpenAI
    const translator = new GeminiTranslator();
    const translatedText = await translator.translate(truncatedText, targetLang, sourceLang);

    // Cache result
    translationCache.set(textHash, targetLang, translatedText);

    res.json({ translatedText });
  } catch (error) {
    console.error('Error translating text:', error);
    res.status(500).json({
      error: 'Failed to translate text',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/widget/icon - Serve widget icon from server
app.get('/api/widget/icon', async (req, res) => {
  try {
    // Try to find icon in multiple locations
    const iconPaths = [
      join(process.cwd(), 'apps', 'widget', 'dist', 'RaawixIcon.png'),
      join(process.cwd(), 'apps', 'widget', 'public', 'RaawixIcon.png'),
      join(process.cwd(), 'apps', 'widget', 'RaawixIcon.png'),
      join(process.cwd(), 'RaawixIcon.png'),
    ];

    let iconPath: string | null = null;
    for (const path of iconPaths) {
      if (existsSync(path)) {
        iconPath = path;
        break;
      }
    }

    if (!iconPath) {
      res.status(404).json({ error: 'Widget icon not found' });
      return;
    }

    // Set appropriate headers
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // Cache for 1 year
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS for widget

    // Stream the file
    const fileStream = createReadStream(iconPath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error serving widget icon:', error);
    res.status(500).json({ error: 'Failed to serve widget icon' });
  }
});

// GET /api/widget/page-package?url=...&entityCode=... (or siteId/domain for legacy)
app.get('/api/widget/page-package', async (req, res) => {
  try {
    const url = req.query.url as string;
    const entityCode = req.query.entityCode as string | undefined;
    const siteId = req.query.siteId as string | undefined; // Legacy support
    const domain = req.query.domain as string | undefined; // Legacy support

    if (!url) {
      res.status(400).json({ error: 'url parameter is required' });
      return;
    }

    // Import services
    const { assistiveMapRepository } = await import('./db/assistive-map-repository.js');
    const { computeCanonicalUrl, getHostname } = await import('./crawler/url-utils.js');
    const { getPrismaClient } = await import('./db/client.js');
    const prisma = await getPrismaClient();

    let requestDomain: string;
    let property: any = null;
    let entity: any = null;
    let latestScan: any = null;

    // NEW: Resolve by entityCode
    if (entityCode && prisma) {
      // Find entity by code
      entity = await prisma.entity.findUnique({
        where: { code: entityCode },
        include: {
          properties: true,
        },
      });

      if (!entity) {
        res.status(404).json({ error: 'Entity not found for code: ' + entityCode });
        return;
      }

      // Resolve property by matching request domain to Property.domain
      requestDomain = getHostname(url);
      property = entity.properties.find((p: any) =>
        p.domain === requestDomain ||
        url.includes(p.domain) ||
        requestDomain.includes(p.domain)
      );

      if (!property) {
        res.status(404).json({
          error: 'Property not found for domain: ' + requestDomain,
          hint: 'Ensure the scanned domain matches a Property.domain for this entity'
        });
        return;
      }

      // Get latest completed scan for this property
      latestScan = await prisma.scan.findFirst({
        where: {
          propertyId: property.id,
          status: 'completed',
        },
        orderBy: { completedAt: 'desc' },
        select: {
          scanId: true,
          completedAt: true,
          summaryJson: true,
        },
      });
    } else {
      // Legacy: Use domain or siteId
      requestDomain = domain || getHostname(url);
    }

    const canonicalUrl = computeCanonicalUrl(url);

    // Find page version (prefer scan-based lookup if we have latestScan)
    let pageVersionMatch: any = null;
    if (latestScan && prisma) {
      // Try to find page version from the latest scan
      const scan = await prisma.scan.findUnique({
        where: { scanId: latestScan.scanId },
        include: {
          pages: {
            where: {
              OR: [
                { url: canonicalUrl },
                { canonicalUrl: canonicalUrl },
                { finalUrl: url },
              ],
            },
            take: 1,
          },
        },
      });

      if (scan && scan.pages.length > 0) {
        const page = scan.pages[0];
        // Find PageVersion for this page
        const site = await prisma.site.findFirst({
          where: { domain: requestDomain },
        });

        if (site) {
          const pageVersion = await prisma.pageVersion.findFirst({
            where: {
              siteId: site.id,
              canonicalUrl: page.canonicalUrl || canonicalUrl,
            },
            include: {
              assistiveMap: true,
            },
          });

          if (pageVersion) {
            pageVersionMatch = {
              pageVersionId: pageVersion.id,
              matchedUrl: pageVersion.canonicalUrl,
              matchConfidence: 'high' as const,
            };
          }
        }
      }
    }

    // Fallback to URL-based lookup
    if (!pageVersionMatch) {
      pageVersionMatch = await assistiveMapRepository.findPageVersionByUrl(
        requestDomain,
        url,
        canonicalUrl
      );
    }

    if (!pageVersionMatch) {
      res.status(404).json({
        error: 'Page package not found. This page may not have been scanned yet.',
        entityCode: entityCode || null,
        propertyDomain: property?.domain || null,
      });
      return;
    }

    // Get assistive map
    const assistiveMapData = await assistiveMapRepository.getAssistiveMap(pageVersionMatch.pageVersionId);

    // Get guidance (use latestScan.scanId if available)
    const scanIdForGuidance = latestScan?.scanId || undefined;
    const guidance = await widgetService.getPageGuidance(url, scanIdForGuidance);

    // Get issues summary
    const issues = await widgetService.getPageIssues(url, scanIdForGuidance);
    const issuesSummary = issues ? {
      total: issues.issues.length,
      critical: issues.issues.filter(i => i.severity === 'critical').length,
      important: issues.issues.filter(i => i.severity === 'important').length,
    } : { total: 0, critical: 0, important: 0 };

    // Get page version details
    let pageVersion: any = null;
    if (prisma) {
      pageVersion = await prisma.pageVersion.findUnique({
        where: { id: pageVersionMatch.pageVersionId },
        include: { site: true },
      });
    }

    // Build response
    const response: any = {
      siteId: pageVersion?.siteId || null,
      entityId: entity?.id || null,
      entityCode: entity?.code || null,
      propertyId: property?.id || null,
      propertyDomain: property?.domain || null,
      url,
      matchedUrl: pageVersionMatch.matchedUrl,
      matchConfidence: pageVersionMatch.matchConfidence,
      generatedAt: pageVersion?.generatedAt || null,
      fingerprint: guidance?.pageFingerprint || null,
      assistiveMap: assistiveMapData?.map || null,
      confidenceSummary: assistiveMapData?.confidenceSummary || null,
      guidance: guidance ? {
        summary: guidance.summary,
        landmarks: guidance.landmarks,
        formSteps: guidance.formSteps,
        keyActions: guidance.keyActions,
      } : null,
      issuesSummary,
      scanTimestamp: latestScan?.completedAt?.toISOString() || guidance?.scanTimestamp || null,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching page package:', error);
    res.status(500).json({ error: 'Failed to fetch page package' });
  }
});

// Simple translation helper (simplified - in production, use proper i18n library)
function translateToArabic(text: string): string {
  // This is a placeholder - in production, use a proper translation service
  // For MVP, return English text with note that translation is needed
  return text; // TODO: Implement proper Arabic translation
}

// Error handling
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await disconnectPrisma();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await disconnectPrisma();
  process.exit(0);
});

// Start server
app.listen(config.port, () => {
  console.log(`Scanner API server running on port ${config.port}`);
  console.log(`Report UI origin: ${config.reportUiOrigin}`);
  console.log(`Max concurrent scans: ${config.maxConcurrentScans}`);
  console.log(`Scan retention: ${config.retention.enabled ? `${config.retention.days} days` : 'disabled'}`);
  console.log(`Database: ${config.database.enabled ? 'enabled' : 'disabled'}`);

  // Run initial retention cleanup on startup
  if (config.retention.enabled) {
    retentionManager.cleanupOldScans().catch((error) => {
      console.error('Initial retention cleanup failed:', error);
    });
  }
});
