/**
 * Custom Playwright reporter that generates raawi-widget-summary.json
 */
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';
declare class SummaryReporter implements Reporter {
    private results;
    onTestEnd(test: TestCase, result: TestResult): void;
    onEnd(result: FullResult): void;
}
export default SummaryReporter;
//# sourceMappingURL=summary-reporter.d.ts.map