/**
 * Custom Playwright reporter that generates raawi-widget-summary.json
 */
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

class SummaryReporter implements Reporter {
  private results: Array<{
    title: string;
    status: string;
    duration: number;
    error?: string;
  }> = [];

  onTestEnd(test: TestCase, result: TestResult) {
    this.results.push({
      title: test.title,
      status: result.status,
      duration: result.duration,
      error: result.error?.message,
    });
  }

  onEnd(result: FullResult) {
    const summary = {
      timestamp: new Date().toISOString(),
      totalTests: this.results.length,
      passed: this.results.filter(r => r.status === 'passed').length,
      failed: this.results.filter(r => r.status === 'failed' || r.status === 'timedOut').length,
      skipped: this.results.filter(r => r.status === 'skipped').length,
      failedTests: this.results
        .filter(r => r.status === 'failed' || r.status === 'timedOut')
        .map(r => r.title),
      testedUrls: ['/good', '/messy'],
      duration: this.results.reduce((sum, r) => sum + r.duration, 0),
    };

    // Ensure test-results directory exists
    const outputDir = join(process.cwd(), 'test-results');
    mkdirSync(outputDir, { recursive: true });

    const summaryPath = join(outputDir, 'raawi-widget-summary.json');
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
    console.log(`\n[E2E Summary] Generated: ${summaryPath}`);
    console.log(`[E2E Summary] Total: ${summary.totalTests}, Passed: ${summary.passed}, Failed: ${summary.failed}, Skipped: ${summary.skipped}`);
  }
}

export default SummaryReporter;

