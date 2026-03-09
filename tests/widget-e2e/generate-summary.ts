/**
 * Generate JSON summary from Playwright test results
 * This script is run after tests complete to create raawi-widget-summary.json
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const resultsPath = join(process.cwd(), 'test-results', 'results.json');
const summaryPath = join(process.cwd(), 'test-results', 'raawi-widget-summary.json');

interface PlaywrightResult {
  config: any;
  suites: Array<{
    title: string;
    specs: Array<{
      title: string;
      tests: Array<{
        title: string;
        status: 'passed' | 'failed' | 'skipped' | 'timedOut';
        duration: number;
        errors: Array<{ message: string }>;
      }>;
    }>;
  }>;
}

interface Summary {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  failedTests: string[];
  testedUrls: string[];
  duration: number;
}

function generateSummary(): void {
  if (!existsSync(resultsPath)) {
    console.error(`[E2E Summary] Results file not found: ${resultsPath}`);
    process.exit(1);
  }

  try {
    const results: PlaywrightResult = JSON.parse(readFileSync(resultsPath, 'utf-8'));
    
    const summary: Summary = {
      timestamp: new Date().toISOString(),
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      failedTests: [],
      testedUrls: ['/good', '/messy'],
      duration: 0,
    };

    // Extract test results
    for (const suite of results.suites || []) {
      for (const spec of suite.specs || []) {
        for (const test of spec.tests || []) {
          summary.totalTests++;
          summary.duration += test.duration || 0;

          if (test.status === 'passed') {
            summary.passed++;
          } else if (test.status === 'failed' || test.status === 'timedOut') {
            summary.failed++;
            summary.failedTests.push(`${spec.title} > ${test.title}`);
          } else if (test.status === 'skipped') {
            summary.skipped++;
          }
        }
      }
    }

    // Write summary
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
    console.log(`[E2E Summary] Generated: ${summaryPath}`);
    console.log(`[E2E Summary] Total: ${summary.totalTests}, Passed: ${summary.passed}, Failed: ${summary.failed}, Skipped: ${summary.skipped}`);
  } catch (error) {
    console.error('[E2E Summary] Error generating summary:', error);
    process.exit(1);
  }
}

generateSummary();

