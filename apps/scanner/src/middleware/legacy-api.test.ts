import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { legacyApiSwitch } from './legacy-api.js';
import { Request, Response, NextFunction } from 'express';

describe('Legacy API Switch Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: NextFunction;
  let originalEnv: string | undefined;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    nextFunction = vi.fn() as unknown as NextFunction;
    originalEnv = process.env.DISABLE_LEGACY_SCAN_API;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.DISABLE_LEGACY_SCAN_API;
    } else {
      process.env.DISABLE_LEGACY_SCAN_API = originalEnv;
    }
    vi.clearAllMocks();
  });

  it('allows the request when DISABLE_LEGACY_SCAN_API is false or unset', () => {
    delete process.env.DISABLE_LEGACY_SCAN_API;
    
    legacyApiSwitch(mockReq as Request, mockRes as Response, nextFunction);
    
    expect(nextFunction).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
    
    process.env.DISABLE_LEGACY_SCAN_API = 'false';
    legacyApiSwitch(mockReq as Request, mockRes as Response, nextFunction);
    
    expect(nextFunction).toHaveBeenCalledTimes(2);
  });

  it('blocks the request with 404 when DISABLE_LEGACY_SCAN_API is true', () => {
    process.env.DISABLE_LEGACY_SCAN_API = 'true';
    
    legacyApiSwitch(mockReq as Request, mockRes as Response, nextFunction);
    
    expect(nextFunction).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Legacy API is disabled in this environment' });
  });
});
