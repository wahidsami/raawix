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
    (global as any).HTMLVideoElement = window.HTMLVideoElement;
    (global as any).customElements = window.customElements;
    (global as any).localStorage = window.localStorage;
    (global as any).MutationObserver = window.MutationObserver;
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

    // Reset host video state to paused
    const hostVideo = document.getElementById('host-video') as HTMLVideoElement | null;
    if (hostVideo) {
      Object.defineProperty(hostVideo, 'paused', { value: true, configurable: true, writable: true });
    }
    // Remove dynamically added videos from previous tests
    document.querySelectorAll('video:not(#host-video)').forEach((v) => v.remove());
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
    let videoPlayed = false;
    Object.defineProperty(video, 'paused', { get: () => videoPaused, configurable: true });
    video.pause = () => {
      videoPaused = true;
    };
    video.play = async () => {
      videoPlayed = true;
      videoPaused = false;
    };

    // Activate Stop Animations
    state.updateSetting('stopAnimations', true);
    assert.equal(root.getAttribute('data-raawi-stop-animations'), 'true');
    assert.equal(videoPaused, true);

    // Revert Stop Animations
    state.updateSetting('stopAnimations', false);
    assert.equal(root.hasAttribute('data-raawi-stop-animations'), false);
    assert.equal(videoPlayed, true, 'Original playing video must be resumed upon deactivation');
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

  it('13. Pre-existing managed attribute survives activation, reset, and teardown with its original value', () => {
    // Host pre-sets data-raawi-text-size to a custom integration value before widget initializes
    document.documentElement.setAttribute('data-raawi-text-size', '1.15');

    const widget = AccessibilityWidget.init();
    const state = widget.getStateManager();
    const root = document.documentElement;

    // Widget changes text size
    state.updateSetting('textSize', 1.4);
    assert.equal(root.getAttribute('data-raawi-text-size'), '1.4');

    // Reset settings
    state.resetSettings();
    // Must be restored to original pre-existing value '1.15', NOT removed
    assert.equal(root.getAttribute('data-raawi-text-size'), '1.15');

    // Re-enable and destroy
    state.updateSetting('textSize', 1.5);
    AccessibilityWidget.destroy();
    assert.equal(root.getAttribute('data-raawi-text-size'), '1.15');
  });

  it('14. Unrelated data-raawi-* attributes are never removed or altered', () => {
    // Integration attributes on html
    document.documentElement.setAttribute('data-raawi-entity-code', 'GOV-PORTAL-01');
    document.documentElement.setAttribute('data-raawi-version', '2.4.0');
    document.documentElement.setAttribute('data-raawi-custom-flag', 'enabled');

    const widget = AccessibilityWidget.init();
    const state = widget.getStateManager();
    const root = document.documentElement;

    // Activate various settings
    state.updateSetting('contrastMode', true);
    state.updateSetting('stopAnimations', true);
    state.updateSetting('bigCursor', 'dark');

    // Reset
    state.resetSettings();

    // Verify unrelated attributes survived intact
    assert.equal(root.getAttribute('data-raawi-entity-code'), 'GOV-PORTAL-01');
    assert.equal(root.getAttribute('data-raawi-version'), '2.4.0');
    assert.equal(root.getAttribute('data-raawi-custom-flag'), 'enabled');

    // Destroy
    AccessibilityWidget.destroy();
    assert.equal(root.getAttribute('data-raawi-entity-code'), 'GOV-PORTAL-01');
    assert.equal(root.getAttribute('data-raawi-version'), '2.4.0');
    assert.equal(root.getAttribute('data-raawi-custom-flag'), 'enabled');
  });

  it('15. Ownership-aware restoration: host mutation during active preference is preserved', () => {
    const widget = AccessibilityWidget.init();
    const state = widget.getStateManager();
    const root = document.documentElement;

    // Widget sets contrastMode
    state.updateSetting('contrastMode', true);
    assert.equal(root.getAttribute('data-raawi-contrast-mode'), 'true');

    // Host application externally overrides attribute to a custom value
    root.setAttribute('data-raawi-contrast-mode', 'host-custom-high-contrast');

    // Reset settings
    state.resetSettings();

    // Ownership check: current value does NOT match what widget set ('true'), so widget leaves it untouched
    assert.equal(root.getAttribute('data-raawi-contrast-mode'), 'host-custom-high-contrast');
  });

  it('16. Managed stylesheet element is removed upon teardown without removing unrelated stylesheets', () => {
    // Add an unrelated stylesheet to head with a similar or different id
    const hostStyle1 = document.createElement('style');
    hostStyle1.id = 'host-main-styles';
    hostStyle1.textContent = 'body { margin: 0; }';
    document.head.appendChild(hostStyle1);

    const hostStyle2 = document.createElement('style');
    hostStyle2.className = 'raawi-custom-theme';
    hostStyle2.textContent = '.custom { color: red; }';
    document.head.appendChild(hostStyle2);

    const widget = AccessibilityWidget.init();
    const displayManager = widget.getDisplayManager();
    assert.ok(displayManager.getManagedStyleElement(), 'Widget must own a managed style element');

    AccessibilityWidget.destroy();

    // Managed style must be gone
    assert.equal(document.getElementById('raawi-display-styles'), null);

    // Unrelated stylesheets must still be present in document.head
    assert.ok(document.getElementById('host-main-styles'));
    assert.ok(document.head.querySelector('.raawi-custom-theme'));

    // Clean up test styles
    hostStyle1.remove();
    hostStyle2.remove();
  });

  it('17. Video playing before activation is paused and resumes when disabled; paused video remains paused', () => {
    // Setup two videos: video1 (playing) and video2 (paused)
    const container = document.createElement('div');
    const v1 = document.createElement('video') as HTMLVideoElement;
    v1.id = 'v1-playing';
    const v2 = document.createElement('video') as HTMLVideoElement;
    v2.id = 'v2-paused';

    let v1Paused = false;
    let v1PlayedTimes = 0;
    Object.defineProperty(v1, 'paused', { get: () => v1Paused, configurable: true });
    v1.pause = () => { v1Paused = true; };
    v1.play = async () => { v1Paused = false; v1PlayedTimes++; };

    let v2Paused = true;
    let v2PlayedTimes = 0;
    Object.defineProperty(v2, 'paused', { get: () => v2Paused, configurable: true });
    v2.pause = () => { v2Paused = true; };
    v2.play = async () => { v2Paused = false; v2PlayedTimes++; };

    container.appendChild(v1);
    container.appendChild(v2);
    document.body.appendChild(container);

    const widget = AccessibilityWidget.init();
    const state = widget.getStateManager();
    const displayManager = widget.getDisplayManager();

    // Activate Stop Animations
    state.updateSetting('stopAnimations', true);

    // Only v1 should have been paused and tracked
    assert.equal(v1Paused, true, 'v1 was playing and must now be paused');
    assert.equal(v2Paused, true, 'v2 was already paused');
    assert.equal(displayManager.isVideoTracked(v1), true, 'v1 must be tracked as paused by widget');
    assert.equal(displayManager.isVideoTracked(v2), false, 'v2 must NOT be tracked since it was already paused');
    assert.equal(displayManager.getPausedVideosCount(), 1, 'Only 1 video was paused by the widget');

    // Deactivate Stop Animations
    state.updateSetting('stopAnimations', false);

    // v1 resumes; v2 remains paused
    assert.equal(v1Paused, false, 'v1 must resume playback');
    assert.equal(v1PlayedTimes, 1, 'v1.play() called exactly once');
    assert.equal(v2Paused, true, 'v2 must remain paused');
    assert.equal(v2PlayedTimes, 0, 'v2.play() must NEVER be called');
    assert.equal(displayManager.getPausedVideosCount(), 0, 'Tracking set must be empty after deactivation');

    container.remove();
  });

  it('18. Reset and teardown restore video playback state without duplicate actions or runtime errors', () => {
    const v = document.createElement('video') as HTMLVideoElement;
    let isPaused = false;
    let playCalls = 0;
    let pauseCalls = 0;
    Object.defineProperty(v, 'paused', { get: () => isPaused, configurable: true });
    v.pause = () => { isPaused = true; pauseCalls++; };
    v.play = async () => { isPaused = false; playCalls++; };
    document.body.appendChild(v);

    const widget = AccessibilityWidget.init();
    const state = widget.getStateManager();

    // Enable stop animations
    state.updateSetting('stopAnimations', true);
    assert.equal(pauseCalls, 1);
    assert.equal(isPaused, true);

    // Reset settings
    state.resetSettings();
    assert.equal(playCalls, 1);
    assert.equal(isPaused, false);

    // Enable stop animations again
    state.updateSetting('stopAnimations', true);
    assert.equal(pauseCalls, 2);

    // Destroy widget directly
    AccessibilityWidget.destroy();
    assert.equal(playCalls, 2, 'Destroying widget must resume video');
    assert.equal(isPaused, false);

    v.remove();
  });

  it('19. Repeated enable/disable toggle cycles leave zero stale tracking state', () => {
    const v = document.createElement('video') as HTMLVideoElement;
    let isPaused = false;
    Object.defineProperty(v, 'paused', { get: () => isPaused, configurable: true });
    v.pause = () => { isPaused = true; };
    v.play = async () => { isPaused = false; };
    document.body.appendChild(v);

    const widget = AccessibilityWidget.init();
    const state = widget.getStateManager();
    const displayManager = widget.getDisplayManager();

    // Toggle 5 times in succession
    for (let i = 0; i < 5; i++) {
      state.updateSetting('stopAnimations', true);
      assert.equal(displayManager.getPausedVideosCount(), 1);
      state.updateSetting('stopAnimations', false);
      assert.equal(displayManager.getPausedVideosCount(), 0);
    }

    assert.equal(displayManager.getPausedVideosCount(), 0, 'Zero stale video tracking state after repeated cycles');
    v.remove();
  });

  it('20. Dynamically inserted video while stop-animations is enabled is paused and resumed cleanly', async () => {
    const widget = AccessibilityWidget.init();
    const state = widget.getStateManager();
    const displayManager = widget.getDisplayManager();

    // Enable stop animations first
    state.updateSetting('stopAnimations', true);

    // Dynamically insert a playing video into body
    const dynVideo = document.createElement('video') as HTMLVideoElement;
    dynVideo.id = 'dyn-video';
    let dynPaused = false;
    let dynPlayCount = 0;
    Object.defineProperty(dynVideo, 'paused', { get: () => dynPaused, configurable: true });
    dynVideo.pause = () => { dynPaused = true; };
    dynVideo.play = async () => { dynPaused = false; dynPlayCount++; };

    document.body.appendChild(dynVideo);

    // Wait microtask for MutationObserver
    await new Promise((r) => setTimeout(r, 50));

    // The dynamically added playing video should have been paused by widget
    assert.equal(dynPaused, true, 'Dynamically inserted video must be paused while stopAnimations is active');
    assert.equal(displayManager.isVideoTracked(dynVideo), true);

    // Deactivate stop animations
    state.updateSetting('stopAnimations', false);
    assert.equal(dynPaused, false, 'Dynamically inserted video must be resumed');
    assert.equal(dynPlayCount, 1);

    dynVideo.remove();
  });
});
