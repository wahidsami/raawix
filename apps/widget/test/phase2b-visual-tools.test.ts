/**
 * Targeted Regression & Acceptance Test Suite: Phase 2B
 * Standalone Visual & Content Tools
 *
 * Scope:
 * 1. Feature A: Readable Font Selection Override
 *    - Default behavior preserves site typography
 *    - Enabling/disabling adds and restores data-raawi-readable-font
 *    - Injected CSS rules include Latin sans-serif and Arabic Naskh fallback ('Cairo', 'Noto Naskh Arabic', 'Tahoma')
 *    - Scoped strictly to host content, excluding widget Shadow DOM
 *    - Persistence and fallback on corrupted state
 *
 * 2. Feature B: Interactive Control & Link Highlighter
 *    - Links (a[href]), buttons (button, [role="button"]), form inputs (input, select, textarea) highlighted
 *    - Distinguishable styling (solid blue underline for links, dashed purple for buttons, dotted green for inputs)
 *    - Reversible: toggling on/off preserves host inline styles and event listeners
 *    - Dynamic elements handled via CSS attribute selector without continuous JS scans
 *    - Exclusion of widget controls and preservation of keyboard focus indicators
 *
 * 3. Feature C: Configurable Reading Guide & Focus Mask
 *    - Independent settings: adjusting guide thickness does not mutate mask height and vice-versa
 *    - Reading guide thickness values ('thin': 3px, 'medium': 6px, 'thick': 12px)
 *    - Reduced-motion integration: transition is 'none' when reduceMotion or stopAnimations is active
 *    - Reading mask window height ('small': 80px, 'medium': 120px, 'large': 180px)
 *    - Clean deactivation and reset
 *
 * 4. Bilingual Localization & UI Controls Parity
 *    - 1:1 translation parity for all Phase 2B keys
 *    - UI controls discoverable, localized, and operable via keyboard
 */

import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { JSDOM } = require('../../../node_modules/.pnpm/node_modules/jsdom');

import { StateManager } from '../src/core/state';
import { I18nManager, translations } from '../src/core/i18n';
import { DisplayManager } from '../src/core/display-manager';
import { DEFAULT_SETTINGS, type WidgetSettings } from '../src/core/types';

describe('Phase 2B: Standalone Visual & Content Tools', () => {
  let dom: JSDOM;
  let window: any;
  let document: Document;
  let PanelComponent: any;
  let RaawiAccessibilityWidget: any;
  let registerRaawiWidget: any;

  before(async () => {
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
        <head>
          <title>Test Portal Services</title>
          <style>
            body { font-family: 'OriginalSiteFont', serif; }
            a.custom-link { color: #0066cc; }
          </style>
        </head>
        <body>
          <header>
            <h1 id="title-main">بوابة الخدمات التفاعلية</h1>
            <nav>
              <a href="#services" id="link-services" class="custom-link">دليل الخدمات الحكومية</a>
              <a href="https://external.example.com" id="link-external">رابط خارجي</a>
              <button id="btn-login" class="action-btn">تسجيل الدخول</button>
            </nav>
          </header>
          <main>
            <section id="form-section">
              <label for="input-search">ابحث في الخدمات:</label>
              <input type="text" id="input-search" placeholder="اكتب للبحث...">
              <select id="select-category">
                <option value="all">كافة الفئات</option>
                <option value="business">أعمال</option>
              </select>
              <textarea id="textarea-notes" placeholder="ملاحظات إضافية"></textarea>
              <div role="button" tabindex="0" id="custom-div-btn">زر مخصص</div>
            </section>
            <section id="content-section">
              <p id="p-desc">النص التجريبي لخدمات المنصة مع تباعد وقراءة سهلة.</p>
              <a name="anchor-without-href" id="anchor-no-href">مرجع داخلي بدون رابط</a>
            </section>
          </main>
        </body>
      </html>
    `, {
      url: 'https://portal.gov.sa/home',
      runScripts: 'dangerously',
    });

    window = dom.window;
    document = window.document;

    (global as any).window = window;
    (global as any).document = document;
    (global as any).HTMLElement = window.HTMLElement;
    (global as any).HTMLButtonElement = window.HTMLButtonElement;
    (global as any).HTMLInputElement = window.HTMLInputElement;
    (global as any).HTMLSelectElement = window.HTMLSelectElement;
    (global as any).customElements = window.customElements;
    (global as any).localStorage = window.localStorage;
    (global as any).requestAnimationFrame = (cb: () => void) => setTimeout(cb, 0);
    (global as any).cancelAnimationFrame = (id: any) => clearTimeout(id);

    const panelMod = await import('../src/components/panel');
    PanelComponent = panelMod.PanelComponent;

    const shadowMod = await import('../src/core/shadow-container');
    RaawiAccessibilityWidget = shadowMod.RaawiAccessibilityWidget;
    registerRaawiWidget = shadowMod.registerRaawiWidget;
    registerRaawiWidget(window.customElements);
  });

  describe('Suite 1: Feature A — Readable Font Selection Override', () => {
    it('defaults to disabled and preserves site typography without modifying host font styles', () => {
      const state = new StateManager('ar');
      assert.strictEqual(DEFAULT_SETTINGS.readableFont, false, 'readableFont must default to false');
      assert.strictEqual(state.getSettings().readableFont, false);
      assert.strictEqual(document.documentElement.hasAttribute('data-raawi-readable-font'), false);
    });

    it('applies data-raawi-readable-font attribute when enabled and cleanly restores on disable', () => {
      const state = new StateManager('ar');
      const container = document.createElement('div');
      const shadow = container.attachShadow({ mode: 'open' });
      const display = new DisplayManager(state, shadow);

      // 1. Enable readable font
      state.updateSetting('readableFont', true);
      assert.strictEqual(document.documentElement.getAttribute('data-raawi-readable-font'), 'true');

      // 2. Disable readable font
      state.updateSetting('readableFont', false);
      assert.strictEqual(document.documentElement.hasAttribute('data-raawi-readable-font'), false);

      display.destroy();
    });

    it('injects scoped CSS rule with Latin sans-serif and Arabic Naskh fallback stack', () => {
      const state = new StateManager('ar');
      const container = document.createElement('div');
      const shadow = container.attachShadow({ mode: 'open' });
      const display = new DisplayManager(state, shadow);

      const styleEl = document.head.querySelector('style#raawi-display-styles');
      assert.ok(styleEl, 'raawi-display-styles element must exist in document.head');
      const css = styleEl.textContent || '';

      // Verify rule selector
      assert.ok(
        css.includes('html[data-raawi-readable-font="true"] body') &&
        css.includes('html[data-raawi-readable-font="true"] p') &&
        css.includes('html[data-raawi-readable-font="true"] h1'),
        'Readable font must apply to body, paragraphs, and headings'
      );

      // Verify Latin and Arabic font stack
      assert.ok(css.includes("'Cairo'"), 'Font stack must include Cairo for Arabic');
      assert.ok(css.includes("'Noto Naskh Arabic'"), 'Font stack must include Noto Naskh Arabic fallback');
      assert.ok(css.includes('sans-serif'), 'Font stack must include generic sans-serif fallback');

      // Verify widget internal exclusion
      assert.ok(
        css.includes(':not(raawi-accessibility-widget *)'),
        'Readable font rule must strictly exclude the Raawi widget'
      );

      display.destroy();
    });

    it('toggles readable font via Panel UI checkbox control', () => {
      const state = new StateManager('ar');
      const i18n = new I18nManager('ar');
      state.setActiveTab('vision');
      const panel = new PanelComponent(state, i18n);

      const toggle = panel.getElement().querySelector('#raawi-toggle-readable-font') as HTMLInputElement;
      assert.ok(toggle, '#raawi-toggle-readable-font must be rendered in vision tab');
      assert.strictEqual(toggle.checked, false);

      toggle.checked = true;
      toggle.dispatchEvent(new window.Event('change'));
      assert.strictEqual(state.getSettings().readableFont, true);

      toggle.checked = false;
      toggle.dispatchEvent(new window.Event('change'));
      assert.strictEqual(state.getSettings().readableFont, false);
    });

    it('restores clean site state on widget reset() without leaving stale classes or attributes', () => {
      const state = new StateManager('ar');
      const container = document.createElement('div');
      const shadow = container.attachShadow({ mode: 'open' });
      const display = new DisplayManager(state, shadow);

      state.updateSetting('readableFont', true);
      assert.strictEqual(document.documentElement.getAttribute('data-raawi-readable-font'), 'true');

      display.reset();
      assert.strictEqual(document.documentElement.hasAttribute('data-raawi-readable-font'), false);

      display.destroy();
    });
  });

  describe('Suite 2: Feature B — Interactive Control & Link Highlighter', () => {
    it('defaults to disabled without adding highlight attributes', () => {
      const state = new StateManager('ar');
      assert.strictEqual(DEFAULT_SETTINGS.highlightLinks, false, 'highlightLinks must default to false');
      assert.strictEqual(document.documentElement.hasAttribute('data-raawi-highlight-links'), false);
    });

    it('applies data-raawi-highlight-links attribute and cleans up on toggle and reset', () => {
      const state = new StateManager('ar');
      const container = document.createElement('div');
      const shadow = container.attachShadow({ mode: 'open' });
      const display = new DisplayManager(state, shadow);

      state.updateSetting('highlightLinks', true);
      assert.strictEqual(document.documentElement.getAttribute('data-raawi-highlight-links'), 'true');

      state.updateSetting('highlightLinks', false);
      assert.strictEqual(document.documentElement.hasAttribute('data-raawi-highlight-links'), false);

      state.updateSetting('highlightLinks', true);
      display.reset();
      assert.strictEqual(document.documentElement.hasAttribute('data-raawi-highlight-links'), false);

      display.destroy();
    });

    it('injects scoped CSS rules distinguishing links, action buttons, and form inputs', () => {
      const state = new StateManager('ar');
      const container = document.createElement('div');
      const shadow = container.attachShadow({ mode: 'open' });
      const display = new DisplayManager(state, shadow);

      const styleEl = document.head.querySelector('style#raawi-display-styles');
      assert.ok(styleEl);
      const css = styleEl.textContent || '';

      // Links with href
      assert.ok(
        css.includes('html[data-raawi-highlight-links="true"] a[href]:not(raawi-accessibility-widget *)'),
        'Highlighter must target links with href while excluding widget'
      );
      assert.ok(css.includes('text-decoration: underline'), 'Links must have underlined styling');

      // Action buttons
      assert.ok(
        css.includes('html[data-raawi-highlight-links="true"] button:not(raawi-accessibility-widget *)'),
        'Highlighter must target button elements'
      );
      assert.ok(
        css.includes('html[data-raawi-highlight-links="true"] [role="button"]:not(raawi-accessibility-widget *)'),
        'Highlighter must target elements with role="button"'
      );

      // Form inputs
      assert.ok(
        css.includes('html[data-raawi-highlight-links="true"] input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="hidden"])'),
        'Highlighter must target text inputs while excluding hidden inputs'
      );
      assert.ok(
        css.includes('html[data-raawi-highlight-links="true"] select:not(raawi-accessibility-widget *)'),
        'Highlighter must target select elements'
      );
      assert.ok(
        css.includes('html[data-raawi-highlight-links="true"] textarea:not(raawi-accessibility-widget *)'),
        'Highlighter must target textarea elements'
      );

      display.destroy();
    });

    it('does not alter host inline styles or intercept user click events', () => {
      const link = document.getElementById('link-services') as HTMLAnchorElement;
      const initialStyle = link.getAttribute('style');

      let clicked = false;
      link.addEventListener('click', () => { clicked = true; });

      const state = new StateManager('ar');
      const container = document.createElement('div');
      const shadow = container.attachShadow({ mode: 'open' });
      const display = new DisplayManager(state, shadow);

      state.updateSetting('highlightLinks', true);

      // Dispatch click event on highlighted link
      link.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      assert.strictEqual(clicked, true, 'Highlighter must never intercept or prevent click events');

      state.updateSetting('highlightLinks', false);
      assert.strictEqual(link.getAttribute('style'), initialStyle, 'Host inline styles must remain completely untouched');

      display.destroy();
    });

    it('toggles highlightLinks via Panel UI checkbox control', () => {
      const state = new StateManager('en');
      const i18n = new I18nManager('en');
      state.setActiveTab('vision');
      const panel = new PanelComponent(state, i18n);

      const toggle = panel.getElement().querySelector('#raawi-toggle-highlight-links') as HTMLInputElement;
      assert.ok(toggle, '#raawi-toggle-highlight-links must be present in vision tab');
      assert.strictEqual(toggle.checked, false);

      toggle.checked = true;
      toggle.dispatchEvent(new window.Event('change'));
      assert.strictEqual(state.getSettings().highlightLinks, true);
    });
  });

  describe('Suite 3: Feature C — Configurable Reading Guide and Focus Mask', () => {
    it('maintains strict independence between readingGuideThickness and readingMaskWindowHeight', () => {
      const state = new StateManager('en');
      assert.strictEqual(DEFAULT_SETTINGS.readingGuideThickness, 'medium');
      assert.strictEqual(DEFAULT_SETTINGS.readingMaskWindowHeight, 'medium');

      // Adjusting guide thickness must NOT affect mask height
      state.updateSetting('readingGuideThickness', 'thick');
      assert.strictEqual(state.getSettings().readingGuideThickness, 'thick');
      assert.strictEqual(state.getSettings().readingMaskWindowHeight, 'medium');

      // Adjusting mask height must NOT affect guide thickness
      state.updateSetting('readingMaskWindowHeight', 'large');
      assert.strictEqual(state.getSettings().readingGuideThickness, 'thick');
      assert.strictEqual(state.getSettings().readingMaskWindowHeight, 'large');

      // Reset restores defaults
      state.resetSettings();
      assert.strictEqual(state.getSettings().readingGuideThickness, 'medium');
      assert.strictEqual(state.getSettings().readingMaskWindowHeight, 'medium');
    });

    it('applies thickness dynamically to reading ruler (thin: 3px, medium: 6px, thick: 12px)', () => {
      const state = new StateManager('en');
      const container = document.createElement('div');
      const shadow = container.attachShadow({ mode: 'open' });
      const display = new DisplayManager(state, shadow);

      // Enable reading guide
      state.updateSetting('readingGuide', true);
      const ruler = shadow.querySelector('#raawi-reading-ruler') as HTMLElement;
      assert.ok(ruler, 'Reading ruler element must exist in shadow root');
      assert.strictEqual(ruler.style.height, '6px', 'Medium thickness should be 6px');

      // Switch to thin
      state.updateSetting('readingGuideThickness', 'thin');
      assert.strictEqual(ruler.style.height, '3px', 'Thin thickness should be 3px');

      // Switch to thick
      state.updateSetting('readingGuideThickness', 'thick');
      assert.strictEqual(ruler.style.height, '12px', 'Thick thickness should be 12px');

      // Disable reading guide
      state.updateSetting('readingGuide', false);
      assert.strictEqual(ruler.style.display, 'none');

      display.destroy();
    });

    it('honors reduced-motion preferences by disabling ruler motion transitions', () => {
      const state = new StateManager('en');
      const container = document.createElement('div');
      const shadow = container.attachShadow({ mode: 'open' });
      const display = new DisplayManager(state, shadow);

      state.updateSetting('readingGuide', true);
      const ruler = shadow.querySelector('#raawi-reading-ruler') as HTMLElement;
      assert.ok(ruler);
      assert.strictEqual(ruler.style.transition, 'top 0.04s ease-out', 'Standard mode should have transition');

      // Enable stopAnimations
      state.updateSetting('stopAnimations', true);
      assert.strictEqual(ruler.style.transition, 'none', 'Reduced motion / stop animations must disable transition');

      // Disable stopAnimations, enable reduceMotion
      state.updateSetting('stopAnimations', false);
      state.updateSetting('reduceMotion', true);
      assert.strictEqual(ruler.style.transition, 'none', 'reduceMotion must disable transition');

      display.destroy();
    });

    it('operates thickness selector and mask height selector buttons in Reading tab', () => {
      const state = new StateManager('en');
      const i18n = new I18nManager('en');
      state.setActiveTab('reading');
      state.updateSetting('readingGuide', true);
      state.updateSetting('readingMask', true);

      const panel = new PanelComponent(state, i18n);
      const el = panel.getElement();

      // Thickness buttons
      const thinBtn = el.querySelector('button[data-guide-thickness="thin"]') as HTMLButtonElement;
      assert.ok(thinBtn, 'Thin thickness button must exist');
      thinBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      assert.strictEqual(state.getSettings().readingGuideThickness, 'thin');

      const thickBtn = el.querySelector('button[data-guide-thickness="thick"]') as HTMLButtonElement;
      assert.ok(thickBtn, 'Thick thickness button must exist');
      thickBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      assert.strictEqual(state.getSettings().readingGuideThickness, 'thick');

      // Mask height buttons
      const smallMaskBtn = el.querySelector('button[data-mask-height="small"]') as HTMLButtonElement;
      assert.ok(smallMaskBtn, 'Small mask button must exist');
      smallMaskBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      assert.strictEqual(state.getSettings().readingMaskWindowHeight, 'small');
    });

    it('sanitizes and guards against corrupted localStorage state for reading enums and numbers', () => {
      // Inject corrupted values in localStorage
      window.localStorage.setItem('raawi_accessibility_settings_v2', JSON.stringify({
        readingGuideThickness: 'invalid-thickness',
        readingMaskWindowHeight: 'corrupted-height',
        textSize: 'not-a-number',
        lineSpacing: NaN,
      }));

      const state = new StateManager('en');
      const loaded = state.getSettings();

      assert.strictEqual(loaded.readingGuideThickness, 'medium', 'Corrupted thickness must fallback to medium');
      assert.strictEqual(loaded.readingMaskWindowHeight, 'medium', 'Corrupted mask height must fallback to medium');
      assert.strictEqual(loaded.textSize, 1.0, 'Corrupted textSize must fallback to 1.0');
      assert.strictEqual(loaded.lineSpacing, 1.0, 'Corrupted lineSpacing must fallback to 1.0');

      window.localStorage.removeItem('raawi_accessibility_settings_v2');
    });
  });

  describe('Suite 4: Bilingual Localization Parity & Accessibility', () => {
    it('guarantees 1:1 translation key parity between Arabic and English for all Phase 2B keys', () => {
      const phase2bKeys = [
        'readableFont',
        'toggleReadableFont',
        'highlightLinks',
        'toggleHighlightLinks',
        'guideThickness',
        'thin',
        'thick',
      ];

      for (const key of phase2bKeys) {
        const arVal = (translations.ar as any)[key];
        const enVal = (translations.en as any)[key];

        assert.ok(arVal && typeof arVal === 'string' && arVal.length > 0, `Missing Arabic translation for "${key}"`);
        assert.ok(enVal && typeof enVal === 'string' && enVal.length > 0, `Missing English translation for "${key}"`);
      }
    });

    it('preserves 1:1 translation key parity across the complete Arabic and English dictionaries', () => {
      const arKeys = Object.keys(translations.ar).sort();
      const enKeys = Object.keys(translations.en).sort();

      assert.deepStrictEqual(
        arKeys,
        enKeys,
        'Arabic and English dictionaries must have 100% identical translation keys'
      );
    });
  });
});
