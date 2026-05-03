import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { config } from '../config.js';
import { ReportGenerator } from '../runner/report-generator.js';
import { normalizeUrl, computeCanonicalUrl, getHostname } from '../crawler/url-utils.js';
import { extractPageGuidance, extractPageIssues, type PageGuidance, type PageIssues } from './widget-guidance.js';
import { widgetCache } from './widget-cache.js';
import { resolvePageByUrl, type PageMatch } from './url-resolver.js';
import type { ScanRun, PageArtifact } from '@raawi-x/core';

export class WidgetService {
  private reportGenerator: ReportGenerator;

  constructor() {
    this.reportGenerator = new ReportGenerator(config.outputDir);
  }

  /**
   * Get page guidance by URL (with resolution and match metadata)
   * @param requestUrl The URL from widget (may have query params, hash, etc.)
   * @param scanId Optional scan ID to search in specific scan. Use "latest" to find most recent scan for domain.
   */
  async getPageGuidance(requestUrl: string, scanId?: string): Promise<PageGuidance | null> {
    // Check cache first (by normalized URL)
    const normalizedUrl = normalizeUrl(requestUrl);
    const cached = widgetCache.getGuidance(normalizedUrl);
    if (cached) {
      return cached;
    }

    // If scanId is "latest", resolve most recent scan for this domain
    if (scanId === 'latest') {
      const latestScanId = await this.findLatestScanForDomain(requestUrl);
      if (latestScanId) {
        const guidance = await this.getGuidanceFromScan(latestScanId, requestUrl);
        if (guidance) {
          widgetCache.setGuidance(normalizedUrl, guidance);
          return guidance;
        }
      }
      // If no scan found for domain, return null (widget will fall back to DOM-only)
      return null;
    }

    // If scanId provided, search in that scan
    if (scanId) {
      const guidance = await this.getGuidanceFromScan(scanId, requestUrl);
      if (guidance) {
        widgetCache.setGuidance(normalizedUrl, guidance);
        return guidance;
      }
    }

    // Otherwise, search in most recent completed scan
    const guidance = await this.findGuidanceInRecentScans(requestUrl);
    if (guidance) {
      widgetCache.setGuidance(normalizedUrl, guidance);
      return guidance;
    }

    return null;
  }

  /**
   * Get known issues for a page by URL (with resolution and match metadata)
   * @param requestUrl The URL from widget (may have query params, hash, etc.)
   * @param scanId Optional scan ID to search in specific scan. Use "latest" to find most recent scan for domain.
   */
  async getPageIssues(requestUrl: string, scanId?: string): Promise<PageIssues | null> {
    // Check cache first (by normalized URL)
    const normalizedUrl = normalizeUrl(requestUrl);
    const cached = widgetCache.getIssues(normalizedUrl);
    if (cached) {
      return cached;
    }

    // If scanId is "latest", resolve most recent scan for this domain
    if (scanId === 'latest') {
      const latestScanId = await this.findLatestScanForDomain(requestUrl);
      if (latestScanId) {
        const issues = await this.getIssuesFromScan(latestScanId, requestUrl);
        if (issues) {
          widgetCache.setIssues(normalizedUrl, issues);
          return issues;
        }
      }
      // If no scan found for domain, return null (widget will fall back to DOM-only)
      return null;
    }

    // If scanId provided, search in that scan
    if (scanId) {
      const issues = await this.getIssuesFromScan(scanId, requestUrl);
      if (issues) {
        widgetCache.setIssues(normalizedUrl, issues);
        return issues;
      }
    }

    // Otherwise, search in most recent completed scan
    const issues = await this.findIssuesInRecentScans(requestUrl);
    if (issues) {
      widgetCache.setIssues(normalizedUrl, issues);
      return issues;
    }

    return null;
  }

  /**
   * Get guidance from specific scan with URL resolution
   */
  private async getGuidanceFromScan(scanId: string, requestUrl: string): Promise<PageGuidance | null> {
    try {
      const reportPath = join(config.outputDir, scanId, 'report.json');
      if (!existsSync(reportPath)) {
        return null;
      }

      const reportData = await readFile(reportPath, 'utf-8');
      const scanRun: ScanRun = JSON.parse(reportData);

      // Convert pages to PageArtifact format for URL resolution
      const pages: PageArtifact[] = scanRun.pages.map((p) => ({
        pageNumber: p.pageNumber,
        url: p.url,
        title: p.title,
        finalUrl: p.finalUrl,
        canonicalUrl: p.canonicalUrl,
        pageFingerprint: p.pageFingerprint,
        htmlPath: p.htmlPath,
        screenshotPath: p.screenshotPath,
        a11yPath: p.a11yPath,
        semanticPath: p.semanticPath,
        visionPath: p.visionPath,
        metadataPath: p.metadataPath,
      }));

      // Resolve page using multiple matching strategies
      const match = resolvePageByUrl(requestUrl, pages);

      if (!match) {
        return null;
      }

      const page = match.page;
      if (!page.htmlPath) {
        return null;
      }

      // Load HTML from file
      const html = await readFile(page.htmlPath, 'utf-8');
      const pageWithHtml = { ...page, html };

      // Find rule results for this page
      const ruleResults = scanRun.results.find((r) => r.pageNumber === page.pageNumber);

      // Extract guidance
      const guidance = await extractPageGuidance(pageWithHtml, ruleResults, scanId);

      if (!guidance) {
        return null;
      }

      // Add match metadata
      guidance.matchedUrl = match.matchedUrl;
      guidance.matchConfidence = match.matchConfidence;
      guidance.scanTimestamp = {
        startedAt: scanRun.startedAt,
        completedAt: scanRun.completedAt,
      };
      guidance.pageFingerprint = page.pageFingerprint;

      return guidance;
    } catch (error) {
      console.error('Failed to get guidance from scan:', error);
      return null;
    }
  }

  /**
   * Get issues from specific scan with URL resolution
   */
  private async getIssuesFromScan(scanId: string, requestUrl: string): Promise<PageIssues | null> {
    try {
      const reportPath = join(config.outputDir, scanId, 'report.json');
      if (!existsSync(reportPath)) {
        return null;
      }

      const reportData = await readFile(reportPath, 'utf-8');
      const scanRun: ScanRun = JSON.parse(reportData);

      // Convert pages to PageArtifact format for URL resolution
      const pages: PageArtifact[] = scanRun.pages.map((p) => ({
        pageNumber: p.pageNumber,
        url: p.url,
        title: p.title,
        finalUrl: p.finalUrl,
        canonicalUrl: p.canonicalUrl,
        pageFingerprint: p.pageFingerprint,
        htmlPath: p.htmlPath,
        screenshotPath: p.screenshotPath,
        a11yPath: p.a11yPath,
        semanticPath: p.semanticPath,
        visionPath: p.visionPath,
        metadataPath: p.metadataPath,
      }));

      // Resolve page using multiple matching strategies
      const match = resolvePageByUrl(requestUrl, pages);

      if (!match) {
        return null;
      }

      const page = match.page;

      // Find rule results for this page
      const ruleResults = scanRun.results.find((r) => r.pageNumber === page.pageNumber);

      const issues = await extractPageIssues(page, ruleResults, scanId);

      if (!issues) {
        return null;
      }

      // Add match metadata
      issues.matchedUrl = match.matchedUrl;
      issues.matchConfidence = match.matchConfidence;
      issues.scanTimestamp = {
        startedAt: scanRun.startedAt,
        completedAt: scanRun.completedAt,
      };
      issues.pageFingerprint = page.pageFingerprint;

      return issues;
    } catch (error) {
      console.error('Failed to get issues from scan:', error);
      return null;
    }
  }

  /**
   * Find guidance in most recent scans (simplified - searches output directory)
   */
  private async findGuidanceInRecentScans(requestUrl: string): Promise<PageGuidance | null> {
    // For MVP, we'll try to find in the most recently modified scan directory
    // In production, you'd want a proper index or database
    try {
      const { readdir, stat } = await import('node:fs/promises');
      const outputDir = config.outputDir;

      if (!existsSync(outputDir)) {
        return null;
      }

      const scanDirs = await readdir(outputDir, { withFileTypes: true });
      const scanStats = await Promise.all(
        scanDirs
          .filter((dir) => dir.isDirectory() && dir.name.startsWith('scan_'))
          .map(async (dir) => {
            const reportPath = join(outputDir, dir.name, 'report.json');
            try {
              const stats = await stat(reportPath);
              return { scanId: dir.name, mtime: stats.mtime.getTime() };
            } catch {
              return null;
            }
          })
      );

      // Sort by modification time (most recent first)
      const validScans = scanStats.filter((s): s is { scanId: string; mtime: number } => s !== null);
      validScans.sort((a, b) => b.mtime - a.mtime);

      // Search in most recent scans (up to 5)
      for (const scan of validScans.slice(0, 5)) {
        const guidance = await this.getGuidanceFromScan(scan.scanId, requestUrl);
        if (guidance) {
          return guidance;
        }
      }
    } catch (error) {
      console.error('Failed to find guidance in recent scans:', error);
    }

    return null;
  }

  /**
   * Find issues in most recent scans
   */
  private async findIssuesInRecentScans(requestUrl: string): Promise<PageIssues | null> {
    // Same approach as findGuidanceInRecentScans
    try {
      const { readdir, stat } = await import('node:fs/promises');
      const outputDir = config.outputDir;

      if (!existsSync(outputDir)) {
        return null;
      }

      const scanDirs = await readdir(outputDir, { withFileTypes: true });
      const scanStats = await Promise.all(
        scanDirs
          .filter((dir) => dir.isDirectory() && dir.name.startsWith('scan_'))
          .map(async (dir) => {
            const reportPath = join(outputDir, dir.name, 'report.json');
            try {
              const stats = await stat(reportPath);
              return { scanId: dir.name, mtime: stats.mtime.getTime() };
            } catch {
              return null;
            }
          })
      );

      const validScans = scanStats.filter((s): s is { scanId: string; mtime: number } => s !== null);
      validScans.sort((a, b) => b.mtime - a.mtime);

      for (const scan of validScans.slice(0, 5)) {
        const issues = await this.getIssuesFromScan(scan.scanId, requestUrl);
        if (issues) {
          return issues;
        }
      }
    } catch (error) {
      console.error('Failed to find issues in recent scans:', error);
    }

    return null;
  }

  /**
   * Find the most recent completed scan for a given domain
   * Used when scanId="latest" is specified
   */
  private async findLatestScanForDomain(requestUrl: string): Promise<string | null> {
    try {
      const requestHostname = getHostname(requestUrl);
      const { readdir, stat } = await import('node:fs/promises');
      const outputDir = config.outputDir;

      if (!existsSync(outputDir)) {
        return null;
      }

      const scanDirs = await readdir(outputDir, { withFileTypes: true });
      const scanCandidates: Array<{ scanId: string; completedAt: number; hostname: string }> = [];

      // Check each scan directory
      for (const dir of scanDirs) {
        if (!dir.isDirectory() || !dir.name.startsWith('scan_')) {
          continue;
        }

        const reportPath = join(outputDir, dir.name, 'report.json');
        if (!existsSync(reportPath)) {
          continue;
        }

        try {
          const reportData = await readFile(reportPath, 'utf-8');
          const scanRun: ScanRun = JSON.parse(reportData);

          // Only consider completed scans
          if ((scanRun as any).status !== 'completed') {
            continue;
          }

          // Check if scan is for the same domain
          const scanHostname = getHostname((scanRun as any).seedUrl || (scanRun as any).url || '');
          if (scanHostname !== requestHostname) {
            continue;
          }

          // Get completion time (prefer completedAt, fallback to startedAt)
          const completedAt = scanRun.completedAt
            ? new Date(scanRun.completedAt).getTime()
            : scanRun.startedAt
              ? new Date(scanRun.startedAt).getTime()
              : 0;

          scanCandidates.push({
            scanId: dir.name,
            completedAt,
            hostname: scanHostname,
          });
        } catch (error) {
          // Skip invalid scan files
          continue;
        }
      }

      // Sort by completion time (most recent first)
      scanCandidates.sort((a, b) => b.completedAt - a.completedAt);

      // Return most recent scan for this domain
      return scanCandidates.length > 0 ? scanCandidates[0].scanId : null;
    } catch (error) {
      console.error('Failed to find latest scan for domain:', error);
      return null;
    }
  }
}

export const widgetService = new WidgetService();

