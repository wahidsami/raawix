import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { validateScanRequest, scanPipelineSchema, scanRequestSchema } from './validation.js';
import { resolveScanPipeline } from '../scan-pipeline.js';
import { config } from '../config.js';

describe('Scan Request Validation Middleware & Limits (Phase 7B.5C)', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    nextFunction = vi.fn() as unknown as NextFunction;
  });

  describe('1. Schema Definition & Field Preservation', () => {
    it('preserves agentMaxSteps and agentMaxMs when valid positive integers are provided', () => {
      const parsed = scanPipelineSchema?.parse({
        layer1: true,
        layer3: true,
        agentMaxSteps: 25,
        agentMaxMs: 5000,
      });

      expect(parsed).toBeDefined();
      expect(parsed?.agentMaxSteps).toBe(25);
      expect(parsed?.agentMaxMs).toBe(5000);
    });

    it('allows omitting agentMaxSteps and agentMaxMs', () => {
      const parsed = scanPipelineSchema?.parse({
        layer1: true,
        layer3: true,
      });

      expect(parsed).toBeDefined();
      expect(parsed?.agentMaxSteps).toBeUndefined();
      expect(parsed?.agentMaxMs).toBeUndefined();
    });

    it('rejects negative values for agentMaxSteps and agentMaxMs', () => {
      expect(() => {
        scanPipelineSchema?.parse({ agentMaxSteps: -10 });
      }).toThrow();

      expect(() => {
        scanPipelineSchema?.parse({ agentMaxMs: -500 });
      }).toThrow();
    });

    it('rejects zero values for agentMaxSteps and agentMaxMs', () => {
      expect(() => {
        scanPipelineSchema?.parse({ agentMaxSteps: 0 });
      }).toThrow();

      expect(() => {
        scanPipelineSchema?.parse({ agentMaxMs: 0 });
      }).toThrow();
    });

    it('rejects fractional/float values for agentMaxSteps and agentMaxMs', () => {
      expect(() => {
        scanPipelineSchema?.parse({ agentMaxSteps: 12.5 });
      }).toThrow();

      expect(() => {
        scanPipelineSchema?.parse({ agentMaxMs: 5000.75 });
      }).toThrow();
    });

    it('rejects non-numeric string values for agentMaxSteps and agentMaxMs', () => {
      expect(() => {
        scanPipelineSchema?.parse({ agentMaxSteps: '25' as any });
      }).toThrow();

      expect(() => {
        scanPipelineSchema?.parse({ agentMaxMs: 'fast' as any });
      }).toThrow();
    });
  });

  describe('2. validateScanRequest Middleware Execution Boundary', () => {
    it('preserves agentMaxSteps and agentMaxMs on req.body for valid HTTP requests', () => {
      mockReq.body = {
        seedUrl: 'https://example.com/test',
        scanPipeline: {
          layer1: true,
          layer3: true,
          agentMaxSteps: 25,
          agentMaxMs: 6000,
        },
      };

      validateScanRequest(mockReq as Request, mockRes as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockReq.body.scanPipeline).toBeDefined();
      expect(mockReq.body.scanPipeline.agentMaxSteps).toBe(25);
      expect(mockReq.body.scanPipeline.agentMaxMs).toBe(6000);
    });

    it('returns HTTP 400 when agentMaxSteps is negative', () => {
      mockReq.body = {
        seedUrl: 'https://example.com/test',
        scanPipeline: {
          agentMaxSteps: -5,
        },
      };

      validateScanRequest(mockReq as Request, mockRes as Response, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
        })
      );
    });

    it('returns HTTP 400 when agentMaxSteps is 0', () => {
      mockReq.body = {
        seedUrl: 'https://example.com/test',
        scanPipeline: {
          agentMaxSteps: 0,
        },
      };

      validateScanRequest(mockReq as Request, mockRes as Response, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('returns HTTP 400 when agentMaxMs is a float', () => {
      mockReq.body = {
        seedUrl: 'https://example.com/test',
        scanPipeline: {
          agentMaxMs: 4500.5,
        },
      };

      validateScanRequest(mockReq as Request, mockRes as Response, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('3. End-to-End Boundary: Validation to resolveScanPipeline', () => {
    it('tightens agentMaxSteps to 25 when requested below server ceiling', () => {
      mockReq.body = {
        seedUrl: 'https://example.com/test',
        scanPipeline: {
          layer1: true,
          layer3: true,
          agentMaxSteps: 25,
        },
      };

      validateScanRequest(mockReq as Request, mockRes as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();

      // Simulate passing validated body to resolveScanPipeline
      const resolved = resolveScanPipeline(mockReq.body, { maxSteps: 50, maxMs: 10000 });

      expect(resolved.agentMaxSteps).toBe(25);
      expect(resolved.agentMaxMs).toBe(10000); // Default server ceiling preserved
    });

    it('clamps agentMaxMs to server ceiling (10000 ms) when request asks for 15000 ms', () => {
      mockReq.body = {
        seedUrl: 'https://example.com/test',
        scanPipeline: {
          layer1: true,
          layer3: true,
          agentMaxMs: 15000,
        },
      };

      validateScanRequest(mockReq as Request, mockRes as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();

      const resolved = resolveScanPipeline(mockReq.body, { maxSteps: 50, maxMs: 10000 });

      // Must be clamped to the 10000 ms ceiling
      expect(resolved.agentMaxMs).toBe(10000);
    });

    it('clamps agentMaxSteps to server ceiling (50) when request asks for 200', () => {
      mockReq.body = {
        seedUrl: 'https://example.com/test',
        scanPipeline: {
          layer1: true,
          layer3: true,
          agentMaxSteps: 200,
        },
      };

      validateScanRequest(mockReq as Request, mockRes as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();

      const resolved = resolveScanPipeline(mockReq.body, { maxSteps: 50, maxMs: 10000 });

      expect(resolved.agentMaxSteps).toBe(50);
    });

    it('preserves server defaults when agent limits are omitted in request', () => {
      mockReq.body = {
        seedUrl: 'https://example.com/test',
        scanPipeline: {
          layer1: true,
          layer3: true,
        },
      };

      validateScanRequest(mockReq as Request, mockRes as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();

      const resolved = resolveScanPipeline(mockReq.body, { maxSteps: 50, maxMs: 10000 });

      expect(resolved.agentMaxSteps).toBe(50);
      expect(resolved.agentMaxMs).toBe(10000);
    });

    it('preserves server defaults when scanPipeline is completely omitted', () => {
      mockReq.body = {
        seedUrl: 'https://example.com/test',
      };

      validateScanRequest(mockReq as Request, mockRes as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalled();

      const resolved = resolveScanPipeline(mockReq.body, { maxSteps: 50, maxMs: 10000 });

      expect(resolved.agentMaxSteps).toBe(50);
      expect(resolved.agentMaxMs).toBe(10000);
    });
  });
});
