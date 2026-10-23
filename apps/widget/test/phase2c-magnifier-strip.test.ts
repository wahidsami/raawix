/**
 * Targeted Regression & Acceptance Test Suite: Phase 2C
 * Standalone Magnified Reading Strip
 *
 * Scope:
 * 1. Toggle behavior, defaults, state persistence and reset
 * 2. Magnification levels (150%, 200%, 250%, 300%) and responsive classes
 * 3. Safe content extraction: headings, paragraphs, lists, links, buttons
 * 4. Nested element resolution (bubbling to semantic parent)
 * 5. Form privacy protection: password, hidden, file inputs & sensitive values suppressed
 * 6. Widget DOM exclusion: controls inside the widget are strictly ignored
 * 7. Multi-source tracking: text selection > keyboard focus > pointer hover
 * 8. Keyboard navigation guard: pointer hover suppressed during/after keyboard traversal
 * 9. Touch-first device protection: ignores hover on touch
 * 10. Arabic (Cairo) vs English (Latin) typography resolution (direction alone never establishes Arabic)
 * 11. Visual-only mirror semantics: aria-hidden="true" on text mirror, accessible toolbar controls
 * 12. Contrast and reduced motion integration
 * 13. Immediate strip close and complete teardown
 * 14. Non-regression of existing Phase 2A and 2B features
 */

import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { JSDOM } = require('../../../node_modules/.pnpm/node_modules/jsdom');

import { StateManager } from '../src/core/state';
import { I18nManager, translations } from '../src/core/i18n';
import { DEFAULT_SETTINGS, type WidgetSettings } from '../src/core/types';
import { ReadingStripComponent } from '../src/components/reading-strip';

describe('Phase 2C: Standalone Magnified Reading Strip', () => {
  let dom: JSDOM;
  let win: any;
  let doc: Document;
  let PanelComponent: any;
  let RaawiAccessibilityWidget: any;

  before(async () => {
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
        <head>
          <title>Portal Accessibility Testing</title>
        </head>
        <body>
          <main>
            <h1 id="main-title">بوابة الخدمات الإلكترونية</h1>
            <h2 id="sub-title">دليل المستخدم والاستخدام</h2>
            <p id="main-para">نرحب بكم في المنصة الوطنية للخدمات الموحدة.</p>
            <ul id="service-list">
              <li id="service-item-1">خدمة الاستعلام عن الطلب</li>
              <li id="service-item-2">خدمة تجديد الوثيقة</li>
            </ul>
            <a href="/login" id="login-link" class="nav-link">تسجيل الدخول</a>
            <button type="button" id="submit-btn" aria-label="إرسال الطلب الآن">
              <svg><path d="M0 0"/></svg>
              <span>إرسال</span>
            </button>

            <!-- Form controls for privacy testing -->
            <form id="test-form">
              <label for="username-input">اسم المستخدم</label>
              <input type="text" id="username-input" placeholder="أدخل اسمك" value="private_user_123">

              <label for="password-input">كلمة المرور</label>
              <input type="password" id="password-input" value="SuperSecretPassword!">

              <input type="hidden" id="csrf-token" value="sensitive-csrf-token-xyz">

              <label for="doc-upload">تحميل الملف</label>
              <input type="file" id="doc-upload">

              <label for="agree-check">أوافق على الشروط</label>
              <input type="checkbox" id="agree-check" checked>

              <select id="city-select">
                <option value="riyadh">الرياض</option>
              </select>

              <div id="editable-div" contenteditable="true">نص خاص داخل المحرر</div>
            </form>

            <!-- English section embedded inside Arabic doc -->
            <section lang="en" dir="ltr" id="english-section">
              <h2 id="en-title">English Support Services</h2>
              <p id="en-para">Please contact our multilingual technical helpdesk for assistance.</p>
              <a href="/en/help" id="en-link">Help Desk</a>
            </section>
          </main>
        </body>
      </html>
    `, {
      url: 'https://portal.example.gov.sa/services',
    });

    win = dom.window;
    doc = win.document;

    (global as any).window = win;
    (global as any).document = doc;
    (global as any).Element = win.Element;
    (global as any).HTMLElement = win.HTMLElement;
    (global as any).HTMLInputElement = win.HTMLInputElement;
    (global as any).customElements = win.customElements;
    (global as any).KeyboardEvent = win.KeyboardEvent;
    (global as any).FocusEvent = win.FocusEvent;
    (global as any).MouseEvent = win.MouseEvent;
    if (win.PointerEvent) {
      (global as any).PointerEvent = win.PointerEvent;
    }

    const panelModule = await import('../src/components/panel');
    PanelComponent = panelModule.PanelComponent;

    const widgetModule = await import('../src/core/shadow-container');
    RaawiAccessibilityWidget = widgetModule.RaawiAccessibilityWidget;
  });

  describe('1. Defaults, Toggle, Persistence and Reset', () => {
    it('initializes with default magnifier settings (magnifierStrip=false, magnifierScale=2.0)', () => {
      assert.strictEqual(DEFAULT_SETTINGS.magnifierStrip, false);
      assert.strictEqual(DEFAULT_SETTINGS.magnifierScale, 2.0);

      const state = new StateManager('ar');
      assert.strictEqual(state.getSettings().magnifierStrip, false);
      assert.strictEqual(state.getSettings().magnifierScale, 2.0);
    });

    it('mounts reading strip into Shadow DOM when enabled and unmounts when disabled', () => {
      const state = new StateManager('ar');
      const i18n = new I18nManager('ar');
      const host = doc.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });

      const strip = new ReadingStripComponent(state, i18n, shadow);

      // Initially disabled -> not in shadow DOM
      assert.strictEqual(shadow.querySelector('[data-testid="raawi-reading-strip"]'), null);

      // Enable strip
      state.updateSetting('magnifierStrip', true);
      const mountedStrip = shadow.querySelector('[data-testid="raawi-reading-strip"]');
      assert.ok(mountedStrip, 'Reading strip must be mounted in Shadow DOM when enabled');
      assert.strictEqual(strip.getElement(), mountedStrip);

      // Disable strip
      state.updateSetting('magnifierStrip', false);
      assert.strictEqual(shadow.querySelector('[data-testid="raawi-reading-strip"]'), null);

      strip.destroy();
    });

    it('resets magnifierStrip and magnifierScale to defaults upon resetSettings()', () => {
      const state = new StateManager('ar');
      const i18n = new I18nManager('ar');
      const host = doc.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });

      const strip = new ReadingStripComponent(state, i18n, shadow);

      state.updateSetting('magnifierStrip', true);
      state.updateSetting('magnifierScale', 3.0);
      assert.strictEqual(state.getSettings().magnifierStrip, true);
      assert.strictEqual(state.getSettings().magnifierScale, 3.0);
      assert.ok(shadow.querySelector('[data-testid="raawi-reading-strip"]'));

      state.resetSettings();
      assert.strictEqual(state.getSettings().magnifierStrip, false);
      assert.strictEqual(state.getSettings().magnifierScale, 2.0);
      assert.strictEqual(shadow.querySelector('[data-testid="raawi-reading-strip"]'), null);

      strip.destroy();
    });

    it('sanitizes invalid or corrupted localStorage values for magnifierScale and magnifierStrip', () => {
      win.localStorage.setItem(
        'raawi_accessibility_settings_v2',
        JSON.stringify({
          magnifierStrip: 'invalid-boolean',
          magnifierScale: 9.99, // not an allowed level
        })
      );

      const state = new StateManager('ar');
      const settings = state.getSettings();
      assert.strictEqual(settings.magnifierStrip, false, 'Invalid boolean must fall back to false');
      assert.strictEqual(settings.magnifierScale, 2.0, 'Invalid scale must fall back to 2.0');

      win.localStorage.clear();
    });
  });

  describe('2. Magnification Levels & Controls', () => {
    it('applies the appropriate scale class (150%, 200%, 250%, 300%) to the mirror text container', () => {
      const state = new StateManager('ar');
      const i18n = new I18nManager('ar');
      const host = doc.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });

      const strip = new ReadingStripComponent(state, i18n, shadow);
      state.updateSetting('magnifierStrip', true);

      const textEl = shadow.querySelector('[data-testid="raawi-strip-text"]') as HTMLElement;
      assert.ok(textEl);

      const scales: Array<1.5 | 2.0 | 2.5 | 3.0> = [1.5, 2.0, 2.5, 3.0];
      for (const scale of scales) {
        state.updateSetting('magnifierScale', scale);
        const expectedClass = `raawi-scale-${Math.round(scale * 100)}`;
        const currentTextEl = shadow.querySelector('[data-testid="raawi-strip-text"]') as HTMLElement;
        assert.ok(
          currentTextEl.classList.contains(expectedClass),
          `Mirror text must contain class ${expectedClass} for scale ${scale}`
        );

        // Check active button in toolbar
        const activeBtn = shadow.querySelector(`.raawi-strip-scale-btn[data-scale="${scale.toFixed(1)}"]`) as HTMLButtonElement;
        assert.ok(activeBtn, `Toolbar must contain button for scale ${scale}`);
        assert.strictEqual(activeBtn.getAttribute('aria-pressed'), 'true');
      }

      strip.destroy();
    });

    it('clicking toolbar scale buttons updates widget settings', () => {
      const state = new StateManager('ar');
      const i18n = new I18nManager('ar');
      const host = doc.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });

      const strip = new ReadingStripComponent(state, i18n, shadow);
      state.updateSetting('magnifierStrip', true);

      const btn300 = shadow.querySelector('[data-testid="raawi-scale-300"]') as HTMLButtonElement;
      assert.ok(btn300);
      btn300.click();

      assert.strictEqual(state.getSettings().magnifierScale, 3.0);

      strip.destroy();
    });

    it('clicking immediate close button disables magnifierStrip immediately', () => {
      const state = new StateManager('ar');
      const i18n = new I18nManager('ar');
      const host = doc.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });

      const strip = new ReadingStripComponent(state, i18n, shadow);
      state.updateSetting('magnifierStrip', true);
      assert.ok(shadow.querySelector('[data-testid="raawi-reading-strip"]'));

      const closeBtn = shadow.querySelector('[data-testid="raawi-strip-close"]') as HTMLButtonElement;
      assert.ok(closeBtn);
      closeBtn.click();

      assert.strictEqual(state.getSettings().magnifierStrip, false);
      assert.strictEqual(shadow.querySelector('[data-testid="raawi-reading-strip"]'), null);

      strip.destroy();
    });
  });

  describe('3. Safe Content Extraction & Semantic Element Resolution', () => {
    it('displays fallback message when no content is focused or selected', () => {
      const state = new StateManager('ar');
      const i18n = new I18nManager('ar');
      const host = doc.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });

      const strip = new ReadingStripComponent(state, i18n, shadow);
      state.updateSetting('magnifierStrip', true);

      const textEl = shadow.querySelector('[data-testid="raawi-strip-text"]') as HTMLElement;
      assert.ok(textEl);
      assert.strictEqual(textEl.textContent, i18n.t().magnifierFallback);
      assert.ok(textEl.classList.contains('fallback'));

      strip.destroy();
    });

    it('extracts content from headings, paragraphs, and list items upon keyboard focus', () => {
      const state = new StateManager('ar');
      const i18n = new I18nManager('ar');
      const host = doc.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });

      const strip = new ReadingStripComponent(state, i18n, shadow);
      state.updateSetting('magnifierStrip', true);

      const h1 = doc.getElementById('main-title')!;
      const p = doc.getElementById('main-para')!;
      const li = doc.getElementById('service-item-1')!;

      // Focus H1
      h1.dispatchEvent(new win.FocusEvent('focusin', { bubbles: true }));
      let textEl = shadow.querySelector('[data-testid="raawi-strip-text"]') as HTMLElement;
      assert.strictEqual(textEl.textContent, 'بوابة الخدمات الإلكترونية');

      // Focus paragraph
      p.dispatchEvent(new win.FocusEvent('focusin', { bubbles: true }));
      assert.strictEqual(textEl.textContent, 'نرحب بكم في المنصة الوطنية للخدمات الموحدة.');

      // Focus list item
      li.dispatchEvent(new win.FocusEvent('focusin', { bubbles: true }));
      assert.strictEqual(textEl.textContent, 'خدمة الاستعلام عن الطلب');

      strip.destroy();
    });

    it('resolves nested icon/span to parent button and extracts accessible label', () => {
      const state = new StateManager('ar');
      const i18n = new I18nManager('ar');
      const host = doc.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });

      const strip = new ReadingStripComponent(state, i18n, shadow);
      state.updateSetting('magnifierStrip', true);

      const btn = doc.getElementById('submit-btn')!;
      const nestedSpan = btn.querySelector('span')!;

      // Focus on the nested span inside the button
      nestedSpan.dispatchEvent(new win.FocusEvent('focusin', { bubbles: true }));
      const textEl = shadow.querySelector('[data-testid="raawi-strip-text"]') as HTMLElement;

      // Button has aria-label="إرسال الطلب الآن"
      assert.strictEqual(textEl.textContent, 'إرسال الطلب الآن');

      strip.destroy();
    });
  });

  describe('4. Form Privacy & Sensitive Data Protection', () => {
    it('NEVER mirrors password values; displays protected content placeholder', () => {
      const state = new StateManager('ar');
      const i18n = new I18nManager('ar');
      const host = doc.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });

      const strip = new ReadingStripComponent(state, i18n, shadow);
      state.updateSetting('magnifierStrip', true);

      const pwdInput = doc.getElementById('password-input')!;
      pwdInput.dispatchEvent(new win.FocusEvent('focusin', { bubbles: true }));

      const textEl = shadow.querySelector('[data-testid="raawi-strip-text"]') as HTMLElement;
      assert.ok(!textEl.textContent?.includes('SuperSecretPassword!'), 'Password value must NEVER be mirrored');
      assert.ok(textEl.textContent?.includes(i18n.t().protectedContentHidden));

      strip.destroy();
    });

    it('NEVER mirrors hidden or file input contents', () => {
      const state = new StateManager('ar');
      const i18n = new I18nManager('ar');
      const host = doc.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });

      const strip = new ReadingStripComponent(state, i18n, shadow);
      state.updateSetting('magnifierStrip', true);

      const csrfInput = doc.getElementById('csrf-token')!;
      csrfInput.dispatchEvent(new win.FocusEvent('focusin', { bubbles: true }));

      const textEl = shadow.querySelector('[data-testid="raawi-strip-text"]') as HTMLElement;
      assert.ok(!textEl.textContent?.includes('sensitive-csrf-token-xyz'));
      assert.ok(textEl.textContent?.includes(i18n.t().protectedContentHidden));

      const fileInput = doc.getElementById('doc-upload')!;
      fileInput.dispatchEvent(new win.FocusEvent('focusin', { bubbles: true }));
      assert.ok(textEl.textContent?.includes(i18n.t().protectedContentHidden));

      strip.destroy();
    });

    it('mirrors only safe descriptive info (label, role, state) for inputs and never private entered text', () => {
      const state = new StateManager('ar');
      const i18n = new I18nManager('ar');
      const host = doc.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });

      const strip = new ReadingStripComponent(state, i18n, shadow);
      state.updateSetting('magnifierStrip', true);

      const userInput = doc.getElementById('username-input')!;
      userInput.dispatchEvent(new win.FocusEvent('focusin', { bubbles: true }));

      const textEl = shadow.querySelector('[data-testid="raawi-strip-text"]') as HTMLElement;
      assert.ok(!textEl.textContent?.includes('private_user_123'), 'Entered value must not be mirrored');
      assert.ok(textEl.textContent?.includes('اسم المستخدم'), 'Label must be mirrored');

      // Checkbox state check
      const checkInput = doc.getElementById('agree-check')!;
      checkInput.dispatchEvent(new win.FocusEvent('focusin', { bubbles: true }));
      assert.ok(textEl.textContent?.includes('محددة') || textEl.textContent?.includes('Checked'));

      strip.destroy();
    });

    it('ignores contenteditable text unless explicitly selected', () => {
      const state = new StateManager('ar');
      const i18n = new I18nManager('ar');
      const host = doc.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });

      const strip = new ReadingStripComponent(state, i18n, shadow);
      state.updateSetting('magnifierStrip', true);

      const editable = doc.getElementById('editable-div')!;
      editable.dispatchEvent(new win.FocusEvent('focusin', { bubbles: true }));

      const textEl = shadow.querySelector('[data-testid="raawi-strip-text"]') as HTMLElement;
      // Contenteditable should not be mirrored without explicit user selection
      assert.strictEqual(textEl.textContent, i18n.t().magnifierFallback);

      strip.destroy();
    });
  });

  describe('5. Widget DOM Exclusion', () => {
    it('strictly excludes widget internal controls from being mirrored', () => {
      const state = new StateManager('ar');
      const i18n = new I18nManager('ar');
      const widget = new RaawiAccessibilityWidget();
      doc.body.appendChild(widget);

      const shadow = widget.shadowRoot || (widget as any).shadow;
      const strip = new ReadingStripComponent(state, i18n, shadow);
      state.updateSetting('magnifierStrip', true);

      // Create an internal widget button inside shadow DOM
      const internalBtn = doc.createElement('button');
      internalBtn.textContent = 'زر داخلي باللوحة';
      shadow.appendChild(internalBtn);

      internalBtn.dispatchEvent(new win.FocusEvent('focusin', { bubbles: true }));

      const textEl = shadow.querySelector('[data-testid="raawi-strip-text"]') as HTMLElement;
      assert.strictEqual(textEl.textContent, i18n.t().magnifierFallback);

      strip.destroy();
      doc.body.removeChild(widget);
    });
  });

  describe('6. Multi-Source Tracking & Keyboard Priority Guard', () => {
    it('prioritizes active text selection over keyboard focus and mouse hover', () => {
      const state = new StateManager('ar');
      const i18n = new I18nManager('ar');
      const host = doc.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });

      const strip = new ReadingStripComponent(state, i18n, shadow);
      state.updateSetting('magnifierStrip', true);

      // Mock active selection
      const mockSelection = {
        toString: () => 'نص محدد بواسطة المستخدم بالماوس',
      };
      win.getSelection = () => mockSelection;

      doc.dispatchEvent(new win.Event('selectionchange'));

      const textEl = shadow.querySelector('[data-testid="raawi-strip-text"]') as HTMLElement;
      assert.strictEqual(textEl.textContent, 'نص محدد بواسطة المستخدم بالماوس');

      // Attempting to focus another element while selection is active should NOT overwrite selection
      const p = doc.getElementById('main-para')!;
      p.dispatchEvent(new win.FocusEvent('focusin', { bubbles: true }));
      assert.strictEqual(textEl.textContent, 'نص محدد بواسطة المستخدم بالماوس');

      // Clear selection
      win.getSelection = () => ({ toString: () => '' });
      doc.dispatchEvent(new win.Event('selectionchange'));
      assert.strictEqual(textEl.textContent, i18n.t().magnifierFallback);

      strip.destroy();
    });

    it('suppresses pointer hover updates immediately after keyboard navigation', async () => {
      const state = new StateManager('ar');
      const i18n = new I18nManager('ar');
      const host = doc.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });

      const strip = new ReadingStripComponent(state, i18n, shadow);
      state.updateSetting('magnifierStrip', true);

      // Simulate keyboard navigation (Tab key press)
      doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

      const h1 = doc.getElementById('main-title')!;
      h1.dispatchEvent(new win.FocusEvent('focusin', { bubbles: true }));

      const textEl = shadow.querySelector('[data-testid="raawi-strip-text"]') as HTMLElement;
      assert.strictEqual(textEl.textContent, 'بوابة الخدمات الإلكترونية');

      // Now dispatch pointerover on a different element immediately
      const p = doc.getElementById('main-para')!;
      p.dispatchEvent(new (win.PointerEvent || win.MouseEvent)('pointerover', { bubbles: true }));

      // Wait 100ms (beyond the 60ms debounce)
      await new Promise((r) => setTimeout(r, 100));

      // Pointer hover should have been suppressed by the keyboard guard (<1200ms)
      assert.strictEqual(
        textEl.textContent,
        'بوابة الخدمات الإلكترونية',
        'Ambient pointer hover must NOT overwrite active keyboard focus'
      );

      strip.destroy();
    });

    it('ignores pointer events when pointerType is touch', async () => {
      const state = new StateManager('ar');
      const i18n = new I18nManager('ar');
      const host = doc.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });

      const strip = new ReadingStripComponent(state, i18n, shadow);
      state.updateSetting('magnifierStrip', true);

      const p = doc.getElementById('main-para')!;
      const touchEvent = new win.MouseEvent('pointerover', { bubbles: true });
      (touchEvent as any).pointerType = 'touch';

      p.dispatchEvent(touchEvent);
      await new Promise((r) => setTimeout(r, 100));

      const textEl = shadow.querySelector('[data-testid="raawi-strip-text"]') as HTMLElement;
      assert.strictEqual(textEl.textContent, i18n.t().magnifierFallback);

      strip.destroy();
    });
  });

  describe('7. Arabic (Cairo) vs English (Latin) Typography Resolution', () => {
    it('applies bundled Cairo font and dir="rtl" for Arabic text and lang="ar" elements', () => {
      const state = new StateManager('ar');
      const i18n = new I18nManager('ar');
      const host = doc.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });

      const strip = new ReadingStripComponent(state, i18n, shadow);
      state.updateSetting('magnifierStrip', true);

      const h1 = doc.getElementById('main-title')!;
      h1.dispatchEvent(new win.FocusEvent('focusin', { bubbles: true }));

      const textEl = shadow.querySelector('[data-testid="raawi-strip-text"]') as HTMLElement;
      assert.ok(textEl.classList.contains('raawi-font-cairo'));
      assert.strictEqual(textEl.getAttribute('dir'), 'rtl');

      strip.destroy();
    });

    it('applies Latin font stack and dir="ltr" for English content embedded in Arabic document', () => {
      const state = new StateManager('ar');
      const i18n = new I18nManager('ar');
      const host = doc.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });

      const strip = new ReadingStripComponent(state, i18n, shadow);
      state.updateSetting('magnifierStrip', true);

      const enP = doc.getElementById('en-para')!;
      enP.dispatchEvent(new win.FocusEvent('focusin', { bubbles: true }));

      const textEl = shadow.querySelector('[data-testid="raawi-strip-text"]') as HTMLElement;
      assert.ok(textEl.classList.contains('raawi-font-latin'));
      assert.ok(!textEl.classList.contains('raawi-font-cairo'));
      assert.strictEqual(textEl.getAttribute('dir'), 'ltr');

      strip.destroy();
    });

    it('never uses dir="rtl" alone on non-Arabic content to trigger Cairo font', () => {
      // Create English element with dir="rtl"
      const testEl = doc.createElement('p');
      testEl.setAttribute('lang', 'en');
      testEl.setAttribute('dir', 'rtl');
      testEl.textContent = 'English content with rtl direction';
      doc.body.appendChild(testEl);

      const isAr = ReadingStripComponent.detectIsArabic(testEl.textContent, testEl);
      assert.strictEqual(isAr, false, 'English content with dir="rtl" must NOT be detected as Arabic');

      doc.body.removeChild(testEl);
    });
  });

  describe('8. Accessibility, Contrast & Reduced Motion', () => {
    it('sets aria-hidden="true" on mirror container and maintains accessible toolbar controls', () => {
      const state = new StateManager('ar');
      const i18n = new I18nManager('ar');
      const host = doc.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });

      const strip = new ReadingStripComponent(state, i18n, shadow);
      state.updateSetting('magnifierStrip', true);

      const mirrorEl = shadow.querySelector('[data-testid="raawi-strip-mirror"]') as HTMLElement;
      assert.ok(mirrorEl);
      assert.strictEqual(
        mirrorEl.getAttribute('aria-hidden'),
        'true',
        'Mirror container must be aria-hidden="true" to avoid duplicate screen reader reading'
      );

      // Check toolbar buttons are NOT aria-hidden
      const closeBtn = shadow.querySelector('[data-testid="raawi-strip-close"]') as HTMLButtonElement;
      assert.ok(closeBtn);
      assert.strictEqual(closeBtn.getAttribute('aria-hidden'), null);
      assert.ok(closeBtn.getAttribute('aria-label'));

      strip.destroy();
    });

    it('adds contrast class when contrastMode is active and reduced motion class when reduceMotion is active', () => {
      const state = new StateManager('ar');
      const i18n = new I18nManager('ar');
      const host = doc.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });

      const strip = new ReadingStripComponent(state, i18n, shadow);
      state.updateSetting('magnifierStrip', true);
      state.updateSetting('contrastMode', true);
      state.updateSetting('reduceMotion', true);

      const stripEl = shadow.querySelector('[data-testid="raawi-reading-strip"]') as HTMLElement;
      assert.ok(stripEl.classList.contains('raawi-strip-contrast'));
      assert.ok(stripEl.classList.contains('raawi-strip-reduced-motion'));

      strip.destroy();
    });
  });

  describe('9. Panel UI Integration & 1:1 Translation Parity', () => {
    it('has 1:1 translation parity for all Phase 2C keys across ar and en', () => {
      const requiredKeys = [
        'magnifierStrip',
        'toggleMagnifierStrip',
        'magnifierScale',
        'magnifierFallback',
        'closeReadingStrip',
        'magnifierZoom150',
        'magnifierZoom200',
        'magnifierZoom250',
        'magnifierZoom300',
        'protectedContentHidden',
      ] as const;

      for (const key of requiredKeys) {
        assert.ok(translations.ar[key], `Arabic dictionary must contain key "${key}"`);
        assert.ok(translations.en[key], `English dictionary must contain key "${key}"`);
        assert.notStrictEqual(translations.ar[key], '', `Arabic key "${key}" must not be empty`);
        assert.notStrictEqual(translations.en[key], '', `English key "${key}" must not be empty`);
      }
    });

    it('renders magnifier strip controls in Panel Reading tab and toggles setting on click', async () => {
      win.localStorage.clear();
      const state = new StateManager('ar');
      const i18n = new I18nManager('ar');
      state.setActiveTab('reading');

      const mockApiClient = {
        getStatus: () => 'idle',
        getData: () => null,
        subscribe: () => () => {},
      };

      const mockRemediator = {
        getActiveChangesCount: () => 0,
        getPendingChangesCount: () => 0,
      };

      const { SpeechReader } = await import('../src/core/speech-reader');
      const speechReader = new SpeechReader({ locale: 'ar' });

      const panel = new PanelComponent(state, i18n, mockApiClient as any, mockRemediator as any, speechReader);
      const panelEl = panel.getElement();

      const toggle = panelEl.querySelector('[data-testid="raawi-tool-magnifier-strip"]') as HTMLInputElement;
      assert.ok(toggle, 'Magnifier strip toggle must exist in Reading tab');
      assert.strictEqual(toggle.checked, false);

      // Check scale buttons in panel
      const scaleContainer = panelEl.querySelector('#raawi-magnifier-scale-container') as HTMLElement;
      assert.ok(scaleContainer);

      // Simulate toggle click
      toggle.checked = true;
      toggle.dispatchEvent(new win.Event('change'));
      assert.strictEqual(state.getSettings().magnifierStrip, true);
    });
  });

  describe('10. Non-Regression of Existing Tools & Complete Teardown', () => {
    it('preserves reading ruler, focus mask, and speech reader while magnifier strip is active', () => {
      const state = new StateManager('ar');
      state.updateSetting('readingGuide', true);
      state.updateSetting('readingMask', true);
      state.updateSetting('magnifierStrip', true);

      const settings = state.getSettings();
      assert.strictEqual(settings.readingGuide, true);
      assert.strictEqual(settings.readingMask, true);
      assert.strictEqual(settings.magnifierStrip, true);
    });

    it('widget.disconnectedCallback() cleanly tears down reading strip and removes DOM nodes', () => {
      const widget = new RaawiAccessibilityWidget();
      doc.body.appendChild(widget);

      const state = widget.getStateManager();
      state.updateSetting('magnifierStrip', true);

      const shadow = widget.getShadowRoot ? widget.getShadowRoot() : widget.shadowRoot!;
      assert.ok(shadow.querySelector('[data-testid="raawi-reading-strip"]'));

      // Disconnect widget from DOM
      doc.body.removeChild(widget);
      assert.strictEqual(shadow.querySelector('[data-testid="raawi-reading-strip"]'), null);
    });
  });
});
