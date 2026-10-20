import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { AssistiveMapGenerator } from './assistive-map-generator.js';
import dashboardRouter from '../api/dashboard.js';
import * as dbClient from '../db/client.js';
import type { Request, Response } from 'express';

describe('Assistive Map Selector Generation', () => {
  const generator = new AssistiveMapGenerator();

  it('generates unique selector for elements with unique ID', () => {
    const dom = new JSDOM(`
      <html>
        <body>
          <button id="submit-btn">Submit</button>
        </body>
      </html>
    `);
    const btn = dom.window.document.getElementById('submit-btn')!;
    const sel = generator.generateSelector(btn, dom.window.document);
    expect(sel).toBe('#submit-btn');
    expect(dom.window.document.querySelectorAll(sel).length).toBe(1);
  });

  it('generates unique selector for elements with data-testid', () => {
    const dom = new JSDOM(`
      <html>
        <body>
          <button data-testid="checkout-button">Checkout</button>
        </body>
      </html>
    `);
    const btn = dom.window.document.querySelector('[data-testid="checkout-button"]')!;
    const sel = generator.generateSelector(btn, dom.window.document);
    expect(sel).toBe('[data-testid="checkout-button"]');
    expect(dom.window.document.querySelectorAll(sel).length).toBe(1);
  });

  it('generates unique selector using href for links with unique URLs', () => {
    const dom = new JSDOM(`
      <html>
        <body>
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
        </body>
      </html>
    `);
    const privacy = dom.window.document.querySelector('a[href="/privacy"]')!;
    const sel = generator.generateSelector(privacy, dom.window.document);
    expect(sel).toBe('a[href="/privacy"]');
    expect(dom.window.document.querySelectorAll(sel).length).toBe(1);
  });

  it('differentiates repeated identical links via hierarchical nth-of-type paths', () => {
    const dom = new JSDOM(`
      <html>
        <body>
          <div class="card">
            <a href="/learn-more">Learn more</a>
          </div>
          <div class="card">
            <a href="/learn-more">Learn more</a>
          </div>
        </body>
      </html>
    `);
    const links = dom.window.document.querySelectorAll('a');
    expect(links.length).toBe(2);

    const sel0 = generator.generateSelector(links[0], dom.window.document);
    const sel1 = generator.generateSelector(links[1], dom.window.document);

    expect(sel0).not.toBe(sel1);
    expect(dom.window.document.querySelectorAll(sel0).length).toBe(1);
    expect(dom.window.document.querySelectorAll(sel0)[0]).toBe(links[0]);
    expect(dom.window.document.querySelectorAll(sel1).length).toBe(1);
    expect(dom.window.document.querySelectorAll(sel1)[0]).toBe(links[1]);
  });

  it('provides safe fallback when unique selector cannot be formed without context', () => {
    const dom = new JSDOM(`
      <div>
        <span>First</span>
        <span>Second</span>
      </div>
    `);
    const spans = dom.window.document.querySelectorAll('span');
    const sel = generator.generateSelector(spans[1], dom.window.document);
    expect(sel).toBeTruthy();
    expect(dom.window.document.querySelectorAll(sel).length).toBe(1);
  });
});

describe('Assistive Map API Endpoint (GET /api/assistive-maps/:id)', () => {
  // Find the route handlers from dashboard router stack
  const routeLayer: any = dashboardRouter.stack.find(
    (layer: any) => layer.route && layer.route.path === '/assistive-maps/:id'
  );

  const handlers = routeLayer?.route?.stack?.map((s: any) => s.handle) || [];
  const authMiddleware = handlers[0];
  const routeHandler = handlers[1];

  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      headers: {},
      params: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  it('verifies requireAuth is attached to the route', () => {
    const nextFn = vi.fn();
    mockReq.headers = {}; // No Authorization header
    authMiddleware(mockReq as Request, mockRes as Response, nextFn);

    expect(nextFn).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'No token provided' });
  });

  it('returns 503 when database client is unavailable', async () => {
    vi.spyOn(dbClient, 'getPrismaClient').mockResolvedValue(null as any);
    mockReq.params = { id: '11111111-1111-1111-1111-111111111111' };

    await routeHandler(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(503);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database not available' });
  });

  it('returns 404 when ID is invalid format', async () => {
    const mockPrisma = {
      assistiveMap: { findFirst: vi.fn() },
    };
    vi.spyOn(dbClient, 'getPrismaClient').mockResolvedValue(mockPrisma as any);
    mockReq.params = { id: 'not-a-valid-uuid' };

    await routeHandler(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Assistive map not found' });
    expect(mockPrisma.assistiveMap.findFirst).not.toHaveBeenCalled();
  });

  it('returns 404 when map is not found in database', async () => {
    const mockPrisma = {
      assistiveMap: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    vi.spyOn(dbClient, 'getPrismaClient').mockResolvedValue(mockPrisma as any);
    mockReq.params = { id: '00000000-0000-0000-0000-000000000000' };

    await routeHandler(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Assistive map not found' });
  });

  it('returns 200 with formatted map when found by ID or pageVersionId', async () => {
    const mockMapRecord = {
      id: '22222222-2222-2222-2222-222222222222',
      pageVersionId: '33333333-3333-3333-3333-333333333333',
      json: {
        labelOverrides: {},
        imageDescriptions: {},
        actionIntents: {
          'a[href="/privacy"]': {
            selector: 'a[href="/privacy"]',
            intent: 'Open link',
            description: 'Open link: Privacy Policy',
            confidence: 'high',
            source: 'dom',
          },
        },
      },
      confidenceSummary: {
        labelOverrides: { high: 0, medium: 0, low: 0 },
        imageDescriptions: { high: 0, medium: 0, low: 0 },
        actionIntents: { high: 1, medium: 0, low: 0 },
      },
      createdAt: new Date('2026-10-20T10:00:00Z'),
      updatedAt: new Date('2026-10-20T10:05:00Z'),
      pageVersion: {
        siteId: '44444444-4444-4444-4444-444444444444',
        canonicalUrl: 'https://example.com/test',
        finalUrl: 'https://example.com/test',
        fingerprintHash: 'hash123',
        scanId: 'scan_123',
        generatedAt: new Date('2026-10-20T09:59:00Z'),
        site: {
          domain: 'example.com',
        },
      },
    };

    const mockPrisma = {
      assistiveMap: { findFirst: vi.fn().mockResolvedValue(mockMapRecord) },
    };
    vi.spyOn(dbClient, 'getPrismaClient').mockResolvedValue(mockPrisma as any);
    mockReq.params = { id: '22222222-2222-2222-2222-222222222222' };

    await routeHandler(mockReq as Request, mockRes as Response);

    expect(mockRes.json).toHaveBeenCalled();
    const responseData = (mockRes.json as any).mock.calls[0][0];
    expect(responseData.map).toBeDefined();
    expect(responseData.map.id).toBe('22222222-2222-2222-2222-222222222222');
    expect(responseData.map.pageVersionId).toBe('33333333-3333-3333-3333-333333333333');
    expect(responseData.map.domain).toBe('example.com');
    expect(responseData.map.data.actionIntents['a[href="/privacy"]']).toBeDefined();
    expect(responseData.map.confidenceSummary.totals.high).toBe(1);
  });
});
