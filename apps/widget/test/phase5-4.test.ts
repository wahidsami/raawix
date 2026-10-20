/**
 * Phase 5.4 Unit & Integration Tests: AssistiveMap Integration & Safe DOM Remediation
 * 
 * Verifies the actual scanner runtime contract for `matchConfidence` and page-package data
 * as implemented in `apps/scanner/src/index.ts`, `apps/scanner/src/db/assistive-map-repository.ts`,
 * and `apps/scanner/src/api/url-resolver.ts`.
 */

import { describe, it, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { JSDOM } = require('../../../node_modules/.pnpm/node_modules/jsdom');

describe('Phase 5.4: AssistiveMap Integration & Safe DOM Remediation', () => {
  let dom: JSDOM;
  let window: any;
  let document: Document;
  let StateManager: any;
  let MapApiClient: any;
  let evaluateMatchConfidence: any;
  let DomRemediator: any;
  let AccessibilityWidget: any;
  let RaawiAccessibilityWidget: any;

  before(async () => {
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl" data-raawi-entity-code="TEST-ENT-54" data-raawi-api-url="https://scanner.internal">
        <head>
          <title>Phase 5.4 Remediation Test Page</title>
        </head>
        <body>
          <header>
            <h1 id="page-title">بوابة الاختبار</h1>
            <!-- Image with no alt attribute -->
            <img id="img-no-alt" src="/assets/hero.jpg" class="hero-banner">
            
            <!-- Image with authored alt attribute -->
            <img id="img-with-alt" src="/assets/logo.png" alt="شعار الجهة الرسمي">

            <!-- Decorative image with intentional empty alt -->
            <img id="img-decorative" src="/assets/divider.svg" alt="">

            <!-- Ambiguous images sharing a common class -->
            <img class="gallery-item" src="/img1.jpg">
            <img class="gallery-item" src="/img2.jpg">
          </header>

          <main>
            <!-- Icon button without accessible name or text -->
            <button id="btn-icon-unlabeled" class="btn-icon">
              <svg><path d="M0 0h24v24H0z"/></svg>
            </button>

            <!-- Button with existing inner text -->
            <button id="btn-with-text">إرسال الطلب</button>

            <!-- Button with existing aria-label -->
            <button id="btn-with-aria-label" aria-label="بحث في البوابة">
              <svg><circle cx="10" cy="10" r="8"/></svg>
            </button>

            <!-- Button with aria-labelledby -->
            <span id="lbl-info">معلومات إضافية</span>
            <button id="btn-with-labelledby" aria-labelledby="lbl-info"></button>

            <!-- Input with associated label -->
            <label for="input-name">الاسم الكامل</label>
            <input id="input-name" type="text">

            <!-- Input wrapped in label -->
            <label id="lbl-wrapped">
              <span>البريد الإلكتروني</span>
              <input id="input-wrapped" type="email">
            </label>

            <!-- Unlabeled input field -->
            <input id="input-unlabeled" type="search" placeholder="ابحث...">
          </main>
        </body>
      </html>
    `, {
      url: 'https://portal.gov.sa/services',
      runScripts: 'dangerously',
    });

    window = dom.window;
    document = window.document;

    (global as any).window = window;
    (global as any).document = document;
    (global as any).HTMLElement = window.HTMLElement;
    (global as any).HTMLButtonElement = window.HTMLButtonElement;
    (global as any).HTMLInputElement = window.HTMLInputElement;
    (global as any).HTMLImageElement = window.HTMLImageElement;
    (global as any).customElements = window.customElements;
    (global as any).localStorage = window.localStorage;
    (global as any).MutationObserver = window.MutationObserver;
    (global as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 16);

    const typesMod = await import('../src/core/types');
    const stateMod = await import('../src/core/state');
    const apiMod = await import('../src/core/api-client');
    const remediatorMod = await import('../src/core/dom-remediator');
    const shadowMod = await import('../src/core/shadow-container');
    const mainMod = await import('../src/index');

    StateManager = stateMod.StateManager;
    MapApiClient = apiMod.MapApiClient;
    evaluateMatchConfidence = apiMod.evaluateMatchConfidence;
    DomRemediator = remediatorMod.DomRemediator;
    RaawiAccessibilityWidget = shadowMod.RaawiAccessibilityWidget;
    AccessibilityWidget = mainMod.AccessibilityWidget;
  });

  /**
   * Helper that mirrors the real scanner response builder
   * from `apps/scanner/src/index.ts:1113-1135`.
   */
  function createRealScannerPagePackage(overrides?: Record<string, any>) {
    return {
      siteId: 'site-uuid-101',
      entityId: 'entity-uuid-202',
      entityCode: 'TEST-ENT-54',
      propertyId: 'prop-uuid-303',
      propertyDomain: 'portal.gov.sa',
      url: 'https://portal.gov.sa/services',
      matchedUrl: 'https://portal.gov.sa/services',
      matchConfidence: 'high' as const, // Actual scanner enum
      generatedAt: new Date().toISOString(),
      fingerprint: {
        title: 'Phase 5.4 Remediation Test Page',
        firstHeading: 'بوابة الاختبار',
      },
      assistiveMap: {
        imageDescriptions: {
          'desc-1': {
            selector: '#img-no-alt',
            alt: 'صورة توضيحية لخدمات البوابة',
            confidence: 'high',
            source: 'vision',
          },
        },
        labelOverrides: {
          'lbl-1': {
            selector: '#btn-icon-unlabeled',
            label: 'فتح قائمة الإشعارات',
            confidence: 'high',
            source: 'dom',
          },
        },
        actionIntents: {},
        forms: [],
      },
      confidenceSummary: {
        imageDescriptions: { high: 1, medium: 0, low: 0 },
        labelOverrides: { high: 1, medium: 0, low: 0 },
        actionIntents: { high: 0, medium: 0, low: 0 },
      },
      semanticModel: null,
      guidance: {
        summary: 'بوابة الخدمات الحكومية الإلكترونية',
        landmarks: [{ role: 'main', label: 'المحتوى الرئيسي', selector: 'main' }],
        formSteps: [],
        keyActions: [],
      },
      issuesSummary: { total: 0, critical: 0, important: 0 },
      scanTimestamp: new Date().toISOString(),
      ...overrides,
    };
  }

  describe('1. MatchConfidence Policy Contract & Policy Evaluation', () => {
    it('correctly accepts actual scanner string enums: high and medium', () => {
      const highRes = evaluateMatchConfidence('high');
      assert.equal(highRes.accepted, true);
      assert.equal(highRes.normalizedLevel, 'high');
      assert.equal(highRes.numericScore, 1.0);

      const mediumRes = evaluateMatchConfidence('medium');
      assert.equal(mediumRes.accepted, true);
      assert.equal(mediumRes.normalizedLevel, 'medium');
      assert.equal(mediumRes.numericScore, 0.75);
    });

    it('correctly rejects scanner string enum: low with explicit reason', () => {
      const lowRes = evaluateMatchConfidence('low');
      assert.equal(lowRes.accepted, false);
      assert.equal(lowRes.normalizedLevel, 'low');
      assert.ok(lowRes.reason?.includes('Low match confidence enum'));
    });

    it('correctly maps blueprint and legacy alias enums without type errors', () => {
      // Blueprint high-confidence aliases
      assert.equal(evaluateMatchConfidence('exact').accepted, true);
      assert.equal(evaluateMatchConfidence('canonical').accepted, true);
      assert.equal(evaluateMatchConfidence('final').accepted, true);

      // Blueprint medium-confidence aliases
      assert.equal(evaluateMatchConfidence('path').accepted, true);
      assert.equal(evaluateMatchConfidence('query-ignored').accepted, true);

      // Blueprint low-confidence aliases
      assert.equal(evaluateMatchConfidence('fingerprint').accepted, false);
      assert.equal(evaluateMatchConfidence('none').accepted, false);
    });

    it('rejects missing, null, undefined, or unrecognized strings', () => {
      assert.equal(evaluateMatchConfidence(null).accepted, false);
      assert.equal(evaluateMatchConfidence(undefined).accepted, false);
      assert.equal(evaluateMatchConfidence('').accepted, false);
      assert.equal(evaluateMatchConfidence('arbitrary-invalid-enum').accepted, false);
    });

    it('normalizes numeric confidence scores accurately without string/numeric confusion', () => {
      // High score >= 0.85
      const numHigh = evaluateMatchConfidence(0.95);
      assert.equal(numHigh.accepted, true);
      assert.equal(numHigh.normalizedLevel, 'high');

      // Medium score >= 0.65
      const numMed = evaluateMatchConfidence(0.70);
      assert.equal(numMed.accepted, true);
      assert.equal(numMed.normalizedLevel, 'medium');

      // Low score < 0.65
      const numLow = evaluateMatchConfidence(0.40);
      assert.equal(numLow.accepted, false);
      assert.equal(numLow.normalizedLevel, 'low');

      // NaN
      const numNan = evaluateMatchConfidence(NaN);
      assert.equal(numNan.accepted, false);
    });
  });

  describe('2. MapApiClient Contract & Real Backend Response Validation', () => {
    it('initializes with detected entityCode and apiUrl from document attributes', () => {
      const client = new MapApiClient();
      assert.equal(client.getEntityCode(), 'TEST-ENT-54');
      assert.equal(client.getApiUrl(), 'https://scanner.internal');
      assert.equal(client.getStatus(), 'idle');
      client.destroy();
    });

    it('handles network failure gracefully without throwing uncaught exceptions', async () => {
      const originalFetch = window.fetch;
      const originalGlobalFetch = (global as any).fetch;
      const mockFail = async () => {
        throw new Error('Network timeout');
      };
      window.fetch = mockFail;
      (global as any).fetch = mockFail;

      const client = new MapApiClient();
      let notifiedStatus = '';
      client.subscribe((status: string) => {
        notifiedStatus = status;
      });

      const result = await client.fetchPagePackage('https://portal.gov.sa/services');
      assert.equal(result, null);
      assert.equal(client.getStatus(), 'offline');
      assert.equal(notifiedStatus, 'offline');

      window.fetch = originalFetch;
      (global as any).fetch = originalGlobalFetch;
      client.destroy();
    });

    it('accepts real scanner page package with matchConfidence: "high"', async () => {
      const originalFetch = window.fetch;
      const originalGlobalFetch = (global as any).fetch;
      const realPackage = createRealScannerPagePackage({ matchConfidence: 'high' });

      window.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => realPackage,
      } as any);
      (global as any).fetch = window.fetch;

      const client = new MapApiClient();
      const result = await client.fetchPagePackage('https://portal.gov.sa/services');

      assert.notEqual(result, null);
      assert.equal(client.getStatus(), 'ready');
      assert.equal(result?.matchConfidence, 'high');
      assert.equal(result?.guidance?.summary, 'بوابة الخدمات الحكومية الإلكترونية');

      window.fetch = originalFetch;
      (global as any).fetch = originalGlobalFetch;
      client.destroy();
    });

    it('accepts real scanner page package with matchConfidence: "medium"', async () => {
      const originalFetch = window.fetch;
      const originalGlobalFetch = (global as any).fetch;
      const realPackage = createRealScannerPagePackage({ matchConfidence: 'medium' });

      window.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => realPackage,
      } as any);
      (global as any).fetch = window.fetch;

      const client = new MapApiClient();
      const result = await client.fetchPagePackage('https://portal.gov.sa/services');

      assert.notEqual(result, null);
      assert.equal(client.getStatus(), 'ready');
      assert.equal(result?.matchConfidence, 'medium');

      window.fetch = originalFetch;
      (global as any).fetch = originalGlobalFetch;
      client.destroy();
    });

    it('rejects low confidence maps ("low") and marks status as mismatch', async () => {
      const originalFetch = window.fetch;
      const originalGlobalFetch = (global as any).fetch;
      const lowPackage = createRealScannerPagePackage({ matchConfidence: 'low' });

      window.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => lowPackage,
      } as any);
      (global as any).fetch = window.fetch;

      const client = new MapApiClient();
      const result = await client.fetchPagePackage('https://portal.gov.sa/services');

      assert.equal(result, null);
      assert.equal(client.getStatus(), 'mismatch');

      window.fetch = originalFetch;
      (global as any).fetch = originalGlobalFetch;
      client.destroy();
    });

    it('rejects package when matchedUrl belongs to a different domain', async () => {
      const originalFetch = window.fetch;
      const originalGlobalFetch = (global as any).fetch;
      const mismatchedDomainPackage = createRealScannerPagePackage({
        matchedUrl: 'https://different-domain.gov.sa/services',
      });

      window.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => mismatchedDomainPackage,
      } as any);
      (global as any).fetch = window.fetch;

      const client = new MapApiClient();
      const result = await client.fetchPagePackage('https://portal.gov.sa/services');

      assert.equal(result, null);
      assert.equal(client.getStatus(), 'mismatch');

      window.fetch = originalFetch;
      (global as any).fetch = originalGlobalFetch;
      client.destroy();
    });

    it('caches valid page-package responses and avoids duplicate network requests', async () => {
      let fetchCallCount = 0;
      const originalFetch = window.fetch;
      const originalGlobalFetch = (global as any).fetch;
      const validPackage = createRealScannerPagePackage({ matchConfidence: 'high' });

      window.fetch = async () => {
        fetchCallCount++;
        return {
          ok: true,
          status: 200,
          json: async () => validPackage,
        } as any;
      };
      (global as any).fetch = window.fetch;

      const client = new MapApiClient();
      const res1 = await client.fetchPagePackage('https://portal.gov.sa/services');
      assert.notEqual(res1, null);
      assert.equal(client.getStatus(), 'ready');
      assert.equal(fetchCallCount, 1);

      // Second call must return cached copy
      const res2 = await client.fetchPagePackage('https://portal.gov.sa/services');
      assert.deepEqual(res1, res2);
      assert.equal(fetchCallCount, 1);

      window.fetch = originalFetch;
      (global as any).fetch = originalGlobalFetch;
      client.destroy();
    });
  });

  describe('3. Safe Image Remediation with Real Schema', () => {
    it('applies description only to images missing alt attributes from real schema', () => {
      const state = new StateManager('ar');
      const remediator = new DomRemediator(state);

      const imgNoAlt = document.getElementById('img-no-alt') as HTMLImageElement;
      assert.equal(imgNoAlt.hasAttribute('alt'), false);

      // Real scanner schema: imageDescriptions is a Record<string, ImageDescription> with 'alt'
      remediator.setAssistiveMap({
        labelOverrides: {},
        actionIntents: {},
        imageDescriptions: {
          'img-1': {
            selector: '#img-no-alt',
            alt: 'صورة توضيحية لخدمات البوابة',
            confidence: 'high',
            source: 'vision',
          },
        },
      });

      // Remediation is opt-in: should not apply yet
      assert.equal(imgNoAlt.hasAttribute('alt'), false);

      // Activate remediation
      remediator.apply();
      assert.equal(imgNoAlt.getAttribute('alt'), 'صورة توضيحية لخدمات البوابة');
      assert.equal(remediator.getRemediatedImagesCount(), 1);

      // Revert
      remediator.revert();
      assert.equal(imgNoAlt.hasAttribute('alt'), false);
      assert.equal(remediator.getActiveChangesCount(), 0);
    });

    it('strictly preserves authored non-empty alt text and intentional empty alt=""', () => {
      const state = new StateManager('ar');
      const remediator = new DomRemediator(state);

      const imgWithAlt = document.getElementById('img-with-alt') as HTMLImageElement;
      const imgDecorative = document.getElementById('img-decorative') as HTMLImageElement;

      assert.equal(imgWithAlt.getAttribute('alt'), 'شعار الجهة الرسمي');
      assert.equal(imgDecorative.getAttribute('alt'), '');

      remediator.setAssistiveMap({
        labelOverrides: {},
        actionIntents: {},
        imageDescriptions: {
          'img-auth': { selector: '#img-with-alt', alt: 'شعار مختلف تم تخمينه', confidence: 'high' },
          'img-dec': { selector: '#img-decorative', alt: 'خط فاصل زخرفي', confidence: 'high' },
        },
      });

      remediator.apply();

      // Authored alt must NOT be overwritten
      assert.equal(imgWithAlt.getAttribute('alt'), 'شعار الجهة الرسمي');

      // Intentional decorative alt="" must NOT be overwritten
      assert.equal(imgDecorative.getAttribute('alt'), '');

      // Zero changes recorded
      assert.equal(remediator.getActiveChangesCount(), 0);
    });

    it('rejects ambiguous selectors matching multiple images', () => {
      const state = new StateManager('ar');
      const remediator = new DomRemediator(state);

      const galleryImages = document.querySelectorAll('.gallery-item');
      assert.equal(galleryImages.length, 2);

      remediator.setAssistiveMap({
        labelOverrides: {},
        actionIntents: {},
        imageDescriptions: {
          'gallery-ambiguous': { selector: '.gallery-item', alt: 'صورة معرض عامة', confidence: 'high' },
        },
      });

      remediator.apply();

      // Ambiguous selector must be rejected
      galleryImages.forEach((img) => {
        assert.equal(img.hasAttribute('alt'), false);
      });
      assert.equal(remediator.getActiveChangesCount(), 0);
    });

    it('safely handles invalid CSS selector syntax without throwing', () => {
      const state = new StateManager('ar');
      const remediator = new DomRemediator(state);

      remediator.setAssistiveMap({
        labelOverrides: {},
        actionIntents: {},
        imageDescriptions: {
          'invalid-sel': { selector: 'img[invalid==syntax]]::unknown', alt: 'وصف تجريبي', confidence: 'high' },
        },
      });

      assert.doesNotThrow(() => {
        remediator.apply();
      });
      assert.equal(remediator.getActiveChangesCount(), 0);
    });
  });

  describe('4. Safe Control Label Remediation with Real Schema', () => {
    it('applies generated aria-label only to controls without accessible names', () => {
      const state = new StateManager('ar');
      const remediator = new DomRemediator(state);

      const btnIcon = document.getElementById('btn-icon-unlabeled') as HTMLButtonElement;
      assert.equal(btnIcon.hasAttribute('aria-label'), false);

      // Real scanner schema: labelOverrides is Record<string, LabelOverride> with 'label'
      remediator.setAssistiveMap({
        actionIntents: {},
        imageDescriptions: {},
        labelOverrides: {
          'btn-1': { selector: '#btn-icon-unlabeled', label: 'فتح قائمة الإشعارات', confidence: 'high' },
        },
      });

      remediator.apply();
      assert.equal(btnIcon.getAttribute('aria-label'), 'فتح قائمة الإشعارات');
      assert.equal(remediator.getRemediatedControlsCount(), 1);

      // Revert restores original state (attribute removed)
      remediator.revert();
      assert.equal(btnIcon.hasAttribute('aria-label'), false);
    });

    it('preserves controls that have authored text, aria-label, aria-labelledby, or associated labels', () => {
      const state = new StateManager('ar');
      const remediator = new DomRemediator(state);

      const btnText = document.getElementById('btn-with-text') as HTMLButtonElement;
      const btnAria = document.getElementById('btn-with-aria-label') as HTMLButtonElement;
      const btnLabelled = document.getElementById('btn-with-labelledby') as HTMLButtonElement;
      const inputNamed = document.getElementById('input-name') as HTMLInputElement;
      const inputWrapped = document.getElementById('input-wrapped') as HTMLInputElement;

      remediator.setAssistiveMap({
        actionIntents: {},
        imageDescriptions: {},
        labelOverrides: {
          'btn-text': { selector: '#btn-with-text', label: 'إرسال معدل', confidence: 'high' },
          'btn-aria': { selector: '#btn-with-aria-label', label: 'بحث معدل', confidence: 'high' },
          'btn-labelled': { selector: '#btn-with-labelledby', label: 'معلومات معدلة', confidence: 'high' },
          'input-name': { selector: '#input-name', label: 'الاسم معدل', confidence: 'high' },
          'input-wrap': { selector: '#input-wrapped', label: 'البريد معدل', confidence: 'high' },
        },
      });

      remediator.apply();

      // Check all controls retain their original accessible names
      assert.equal(btnText.hasAttribute('aria-label'), false);
      assert.equal(btnAria.getAttribute('aria-label'), 'بحث في البوابة');
      assert.equal(btnLabelled.getAttribute('aria-labelledby'), 'lbl-info');
      assert.equal(btnLabelled.hasAttribute('aria-label'), false);
      assert.equal(inputNamed.hasAttribute('aria-label'), false);
      assert.equal(inputWrapped.hasAttribute('aria-label'), false);

      assert.equal(remediator.getActiveChangesCount(), 0);
    });
  });

  describe('5. Ownership-Aware Restoration & Host Modifications', () => {
    it('does not overwrite host modification made while remediation was active', () => {
      const state = new StateManager('ar');
      const remediator = new DomRemediator(state);

      const btn = document.getElementById('btn-icon-unlabeled') as HTMLButtonElement;
      remediator.setAssistiveMap({
        actionIntents: {},
        imageDescriptions: {},
        labelOverrides: {
          'btn-temp': { selector: '#btn-icon-unlabeled', label: 'تسمية مؤقتة', confidence: 'high' },
        },
      });

      remediator.apply();
      assert.equal(btn.getAttribute('aria-label'), 'تسمية مؤقتة');

      // Host script dynamically sets a real label
      btn.setAttribute('aria-label', 'تسمية أنشأها تطبيق المضيف');

      // Widget reverts remediation (e.g. user toggles off)
      remediator.revert();

      // Remediation must respect host ownership and NOT revert to null/empty!
      assert.equal(btn.getAttribute('aria-label'), 'تسمية أنشأها تطبيق المضيف');

      // Cleanup for remaining tests
      btn.removeAttribute('aria-label');
    });

    it('handles removal of target element from DOM gracefully', () => {
      const state = new StateManager('ar');
      const remediator = new DomRemediator(state);

      // Create a temporary element
      const tempImg = document.createElement('img');
      tempImg.id = 'temp-img-dynamic';
      document.body.appendChild(tempImg);

      remediator.setAssistiveMap({
        actionIntents: {},
        labelOverrides: {},
        imageDescriptions: {
          'temp-desc': { selector: '#temp-img-dynamic', alt: 'صورة مؤقتة', confidence: 'high' },
        },
      });

      remediator.apply();
      assert.equal(tempImg.getAttribute('alt'), 'صورة مؤقتة');

      // Host removes element from DOM
      tempImg.remove();

      // Revert should not crash even if element is disconnected
      assert.doesNotThrow(() => {
        remediator.revert();
      });
    });
  });

  describe('6. Widget Full Integration & Reset Lifecycle', () => {
    it('integrates DomRemediator and MapApiClient with custom element', () => {
      const widget = new RaawiAccessibilityWidget();
      document.body.appendChild(widget);

      const apiClient = widget.getApiClient();
      const remediator = widget.getDomRemediator();
      const state = widget.getStateManager();

      assert.notEqual(apiClient, null);
      assert.notEqual(remediator, null);
      assert.equal(state.getSettings().remediationEnabled, false); // Opt-in default

      // Turning on remediation via state applies remediator
      state.updateSetting('remediationEnabled', true);
      assert.equal(remediator.isRemediationActive(), true);

      // Resetting settings turns off remediation and reverts changes
      state.resetSettings();
      assert.equal(state.getSettings().remediationEnabled, false);
      assert.equal(remediator.isRemediationActive(), false);

      widget.remove();
    });
  });
});
