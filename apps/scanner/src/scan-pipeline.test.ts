import { describe, it, expect } from 'vitest';
import { resolveScanPipeline } from './scan-pipeline.js';
import type { ScanRequest } from '@raawi-x/core';

describe('resolveScanPipeline', () => {
  it('defaults to full pipeline with full-page screenshot when scanPipeline omitted (BFS)', () => {
    const r = resolveScanPipeline({ seedUrl: 'https://a.test/', url: 'https://a.test/' });
    expect(r).toMatchObject({
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
    expect(r).toMatchObject({
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

  describe('safe interaction limits (Part B/D)', () => {
    it('uses server defaults when limits are omitted from request', () => {
      const r = resolveScanPipeline(
        { seedUrl: 'https://a.test/', url: 'https://a.test/' },
        { maxSteps: 50, maxMs: 60000 }
      );
      expect(r.agentMaxSteps).toBe(50);
      expect(r.agentMaxMs).toBe(60000);
    });

    it('tightens agentMaxSteps and agentMaxMs when request specifies lower values', () => {
      const r = resolveScanPipeline(
        {
          seedUrl: 'https://a.test/',
          url: 'https://a.test/',
          scanPipeline: { agentMaxSteps: 15, agentMaxMs: 25000 },
        },
        { maxSteps: 50, maxMs: 60000 }
      );
      expect(r.agentMaxSteps).toBe(15);
      expect(r.agentMaxMs).toBe(25000);
    });

    it('clamps agentMaxSteps to server ceiling when request attempts to exceed it', () => {
      const r = resolveScanPipeline(
        {
          seedUrl: 'https://a.test/',
          url: 'https://a.test/',
          scanPipeline: { agentMaxSteps: 200 },
        },
        { maxSteps: 50, maxMs: 60000 }
      );
      expect(r.agentMaxSteps).toBe(50);
    });

    it('clamps agentMaxMs to server ceiling when request attempts to exceed it', () => {
      const r = resolveScanPipeline(
        {
          seedUrl: 'https://a.test/',
          url: 'https://a.test/',
          scanPipeline: { agentMaxMs: 999999 },
        },
        { maxSteps: 50, maxMs: 60000 }
      );
      expect(r.agentMaxMs).toBe(60000);
    });

    it('handles negative or invalid values by falling back to safe minimums or server defaults', () => {
      const rNegative = resolveScanPipeline(
        {
          seedUrl: 'https://a.test/',
          url: 'https://a.test/',
          scanPipeline: { agentMaxSteps: -10, agentMaxMs: 10 },
        },
        { maxSteps: 50, maxMs: 60000 }
      );
      // Math.max(1, Math.min(-10, 50)) => 1
      expect(rNegative.agentMaxSteps).toBe(1);
      // Math.max(100, Math.min(10, 60000)) => 100
      expect(rNegative.agentMaxMs).toBe(100);

      const rInvalid = resolveScanPipeline(
        {
          seedUrl: 'https://a.test/',
          url: 'https://a.test/',
          scanPipeline: { agentMaxSteps: NaN as any, agentMaxMs: 'invalid' as any },
        },
        { maxSteps: 50, maxMs: 60000 }
      );
      expect(rInvalid.agentMaxSteps).toBe(50);
      expect(rInvalid.agentMaxMs).toBe(60000);
    });
  });
});
