import type { ScanRequest, ResolvedScanPipeline, ScreenshotCaptureMode } from '@raawi-x/core';

const FULL: ResolvedScanPipeline = {
  layer1: true,
  layer2: true,
  layer3: true,
  analysisAgent: true,
  screenshotMode: 'full',
};

/**
 * Domain crawl always keeps Layer 1 on so HTML/link extraction and rule inputs stay available.
 * Sequential (selected URLs) scans may disable Layer 1 for faster vision-only passes.
 *
 * `scanPreset: 'fast'` ⇒ L1 on, L2/L3/agent off (DOM + rules path only).
 * `screenshotMode: 'none'` ⇒ Layer 2 off (no screenshot, no vision).
 */
export function resolveScanPipeline(request: ScanRequest): ResolvedScanPipeline {
  const p = request.scanPipeline;
  const isSequential = !!(request.selectedUrls && request.selectedUrls.length > 0);

  let layer1: boolean;
  let layer2: boolean;
  let layer3: boolean;
  let analysisAgent: boolean;

  if (p?.scanPreset === 'fast') {
    layer1 = true;
    layer2 = false;
    layer3 = false;
    analysisAgent = false;
  } else {
    layer1 = !isSequential || p?.layer1 !== false;
    layer2 = p?.layer2 !== false;
    layer3 = p?.layer3 !== false;
    analysisAgent = p?.analysisAgent !== false;
  }

  if (!isSequential) {
    layer1 = true;
  }

  let screenshotMode: ScreenshotCaptureMode = 'none';
  if (layer2) {
    const rawMode: ScreenshotCaptureMode =
      p?.scanPreset === 'fast' ? 'none' : (p?.screenshotMode ?? 'full');
    if (rawMode === 'none') {
      layer2 = false;
      screenshotMode = 'none';
    } else {
      screenshotMode = rawMode === 'viewport' ? 'viewport' : 'full';
    }
  } else {
    screenshotMode = 'none';
  }

  return { layer1, layer2, layer3, analysisAgent, screenshotMode };
}

export function defaultScanPipeline(): ResolvedScanPipeline {
  return { ...FULL };
}
