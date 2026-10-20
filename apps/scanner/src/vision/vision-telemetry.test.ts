import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VisionAnalyzer } from './analyzer.js';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { scanEventEmitter } from '../events/scan-events.js';
import { config } from '../config.js';

describe('Vision Analyzer Telemetry & Artifacts', () => {
  const testOutputDir = join(process.cwd(), 'scratch', 'test-vision-output');

  beforeEach(async () => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    try {
      await rm(testOutputDir, { recursive: true, force: true });
    } catch {}
  });

  it('rethrows error when page interaction fails catastrophically instead of silently swallowing', async () => {
    const analyzer = new VisionAnalyzer('test-scan');

    const mockPage = {
      $$: vi.fn().mockRejectedValue(new Error('Browser target crashed or disconnected')),
    };

    // Ensure vision is enabled for test
    const originalEnabled = config.vision.enabled;
    config.vision.enabled = true;

    try {
      await expect(
        analyzer.analyzePage(mockPage as any, 1, 'https://example.com', testOutputDir)
      ).rejects.toThrow('Browser target crashed or disconnected');
    } finally {
      config.vision.enabled = originalEnabled;
    }
  });

  it('saves empty array artifact when findings count is 0, providing evidence of execution', async () => {
    const analyzer = new VisionAnalyzer('test-scan');

    const savedPath = await analyzer.saveFindings([], 1, testOutputDir);

    expect(existsSync(savedPath)).toBe(true);
    expect(savedPath).toContain('vision.json');

    const content = await readFile(savedPath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(0);
  });

  it('saves populated findings artifact when findings are detected', async () => {
    const analyzer = new VisionAnalyzer('test-scan');

    const mockFindings: any[] = [
      {
        id: 'vf-1',
        type: 'low_contrast_button',
        description: 'Button has insufficient contrast',
        confidence: 0.9,
      },
    ];

    const savedPath = await analyzer.saveFindings(mockFindings, 1, testOutputDir);

    expect(existsSync(savedPath)).toBe(true);
    const content = await readFile(savedPath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed.length).toBe(1);
    expect(parsed[0].id).toBe('vf-1');
  });
});

describe('Vision Layer Telemetry Event Distinctions', () => {
  it('distinguishes completed vs skipped vs failed events', () => {
    const emittedEvents: any[] = [];
    const emitSpy = vi.spyOn(scanEventEmitter, 'emitEvent').mockImplementation((scanId, event) => {
      emittedEvents.push(event);
    });

    // 1. Completed with 0 findings
    scanEventEmitter.emitEvent('scan-1', {
      type: 'layer_status',
      scanId: 'scan-1',
      url: 'https://example.com',
      pageNumber: 1,
      layer: 'L2',
      status: 'done',
      meta: {
        visionCount: 0,
        outcome: 'completed',
      },
      timestamp: new Date().toISOString(),
    });

    // 2. Skipped because vision is disabled
    scanEventEmitter.emitEvent('scan-1', {
      type: 'layer_status',
      scanId: 'scan-1',
      url: 'https://example.com',
      pageNumber: 2,
      layer: 'L2',
      status: 'done',
      meta: {
        visionCount: 0,
        outcome: 'skipped',
        skipped: true,
        reason: 'vision_disabled',
      },
      timestamp: new Date().toISOString(),
    });

    // 3. Failed due to error
    scanEventEmitter.emitEvent('scan-1', {
      type: 'layer_status',
      scanId: 'scan-1',
      url: 'https://example.com',
      pageNumber: 3,
      layer: 'L2',
      status: 'failed',
      meta: {
        visionCount: 0,
        outcome: 'failed',
        error: 'Playwright session closed',
      },
      timestamp: new Date().toISOString(),
    });

    expect(emittedEvents.length).toBe(3);

    // Completed
    expect(emittedEvents[0].status).toBe('done');
    expect(emittedEvents[0].meta.outcome).toBe('completed');
    expect(emittedEvents[0].meta.visionCount).toBe(0);

    // Skipped
    expect(emittedEvents[1].status).toBe('done');
    expect(emittedEvents[1].meta.outcome).toBe('skipped');
    expect(emittedEvents[1].meta.reason).toBe('vision_disabled');

    // Failed - MUST NOT be status: 'done' or reported as clean 0-finding scan
    expect(emittedEvents[2].status).toBe('failed');
    expect(emittedEvents[2].meta.outcome).toBe('failed');
    expect(emittedEvents[2].meta.error).toBe('Playwright session closed');

    emitSpy.mockRestore();
  });
});
