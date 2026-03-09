import type { ScanRun, PageRuleResults, RuleResult, PageArtifact } from '@raawi-x/core';
import { join } from 'node:path';
import { config } from '../config.js';

/**
 * Unified API response model derived from ScanRun (report.json)
 */
export interface ScanApiResponse {
  // Scan metadata
  scanId: string;
  seedUrl: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  error?: string;

  // Summary
  summary: {
    totalPages: number;
    totalRules: number;
    aFailures: number; // WCAG A failures
    aaFailures: number; // WCAG AA failures
    needsReview: number; // Items needing review
    byStatus: {
      pass: number;
      fail: number;
      needs_review: number;
      na: number;
    };
  };

  // Pages list with per-page counts
  pages: Array<{
    pageNumber: number;
    url: string;
    title?: string;
    finalUrl?: string;
    status: 'success' | 'failed';
    error?: string;
    counts: {
      pass: number;
      fail: number;
      needs_review: number;
      na: number;
      total: number;
    };
    screenshotPath?: string;
  }>;

  // Findings drill-down (all rule results with evidence)
  findings: Array<{
    pageNumber: number;
    pageUrl: string;
    ruleId: string;
    wcagId?: string;
    level?: 'A' | 'AA' | 'AAA';
    status: 'pass' | 'fail' | 'needs_review' | 'na';
    confidence: 'high' | 'medium' | 'low';
    message?: string;
    evidence: Array<{
      type: 'element' | 'screenshot' | 'html' | 'text' | 'url' | 'style';
      value: string;
      selector?: string;
      description?: string;
      context?: string;
    }>;
    howToVerify: string;
    screenshotPath?: string;
  }>;
}

/**
 * Convert ScanRun to unified API response
 */
export function scanRunToApiResponse(scanRun: ScanRun, baseUrl?: string): ScanApiResponse {
  const status: 'pending' | 'running' | 'completed' | 'failed' = scanRun.error
    ? 'failed'
    : scanRun.completedAt
    ? 'completed'
    : 'running';

  // Calculate per-page counts
  const pageCounts = new Map<number, { pass: number; fail: number; needs_review: number; na: number }>();
  
  for (const pageResult of scanRun.results) {
    const counts = { pass: 0, fail: 0, needs_review: 0, na: 0 };
    for (const ruleResult of pageResult.ruleResults) {
      counts[ruleResult.status]++;
    }
    pageCounts.set(pageResult.pageNumber, counts);
  }

  // Build pages list
  const pages = scanRun.pages.map((page) => {
    const counts = pageCounts.get(page.pageNumber) || { pass: 0, fail: 0, needs_review: 0, na: 0 };
    const total = counts.pass + counts.fail + counts.needs_review + counts.na;
    
    // Build screenshot path URL if baseUrl provided
    let screenshotPath: string | undefined;
    if (page.screenshotPath && baseUrl) {
      // Extract relative path from full path
      const relativePath = page.screenshotPath.replace(/^.*[\\/]pages[\\/]/, 'pages/');
      screenshotPath = `${baseUrl}/api/scan/${scanRun.scanId}/artifact/${relativePath}`;
    } else if (page.screenshotPath) {
      screenshotPath = page.screenshotPath;
    }

    return {
      pageNumber: page.pageNumber,
      url: page.url,
      title: page.title,
      finalUrl: page.finalUrl || page.url,
      status: (page.error ? 'failed' : 'success') as 'success' | 'failed',
      error: page.error,
      counts: {
        ...counts,
        total,
      },
      screenshotPath,
    };
  });

  // Build findings drill-down (flatten all rule results)
  const findings = scanRun.results.flatMap((pageResult) => {
    const page = scanRun.pages.find((p) => p.pageNumber === pageResult.pageNumber);
    
    return pageResult.ruleResults.map((ruleResult) => {
      // Build screenshot path URL if baseUrl provided
      let screenshotPath: string | undefined;
      if (page?.screenshotPath && baseUrl) {
        const relativePath = page.screenshotPath.replace(/^.*[\\/]pages[\\/]/, 'pages/');
        screenshotPath = `${baseUrl}/api/scan/${scanRun.scanId}/artifact/${relativePath}`;
      } else if (page?.screenshotPath) {
        screenshotPath = page.screenshotPath;
      }

      // Get level from rule if available (rules have level, but RuleResult may not)
      // We'll need to look it up from the rule engine or infer from wcagId
      let level: 'A' | 'AA' | 'AAA' | undefined;
      if (ruleResult.wcagId) {
        // Infer level from WCAG ID (heuristic)
        if (ruleResult.wcagId.startsWith('1.1') || ruleResult.wcagId.startsWith('1.3') || 
            ruleResult.wcagId.startsWith('2.1') || ruleResult.wcagId.startsWith('2.4.2') || 
            ruleResult.wcagId.startsWith('3.1.1') || ruleResult.wcagId.startsWith('4.1.2')) {
          level = 'A';
        } else if (ruleResult.wcagId.startsWith('1.4.3') || ruleResult.wcagId.startsWith('1.4.10')) {
          level = 'AA';
        }
      }

      return {
        pageNumber: pageResult.pageNumber,
        pageUrl: pageResult.url,
        ruleId: ruleResult.ruleId,
        wcagId: ruleResult.wcagId,
        level,
        status: ruleResult.status,
        confidence: ruleResult.confidence,
        message: ruleResult.message,
        evidence: ruleResult.evidence,
        howToVerify: ruleResult.howToVerify,
        screenshotPath,
      };
    });
  });

  return {
    scanId: scanRun.scanId,
    seedUrl: scanRun.seedUrl,
    status,
    startedAt: scanRun.startedAt,
    completedAt: scanRun.completedAt,
    error: scanRun.error,
    summary: {
      totalPages: scanRun.summary.totalPages,
      totalRules: scanRun.summary.totalRules,
      aFailures: scanRun.summary.byLevel.A.fail,
      aaFailures: scanRun.summary.byLevel.AA.fail,
      needsReview: scanRun.summary.byStatus.needs_review,
      byStatus: scanRun.summary.byStatus,
    },
    pages,
    findings,
  };
}

/**
 * Legacy adapter: Convert ScanRun to legacy ScanResult format
 * For backward compatibility only
 */
export function scanRunToLegacyResult(scanRun: ScanRun): any {
  // This is a minimal adapter - full conversion would require more mapping
  return {
    scanId: scanRun.scanId,
    seedUrl: scanRun.seedUrl,
    url: scanRun.seedUrl, // Legacy field
    status: scanRun.error ? 'failed' : scanRun.completedAt ? 'completed' : 'running',
    startedAt: scanRun.startedAt,
    completedAt: scanRun.completedAt,
    error: scanRun.error,
    summary: {
      total: scanRun.summary.byStatus.fail + scanRun.summary.byStatus.needs_review,
      errors: scanRun.summary.byStatus.fail,
      warnings: scanRun.summary.byStatus.needs_review,
      info: scanRun.summary.byStatus.pass,
    },
    pages: scanRun.pages.map((page) => ({
      pageNumber: page.pageNumber,
      url: page.url,
      title: page.title,
      finalUrl: page.finalUrl,
      error: page.error,
      screenshotPath: page.screenshotPath,
      htmlPath: page.htmlPath,
      a11yPath: page.a11yPath,
      metadataPath: page.metadataPath,
      status: page.error ? 'failed' : 'success',
    })),
  };
}

