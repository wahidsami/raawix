import { describe, it, expect } from 'vitest';
import { resolveScanPipeline } from './scan-pipeline.js';
import type { ScanRequest } from '@raawi-x/core';

describe('resolveScanPipeline', () => {
  it('defaults to full pipeline with full-page screenshot when scanPipeline omitted (BFS)', () => {
    const r = resolveScanPipeline({ seedUrl: 'https://a.test/', url: 'https://a.test/' });
    expect(r).toEqual({
      layer1: true,
      layer2: true,
      layer3: true,
      analysisAgent: true,
      screenshotMode: 'full',
    });
  });

  it('defaults to full pipeline for sequential when scanPipeline omitted', () => {
    const r = resolveScanPipeline({
      seedUrl: 'https://a.test/',
      url: 'https://a.test/',
      selectedUrls: ['https://a.test/one'],
    });
    expect(r.layer1).toBe(true);
    expect(r.layer2).toBe(true);
    expect(r.screenshotMode).toBe('full');
  });

  it('scanPreset fast forces L1 on and L2/L3/agent off (BFS)', () => {
    const r = resolveScanPipeline({
      seedUrl: 'https://a.test/',
      url: 'https://a.test/',
      scanPipeline: { scanPreset: 'fast', layer2: true, layer3: true },
    });
    expect(r).toEqual({
      layer1: true,
      layer2: false,
      layer3: false,
      analysisAgent: false,
      screenshotMode: 'none',
    });
  });

  it('scanPreset fast satisfies sequential validation shape (L1 on, L2 off)', () => {
    const r = resolveScanPipeline({
      seedUrl: 'https://a.test/',
      url: 'https://a.test/',
      selectedUrls: ['https://a.test/p'],
      scanPipeline: { scanPreset: 'fast' },
    });
    expect(r.layer1).toBe(true);
    expect(r.layer2).toBe(false);
    expect(r.screenshotMode).toBe('none');
  });

  it('forces layer1 on for BFS even if layer1 false requested', () => {
    const r = resolveScanPipeline({
      seedUrl: 'https://a.test/',
      url: 'https://a.test/',
      scanPipeline: { layer1: false },
    });
    expect(r.layer1).toBe(true);
  });

  it('allows layer1 off for sequential vision-only', () => {
    const r = resolveScanPipeline({
      seedUrl: 'https://a.test/',
      url: 'https://a.test/',
      selectedUrls: ['https://a.test/p'],
      scanPipeline: { layer1: false, layer2: true },
    });
    expect(r.layer1).toBe(false);
    expect(r.layer2).toBe(true);
    expect(r.screenshotMode).toBe('full');
  });

  it('screenshotMode viewport when L2 on', () => {
    const r = resolveScanPipeline({
      seedUrl: 'https://a.test/',
      url: 'https://a.test/',
      scanPipeline: { screenshotMode: 'viewport' },
    });
    expect(r.layer2).toBe(true);
    expect(r.screenshotMode).toBe('viewport');
  });

  it('screenshotMode none turns L2 off', () => {
    const r = resolveScanPipeline({
      seedUrl: 'https://a.test/',
      url: 'https://a.test/',
      scanPipeline: { layer2: true, screenshotMode: 'none' },
    });
    expect(r.layer2).toBe(false);
    expect(r.screenshotMode).toBe('none');
  });

  it('layer2 false implies screenshotMode none', () => {
    const r = resolveScanPipeline({
      seedUrl: 'https://a.test/',
      url: 'https://a.test/',
      scanPipeline: { layer2: false, screenshotMode: 'full' },
    });
    expect(r.layer2).toBe(false);
    expect(r.screenshotMode).toBe('none');
  });
});
