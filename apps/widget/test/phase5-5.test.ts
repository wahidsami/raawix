/**
 * Phase 5.5 Unit Test Suite: Freshness Engine, Fingerprint Validation & Advanced Navigation
 * 
 * Verifies:
 * 1. Bit-for-bit SHA-256 calculation and UTF-8 encoding.
 * 2. Live DOM fingerprint extraction with widget DOM exclusion.
 * 3. Freshness decision matrix: ready, outdated, unknown (missing fingerprint).
 * 4. Resilient caching, cancellation, and manual refresh in MapApiClient.
 * 5. Safe, accessible LandmarkNavigator focus transfer and error handling.
 * 6. PageTracker SPA navigation and stale-map safe remediation shutdown.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const { JSDOM } = require('../../../node_modules/.pnpm/node_modules/jsdom');

import {
  computeSha256,
  computeLivePageFingerprint,
  evaluateFreshness,
} from '../src/core/freshness-engine';
import { MapApiClient } from '../src/core/api-client';
import { DomRemediator } from '../src/core/dom-remediator';
import { LandmarkNavigator } from '../src/core/landmark-navigator';
import { PageTracker } from '../src/core/page-tracker';
import { StateManager } from '../src/core/state';
import type { PagePackageResponse, PageFingerprint } from '../src/core/types';

describe('Phase 5.5: Freshness Engine, Fingerprint Validation & Advanced Navigation', () => {
  let dom: JSDOM;

  beforeEach(() => {
    dom = new JSDOM(
      `<!DOCTYPE html>
      <html lang="ar" dir="rtl">
        <head>
          <title>بوابة الخدمات الرقمية الموحدة</title>
        </head>
        <body>
          <header role="banner" id="site-header">
            <h1>منصة راوي إكس الرقمية</h1>
          </header>
          <main role="main" id="main-content">
            <p>مرحباً بكم في البوابة الرسمية لتسهيل إجراءات المواطنين والمقيمين.</p>
            <div id="services-grid">
              <button id="btn-service-1">طلب الخدمة الأولى</button>
              <img id="img-hero" class="hero-image" src="hero.jpg">
              <div id="card-hero" class="hero-card">بطاقة ترحيبية</div>
            </div>
          </main>
          <footer role="contentinfo" id="site-footer">
            <p>جميع الحقوق محفوظة 2026</p>
          </footer>
        </body>
      </html>`,
      { url: 'https://example.gov.sa/portal', pretendToBeVisual: true }
    );

    (globalThis as any).window = dom.window;
    (globalThis as any).document = dom.window.document;
    (globalThis as any).history = dom.window.history;
    (globalThis as any).HTMLElement = dom.window.HTMLElement;
    (globalThis as any).HTMLImageElement = dom.window.HTMLImageElement;
    (globalThis as any).HTMLButtonElement = dom.window.HTMLButtonElement;
    (globalThis as any).MutationObserver = dom.window.MutationObserver;
  });

  afterEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).document;
    delete (globalThis as any).history;
    delete (globalThis as any).HTMLElement;
    delete (globalThis as any).HTMLImageElement;
    delete (globalThis as any).HTMLButtonElement;
    delete (globalThis as any).MutationObserver;
  });

  describe('1. Bit-for-Bit SHA-256 and UTF-8 Encoding', () => {
    it('matches Node crypto SHA-256 for ASCII strings', () => {
      const text = 'Raawi X Compliance Scanner - Fingerprint Hash 2026';
      const expected = createHash('sha256').update(text).digest('hex');
      const actual = computeSha256(text);
      assert.equal(actual, expected);
    });

    it('matches Node crypto SHA-256 for Arabic UTF-8 text', () => {
      const text = 'منصة راوي إكس الرقمية - بوابة فحص وتيسير النفاذ الرقمي للأشخاص ذوي الإعاقة';
      const expected = createHash('sha256').update(text).digest('hex');
      const actual = computeSha256(text);
      assert.equal(actual, expected);
    });

    it('produces distinct hashes for differing content', () => {
      const hash1 = computeSha256('Page Title Alpha');
      const hash2 = computeSha256('Page Title Beta');
      assert.notEqual(hash1, hash2);
    });
  });

  describe('2. Live DOM Fingerprint Extraction', () => {
    it('extracts title, firstHeading, and main content hash accurately', () => {
      const fp = computeLivePageFingerprint(dom.window.document);
      assert.equal(fp.title, 'بوابة الخدمات الرقمية الموحدة');
      assert.equal(fp.firstHeading, 'منصة راوي إكس الرقمية');
      assert.ok(fp.mainTextHash && fp.mainTextHash.length === 64);
    });

    it('falls back to H2 if H1 is not present', () => {
      const h1 = dom.window.document.querySelector('h1')!;
      h1.remove();
      const h2 = dom.window.document.createElement('h2');
      h2.textContent = 'عنوان المستوى الثاني البديل';
      dom.window.document.body.prepend(h2);

      const fp = computeLivePageFingerprint(dom.window.document);
      assert.equal(fp.firstHeading, 'عنوان المستوى الثاني البديل');
    });

    it('excludes widget DOM elements so widget insertion does not mutate fingerprint', () => {
      const fpBefore = computeLivePageFingerprint(dom.window.document);

      // Insert widget custom element into host body
      const widgetEl = dom.window.document.createElement('raawi-accessibility-widget');
      widgetEl.innerHTML = '<div>Widget Internal Controls & Active State</div>';
      dom.window.document.body.appendChild(widgetEl);

      const fpAfter = computeLivePageFingerprint(dom.window.document);
      assert.equal(fpAfter.mainTextHash, fpBefore.mainTextHash);
    });
  });

  describe('3. Freshness Decision Matrix (evaluateFreshness)', () => {
    it('returns "ready" when title, heading, and main text hash match', () => {
      const liveFp = computeLivePageFingerprint(dom.window.document);
      const result = evaluateFreshness(liveFp, liveFp);

      assert.equal(result.status, 'ready');
      assert.equal(result.isStale, false);
      assert.equal(result.score, 1.0);
      assert.equal(result.mismatchedFields.length, 0);
    });

    it('returns "outdated" when page title differs', () => {
      const liveFp = computeLivePageFingerprint(dom.window.document);
      const stalePackageFp: PageFingerprint = {
        ...liveFp,
        title: 'عنوان قديم تم تغييره',
      };

      const result = evaluateFreshness(stalePackageFp, liveFp);
      assert.equal(result.status, 'outdated');
      assert.equal(result.isStale, true);
      assert.ok(result.mismatchedFields.includes('title'));
      assert.ok(result.reason?.includes('title'));
    });

    it('returns "outdated" when first heading differs', () => {
      const liveFp = computeLivePageFingerprint(dom.window.document);
      const stalePackageFp: PageFingerprint = {
        ...liveFp,
        firstHeading: 'عنوان رئيسي قديم',
      };

      const result = evaluateFreshness(stalePackageFp, liveFp);
      assert.equal(result.status, 'outdated');
      assert.equal(result.isStale, true);
      assert.ok(result.mismatchedFields.includes('firstHeading'));
    });

    it('returns "outdated" when main text hash differs while titles match', () => {
      const liveFp = computeLivePageFingerprint(dom.window.document);
      const stalePackageFp: PageFingerprint = {
        ...liveFp,
        mainTextHash: '0000000000000000000000000000000000000000000000000000000000000000',
      };

      const result = evaluateFreshness(stalePackageFp, liveFp);
      assert.equal(result.status, 'outdated');
      assert.equal(result.isStale, true);
      assert.ok(result.mismatchedFields.includes('mainTextHash'));
    });

    it('handles incomplete / missing package fingerprint conservatively as "unknown"', () => {
      const liveFp = computeLivePageFingerprint(dom.window.document);
      const result = evaluateFreshness(null, liveFp);

      assert.equal(result.status, 'unknown');
      assert.equal(result.isStale, false);
      assert.ok(result.reason?.includes('Package lacks fingerprint'));
    });
  });

  describe('4. MapApiClient Freshness Integration & Manual Refresh', () => {
    it('sets status to "ready" when package fingerprint matches live DOM', async () => {
      const client = new MapApiClient({ apiUrl: 'https://api.example.com', entityCode: 'TEST' });
      const liveFp = computeLivePageFingerprint(dom.window.document);

      const mockPackage: PagePackageResponse = {
        url: 'https://example.gov.sa/portal',
        matchConfidence: 'high',
        fingerprint: liveFp,
      };

      (globalThis as any).window.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => mockPackage,
      });

      const res = await client.fetchPagePackage('https://example.gov.sa/portal');
      assert.ok(res);
      assert.equal(client.getStatus(), 'ready');
    });

    it('sets status to "outdated" when package fingerprint does not match live DOM', async () => {
      const client = new MapApiClient({ apiUrl: 'https://api.example.com', entityCode: 'TEST' });

      const stalePackage: PagePackageResponse = {
        url: 'https://example.gov.sa/portal',
        matchConfidence: 'high',
        fingerprint: {
          title: 'Different Title From Scanner',
          firstHeading: 'Old Heading',
          mainTextHash: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        },
      };

      (globalThis as any).window.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => stalePackage,
      });

      const res = await client.fetchPagePackage('https://example.gov.sa/portal');
      assert.ok(res);
      assert.equal(client.getStatus(), 'outdated');
      assert.ok(client.getError()?.includes('title'));
    });

    it('manual refresh bypasses cache and re-fetches package', async () => {
      const client = new MapApiClient({ apiUrl: 'https://api.example.com', entityCode: 'TEST' });
      const liveFp = computeLivePageFingerprint(dom.window.document);

      let fetchCount = 0;
      (globalThis as any).window.fetch = async () => {
        fetchCount++;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            url: 'https://example.gov.sa/portal',
            matchConfidence: 'high',
            fingerprint: liveFp,
          }),
        };
      };

      await client.fetchPagePackage('https://example.gov.sa/portal');
      assert.equal(fetchCount, 1);

      // Second regular fetch should use cache
      await client.fetchPagePackage('https://example.gov.sa/portal');
      assert.equal(fetchCount, 1);

      // Manual refresh must bypass cache
      await client.refresh('https://example.gov.sa/portal');
      assert.equal(fetchCount, 2);
    });

    it('aborts in-flight requests when abortAllRequests is called', async () => {
      const client = new MapApiClient({ apiUrl: 'https://api.example.com', entityCode: 'TEST' });

      (globalThis as any).window.fetch = async (_: any, opts: any) => {
        return new Promise((resolve, reject) => {
          opts.signal.addEventListener('abort', () => {
            const err = new Error('Aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      };

      const pending = client.fetchPagePackage('https://example.gov.sa/portal');
      client.abortAllRequests();
      const res = await pending;
      assert.equal(res, null);
    });

    it('marks malformed packages as "invalid"', () => {
      const client = new MapApiClient({ apiUrl: 'https://api.example.com', entityCode: 'TEST' });
      const res = client.validatePagePackage('not-an-object', 'https://example.gov.sa/portal');
      assert.equal(res, null);
      assert.equal(client.getStatus(), 'invalid');
    });
  });

  describe('5. LandmarkNavigator Focus Management', () => {
    it('transfers focus directly to focusable elements', () => {
      const btn = dom.window.document.querySelector('#btn-service-1') as HTMLButtonElement;
      assert.ok(btn);

      const result = LandmarkNavigator.navigateToLandmark({
        selector: '#btn-service-1',
        role: 'button',
      });

      assert.equal(result.success, true);
      assert.equal(dom.window.document.activeElement, btn);
    });

    it('applies temporary tabindex="-1" and data-raawi-temp-focus to non-focusable landmark', () => {
      const header = dom.window.document.querySelector('#site-header') as HTMLElement;
      assert.ok(header);
      assert.equal(header.hasAttribute('tabindex'), false);

      const result = LandmarkNavigator.navigateToLandmark({
        selector: '#site-header',
        role: 'banner',
      });

      assert.equal(result.success, true);
      assert.equal(dom.window.document.activeElement, header);
      assert.equal(header.getAttribute('tabindex'), '-1');
      assert.equal(header.getAttribute('data-raawi-temp-focus'), 'true');

      // On blur, temporary attributes must be cleanly removed
      header.dispatchEvent(new dom.window.FocusEvent('blur'));
      assert.equal(header.hasAttribute('tabindex'), false);
      assert.equal(header.hasAttribute('data-raawi-temp-focus'), false);
    });

    it('fails safely when landmark selector matches 0 elements', () => {
      const result = LandmarkNavigator.navigateToLandmark({
        selector: '#non-existent-landmark-id',
        role: 'complementary',
      });

      assert.equal(result.success, false);
      assert.ok(result.message?.includes('not found'));
    });

    it('fails safely when landmark selector matches multiple elements (ambiguous)', () => {
      const result = LandmarkNavigator.navigateToLandmark({
        selector: 'p', // matches 2 paragraph elements
        role: 'main',
      });

      assert.equal(result.success, false);
      assert.ok(result.message?.includes('Ambiguous selector'));
    });

    it('fails safely on invalid CSS selector syntax', () => {
      const result = LandmarkNavigator.navigateToLandmark({
        selector: 'div[invalid===syntax]',
        role: 'main',
      });

      assert.equal(result.success, false);
      assert.ok(result.message?.includes('Invalid CSS selector'));
    });
  });

  describe('6. PageTracker & Stale Remediation Cleanup', () => {
    it('reverts active remediation immediately when URL changes in an SPA', () => {
      const state = new StateManager('ar');
      state.updateSetting('remediationEnabled', true);

      const remediator = new DomRemediator(state);
      remediator.setAssistiveMap({
        labelOverrides: {},
        imageDescriptions: {
          '#img-hero': { selector: '#img-hero', alt: 'بطاقة الخدمة المعتمدة', confidence: 'high' },
        },
        actionIntents: {},
      });
      remediator.apply();

      const heroImg = dom.window.document.querySelector('#img-hero')!;
      assert.equal(heroImg.getAttribute('data-raawi-remediated-alt'), 'true');

      const client = new MapApiClient({ apiUrl: 'https://api.example.com', entityCode: 'TEST' });
      const tracker = new PageTracker({
        apiClient: client,
        domRemediator: remediator,
      });

      // Simulate SPA navigation
      dom.window.history.pushState({}, '', 'https://example.gov.sa/portal/new-page');

      // Remediation from previous page must be reverted immediately
      assert.equal(heroImg.hasAttribute('data-raawi-remediated-alt'), false);

      tracker.destroy();
    });

    it('reverts remediation and marks status outdated when meaningful content mutation occurs', () => {
      const state = new StateManager('ar');
      state.updateSetting('remediationEnabled', true);

      const remediator = new DomRemediator(state);
      remediator.setAssistiveMap({
        labelOverrides: {},
        imageDescriptions: {
          '#img-hero': { selector: '#img-hero', alt: 'بطاقة الخدمة المعتمدة', confidence: 'high' },
        },
        actionIntents: {},
      });
      remediator.apply();

      const heroImg = dom.window.document.querySelector('#img-hero')!;
      assert.equal(heroImg.getAttribute('data-raawi-remediated-alt'), 'true');

      const client = new MapApiClient({ apiUrl: 'https://api.example.com', entityCode: 'TEST' });
      // Feed initial matched package
      (client as any).currentData = {
        url: 'https://example.gov.sa/portal',
        matchConfidence: 'high',
        fingerprint: computeLivePageFingerprint(dom.window.document),
      };

      let staleReported = false;
      const tracker = new PageTracker({
        apiClient: client,
        domRemediator: remediator,
        onStaleDetected: () => {
          staleReported = true;
        },
      });

      // Change page title to make page stale
      dom.window.document.title = 'عنوان صفحة مختلف تماماً';
      tracker.checkCurrentPageFreshness();

      assert.equal(staleReported, true);
      assert.equal(client.getStatus(), 'outdated');
      assert.equal(heroImg.hasAttribute('data-raawi-remediated-alt'), false);

      tracker.destroy();
    });

    it('properly restores pushState and cleans up listeners on destroy', () => {
      const client = new MapApiClient({ apiUrl: 'https://api.example.com', entityCode: 'TEST' });
      const state = new StateManager('ar');
      const remediator = new DomRemediator(state);

      const originalPush = dom.window.history.pushState;
      const tracker = new PageTracker({
        apiClient: client,
        domRemediator: remediator,
      });

      assert.notEqual(dom.window.history.pushState, originalPush);

      tracker.destroy();
      assert.equal(dom.window.history.pushState, originalPush);
    });
  });
});
