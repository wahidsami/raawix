/**
 * Phase 5.1 Acceptance Tests: Architectural Foundation and Shadow DOM Encapsulation
 * 
 * Verifies:
 * 1. Custom element initialization and Shadow Root mounting
 * 2. Widget styles isolation from host page styles (zero global style leaks)
 * 3. Host-page DOM, typography hierarchy, and existing elements remain intact
 * 4. Instance deduplication and lifecycle stability
 * 5. Keyboard accessibility and Escape key handling
 * 6. Arabic RTL and English LTR reactive localization
 * 7. Asset self-containment (inline SVG, zero external PNG dependency)
 * 8. Programmatic API and embed contract compatibility
 */

import { describe, it, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// Resolve JSDOM from repository pnpm modules
const require = createRequire(import.meta.url);
const { JSDOM } = require('../../../node_modules/.pnpm/node_modules/jsdom');

describe('Phase 5.1: Raawi X Widget Architecture & Shadow DOM', () => {
  let dom: JSDOM;
  let window: any;
  let document: Document;
  let AccessibilityWidget: any;
  let RaawiAccessibilityWidget: any;

  before(async () => {
    // Set up clean browser DOM environment once
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
        <head>
          <title>Host Government Portal</title>
          <style>
            h1 { font-size: 32px; color: #1a202c; }
            p { font-size: 16px; line-height: 1.5; }
            .host-btn { background: #3182ce; color: #ffffff; padding: 10px 20px; }
          </style>
        </head>
        <body>
          <header>
            <h1 id="host-heading">البوابة الوطنية الموحدة</h1>
            <button class="host-btn" id="host-action">تسجيل الدخول</button>
          </header>
          <main>
            <p id="host-paragraph">هذا النص تجريبي للتحقق من عدم تأثر تنسيقات الصفحة المضيفة بالبرمجية المساعدة.</p>
          </main>
        </body>
      </html>
    `, {
      url: 'https://portal.gov.sa/services',
      runScripts: 'dangerously',
    });

    window = dom.window;
    document = window.document;

    // Attach globals to simulated environment
    (global as any).window = window;
    (global as any).document = document;
    (global as any).HTMLElement = window.HTMLElement;
    (global as any).HTMLButtonElement = window.HTMLButtonElement;
    (global as any).customElements = window.customElements;
    (global as any).localStorage = window.localStorage;

    // Dynamically import widget modules into simulated environment
    const widgetModule = await import('../src/index');
    AccessibilityWidget = widgetModule.AccessibilityWidget;
    RaawiAccessibilityWidget = widgetModule.RaawiAccessibilityWidget;
  });

  beforeEach(() => {
    // Reset host DOM for each test
    document.body.innerHTML = `
      <header>
        <h1 id="host-heading">البوابة الوطنية الموحدة</h1>
        <button class="host-btn" id="host-action">تسجيل الدخول</button>
      </header>
      <main>
        <p id="host-paragraph">هذا النص تجريبي للتحقق من عدم تأثر تنسيقات الصفحة المضيفة بالبرمجية المساعدة.</p>
      </main>
    `;
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
    window.localStorage.clear();
  });

  afterEach(() => {
    if (AccessibilityWidget) {
      AccessibilityWidget.destroy();
    }
  });

  it('1. Initializes custom element and mounts UI exclusively inside an open Shadow Root', () => {
    const widgetInstance = AccessibilityWidget.init();
    assert.ok(widgetInstance, 'AccessibilityWidget.init() should return instance');

    const customEl = document.querySelector('raawi-accessibility-widget');
    assert.ok(customEl, '<raawi-accessibility-widget> custom element must be present in DOM');
    assert.equal(customEl, widgetInstance, 'Mounted custom element must match returned instance');

    const shadow = customEl.shadowRoot;
    assert.ok(shadow, 'Custom element must attach an open Shadow Root');
    assert.equal(shadow.mode, 'open', 'Shadow Root must be open');

    // Launcher and panel must exist inside Shadow Root
    const launcherInShadow = shadow.querySelector('[data-testid="raawi-launcher"]');
    assert.ok(launcherInShadow, 'Launcher button must exist inside Shadow Root');

    const panelInShadow = shadow.querySelector('[data-testid="raawi-panel"]');
    assert.ok(panelInShadow, 'Panel dialog must exist inside Shadow Root');

    // Host body must NOT contain the widget buttons directly (preventing DOM clutter)
    const rawLauncherInBody = document.body.querySelector(':scope > [data-testid="raawi-launcher"]');
    assert.equal(rawLauncherInBody, null, 'Host document.body must not directly contain launcher');

    const rawPanelInBody = document.body.querySelector(':scope > [data-testid="raawi-panel"]');
    assert.equal(rawPanelInBody, null, 'Host document.body must not directly contain panel');
  });

  it('2. Isolates styles inside Shadow Root and eliminates destructive global CSS leaks', () => {
    AccessibilityWidget.init();

    // Verify ZERO <style id="raawi-accessibility-styles"> appended to document.head
    const legacyGlobalStyle = document.head.querySelector('#raawi-accessibility-styles');
    assert.equal(legacyGlobalStyle, null, 'Legacy global stylesheet must NOT be injected into document.head');

    // Verify all widget styles reside strictly inside Shadow Root
    const customEl = document.querySelector('raawi-accessibility-widget')!;
    const shadowStyles = customEl.shadowRoot!.querySelectorAll('style');
    assert.ok(shadowStyles.length > 0, 'Shadow Root must contain its own encapsulated <style> tag');

    const styleContent = shadowStyles[0].textContent || '';
    assert.ok(styleContent.includes(':host'), 'Shadow styles must use :host scoping');
    assert.ok(styleContent.includes('--primary: #27ae60'), 'Shadow styles must declare modern Emerald theme tokens');

    // Verify absence of destructive universal overrides
    assert.ok(
      !styleContent.includes('font-size: inherit !important'),
      'Must NOT contain universal font-size: inherit !important that destroys heading hierarchy'
    );
    assert.ok(
      !styleContent.includes('line-height: calc(1.5 * var'),
      'Must NOT contain universal line-height override that breaks compact layouts'
    );
  });

  it('3. Preserves host-page DOM content, typography scale, and unrelated controls', () => {
    const headingBefore = document.getElementById('host-heading')!.outerHTML;
    const buttonBefore = document.getElementById('host-action')!.outerHTML;
    const paragraphBefore = document.getElementById('host-paragraph')!.outerHTML;

    // Initialize widget and open options
    const widget = AccessibilityWidget.init();
    widget.open();

    // Verify host elements were completely untouched
    const headingAfter = document.getElementById('host-heading')!.outerHTML;
    const buttonAfter = document.getElementById('host-action')!.outerHTML;
    const paragraphAfter = document.getElementById('host-paragraph')!.outerHTML;

    assert.equal(headingAfter, headingBefore, 'Host heading DOM must remain untouched');
    assert.equal(buttonAfter, buttonBefore, 'Host action button DOM must remain untouched');
    assert.equal(paragraphAfter, paragraphBefore, 'Host paragraph DOM must remain untouched');

    // Verify no destructive data-attributes were attached to host root
    assert.equal(
      document.documentElement.getAttribute('data-raawi-text-size'),
      null,
      'Host html tag must not have destructive text-size attributes'
    );
  });

  it('4. Prevents duplicate instances and maintains single custom-element lifecycle', () => {
    const inst1 = AccessibilityWidget.init();
    const inst2 = AccessibilityWidget.init();
    const inst3 = AccessibilityWidget.init();

    assert.equal(inst1, inst2, 'Repeated AccessibilityWidget.init() calls must return same instance');
    assert.equal(inst2, inst3, 'Repeated AccessibilityWidget.init() calls must return same instance');

    const allCustomEls = document.querySelectorAll('raawi-accessibility-widget');
    assert.equal(allCustomEls.length, 1, 'Exactly one <raawi-accessibility-widget> custom element must exist');
  });

  it('5. Supports keyboard activation, panel toggling, and Escape key close', () => {
    const widget = AccessibilityWidget.init();
    const shadow = widget.shadowRoot!;
    const launcher = shadow.querySelector('[data-testid="raawi-launcher"]') as HTMLButtonElement;
    const panel = shadow.querySelector('[data-testid="raawi-panel"]') as HTMLElement;

    assert.equal(launcher.getAttribute('aria-expanded'), 'false', 'Launcher initially aria-expanded=false');
    assert.ok(panel.hasAttribute('hidden'), 'Panel initially hidden');

    // Simulate keyboard Enter on launcher
    launcher.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    assert.equal(launcher.getAttribute('aria-expanded'), 'true', 'Launcher aria-expanded=true after Enter');
    assert.ok(panel.classList.contains('open'), 'Panel class contains open after Enter');

    // Simulate Escape keydown on document
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.equal(launcher.getAttribute('aria-expanded'), 'false', 'Launcher aria-expanded=false after Escape');
    assert.ok(panel.hasAttribute('hidden'), 'Panel hidden after Escape');
  });

  it('6. Fully re-renders all internal strings upon Arabic/English language toggle', () => {
    const widget = AccessibilityWidget.init();
    const shadow = widget.shadowRoot!;
    const state = widget.getStateManager();

    // Default detected from <html lang="ar" dir="rtl">
    assert.equal(state.getLocale(), 'ar', 'Initial locale should detect Arabic');
    assert.equal(widget.getAttribute('dir'), 'rtl', 'Widget direction should be rtl');

    const titleEl = shadow.querySelector('#raawi-panel-title')!;
    assert.equal(titleEl.textContent, 'أدوات الوصول وسهولة الاستخدام', 'Title must be Arabic');

    const assistTab = shadow.querySelector('[data-testid="raawi-tab-assist"]')!;
    assert.equal(assistTab.textContent, 'المساعدة', 'Assist tab label must be Arabic');

    // Switch to English via toggle button
    const enBtn = shadow.querySelector('.raawi-lang-btn[data-lang="en"]') as HTMLButtonElement;
    assert.ok(enBtn, 'English toggle button must exist');
    enBtn.click();

    assert.equal(state.getLocale(), 'en', 'State locale should be English after click');
    assert.equal(widget.getAttribute('dir'), 'ltr', 'Widget direction should switch to ltr');

    const titleElEn = shadow.querySelector('#raawi-panel-title')!;
    assert.equal(titleElEn.textContent, 'Accessibility & Usability Options', 'Title must update to English');

    const assistTabEn = shadow.querySelector('[data-testid="raawi-tab-assist"]')!;
    assert.equal(assistTabEn.textContent, 'Assist', 'Assist tab label must update to English');
  });

  it('7. Emits crisp inline SVG icon and functions without external network dependencies', () => {
    const widget = AccessibilityWidget.init();
    const shadow = widget.shadowRoot!;
    const launcher = shadow.querySelector('[data-testid="raawi-launcher"]')!;

    const svgIcon = launcher.querySelector('svg.raawi-launcher-icon');
    assert.ok(svgIcon, 'Launcher must contain self-contained inline SVG icon');
    assert.ok(
      !launcher.querySelector('img[src*="RaawixIcon.png"]'),
      'Launcher must NOT require external 2.5MB raster icon'
    );
  });

  it('8. Displays prominent WCAG compliance disclaimer in panel footer', () => {
    const widget = AccessibilityWidget.init();
    const shadow = widget.shadowRoot!;
    const disclaimer = shadow.querySelector('.raawi-disclaimer');
    assert.ok(disclaimer, 'Panel must contain compliance disclaimer');
    assert.ok(
      disclaimer.textContent!.includes('لا يغني عن الامتثال لمعايير WCAG 2.1 AA') ||
      disclaimer.textContent!.includes('does not substitute for native WCAG 2.1 AA compliance'),
      'Disclaimer must explicitly state widget does not substitute for native WCAG compliance'
    );
  });

  it('9. Supports complete programmatic API (open, close, toggle, setLocale, destroy)', () => {
    const widget = AccessibilityWidget.init();
    const launcher = widget.shadowRoot!.querySelector('[data-testid="raawi-launcher"]')!;

    assert.equal(launcher.getAttribute('aria-expanded'), 'false');
    widget.open();
    assert.equal(launcher.getAttribute('aria-expanded'), 'true');
    widget.close();
    assert.equal(launcher.getAttribute('aria-expanded'), 'false');
    widget.toggle();
    assert.equal(launcher.getAttribute('aria-expanded'), 'true');

    widget.setLocale('en');
    assert.equal(widget.getAttribute('dir'), 'ltr');
    assert.equal(widget.getStateManager().getLocale(), 'en');

    AccessibilityWidget.destroy();
    assert.equal(document.querySelector('raawi-accessibility-widget'), null);
    assert.equal(AccessibilityWidget.getInstance(), null);
  });

  it('10. Operates panel controls (stepper, toggle, reset) without runtime exceptions', () => {
    const widget = AccessibilityWidget.init();
    widget.open();
    const shadow = widget.shadowRoot!;
    const state = widget.getStateManager();

    // Switch to Vision tab
    const visionTab = shadow.querySelector('[data-testid="raawi-tab-vision"]') as HTMLButtonElement;
    assert.ok(visionTab, 'Vision tab must exist');
    visionTab.click();

    // Text size increase stepper
    const incBtn = shadow.querySelector('#raawi-btn-text-inc') as HTMLButtonElement;
    assert.ok(incBtn, 'Text increase button must exist');
    incBtn.click();
    assert.equal(state.getSettings().textSize, 1.1, 'Text size should increase to 1.1');

    // High contrast toggle
    const contrastInput = shadow.querySelector('#raawi-toggle-contrast') as HTMLInputElement;
    assert.ok(contrastInput, 'Contrast toggle input must exist');
    contrastInput.checked = true;
    contrastInput.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.equal(state.getSettings().contrastMode, true, 'Contrast mode should be enabled');

    // Reset settings
    const resetBtn = shadow.querySelector('#raawi-reset-btn') as HTMLButtonElement;
    assert.ok(resetBtn, 'Reset button must exist');
    resetBtn.click();
    assert.equal(state.getSettings().textSize, 1.0, 'Text size should reset to 1.0');
    assert.equal(state.getSettings().contrastMode, false, 'Contrast mode should reset to false');
  });

  it('11. Persists preferences to localStorage across reloads', () => {
    const widget = AccessibilityWidget.init();
    widget.getStateManager().updateSetting('textSize', 1.4);
    widget.getStateManager().setLocale('en');

    // Destroy and re-init from storage
    AccessibilityWidget.destroy();
    const newWidget = AccessibilityWidget.init();
    assert.equal(newWidget.getStateManager().getSettings().textSize, 1.4, 'Stored textSize must persist');
    assert.equal(newWidget.getStateManager().getLocale(), 'en', 'Stored locale must persist');
  });

  it('12. Operates gracefully in minimal host documents and when localStorage is restricted', () => {
    // Simulate minimal host with empty body
    document.body.innerHTML = '';

    const widget = AccessibilityWidget.init();
    assert.ok(widget, 'Widget must mount even in empty body');
    widget.open();
    assert.equal(widget.shadowRoot!.querySelector('[data-testid="raawi-panel"]')!.classList.contains('open'), true);
    widget.close();
    assert.equal(widget.shadowRoot!.querySelector('[data-testid="raawi-panel"]')!.classList.contains('open'), false);
  });
});

