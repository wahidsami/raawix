import type { ScanRequest, ResolvedScanPipeline } from '@raawi-x/core';
/**
 * Domain crawl always keeps Layer 1 on so HTML/link extraction and rule inputs stay available.
 * Sequential (selected URLs) scans may disable Layer 1 for faster vision-only passes.
 *
 * `scanPreset: 'fast'` ⇒ L1 on, L2/L3/agent off (DOM + rules path only).
 * `screenshotMode: 'none'` ⇒ Layer 2 off (no screenshot, no vision).
 */
export declare function resolveScanPipeline(request: ScanRequest): ResolvedScanPipeline;
export declare function defaultScanPipeline(): ResolvedScanPipeline;
//# sourceMappingURL=scan-pipeline.d.ts.map