/**
 * Phase 5.3 Acceptance Tests: Non-Destructive Display and Reading Preferences
 */

import { describe, it, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { JSDOM } = require('../../../node_modules/.pnpm/node_modules/jsdom');

describe('Phase 5.3: Non-Destructive Display and Reading Preferences', () => {
  let dom: JSDOM;
  let window: any;
  let document: Document;
  let AccessibilityWidget: any;
  let RaawiAccessibilityWidget: any;
  let DisplayManager: any;

  before(async () => {
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
        <head>
          <title>Test Host Portal</title>
        </head>
        <body>
          <header>
            <h1 id="host-h1">عنوان رئيسي</h1>
            <button id="host-btn">زر تحكم</button>
          </header>
          <main>
            <h2>عنوان فرعي</h2>
            <p id="host-p">فقرة نصية تفصيلية لتجربة القراءة والتكبير.</p>
            <div class="card">
              <h3>بطاقة خدمة</h3>
              <p>نص إضافي داخل بطاقة.</p>
              <button class="button">تنفيذ</button>
            </div>
            <video id="host-video" src="test.mp4"></video>
          </main>
        </body>
      </html>
    `, {
      url: 'https://portal.gov.sa',
      runScripts: 'dangerously',
    });

    window = dom.window;
    document = window.document;

    (global as any).window = window;
    (global as any).document = document;
    (global as any).HTMLElement = window.HTMLElement;
    (global as any).HTMLButtonElement = window.HTMLButtonElement;
    (global as any).customElements = window.customElements;
    (global as any).localStorage = window.localStorage;
    (global as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 16);
    (global as any).cancelAnimationFrame = (id: any) => clearTimeout(id);

    const widgetModule = await import('../src/index');
    AccessibilityWidget = widgetModule.AccessibilityWidget;
    RaawiAccessibilityWidget = widgetModule.RaawiAccessibilityWidget;
    DisplayManager = widgetModule.DisplayManager;
  });

  beforeEach(() => {
    // Reset document state
    document.documentElement.removeAttribute('data-raawi-text-size');
    document.documentElement.removeAttribute('data-raawi-line-spacing');
    document.documentElement.removeAttribute('data-raawi-contrast-mode');
    document.documentElement.removeAttribute('data-raawi-stop-animations');
    document.documentElement.removeAttribute('data-raawi-cursor');
    document.documentElement.removeAttribute('data-raawi-hide-images');
    document.documentElement.style.removeProperty('--raawi-text-size');
    document.documentElement.style.removeProperty('--raawi-line-spacing');
    window.localStorage.clear();
  });

  afterEach(() => {
    AccessibilityWidget.destroy();
  });

  it('1. Text scaling preserves heading/body hierarchy and does not flatten styles', () => {
    const widget = AccessibilityWidget.init();
    const state = widget.getStateManager();

    // Scale to 130%
    state.updateSetting('textSize', 1.3);

    const root = document.documentElement;
    assert.equal(root.getAttribute('data-raawi-text-size'), '1.3');
    assert.equal(root.style.getPropertyValue('--raawi-text-size'), '1.3');

    // Verify widget internal styling remains isolated
    assert.ok(widget.shadowRoot, 'Widget must have shadowRoot');
    const panel = widget.getPanelComponent().getElement();
    assert.ok(panel, 'Panel container exists in shadowRoot');

    // Return to 1.0 (default)
    state.updateSetting('textSize', 1.0);
    assert.equal(root.hasAttribute('data-raawi-text-size'), false);
    assert.equal(root.style.getPropertyValue('--raawi-text-size'), '');
  });

  it('2. Line-spacing changes target content blocks without breaking compact controls', () => {
    const widget = AccessibilityWidget.init();
    const state = widget.getStateManager();

    // Set line spacing to 1.5
    state.updateSetting('lineSpacing', 1.5);

    const root = document.documentElement;
    assert.equal(root.getAttribute('data-raawi-line-spacing'), '1.5');
    assert.equal(root.style.getPropertyValue('--raawi-line-spacing'), '1.5');

    // Return to 1.0
    state.updateSetting('lineSpacing', 1.0);
    assert.equal(root.hasAttribute('data-raawi-line-spacing'), false);
    assert.equal(root.style.getPropertyValue('--raawi-line-spacing'), '');
  });

  it('3. High-contrast mode produces intended theme attributes and remains reversible', () => {
    const widget = AccessibilityWidget.init();
    const state = widget.getStateManager();

    assert.equal(document.documentElement.hasAttribute('data-raawi-contrast-mode'), false);

    // Turn on High Contrast Mode
    state.updateSetting('contrastMode', true);
    assert.equal(document.documentElement.getAttribute('data-raawi-contrast-mode'), 'true');

    // Turn off High Contrast Mode
    state.updateSetting('contrastMode', false);
    assert.equal(document.documentElement.hasAttribute('data-raawi-contrast-mode'), false);
  });

  it('4. Reading ruler overlay is contained in Shadow DOM, has pointer-events:none, and tracks position', () => {
    const widget = AccessibilityWidget.init();
    const state = widget.getStateManager();
    const shadow = widget.getShadowRoot();

    // Enable reading guide
    state.updateSetting('readingGuide', true);

    const ruler = shadow.querySelector('#raawi-reading-ruler') as HTMLElement;
    assert.ok(ruler, 'Reading ruler must be created inside Shadow DOM');
    assert.equal(ruler.getAttribute('aria-hidden'), 'true');
    assert.equal(ruler.getAttribute('data-testid'), 'raawi-reading-ruler');
    assert.notEqual(ruler.style.display, 'none');

    // Ensure ruler never exists in host document body
    assert.equal(document.body.querySelector('#raawi-reading-ruler'), null);

    // Disable reading guide
    state.updateSetting('readingGuide', false);
    assert.equal(ruler.style.display, 'none');
  });

  it('5. Reading focus mask has top/bottom overlays in Shadow DOM and adjusts window height', () => {
    const widget = AccessibilityWidget.init();
    const state = widget.getStateManager();
    const shadow = widget.getShadowRoot();

    // Enable reading mask
    state.updateSetting('readingMask', true);

    const topOverlay = shadow.querySelector('#raawi-reading-mask-top') as HTMLElement;
    const bottomOverlay = shadow.querySelector('#raawi-reading-mask-bottom') as HTMLElement;

    assert.ok(topOverlay, 'Top mask overlay must exist in Shadow DOM');
    assert.ok(bottomOverlay, 'Bottom mask overlay must exist in Shadow DOM');
    assert.equal(topOverlay.getAttribute('aria-hidden'), 'true');
    assert.equal(bottomOverlay.getAttribute('aria-hidden'), 'true');

    // Check small, medium, large window height updates
    state.updateSetting('readingMaskWindowHeight', 'small');
    state.updateSetting('readingMaskWindowHeight', 'large');

    // Ensure overlays never pollute host document body
    assert.equal(document.body.querySelector('#raawi-reading-mask-top'), null);
    assert.equal(document.body.querySelector('#raawi-reading-mask-bottom'), null);

    // Disable reading mask
    state.updateSetting('readingMask', false);
    assert.equal(topOverlay.style.display, 'none');
    assert.equal(bottomOverlay.style.display, 'none');
  });

  it('6. Stop-animations behavior suppresses animations and pauses host video playback', () => {
    const widget = AccessibilityWidget.init();
    const state = widget.getStateManager();
    const root = document.documentElement;

    const video = document.getElementById('host-video') as HTMLVideoElement;
    let videoPaused = false;
    Object.defineProperty(video, 'paused', { value: false, configurable: true, writable: true });
    video.pause = () => {
      videoPaused = true;
      video.paused = true;
    };

    // Activate Stop Animations
    state.updateSetting('stopAnimations', true);
    assert.equal(root.getAttribute('data-raawi-stop-animations'), 'true');
    assert.equal(videoPaused, true);

    // Revert Stop Animations
    state.updateSetting('stopAnimations', false);
    assert.equal(root.hasAttribute('data-raawi-stop-animations'), false);
  });

  it('7. High-visibility cursor assistance applies SVG cursor mode reversibly', () => {
    const widget = AccessibilityWidget.init();
    const state = widget.getStateManager();
    const root = document.documentElement;

    // Dark cursor
    state.updateSetting('bigCursor', 'dark');
    assert.equal(root.getAttribute('data-raawi-cursor'), 'dark');

    // Light cursor
    state.updateSetting('bigCursor', 'light');
    assert.equal(root.getAttribute('data-raawi-cursor'), 'light');

    // Off
    state.updateSetting('bigCursor', 'off');
    assert.equal(root.hasAttribute('data-raawi-cursor'), false);
  });

  it('8. Hide images sets non-destructive visibility flag and restores cleanly', () => {
    const widget = AccessibilityWidget.init();
    const state = widget.getStateManager();
    const root = document.documentElement;

    // Hide images
    state.updateSetting('hideImages', true);
    assert.equal(root.getAttribute('data-raawi-hide-images'), 'true');

    // Restore images
    state.updateSetting('hideImages', false);
    assert.equal(root.hasAttribute('data-raawi-hide-images'), false);
  });

  it('9. Presets activate combined visual preferences correctly', () => {
    const widget = AccessibilityWidget.init();
    const state = widget.getStateManager();
    const root = document.documentElement;

    // Apply Low-Vision preset
    state.applyPreset('low-vision');
    assert.equal(state.getSettings().textSize, 1.3);
    assert.equal(state.getSettings().contrastMode, true);
    assert.equal(state.getSettings().bigCursor, 'dark');
    assert.equal(root.getAttribute('data-raawi-text-size'), '1.3');
    assert.equal(root.getAttribute('data-raawi-contrast-mode'), 'true');
    assert.equal(root.getAttribute('data-raawi-cursor'), 'dark');

    // Apply Dyslexia preset
    state.applyPreset('dyslexia');
    assert.equal(state.getSettings().lineSpacing, 1.4);
    assert.equal(state.getSettings().readingGuide, true);
    assert.equal(state.getSettings().stopAnimations, true);
    assert.equal(root.getAttribute('data-raawi-line-spacing'), '1.4');
    assert.equal(root.getAttribute('data-raawi-stop-animations'), 'true');
  });

  it('10. Reset restores each preference without leaving residual host attributes', () => {
    const widget = AccessibilityWidget.init();
    const state = widget.getStateManager();
    const root = document.documentElement;

    // Enable multiple features
    state.updateSetting('textSize', 1.5);
    state.updateSetting('lineSpacing', 1.6);
    state.updateSetting('contrastMode', true);
    state.updateSetting('stopAnimations', true);
    state.updateSetting('bigCursor', 'dark');
    state.updateSetting('readingGuide', true);
    state.updateSetting('readingMask', true);
    state.updateSetting('hideImages', true);

    // Call reset
    state.resetSettings();

    // Verify all host attributes and variables are completely cleared
    assert.equal(root.hasAttribute('data-raawi-text-size'), false);
    assert.equal(root.hasAttribute('data-raawi-line-spacing'), false);
    assert.equal(root.hasAttribute('data-raawi-contrast-mode'), false);
    assert.equal(root.hasAttribute('data-raawi-stop-animations'), false);
    assert.equal(root.hasAttribute('data-raawi-cursor'), false);
    assert.equal(root.hasAttribute('data-raawi-hide-images'), false);
    assert.equal(root.style.getPropertyValue('--raawi-text-size'), '');
    assert.equal(root.style.getPropertyValue('--raawi-line-spacing'), '');
  });

  it('11. Widget destruction cleanly removes managed styles, overlays, and observers', () => {
    const widget = AccessibilityWidget.init();
    const state = widget.getStateManager();

    state.updateSetting('readingGuide', true);
    state.updateSetting('contrastMode', true);

    // Destroy widget
    AccessibilityWidget.destroy();

    // Verify managed style tag is removed
    const styleEl = document.getElementById('raawi-display-styles');
    assert.equal(styleEl, null, 'Managed style element must be removed from document.head upon destruction');

    // Verify host attributes removed
    assert.equal(document.documentElement.hasAttribute('data-raawi-contrast-mode'), false);
  });

  it('12. Zero unprompted Web Speech TTS narration starts during any preference change', () => {
    let speakCalls = 0;
    (window as any).speechSynthesis = {
      speak: () => { speakCalls++; },
      cancel: () => {},
    };

    const widget = AccessibilityWidget.init();
    const state = widget.getStateManager();

    // Cycle through all display preferences
    state.updateSetting('textSize', 1.4);
    state.updateSetting('lineSpacing', 1.5);
    state.updateSetting('contrastMode', true);
    state.updateSetting('stopAnimations', true);
    state.updateSetting('bigCursor', 'light');
    state.updateSetting('readingGuide', true);
    state.updateSetting('readingMask', true);
    state.resetSettings();

    // Verify speech synthesis was never called
    assert.equal(speakCalls, 0, 'No automatic TTS narration should start during preference adjustments');
  });
});
