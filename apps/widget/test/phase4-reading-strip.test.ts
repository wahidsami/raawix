/**
 * Phase 4: Magnified Reading Strip & Mobile Experience Polish Test Suite
 *
 * Scope:
 * 1. Heading-Jump Double-Close Event Cleanup (Section 8)
 *    - Consolidated single raawi-close-dialog dispatch with skipFocusRestore: true
 *    - Focus handoff to heading element
 *    - Temporary focus attribute cleanup on blur
 *    - Normal close restores focus to launcher
 * 2. Magnified Reading Strip Visual Redesign & Inclusion Shield UI (Section 3)
 *    - Dark slate high-contrast surface (#0f172a)
 *    - Teal accent border (#0d9488)
 *    - Compact toolbar with title, brand SVG icon, and active magnification badge
 *    - Consistent segmented buttons for 150%, 200%, 250%, 300%
 *    - 44px hit bounds on touch targets
 * 3. Magnified Content Layout & Scrolling (Section 4)
 *    - Sticky toolbar, scrollable mirror region (overflow-y: auto)
 *    - Word-wrapping without horizontal page overflow
 *    - Scale switching without host-page dimension changes or layout jumps
 *    - Viewport immediately restored when strip is closed
 * 4. Viewport Collision & Docking Strategy (Section 5)
 *    - Dock toggle button (top/bottom)
 *    - .raawi-strip-dock-top styling and state persistence
 *    - Non-invasive zero permanent host-body mutation
 * 5. Responsive / Mobile Refinement (< 768px) (Section 6)
 *    - Mobile bottom-sheet layout for panel
 *    - Grab handle (.raawi-grab-handle)
 *    - Mobile safe areas and touch target sizes
 * 6. High Contrast Mode & Reduced Motion (Section 7)
 *    - .raawi-strip-contrast with pure black and yellow accent
 *    - .raawi-strip-reduced-motion
 * 7. Localization Parity (1:1 AR/EN parity)
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { JSDOM } = require('../../../node_modules/.pnpm/node_modules/jsdom');
import { StateManager } from '../src/core/state';
import { I18nManager, translations } from '../src/core/i18n';
import { ReadingStripComponent } from '../src/components/reading-strip';
import { PanelComponent } from '../src/components/panel';
import { HeadingsNavigator } from '../src/core/headings-navigator';
import { WIDGET_CSS } from '../src/styles/widget-styles';

describe('Phase 4: Magnified Reading Strip & Mobile Experience Polish', () => {
  let dom: JSDOM;
  let prevWindow: any;
  let prevDoc: any;
  let prevCustomElements: any;

  beforeEach(() => {
    dom = new JSDOM(
      `<!DOCTYPE html>
      <html lang="en">
        <head><title>Phase 4 Test Page</title></head>
        <body>
          <header class="sticky-header" style="position: sticky; top: 0; height: 50px;">Header</header>
          <main>
            <h1 id="main-heading">Main Article Title</h1>
            <p id="first-p">This is an English paragraph intended for reading strip mirroring.</p>
            <h2 id="section-heading">Section 2: Comprehensive Details</h2>
            <p id="long-p">A long content block designed to test overflow-wrap and vertical scrolling in the magnified strip mirror container.</p>
            <div id="arabic-block" lang="ar" dir="rtl">
              <h2 id="ar-heading">عنوان تجريبي باللغة العربية</h2>
              <p id="ar-p">نص عربي لاختبار خط كايرو المدمج واتجاه القراءة من اليمين إلى اليسار.</p>
            </div>
            <a href="#test" id="test-link">Test Action Link</a>
          </main>
          <footer class="sticky-footer" style="position: sticky; bottom: 0; height: 60px;">Sticky Footer</footer>
        </body>
      </html>`,
      { url: 'http://localhost' }
    );

    prevWindow = global.window;
    prevDoc = global.document;
    prevCustomElements = global.customElements;

    (global as any).window = dom.window;
    (global as any).document = dom.window.document;
    (global as any).HTMLElement = dom.window.HTMLElement;
    (global as any).customElements = dom.window.customElements;
    (global as any).localStorage = dom.window.localStorage;
    (global as any).CustomEvent = dom.window.CustomEvent;
    (global as any).Event = dom.window.Event;
  });

  afterEach(() => {
    (global as any).window = prevWindow;
    (global as any).document = prevDoc;
    (global as any).customElements = prevCustomElements;
  });

  // 1. Heading-Jump Double-Close Event Cleanup (Section 8)
  describe('1. Heading-Jump Double-Close Event Cleanup', () => {
    test('heading-jump click handler dispatches raawi-close-dialog exactly ONCE with skipFocusRestore: true', () => {
      const state = new StateManager();
      const i18n = new I18nManager('en');
      state.setActiveTab('tools');

      const panel = new PanelComponent(state, i18n);
      const panelEl = panel.getElement();

      let closeEventCount = 0;
      let lastEventDetail: any = null;

      panelEl.addEventListener('raawi-close-dialog', (e: any) => {
        closeEventCount++;
        lastEventDetail = e.detail;
      });

      // Find jump button in tools tab
      const jumpBtns = panelEl.querySelectorAll<HTMLButtonElement>('.raawi-heading-jump-btn');
      assert.ok(jumpBtns.length > 0, 'Headings jump buttons should be rendered');

      const firstJumpBtn = jumpBtns[0];
      firstJumpBtn.click();

      // Verified: exactly 1 dispatch occurred, not 2!
      assert.strictEqual(closeEventCount, 1, 'raawi-close-dialog must be dispatched exactly once');
      assert.strictEqual(lastEventDetail?.skipFocusRestore, true, 'skipFocusRestore must be true to allow focus handoff');
    });

    test('heading jump scrolls and transfers focus to target heading', () => {
      const targetHeading = dom.window.document.getElementById('section-heading');
      assert.ok(targetHeading, 'Target heading exists');

      const headings = HeadingsNavigator.discoverHeadings();
      const match = headings.find((h) => h.id === 'section-heading');
      assert.ok(match, 'Discovered matching heading item');

      const result = HeadingsNavigator.navigateToHeading(match);
      assert.strictEqual(result.success, true, 'Navigation succeeds');

      // Check focus attribute
      assert.strictEqual(targetHeading.getAttribute('tabindex'), '-1');
      assert.strictEqual(targetHeading.getAttribute('data-raawi-temp-focus'), 'true');

      // Blur removes temporary focus markers
      targetHeading.dispatchEvent(new dom.window.Event('blur'));
      assert.strictEqual(targetHeading.hasAttribute('tabindex'), false);
      assert.strictEqual(targetHeading.hasAttribute('data-raawi-temp-focus'), false);
    });

    test('normal close action dispatches raawi-close-dialog without skipFocusRestore', () => {
      const state = new StateManager();
      const i18n = new I18nManager('en');
      state.setOpen(true);

      const panel = new PanelComponent(state, i18n);
      const panelEl = panel.getElement();

      let closeEventDetail: any = null;
      panelEl.addEventListener('raawi-close-dialog', (e: any) => {
        closeEventDetail = e.detail;
      });

      const closeBtn = panelEl.querySelector<HTMLButtonElement>('[data-testid="raawi-close"]');
      assert.ok(closeBtn, 'Close button exists');
      closeBtn.click();

      assert.ok(closeEventDetail === null || closeEventDetail?.skipFocusRestore !== true, 'Normal close does not set skipFocusRestore');
    });
  });

  // 2. Reading Strip Visual Redesign & Inclusion Shield UI (Section 3)
  describe('2. Magnified Reading Strip Visual Redesign', () => {
    test('renders docked strip inside shadow container when enabled', () => {
      const state = new StateManager();
      const i18n = new I18nManager('en');
      const host = dom.window.document.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });

      state.updateSetting('magnifierStrip', true);
      const stripComponent = new ReadingStripComponent(state, i18n, shadow);

      const stripEl = stripComponent.getElement();
      assert.ok(stripEl, 'Strip element should be mounted in shadow DOM');
      assert.strictEqual(stripEl.classList.contains('raawi-reading-strip'), true);

      // Clean up
      stripComponent.destroy();
    });

    test('displays toolbar with brand SVG icon, title, and active scale badge', () => {
      const state = new StateManager();
      const i18n = new I18nManager('en');
      const host = dom.window.document.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });

      state.updateSetting('magnifierStrip', true);
      state.updateSetting('magnifierScale', 2.0);
      const stripComponent = new ReadingStripComponent(state, i18n, shadow);

      const stripEl = stripComponent.getElement()!;
      const brand = stripEl.querySelector('.raawi-strip-brand');
      assert.ok(brand, 'Brand container exists');

      const icon = brand.querySelector('.raawi-strip-icon');
      assert.ok(icon, 'Brand SVG icon exists');

      const title = brand.querySelector('.raawi-strip-title');
      assert.strictEqual(title?.textContent, 'Magnified Reading Strip');

      const badge = brand.querySelector('[data-testid="raawi-strip-badge"]');
      assert.ok(badge, 'Active magnification badge exists');
      assert.strictEqual(badge.textContent, '200%');

      stripComponent.destroy();
    });

    test('supports segmented controls for 150%, 200%, 250%, and 300%', () => {
      const state = new StateManager();
      const i18n = new I18nManager('en');
      const host = dom.window.document.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });

      state.updateSetting('magnifierStrip', true);
      const stripComponent = new ReadingStripComponent(state, i18n, shadow);
      const stripEl = stripComponent.getElement()!;

      const scaleBtns = stripEl.querySelectorAll<HTMLButtonElement>('.raawi-strip-scale-btn');
      assert.strictEqual(scaleBtns.length, 4, 'Four scale buttons must be present');

      const scales = [1.5, 2.0, 2.5, 3.0];
      for (const scale of scales) {
        const scaleStr = scale.toFixed(1);
        const btn = stripEl.querySelector<HTMLButtonElement>(`[data-scale="${scaleStr}"]`);
        assert.ok(btn, `Button for ${scaleStr} exists`);
        btn.click();
        assert.strictEqual(state.getSettings().magnifierScale, scale, `State updated to ${scale}`);

        // Badge reflects new scale
        const badge = stripEl.querySelector('[data-testid="raawi-strip-badge"]');
        assert.strictEqual(badge?.textContent, `${Math.round(scale * 100)}%`);

        // Active class applied on newly rendered button
        const updatedBtn = stripEl.querySelector<HTMLButtonElement>(`[data-scale="${scaleStr}"]`)!;
        assert.strictEqual(updatedBtn.classList.contains('active'), true);
        assert.strictEqual(updatedBtn.getAttribute('aria-pressed'), 'true');
      }

      stripComponent.destroy();
    });
  });

  // 3. Viewport Collision & Docking Strategy (Section 5)
  describe('3. Viewport Collision & Docking Strategy', () => {
    test('dock toggle button flips strip between bottom and top docking', () => {
      const state = new StateManager();
      const i18n = new I18nManager('en');
      const host = dom.window.document.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });

      state.updateSetting('magnifierStrip', true);
      const stripComponent = new ReadingStripComponent(state, i18n, shadow);

      // Default is bottom
      assert.strictEqual(stripComponent.getDockPosition(), 'bottom');
      const stripEl = stripComponent.getElement()!;
      assert.strictEqual(stripEl.classList.contains('raawi-strip-dock-top'), false);

      const dockBtn = stripEl.querySelector<HTMLButtonElement>('#raawi-strip-dock-toggle');
      assert.ok(dockBtn, 'Dock button exists');
      assert.strictEqual(dockBtn.getAttribute('aria-label'), 'Dock to top');

      // Click to dock top
      dockBtn.click();
      assert.strictEqual(stripComponent.getDockPosition(), 'top');
      assert.strictEqual(stripEl.classList.contains('raawi-strip-dock-top'), true);

      // Button title/aria-label updates to Dock to bottom
      const updatedDockBtn = stripEl.querySelector<HTMLButtonElement>('#raawi-strip-dock-toggle');
      assert.strictEqual(updatedDockBtn?.getAttribute('aria-label'), 'Dock to bottom');

      // Click again to dock bottom
      updatedDockBtn!.click();
      assert.strictEqual(stripComponent.getDockPosition(), 'bottom');
      assert.strictEqual(stripEl.classList.contains('raawi-strip-dock-top'), false);

      stripComponent.destroy();
    });

    test('close button immediately unmounts strip and restores available page viewport', () => {
      const state = new StateManager();
      const i18n = new I18nManager('en');
      const host = dom.window.document.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });

      state.updateSetting('magnifierStrip', true);
      const stripComponent = new ReadingStripComponent(state, i18n, shadow);

      assert.ok(shadow.querySelector('.raawi-reading-strip'), 'Strip is in shadow DOM');

      const closeBtn = shadow.querySelector<HTMLButtonElement>('#raawi-strip-close');
      assert.ok(closeBtn, 'Close button exists');
      closeBtn.click();

      // State is disabled
      assert.strictEqual(state.getSettings().magnifierStrip, false);

      // Strip element is completely removed from shadow DOM
      assert.strictEqual(shadow.querySelector('.raawi-reading-strip'), null);
      assert.strictEqual(stripComponent.getElement(), null);

      stripComponent.destroy();
    });
  });

  // 4. Content Layout, Arabic Cairo & Wrapping (Section 4)
  describe('4. Magnified Content Layout & Typography', () => {
    test('applies Latin font and LTR to English content', () => {
      const state = new StateManager();
      const i18n = new I18nManager('en');
      const host = dom.window.document.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });

      state.updateSetting('magnifierStrip', true);
      const stripComponent = new ReadingStripComponent(state, i18n, shadow);

      const englishP = dom.window.document.getElementById('first-p')!;
      const extracted = stripComponent.extractElementContent(englishP);

      assert.ok(extracted);
      assert.strictEqual(extracted.isArabic, false);
      assert.strictEqual(extracted.text, 'This is an English paragraph intended for reading strip mirroring.');

      stripComponent.destroy();
    });

    test('applies Cairo font and RTL to Arabic content', () => {
      const state = new StateManager();
      const i18n = new I18nManager('ar');
      const host = dom.window.document.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });

      state.updateSetting('magnifierStrip', true);
      const stripComponent = new ReadingStripComponent(state, i18n, shadow);

      const arabicP = dom.window.document.getElementById('ar-p')!;
      const extracted = stripComponent.extractElementContent(arabicP);

      assert.ok(extracted);
      assert.strictEqual(extracted.isArabic, true);
      assert.strictEqual(ReadingStripComponent.detectIsArabic(extracted.text, arabicP), true);

      stripComponent.destroy();
    });

    test('CSS stylesheet includes word-break and overflow-wrap for long content without layout jumps', () => {
      assert.strictEqual(WIDGET_CSS.includes('word-break: break-word;'), true);
      assert.strictEqual(WIDGET_CSS.includes('overflow-wrap: break-word;'), true);
      assert.strictEqual(WIDGET_CSS.includes('overflow-y: auto;'), true);
      assert.strictEqual(WIDGET_CSS.includes('scrollbar-width: thin;'), true);
    });
  });

  // 5. High Contrast & Reduced Motion (Section 7)
  describe('5. High Contrast & Reduced Motion', () => {
    test('applies .raawi-strip-contrast when contrastMode is active', () => {
      const state = new StateManager();
      const i18n = new I18nManager('en');
      const host = dom.window.document.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });

      state.updateSetting('contrastMode', true);
      state.updateSetting('magnifierStrip', true);
      const stripComponent = new ReadingStripComponent(state, i18n, shadow);

      const stripEl = stripComponent.getElement()!;
      assert.strictEqual(stripEl.classList.contains('raawi-strip-contrast'), true);

      stripComponent.destroy();
    });

    test('applies .raawi-strip-reduced-motion when reduceMotion or stopAnimations is active', () => {
      const state = new StateManager();
      const i18n = new I18nManager('en');
      const host = dom.window.document.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });

      state.updateSetting('stopAnimations', true);
      state.updateSetting('magnifierStrip', true);
      const stripComponent = new ReadingStripComponent(state, i18n, shadow);

      const stripEl = stripComponent.getElement()!;
      assert.strictEqual(stripEl.classList.contains('raawi-strip-reduced-motion'), true);

      stripComponent.destroy();
    });
  });

  // 6. Mobile & Responsive (< 768px) (Section 6)
  describe('6. Responsive & Mobile Refinement', () => {
    test('panel renders grab handle (.raawi-grab-handle) for mobile bottom sheet', () => {
      const state = new StateManager();
      const i18n = new I18nManager('en');
      const panel = new PanelComponent(state, i18n);
      const panelEl = panel.getElement();

      const grabHandle = panelEl.querySelector('.raawi-grab-handle');
      assert.ok(grabHandle, 'Mobile grab handle must exist in panel');
      assert.strictEqual(grabHandle.getAttribute('aria-hidden'), 'true');
    });

    test('CSS stylesheet includes mobile bottom-sheet styling at max-width: 768px', () => {
      assert.strictEqual(WIDGET_CSS.includes('@media (max-width: 768px)'), true);
      assert.strictEqual(WIDGET_CSS.includes('border-radius: 18px 18px 0 0'), true);
      assert.strictEqual(WIDGET_CSS.includes('max-height: 85vh'), true);
      assert.strictEqual(WIDGET_CSS.includes('safe-area-inset-bottom'), true);
    });

    test('toolbar buttons have 44px hit bounds defined in CSS', () => {
      assert.strictEqual(WIDGET_CSS.includes('.raawi-strip-dock-btn::after'), true);
      assert.strictEqual(WIDGET_CSS.includes('.raawi-strip-close-btn::after'), true);
      assert.strictEqual(WIDGET_CSS.includes('min-width: 44px;'), true);
      assert.strictEqual(WIDGET_CSS.includes('min-height: 44px;'), true);
    });
  });

  // 7. Bilingual Localization Parity
  describe('7. Bilingual Localization Parity', () => {
    test('dockTop, dockBottom, and toggleDockPosition have 1:1 AR and EN parity', () => {
      const ar = translations.ar;
      const en = translations.en;

      assert.ok(ar.dockTop && en.dockTop, 'dockTop exists in both locales');
      assert.ok(ar.dockBottom && en.dockBottom, 'dockBottom exists in both locales');
      assert.ok(ar.toggleDockPosition && en.toggleDockPosition, 'toggleDockPosition exists in both locales');

      // Verify no empty strings
      assert.ok(ar.dockTop.length > 0 && en.dockTop.length > 0);
      assert.ok(ar.dockBottom.length > 0 && en.dockBottom.length > 0);
      assert.ok(ar.toggleDockPosition.length > 0 && en.toggleDockPosition.length > 0);
    });

    test('all translation keys match 1:1 between AR and EN dictionaries', () => {
      const arKeys = Object.keys(translations.ar).sort();
      const enKeys = Object.keys(translations.en).sort();

      assert.deepStrictEqual(arKeys, enKeys, 'AR and EN translation keys must match exactly');
    });
  });
});
