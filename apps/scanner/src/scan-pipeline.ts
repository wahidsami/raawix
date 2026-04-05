import type { ScanRequest, ResolvedScanPipeline } from '@raawi-x/core';

const FULL: ResolvedScanPipeline = {
  layer1: true,
  layer2: true,
  layer3: true,
  analysisAgent: true,
};

/**
 * Domain crawl always keeps Layer 1 on so HTML/link extraction and rule inputs stay available.
 * Sequential (selected URLs) scans may disable Layer 1 for faster vision-only passes.
 */
export function resolveScanPipeline(request: ScanRequest): ResolvedScanPipeline {
  const p = request.scanPipeline;
  const isSequential = !!(request.selectedUrls && request.selectedUrls.length > 0);
  return {
    layer1: !isSequential || p?.layer1 !== false,
    layer2: p?.layer2 !== false,
    layer3: p?.layer3 !== false,
    analysisAgent: p?.analysisAgent !== false,
  };
}

export function defaultScanPipeline(): ResolvedScanPipeline {
  return { ...FULL };
}
