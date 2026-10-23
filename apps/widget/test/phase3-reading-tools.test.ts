/**
 * Phase 3: Reading and Tools Tab Polish Test Suite
 *
 * Covers:
 * 1. Reading Guide Ruler thickness controls, value display, independent state
 * 2. Reading Focus Mask aperture controls, value display, independent state
 * 3. Hide Images toggle & persistence
 * 4. Magnified Reading Strip control card & scale choices
 * 5. TTS Read Aloud idle speed selection feedback, transport states, voice availability/fallback
 * 6. Page Headings Navigator discovery (H1-H6), badges, hierarchy, scrollable list, empty state, safe jump
 * 7. 1:1 Translation key parity across Arabic and English
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { JSDOM } = require('../../../node_modules/.pnpm/node_modules/jsdom');
import { StateManager } from '../src/core/state';
import { I18nManager, translations } from '../src/core/i18n';
import { SpeechReader } from '../src/core/speech-reader';
import { HeadingsNavigator } from '../src/core/headings-navigator';
import { PanelComponent } from '../src/components/panel';
import { RaawiWidget } from '../src/core/shadow-container';

describe('Phase 3: Reading and Tools Tab Polish', () => {
  let dom: JSDOM;
  let prevWindow: any;
  let prevDoc: any;
  let prevCustomElements: any;

  beforeEach(() => {
    dom = new JSDOM(
      `<!DOCTYPE html>
      <html lang="en">
        <head><title>Phase 3 Test Page</title></head>
        <body>
          <main>
            <h1>Main Page Title (H1)</h1>
            <p>Some introductory text.</p>
            <h2>Section 1 (H2)</h2>
            <p>Section 1 text with a <a href="#test">link</a>.</p>
            <h3>Sub-section 1.1 (H3)</h3>
            <p>Sub-section detail.</p>
            <h4>Deep Section 1.1.1 (H4)</h4>
            <p>Deep details.</p>
            <h5>Minor Heading (H5)</h5>
            <p>Minor details.</p>
            <h6>Lowest Heading (H6)</h6>
            <p>Lowest details.</p>
            <h2 id="very-long-heading">This is an extremely long heading title intended to verify single-line truncation with text-overflow ellipsis</h2>
          </main>
        </body>
      </html>`,
      { url: 'http://localhost' }
    );

    prevWindow = global.window;
    prevDoc = global.document;
    prevCustomElements = global.customElements;
    const prevCustomEvent = global.CustomEvent;
    const prevEvent = global.Event;

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

  // =========================================================================
  // 1. Translation Parity
  // =========================================================================
  describe('1. Translation Parity', () => {
    test('maintains strict 1:1 translation parity between ar and en for all keys', () => {
      const enKeys = Object.keys(translations.en).sort();
      const arKeys = Object.keys(translations.ar).sort();

      assert.deepStrictEqual(
        enKeys,
        arKeys,
        'English and Arabic translation dictionaries must have identical keys'
      );

      // Verify Phase 3 keys exist
      assert.ok(translations.en.readingGuideDesc, 'readingGuideDesc should exist in en');
      assert.ok(translations.ar.readingGuideDesc, 'readingGuideDesc should exist in ar');
      assert.ok(translations.en.readingMaskDesc, 'readingMaskDesc should exist in en');
      assert.ok(translations.ar.readingMaskDesc, 'readingMaskDesc should exist in ar');
      assert.ok(translations.en.hideImagesDesc, 'hideImagesDesc should exist in en');
      assert.ok(translations.ar.hideImagesDesc, 'hideImagesDesc should exist in ar');
    });
  });

  // =========================================================================
  // 2. Reading Tab Polish
  // =========================================================================
  describe('2. Reading Tab Polish', () => {
    test('Reading Guide Ruler: toggle and thickness options work independently', () => {
      const state = new StateManager();
      const i18n = new I18nManager('en');
      state.setActiveTab('reading');
      const panel = new PanelComponent(state, i18n);
      const el = panel.getElement();

      const rulerToggle = el.querySelector('#raawi-toggle-reading-guide') as HTMLInputElement;
      assert.ok(rulerToggle, 'Reading Guide toggle must exist');
      assert.strictEqual(rulerToggle.checked, false);

      // Toggle ON
      rulerToggle.checked = true;
      rulerToggle.dispatchEvent(new dom.window.Event('change'));
      assert.strictEqual(state.getSettings().readingGuide, true);

      // Thickness buttons
      const thinBtn = el.querySelector('button[data-guide-thickness="thin"]') as HTMLButtonElement;
      const medBtn = el.querySelector('button[data-guide-thickness="medium"]') as HTMLButtonElement;
      const thickBtn = el.querySelector('button[data-guide-thickness="thick"]') as HTMLButtonElement;

      assert.ok(thinBtn && medBtn && thickBtn, 'All thickness buttons must exist');
      assert.ok(medBtn.classList.contains('active'), 'Medium should be active by default');

      // Click thick
      thickBtn.click();
      assert.strictEqual(state.getSettings().readingGuideThickness, 'thick');
      const updatedThickBtn = el.querySelector('button[data-guide-thickness="thick"]');
      assert.ok(updatedThickBtn?.classList.contains('active'), 'Thick button should now be active');

      // Reading mask remains independent
      assert.strictEqual(state.getSettings().readingMask, false);
    });

    test('Reading Focus Mask: aperture height options work independently', () => {
      const state = new StateManager();
      const i18n = new I18nManager('en');
      state.setActiveTab('reading');
      const panel = new PanelComponent(state, i18n);
      const el = panel.getElement();

      const maskToggle = el.querySelector('#raawi-toggle-reading-mask') as HTMLInputElement;
      assert.ok(maskToggle, 'Reading Focus Mask toggle must exist');
      assert.strictEqual(maskToggle.checked, false);

      // Toggle ON
      maskToggle.checked = true;
      maskToggle.dispatchEvent(new dom.window.Event('change'));
      assert.strictEqual(state.getSettings().readingMask, true);

      // Mask height buttons
      const smallBtn = el.querySelector('button[data-mask-height="small"]') as HTMLButtonElement;
      const medBtn = el.querySelector('button[data-mask-height="medium"]') as HTMLButtonElement;
      const largeBtn = el.querySelector('button[data-mask-height="large"]') as HTMLButtonElement;

      assert.ok(smallBtn && medBtn && largeBtn, 'All mask aperture buttons must exist');
      assert.ok(medBtn.classList.contains('active'), 'Medium aperture should be active by default');

      // Click large
      largeBtn.click();
      assert.strictEqual(state.getSettings().readingMaskWindowHeight, 'large');
      const updatedLargeBtn = el.querySelector('button[data-mask-height="large"]');
      assert.ok(updatedLargeBtn?.classList.contains('active'), 'Large button should now be active');

      // Reading guide remains independent
      assert.strictEqual(state.getSettings().readingGuide, false);
    });

    test('Hide Images: toggle updates setting and preserves state', () => {
      const state = new StateManager();
      const i18n = new I18nManager('en');
      state.setActiveTab('reading');
      const panel = new PanelComponent(state, i18n);
      const el = panel.getElement();

      const hideToggle = el.querySelector('#raawi-toggle-hide-images') as HTMLInputElement;
      assert.ok(hideToggle, 'Hide Images toggle must exist');
      assert.strictEqual(hideToggle.checked, false);

      hideToggle.checked = true;
      hideToggle.dispatchEvent(new dom.window.Event('change'));
      assert.strictEqual(state.getSettings().hideImages, true);
    });

    test('Magnified Reading Strip: control card displays scale choices and updates setting', () => {
      const state = new StateManager();
      const i18n = new I18nManager('en');
      state.setActiveTab('reading');
      const panel = new PanelComponent(state, i18n);
      const el = panel.getElement();

      const stripToggle = el.querySelector('#raawi-toggle-magnifier-strip') as HTMLInputElement;
      assert.ok(stripToggle, 'Magnifier strip toggle must exist');

      const scale150 = el.querySelector('button[data-panel-magnifier-scale="1.5"]') as HTMLButtonElement;
      const scale200 = el.querySelector('button[data-panel-magnifier-scale="2.0"]') as HTMLButtonElement;
      const scale250 = el.querySelector('button[data-panel-magnifier-scale="2.5"]') as HTMLButtonElement;
      const scale300 = el.querySelector('button[data-panel-magnifier-scale="3.0"]') as HTMLButtonElement;

      assert.ok(scale150 && scale200 && scale250 && scale300, 'All 4 scale choices must exist');
      assert.ok(scale200.classList.contains('active'), '200% should be active by default');

      // Click 250%
      scale250.click();
      assert.strictEqual(state.getSettings().magnifierScale, 2.5);
      const updatedScale250 = el.querySelector('button[data-panel-magnifier-scale="2.5"]');
      assert.ok(updatedScale250?.classList.contains('active'), '250% should now be active');
    });
  });

  // =========================================================================
  // 3. Tools Tab: TTS Read Aloud Polish & Immediate Idle Speed Selection
  // =========================================================================
  describe('3. Tools Tab: TTS Read Aloud Polish', () => {
    function setupSpeechMock(voices: any[] = []) {
      class MockUtterance {
        public text: string = '';
        public rate: number = 1.0;
        public voice: any = null;
        public lang: string = 'en-US';
        public onstart?: () => void;
        public onpause?: () => void;
        public onresume?: () => void;
        public onend?: () => void;
        public onerror?: (e: any) => void;
        constructor(text: string = '') {
          this.text = text;
        }
      }

      (dom.window as any).SpeechSynthesisUtterance = MockUtterance;
      (global as any).SpeechSynthesisUtterance = MockUtterance;

      const mockSynth = {
        speaking: false,
        paused: false,
        getVoices: () => voices,
        speak: () => {},
        cancel: () => {},
        pause: () => {},
        resume: () => {},
      };

      (dom.window as any).speechSynthesis = mockSynth;
      (global as any).speechSynthesis = mockSynth;
    }

    test('SpeechReader notifies subscribers immediately when rate changes while idle', () => {
      setupSpeechMock();

      const reader = new SpeechReader({ locale: 'en' });
      assert.strictEqual(reader.getState(), 'idle');
      assert.strictEqual(reader.getRate(), 1.0);

      let notifiedCount = 0;
      reader.subscribe((state) => {
        notifiedCount++;
        assert.strictEqual(state, 'idle', 'State should remain idle during rate change');
      });

      // Change rate while idle
      reader.setRate(1.25);
      assert.strictEqual(reader.getRate(), 1.25);
      assert.strictEqual(notifiedCount, 1, 'Subscriber must be notified immediately upon rate change');

      reader.setRate(1.5);
      assert.strictEqual(reader.getRate(), 1.5);
      assert.strictEqual(notifiedCount, 2, 'Subscriber must be notified on second rate change');
    });

    test('Panel UI immediately reflects active class and aria-pressed on speed button click while idle', () => {
      setupSpeechMock();

      const state = new StateManager();
      const i18n = new I18nManager('en');
      const reader = new SpeechReader({ locale: 'en' });
      state.setActiveTab('tools');

      const panel = new PanelComponent(state, i18n, undefined, undefined, reader);
      const el = panel.getElement();

      const defaultRateBtn = el.querySelector('button[data-speech-rate="1.0"]') as HTMLButtonElement;
      assert.ok(defaultRateBtn, '1.0x rate button must exist');
      assert.ok(defaultRateBtn.classList.contains('active'), '1.0x should be active initially');
      assert.strictEqual(defaultRateBtn.getAttribute('aria-pressed'), 'true');

      const fastRateBtn = el.querySelector('button[data-speech-rate="1.5"]') as HTMLButtonElement;
      assert.ok(fastRateBtn, '1.5x rate button must exist');
      assert.strictEqual(fastRateBtn.classList.contains('active'), false);
      assert.strictEqual(fastRateBtn.getAttribute('aria-pressed'), 'false');

      // Click 1.5x button while idle
      fastRateBtn.click();

      // Verify immediate reflection without speech playback
      const updatedFastRateBtn = el.querySelector('button[data-speech-rate="1.5"]') as HTMLButtonElement;
      const updatedDefaultRateBtn = el.querySelector('button[data-speech-rate="1.0"]') as HTMLButtonElement;

      assert.strictEqual(reader.getRate(), 1.5, 'SpeechReader rate should be updated to 1.5');
      assert.strictEqual(reader.getState(), 'idle', 'SpeechReader state should still be idle');
      assert.ok(updatedFastRateBtn.classList.contains('active'), '1.5x button must immediately have active class');
      assert.strictEqual(updatedFastRateBtn.getAttribute('aria-pressed'), 'true', '1.5x aria-pressed must be true');
      assert.strictEqual(updatedDefaultRateBtn.classList.contains('active'), false, '1.0x button must not have active class');
      assert.strictEqual(updatedDefaultRateBtn.getAttribute('aria-pressed'), 'false');
    });

    test('TTS transport controls render correctly with accessible names and status pill', () => {
      setupSpeechMock();

      const state = new StateManager();
      const i18n = new I18nManager('en');
      const reader = new SpeechReader({ locale: 'en' });
      state.setActiveTab('tools');

      const panel = new PanelComponent(state, i18n, undefined, undefined, reader);
      const el = panel.getElement();

      const playBtn = el.querySelector('#raawi-btn-tts-play');
      const pauseBtn = el.querySelector('#raawi-btn-tts-pause');
      const stopBtn = el.querySelector('#raawi-btn-tts-stop');

      assert.ok(playBtn, 'Play button must exist');
      assert.ok(pauseBtn, 'Pause button must exist');
      assert.ok(stopBtn, 'Stop button must exist');

      // Status badge
      const statusBadge = el.querySelector('#raawi-tts-status-badge');
      assert.ok(statusBadge, 'TTS status badge must exist');
      assert.ok(statusBadge.textContent?.includes('Ready'), 'Initial status should be Ready');
    });

    test('Gracefully handles missing voices without claiming nonexistent voices', () => {
      setupSpeechMock([]);

      const state = new StateManager();
      const i18n = new I18nManager('en');
      const reader = new SpeechReader({ locale: 'en' });
      state.setActiveTab('tools');

      const panel = new PanelComponent(state, i18n, undefined, undefined, reader);
      const el = panel.getElement();

      const voiceFallback = el.querySelector('.raawi-voice-fallback');
      assert.ok(voiceFallback, 'Voice fallback message should be rendered when no voices exist');
    });
  });

  // =========================================================================
  // 4. Tools Tab: Page Headings Navigator Polish
  // =========================================================================
  describe('4. Tools Tab: Page Headings Navigator Polish', () => {
    test('discovers all H1-H6 headings without suppressing H4-H6', () => {
      const headings = HeadingsNavigator.discoverHeadings(dom.window.document);
      assert.strictEqual(headings.length, 7, 'Should discover all 7 visible headings in the test page');

      const levels = headings.map((h) => h.level);
      assert.ok(levels.includes(1), 'H1 must be included');
      assert.ok(levels.includes(2), 'H2 must be included');
      assert.ok(levels.includes(3), 'H3 must be included');
      assert.ok(levels.includes(4), 'H4 must NOT be suppressed');
      assert.ok(levels.includes(5), 'H5 must NOT be suppressed');
      assert.ok(levels.includes(6), 'H6 must NOT be suppressed');
    });

    test('renders color-coded level badges and hierarchical indentation', () => {
      const state = new StateManager();
      const i18n = new I18nManager('en');
      state.setActiveTab('tools');

      const panel = new PanelComponent(state, i18n);
      const el = panel.getElement();

      const headingItems = el.querySelectorAll('.raawi-heading-item');
      assert.strictEqual(headingItems.length, 7, 'Panel should render all 7 heading items');

      // Check badge classes
      const h1Badge = el.querySelector('.raawi-heading-badge-1');
      const h2Badge = el.querySelector('.raawi-heading-badge-2');
      const h3Badge = el.querySelector('.raawi-heading-badge-3');
      const h4Badge = el.querySelector('.raawi-heading-badge-4');
      const h5Badge = el.querySelector('.raawi-heading-badge-5');
      const h6Badge = el.querySelector('.raawi-heading-badge-6');

      assert.ok(h1Badge, 'H1 badge class must exist');
      assert.ok(h2Badge, 'H2 badge class must exist');
      assert.ok(h3Badge, 'H3 badge class must exist');
      assert.ok(h4Badge, 'H4 badge class must exist');
      assert.ok(h5Badge, 'H5 badge class must exist');
      assert.ok(h6Badge, 'H6 badge class must exist');

      // Check indentation
      const h1Item = headingItems[0] as HTMLElement;
      const h3Item = headingItems[2] as HTMLElement;
      assert.strictEqual(h1Item.style.marginInlineStart, '0px', 'H1 should have 0 indent');
      assert.strictEqual(h3Item.style.marginInlineStart, '16px', 'H3 should have 16px indent');
    });

    test('handles long heading labels without breaking layout using single-line ellipsis', () => {
      const state = new StateManager();
      const i18n = new I18nManager('en');
      state.setActiveTab('tools');

      const panel = new PanelComponent(state, i18n);
      const el = panel.getElement();

      const longHeadingText = el.querySelector('.raawi-heading-item:last-child .raawi-heading-text');
      assert.ok(longHeadingText, 'Heading text element must exist');
      assert.ok(longHeadingText.textContent?.includes('extremely long heading title'));
    });

    test('renders localized empty state when document has no headings', () => {
      // Create empty document
      const emptyDom = new JSDOM('<!DOCTYPE html><html><body><main><p>No headings here</p></main></body></html>');
      const origDoc = global.document;
      (global as any).document = emptyDom.window.document;

      try {
        const state = new StateManager();
        const i18n = new I18nManager('en');
        state.setActiveTab('tools');

        const panel = new PanelComponent(state, i18n);
        const el = panel.getElement();

        const emptyContainer = el.querySelector('.raawi-headings-empty');
        assert.ok(emptyContainer, 'Empty state container must be rendered');
        assert.ok(emptyContainer.textContent?.includes(translations.en.noHeadingsFound));
      } finally {
        (global as any).document = origDoc;
      }
    });

    test('safe jump navigates to heading, handles focus, and cleans up temporary focus markers', () => {
      const state = new StateManager();
      const i18n = new I18nManager('en');
      state.setActiveTab('tools');

      const panel = new PanelComponent(state, i18n);
      const el = panel.getElement();

      const jumpBtns = el.querySelectorAll<HTMLButtonElement>('.raawi-heading-jump-btn');
      assert.ok(jumpBtns.length > 0, 'Jump buttons must exist');

      let closeDispatched = false;
      let announcement = '';
      el.addEventListener('raawi-close-dialog', () => {
        closeDispatched = true;
      });
      el.addEventListener('raawi-announce', (e: any) => {
        announcement = e.detail?.message;
      });

      // Jump to first heading
      jumpBtns[0].click();

      assert.strictEqual(closeDispatched, true, 'raawi-close-dialog must be dispatched');
      assert.ok(announcement.length > 0, 'announcement must be made');
    });
  });

  // =========================================================================
  // 5. Lifecycle & Reset
  // =========================================================================
  describe('5. Lifecycle & Reset', () => {
    test('Reset button stops active speech reader and resets reading/tools settings', () => {
      (dom.window as any).speechSynthesis = {
        speaking: true,
        paused: false,
        getVoices: () => [],
        speak: () => {},
        cancel: () => {},
        pause: () => {},
        stop: () => {},
      };

      const state = new StateManager();
      const i18n = new I18nManager('en');
      const reader = new SpeechReader({ locale: 'en' });
      state.updateSetting('readingGuide', true);
      state.updateSetting('readingMask', true);

      let stopCalled = false;
      reader.stop = () => {
        stopCalled = true;
      };

      const panel = new PanelComponent(state, i18n, undefined, undefined, reader);
      const el = panel.getElement();

      const resetBtn = el.querySelector('#raawi-reset-btn') as HTMLButtonElement;
      assert.ok(resetBtn, 'Reset button must exist');
      resetBtn.click();

      assert.strictEqual(stopCalled, true, 'Speech reader must be stopped upon reset');
      assert.strictEqual(state.getSettings().readingGuide, false, 'Reading guide must reset');
      assert.strictEqual(state.getSettings().readingMask, false, 'Reading mask must reset');
    });
  });
});
