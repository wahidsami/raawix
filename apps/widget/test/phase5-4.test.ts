/**
 * Phase 5.4 Unit & Integration Tests: AssistiveMap Integration & Safe DOM Remediation
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
    DomRemediator = remediatorMod.DomRemediator;
    RaawiAccessibilityWidget = shadowMod.RaawiAccessibilityWidget;
    AccessibilityWidget = mainMod.AccessibilityWidget;
  });

  describe('1. MapApiClient Contract & Safety', () => {
    it('initializes with detected entityCode and apiUrl from document attributes', () => {
      const client = new MapApiClient();
      assert.equal(client.getEntityCode(), 'TEST-ENT-54');
      assert.equal(client.getApiUrl(), 'https://scanner.internal');
      assert.equal(client.getStatus(), 'idle');
      client.destroy();
    });

    it('handles network failure gracefully without throwing uncaught exceptions', async () => {
      // Mock fetch rejection
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

    it('rejects low confidence maps (< 0.65) and marks status as mismatch', async () => {
      const originalFetch = window.fetch;
      const originalGlobalFetch = (global as any).fetch;
      const mockMismatch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          targetUrl: 'https://portal.gov.sa/services',
          matchConfidence: 0.45, // low confidence
          assistiveMap: {
            imageDescriptions: [{ selector: '#img-no-alt', description: 'Hero banner', confidence: 0.9 }],
          },
        }),
      } as any);
      window.fetch = mockMismatch;
      (global as any).fetch = mockMismatch;

      const client = new MapApiClient();
      const result = await client.fetchPagePackage('https://portal.gov.sa/services');
      assert.equal(result, null);
      assert.equal(client.getStatus(), 'mismatch');

      window.fetch = originalFetch;
      (global as any).fetch = originalGlobalFetch;
      client.destroy();
    });

    it('accepts high confidence valid page-package and populates cache', async () => {
      let fetchCallCount = 0;
      const originalFetch = window.fetch;
      const originalGlobalFetch = (global as any).fetch;
      const mockSuccess = async () => {
        fetchCallCount++;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            targetUrl: 'https://portal.gov.sa/services',
            matchConfidence: 0.95,
            guidance: {
              summary: 'بوابة الخدمات الحكومية الإلكترونية',
              landmarks: [{ role: 'main', label: 'المحتوى الرئيسي', selector: 'main' }],
            },
            assistiveMap: {
              imageDescriptions: [
                { selector: '#img-no-alt', description: 'صورة توضيحية لخدمات البوابة', confidence: 0.95 },
              ],
              labelOverrides: [
                { selector: '#btn-icon-unlabeled', ariaLabel: 'فتح قائمة الإشعارات', confidence: 0.9 },
              ],
            },
          }),
        } as any;
      };
      window.fetch = mockSuccess;
      (global as any).fetch = mockSuccess;

      const client = new MapApiClient();
      const res1 = await client.fetchPagePackage('https://portal.gov.sa/services');
      assert.notEqual(res1, null);
      assert.equal(client.getStatus(), 'ready');
      assert.equal(fetchCallCount, 1);

      // Repeated call should hit in-memory cache
      const res2 = await client.fetchPagePackage('https://portal.gov.sa/services');
      assert.deepEqual(res1, res2);
      assert.equal(fetchCallCount, 1);

      window.fetch = originalFetch;
      (global as any).fetch = originalGlobalFetch;
      client.destroy();
    });
  });

  describe('2. Safe Image Remediation', () => {
    it('applies description only to images missing alt attributes', () => {
      const state = new StateManager('ar');
      const remediator = new DomRemediator(state);

      const imgNoAlt = document.getElementById('img-no-alt') as HTMLImageElement;
      assert.equal(imgNoAlt.hasAttribute('alt'), false);

      remediator.setAssistiveMap({
        imageDescriptions: [
          { selector: '#img-no-alt', description: 'صورة توضيحية لخدمات البوابة', confidence: 0.95 },
        ],
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
        imageDescriptions: [
          { selector: '#img-with-alt', description: 'شعار مختلف تم تخمينه', confidence: 0.99 },
          { selector: '#img-decorative', description: 'خط فاصل زخرفي', confidence: 0.99 },
        ],
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
        imageDescriptions: [
          { selector: '.gallery-item', description: 'صورة معرض عامة', confidence: 0.95 },
        ],
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
        imageDescriptions: [
          { selector: 'img[invalid==syntax]]::unknown', description: 'وصف تجريبي', confidence: 0.95 },
        ],
      });

      assert.doesNotThrow(() => {
        remediator.apply();
      });
      assert.equal(remediator.getActiveChangesCount(), 0);
    });
  });

  describe('3. Safe Control Label Remediation', () => {
    it('applies generated aria-label only to controls without accessible names', () => {
      const state = new StateManager('ar');
      const remediator = new DomRemediator(state);

      const btnIcon = document.getElementById('btn-icon-unlabeled') as HTMLButtonElement;
      assert.equal(btnIcon.hasAttribute('aria-label'), false);

      remediator.setAssistiveMap({
        labelOverrides: [
          { selector: '#btn-icon-unlabeled', ariaLabel: 'فتح قائمة الإشعارات', confidence: 0.92 },
        ],
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
        labelOverrides: [
          { selector: '#btn-with-text', ariaLabel: 'إرسال معدل', confidence: 0.98 },
          { selector: '#btn-with-aria-label', ariaLabel: 'بحث معدل', confidence: 0.98 },
          { selector: '#btn-with-labelledby', ariaLabel: 'معلومات معدلة', confidence: 0.98 },
          { selector: '#input-name', ariaLabel: 'الاسم معدل', confidence: 0.98 },
          { selector: '#input-wrapped', ariaLabel: 'البريد معدل', confidence: 0.98 },
        ],
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

  describe('4. Ownership-Aware Restoration & Host Modifications', () => {
    it('does not overwrite host modification made while remediation was active', () => {
      const state = new StateManager('ar');
      const remediator = new DomRemediator(state);

      const btn = document.getElementById('btn-icon-unlabeled') as HTMLButtonElement;
      remediator.setAssistiveMap({
        labelOverrides: [
          { selector: '#btn-icon-unlabeled', ariaLabel: 'تسمية مؤقتة', confidence: 0.9 },
        ],
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
        imageDescriptions: [
          { selector: '#temp-img-dynamic', description: 'صورة مؤقتة', confidence: 0.9 },
        ],
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

  describe('5. Widget Full Integration & Reset Lifecycle', () => {
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
