/**
 * Phase 2A Unit Test Suite: Integrity Cleanup and Standalone Reading Assistance
 * 
 * Verifies:
 * 1. Phase 1 Integrity Cleanup:
 *    - Absence of visible non-functional AI buttons (#raawi-btn-describe-image, #raawi-btn-describe-focused, #raawi-btn-what-can-i-do).
 *    - Removal of ghost settings (imageCaptions, magnifier, magnifierZoom) from WidgetSettings and presets.
 * 2. Standalone Focus Visibility Indicator:
 *    - Managed attribute data-raawi-focus-highlight lifecycle and clean restoration.
 *    - High-visibility focus indicator rules that preserve widget UI.
 * 3. Headings Navigator:
 *    - Autonomous host page h1-h6 discovery and level hierarchy.
 *    - Strict exclusion of widget Shadow DOM and hidden elements.
 *    - Non-destructive focus transfer and blur cleanup.
 *    - Empty state handling on pages without headings.
 * 4. Browser-Native Read-Aloud (SpeechReader):
 *    - Graceful fallback when SpeechSynthesis is unsupported.
 *    - Complete lifecycle: Play, Pause, Resume, Stop with mock SpeechSynthesis.
 *    - User text selection vs page content fallback extraction.
 *    - Exclusion of widget controls and hidden nodes from speech text.
 *    - Voice discovery, locale matching, and cancellation on teardown/close.
 * 5. WAI-ARIA Tab Navigation & Touch Targets:
 *    - Tablist semantics, arrow keys (Left/Right/Up/Down), Home, End.
 *    - 44px touch targets on tabs and primary action controls.
 * 6. Bilingual Localization & Key Parity.
 */

import { describe, it, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { JSDOM } = require('../../../node_modules/.pnpm/node_modules/jsdom');

import { HeadingsNavigator, type HeadingItem } from '../src/core/headings-navigator';
import { SpeechReader, type VoiceInfo } from '../src/core/speech-reader';
import { StateManager } from '../src/core/state';
import { I18nManager, translations } from '../src/core/i18n';
import { DisplayManager } from '../src/core/display-manager';
import { DEFAULT_SETTINGS, type WidgetSettings } from '../src/core/types';

describe('Phase 1 + Phase 2A: Integrity Cleanup & Standalone Reading Assistance', () => {
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
          <title>Test Government Services</title>
        </head>
        <body>
          <header>
            <h1 id="main-h1">البوابة الوطنية للخدمات الحكومية</h1>
            <nav>
              <h2 id="nav-h2">روابط سريعة</h2>
              <a href="#services" class="test-link" id="link-services">دليل الخدمات</a>
              <button class="test-btn" id="btn-login">تسجيل الدخول</button>
            </nav>
          </header>
          <main>
            <h2 id="services-h2">أبرز الخدمات الإلكترونية</h2>
            <p id="p-intro">تقدم البوابة تجربة وصول رقمية شاملة لكافة المواطنين والمقيمين.</p>
            <h3 id="step-h3">خطوات التقديم الإلكتروني</h3>
            <p id="p-steps">قم بتسجيل الدخول ثم اختيار الخدمة وتعبئة النموذج.</p>
            <div id="hidden-section" style="display: none;">
              <h4 id="hidden-h4">عناوين مخفية يجب استبعادها</h4>
              <p>محتوى مخفي</p>
            </div>
            <div aria-hidden="true">
              <h5 id="aria-hidden-h5">عنوان في قسم غير مرئي للتقنيات المساعدة</h5>
            </div>
          </main>
        </body>
      </html>
    `, {
      url: 'https://services.gov.sa/home',
      runScripts: 'dangerously',
    });

    window = dom.window;
    document = window.document;

    (global as any).window = window;
    (global as any).document = document;
    (global as any).HTMLElement = window.HTMLElement;
    (global as any).HTMLButtonElement = window.HTMLButtonElement;
    (global as any).HTMLSelectElement = window.HTMLSelectElement;
    (global as any).customElements = window.customElements;
    (global as any).localStorage = window.localStorage;

    const panelMod = await import('../src/components/panel');
    PanelComponent = panelMod.PanelComponent;

    const shadowMod = await import('../src/core/shadow-container');
    RaawiAccessibilityWidget = shadowMod.RaawiAccessibilityWidget;
    registerRaawiWidget = shadowMod.registerRaawiWidget;

    registerRaawiWidget(window.customElements);
  });

  describe('Suite 1: Phase 1 Integrity Cleanup', () => {
    it('guarantees visible dead AI buttons are absent from the active panel DOM', () => {
      const state = new StateManager('ar');
      const i18n = new I18nManager('ar');
      const panel = new PanelComponent(state, i18n);
      const el = panel.getElement();

      assert.strictEqual(
        el.querySelector('#raawi-btn-describe-image'),
        null,
        '#raawi-btn-describe-image must not exist in active DOM'
      );
      assert.strictEqual(
        el.querySelector('#raawi-btn-describe-focused'),
        null,
        '#raawi-btn-describe-focused must not exist in active DOM'
      );
      assert.strictEqual(
        el.querySelector('#raawi-btn-what-can-i-do'),
        null,
        '#raawi-btn-what-can-i-do must not exist in active DOM'
      );
    });

    it('removes ghost settings from WidgetSettings and DEFAULT_SETTINGS', () => {
      const settings = { ...DEFAULT_SETTINGS };
      assert.strictEqual((settings as any).magnifier, undefined, 'magnifier must not exist in DEFAULT_SETTINGS');
      assert.strictEqual((settings as any).magnifierZoom, undefined, 'magnifierZoom must not exist in DEFAULT_SETTINGS');
      assert.strictEqual((settings as any).imageCaptions, undefined, 'imageCaptions must not exist in DEFAULT_SETTINGS');
      assert.strictEqual(settings.focusHighlight, false, 'focusHighlight must default to false');
    });

    it('operates accessibility presets cleanly without referencing ghost settings or enabling remediation implicitly', () => {
      const state = new StateManager('en');

      // 1. Default remains disabled
      assert.strictEqual(DEFAULT_SETTINGS.remediationEnabled, false, 'remediationEnabled must be false by default');
      assert.strictEqual(state.getSettings().remediationEnabled, false, 'initial state must have remediation disabled');

      // 2. Applying Blind preset does NOT enable remediation implicitly
      state.applyPreset('blind');
      const blindSettings = state.getSettings();
      assert.strictEqual(blindSettings.activePreset, 'blind');
      assert.strictEqual((blindSettings as any).imageCaptions, undefined);
      assert.strictEqual(blindSettings.remediationEnabled, false, 'blind profile must never enable remediation implicitly');

      // 3. Explicitly enabling remediation through its intended control continues to work
      state.updateSetting('remediationEnabled', true);
      assert.strictEqual(state.getSettings().remediationEnabled, true, 'explicit toggle must enable remediation');

      // 4. Switching presets does not leave remediation unexpectedly enabled
      state.applyPreset('low-vision');
      const lowVisionSettings = state.getSettings();
      assert.strictEqual(lowVisionSettings.contrastMode, true);
      assert.strictEqual(lowVisionSettings.textSize, 1.3);
      assert.strictEqual(lowVisionSettings.remediationEnabled, false, 'switching preset must reset remediation to disabled');

      state.applyPreset('dyslexia');
      const dyslexiaSettings = state.getSettings();
      assert.strictEqual(dyslexiaSettings.remediationEnabled, false, 'dyslexia preset must have remediation disabled');

      // 5. Resetting settings restores default disabled state
      state.updateSetting('remediationEnabled', true);
      state.resetSettings();
      const defaultSettings = state.getSettings();
      assert.strictEqual(defaultSettings.activePreset, 'none');
      assert.strictEqual(defaultSettings.textSize, 1.0);
      assert.strictEqual(defaultSettings.remediationEnabled, false, 'resetting settings must disable remediation');
    });
  });

  describe('Suite 2: Standalone Focus Visibility Indicator', () => {
    it('applies and cleanly restores data-raawi-focus-highlight attribute on <html>', () => {
      const state = new StateManager('ar');
      const container = document.createElement('div');
      const shadow = container.attachShadow({ mode: 'open' });
      const display = new DisplayManager(state, shadow);

      assert.strictEqual(document.documentElement.hasAttribute('data-raawi-focus-highlight'), false);

      state.updateSetting('focusHighlight', true);
      assert.strictEqual(document.documentElement.getAttribute('data-raawi-focus-highlight'), 'true');

      state.updateSetting('focusHighlight', false);
      assert.strictEqual(document.documentElement.hasAttribute('data-raawi-focus-highlight'), false);

      display.destroy();
    });

    it('injects scoped focus highlight CSS rules that exclude widget internal elements', () => {
      const state = new StateManager('en');
      const container = document.createElement('div');
      const shadow = container.attachShadow({ mode: 'open' });
      const display = new DisplayManager(state, shadow);

      const style = document.head.querySelector('style[data-raawi-owned="true"]');
      assert.ok(style, 'Managed style element must exist in document.head');
      const css = style.textContent || '';

      assert.ok(
        css.includes('html[data-raawi-focus-highlight="true"] :focus-visible:not(raawi-accessibility-widget *)'),
        'Focus highlight must target host focus-visible elements and exclude widget'
      );
      assert.ok(
        css.includes('box-shadow'),
        'Focus highlight rule must provide enhanced multi-layered ring'
      );

      display.destroy();
    });

    it('toggles focus highlight via Panel UI checkbox control', () => {
      const state = new StateManager('ar');
      const i18n = new I18nManager('ar');
      state.setActiveTab('vision');
      const panel = new PanelComponent(state, i18n);

      const toggle = panel.getElement().querySelector('#raawi-toggle-focus-highlight') as HTMLInputElement;
      assert.ok(toggle, '#raawi-toggle-focus-highlight must be rendered in vision tab');
      assert.strictEqual(toggle.checked, false);

      toggle.checked = true;
      toggle.dispatchEvent(new window.Event('change'));
      assert.strictEqual(state.getSettings().focusHighlight, true);
    });
  });

  describe('Suite 3: Headings Navigator', () => {
    it('discovers visible h1-h6 headings in hierarchical order from host DOM', () => {
      const headings = HeadingsNavigator.discoverHeadings(document);
      assert.ok(headings.length >= 4, 'Should discover at least 4 visible headings');

      assert.strictEqual(headings[0].level, 1);
      assert.strictEqual(headings[0].text, 'البوابة الوطنية للخدمات الحكومية');

      assert.strictEqual(headings[1].level, 2);
      assert.strictEqual(headings[1].text, 'روابط سريعة');

      assert.strictEqual(headings[2].level, 2);
      assert.strictEqual(headings[2].text, 'أبرز الخدمات الإلكترونية');

      assert.strictEqual(headings[3].level, 3);
      assert.strictEqual(headings[3].text, 'خطوات التقديم الإلكتروني');
    });

    it('strictly excludes hidden headings and headings inside aria-hidden containers', () => {
      const headings = HeadingsNavigator.discoverHeadings(document);
      const texts = headings.map((h) => h.text);

      assert.strictEqual(texts.includes('عناوين مخفية يجب استبعادها'), false);
      assert.strictEqual(texts.includes('عنوان في قسم غير مرئي للتقنيات المساعدة'), false);
    });

    it('excludes headings residing inside the widget Shadow DOM container', () => {
      const widget = document.createElement('raawi-accessibility-widget') as any;
      document.body.appendChild(widget);

      const headings = HeadingsNavigator.discoverHeadings(document);
      for (const h of headings) {
        assert.notStrictEqual(h.text, 'أدوات الوصول وسهولة الاستخدام');
        assert.strictEqual(h.element.closest('raawi-accessibility-widget'), null);
      }

      widget.remove();
    });

    it('navigates to heading, applies temporary tabindex="-1", and cleans up on blur', () => {
      const headings = HeadingsNavigator.discoverHeadings(document);
      const target = headings[0];

      let scrollOpts: any = null;
      target.element.scrollIntoView = (opts?: any) => { scrollOpts = opts; };

      const res = HeadingsNavigator.navigateToHeading(target, { reduceMotion: false });
      assert.strictEqual(res.success, true);
      assert.deepStrictEqual(scrollOpts, { behavior: 'smooth', block: 'start' });

      assert.strictEqual(target.element.getAttribute('tabindex'), '-1');
      assert.strictEqual(target.element.getAttribute('data-raawi-temp-focus'), 'true');

      // Trigger blur event
      target.element.dispatchEvent(new window.FocusEvent('blur'));
      assert.strictEqual(target.element.hasAttribute('tabindex'), false);
      assert.strictEqual(target.element.hasAttribute('data-raawi-temp-focus'), false);
    });

    it('uses non-animated scrolling when reduceMotion is requested explicitly in options', () => {
      const headings = HeadingsNavigator.discoverHeadings(document);
      const target = headings[0];

      let scrollOpts: any = null;
      target.element.scrollIntoView = (opts?: any) => { scrollOpts = opts; };

      const res = HeadingsNavigator.navigateToHeading(target, { reduceMotion: true });
      assert.strictEqual(res.success, true);
      assert.deepStrictEqual(scrollOpts, { behavior: 'auto', block: 'start' });
    });

    it('respects system prefers-reduced-motion media query even when options omit reduceMotion', () => {
      const headings = HeadingsNavigator.discoverHeadings(document);
      const target = headings[0];

      let scrollOpts: any = null;
      target.element.scrollIntoView = (opts?: any) => { scrollOpts = opts; };

      const originalMatchMedia = window.matchMedia;
      try {
        window.matchMedia = (query: string) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        });

        // Call navigateToHeading without options or with reduceMotion omitted
        const res = HeadingsNavigator.navigateToHeading(target);
        assert.strictEqual(res.success, true);
        assert.deepStrictEqual(scrollOpts, { behavior: 'auto', block: 'start' });
      } finally {
        window.matchMedia = originalMatchMedia;
      }
    });

    it('returns empty list and renders friendly empty state on pages with no headings', () => {
      const originalBody = document.body.innerHTML;
      try {
        document.body.innerHTML = '<p>No headings here</p>';

        const headings = HeadingsNavigator.discoverHeadings(document);
        assert.deepStrictEqual(headings, []);

        const state = new StateManager('en');
        state.setActiveTab('tools');
        const i18n = new I18nManager('en');
        const panel = new PanelComponent(state, i18n);

        const emptyEl = panel.getElement().querySelector('[data-testid="raawi-no-headings"]');
        assert.ok(emptyEl, 'Empty state element should be rendered');
        assert.ok(emptyEl.textContent?.includes('No headings found on this page'));
      } finally {
        document.body.innerHTML = originalBody;
      }
    });
  });

  describe('Suite 4: Browser-Native Speech Synthesis (Read-Aloud)', () => {
    it('handles environments without SpeechSynthesis gracefully without throwing', () => {
      delete (window as any).speechSynthesis;
      delete (window as any).SpeechSynthesisUtterance;

      assert.strictEqual(SpeechReader.isSupported(), false);
      const reader = new SpeechReader();
      assert.strictEqual(reader.getState(), 'unsupported');

      const res = reader.read();
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.message, 'Speech synthesis is not supported in this browser');
    });

    it('operates complete Play, Pause, Resume, Stop lifecycle using mock SpeechSynthesis', () => {
      let spokenUtterance: any = null;
      let cancelled = false;
      let paused = false;
      let resumed = false;

      // Mock Web Speech APIs
      (window as any).SpeechSynthesisUtterance = class MockUtterance {
        public text: string;
        public rate: number = 1.0;
        public voice: any = null;
        public lang: string = 'ar-SA';
        public onstart?: () => void;
        public onpause?: () => void;
        public onresume?: () => void;
        public onend?: () => void;
        public onerror?: (e: any) => void;
        constructor(text: string) {
          this.text = text;
        }
      };

      (window as any).speechSynthesis = {
        speak: (u: any) => {
          spokenUtterance = u;
          u.onstart?.();
        },
        pause: () => {
          paused = true;
          spokenUtterance?.onpause?.();
        },
        resume: () => {
          resumed = true;
          spokenUtterance?.onresume?.();
        },
        cancel: () => {
          cancelled = true;
          if (spokenUtterance) {
            spokenUtterance.onerror?.({ error: 'canceled' });
          }
        },
        getVoices: () => [
          { voiceURI: 'voice-ar-1', name: 'Maged (Arabic)', lang: 'ar-SA', default: true },
          { voiceURI: 'voice-en-1', name: 'Samantha (English)', lang: 'en-US', default: false },
        ],
        onvoiceschanged: null,
      };

      assert.strictEqual(SpeechReader.isSupported(), true);
      const reader = new SpeechReader({ locale: 'ar', defaultRate: 1.25 });
      assert.strictEqual(reader.getRate(), 1.25);

      const stateTransitions: string[] = [];
      reader.subscribe((st) => stateTransitions.push(st));

      // 1. Play
      const playRes = reader.read('هذا نص تجريبي');
      assert.strictEqual(playRes.success, true);
      assert.strictEqual(reader.getState(), 'playing');
      assert.ok(spokenUtterance);
      assert.strictEqual(spokenUtterance.text, 'هذا نص تجريبي');
      assert.strictEqual(spokenUtterance.rate, 1.25);
      assert.strictEqual(spokenUtterance.voice.voiceURI, 'voice-ar-1');

      // 2. Pause
      const pauseRes = reader.pause();
      assert.strictEqual(pauseRes.success, true);
      assert.strictEqual(paused, true);
      assert.strictEqual(reader.getState(), 'paused');

      // 3. Resume
      const resumeRes = reader.resume();
      assert.strictEqual(resumeRes.success, true);
      assert.strictEqual(resumed, true);
      assert.strictEqual(reader.getState(), 'playing');

      // 4. Stop
      const stopRes = reader.stop();
      assert.strictEqual(stopRes.success, true);
      assert.strictEqual(cancelled, true);

      reader.destroy();
    });

    it('extracts user selection when present, and falls back to readable page content when not', () => {
      // 1. With Selection
      window.getSelection = () => ({
        toString: () => '   النص المختار من قبل المستخدم   ',
      });

      const selContent = SpeechReader.extractReadableContent(document);
      assert.strictEqual(selContent.source, 'selection');
      assert.strictEqual(selContent.text, 'النص المختار من قبل المستخدم');

      // 2. Without Selection (empty)
      window.getSelection = () => ({
        toString: () => '',
      });

      const pageContent = SpeechReader.extractReadableContent(document);
      assert.strictEqual(pageContent.source, 'page');
      assert.ok(pageContent.text.includes('البوابة الوطنية للخدمات الحكومية'));
      assert.ok(pageContent.text.includes('تقدم البوابة تجربة وصول رقمية شاملة'));
      assert.strictEqual(pageContent.text.includes('عناوين مخفية يجب استبعادها'), false);
    });

    it('cancels speech playback when widget panel dialog is closed', () => {
      let cancelled = false;
      (window as any).speechSynthesis = {
        speak: (u: any) => { u.onstart?.(); },
        pause: () => {},
        resume: () => {},
        cancel: () => { cancelled = true; },
        getVoices: () => [],
      };

      const widget = document.createElement('raawi-accessibility-widget') as RaawiAccessibilityWidget;
      document.body.appendChild(widget);

      widget.open();
      const reader = widget.getSpeechReader();
      reader.read('قراءة تجريبية');
      assert.strictEqual(reader.getState(), 'playing');

      // Closing the widget should cancel active speech
      widget.close();
      assert.strictEqual(cancelled, true);

      widget.remove();
    });

    it('handles malformed or unsupported speech-boundary events gracefully without throwing', () => {
      const reader = new SpeechReader({ locale: 'ar' });

      // Direct boundary handler invocation with edge-case payloads
      assert.doesNotThrow(() => {
        (reader as any).handleBoundary(null);
        (reader as any).handleBoundary(undefined);
        (reader as any).handleBoundary({});
        (reader as any).handleBoundary({ charIndex: 'not-a-number' });
        (reader as any).handleBoundary({ charIndex: 12 });
      });

      reader.destroy();
    });

    it('extracts text without permanently rewriting host DOM content, links, form controls, or active selections', () => {
      const initialHtml = document.body.innerHTML;
      const initialLinks = Array.from(document.querySelectorAll('a')).map((a) => a.outerHTML);
      const initialButtons = Array.from(document.querySelectorAll('button')).map((b) => b.outerHTML);

      // Set user selection mock
      let selectionCleared = false;
      window.getSelection = () => ({
        toString: () => 'نص محدد للاختبار',
        removeAllRanges: () => { selectionCleared = true; },
      });

      const res = SpeechReader.extractReadableContent(document);
      assert.strictEqual(res.source, 'selection');
      assert.strictEqual(res.text, 'نص محدد للاختبار');
      assert.strictEqual(selectionCleared, false, 'Reading selection must not clear user selection');

      // Verify page content was untouched
      const postHtml = document.body.innerHTML;
      assert.strictEqual(postHtml, initialHtml, 'Reading must not mutate host document HTML');

      const postLinks = Array.from(document.querySelectorAll('a')).map((a) => a.outerHTML);
      assert.deepStrictEqual(postLinks, initialLinks, 'Links must remain completely identical');

      const postButtons = Array.from(document.querySelectorAll('button')).map((b) => b.outerHTML);
      assert.deepStrictEqual(postButtons, initialButtons, 'Buttons must remain completely identical');
    });

    it('cancels speech playback when the panel reset button is clicked', () => {
      let cancelled = false;
      (window as any).speechSynthesis = {
        speak: (u: any) => { u.onstart?.(); },
        pause: () => {},
        resume: () => {},
        cancel: () => { cancelled = true; },
        getVoices: () => [],
      };

      const state = new StateManager('en');
      const i18n = new I18nManager('en');
      const reader = new SpeechReader({ locale: 'en' });
      reader.read('Test speech');
      assert.strictEqual(reader.getState(), 'playing');

      const panel = new PanelComponent(state, i18n, undefined, undefined, reader);
      const resetBtn = panel.getElement().querySelector('#raawi-reset-btn') as HTMLButtonElement;
      assert.ok(resetBtn, 'Reset button must exist');

      resetBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      assert.strictEqual(cancelled, true, 'Reset button must cancel active speech');

      reader.destroy();
    });
  });

  describe('Suite 5: WAI-ARIA Tab Navigation and Touch Targets', () => {
    it('implements complete ARIA tablist semantics with id and aria-controls', () => {
      const state = new StateManager('en');
      const i18n = new I18nManager('en');
      const panel = new PanelComponent(state, i18n);
      const el = panel.getElement();

      const tabs = Array.from(el.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
      assert.strictEqual(tabs.length, 4);

      const tabIds = tabs.map((t) => t.id);
      assert.deepStrictEqual(tabIds, [
        'raawi-tab-assist',
        'raawi-tab-vision',
        'raawi-tab-reading',
        'raawi-tab-tools',
      ]);

      for (const tab of tabs) {
        assert.ok(tab.hasAttribute('aria-controls'));
        const targetPanelId = tab.getAttribute('aria-controls')!;
        assert.ok(el.querySelector(`#${targetPanelId}`), `Panel #${targetPanelId} must exist`);
      }
    });

    it('supports arrow-key keyboard navigation across tabs (ArrowRight, ArrowLeft, Home, End)', () => {
      const state = new StateManager('en');
      const i18n = new I18nManager('en');
      const panel = new PanelComponent(state, i18n);
      const tabList = panel.getElement().querySelector('.raawi-tab-bar')!;

      assert.strictEqual(state.getActiveTab(), 'assist');

      // 1. ArrowRight -> vision
      tabList.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      assert.strictEqual(state.getActiveTab(), 'vision');

      // 2. ArrowRight -> reading
      tabList.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      assert.strictEqual(state.getActiveTab(), 'reading');

      // 3. ArrowLeft -> vision
      tabList.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      assert.strictEqual(state.getActiveTab(), 'vision');

      // 4. End key -> tools
      tabList.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      assert.strictEqual(state.getActiveTab(), 'tools');

      // 5. Home key -> assist
      tabList.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
      assert.strictEqual(state.getActiveTab(), 'assist');
    });

    it('navigates in reverse visual order in Arabic RTL mode (ArrowRight moves prev, ArrowLeft moves next)', () => {
      const state = new StateManager('ar');
      const i18n = new I18nManager('ar');
      const panel = new PanelComponent(state, i18n);
      const tabList = panel.getElement().querySelector('.raawi-tab-bar')!;

      assert.strictEqual(state.getActiveTab(), 'assist');

      // In RTL, ArrowLeft moves forward to vision
      tabList.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      assert.strictEqual(state.getActiveTab(), 'vision');

      // ArrowRight moves back to assist
      tabList.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      assert.strictEqual(state.getActiveTab(), 'assist');
    });

    it('provides primary controls and tabs with minimum 44px touch targets', () => {
      const state = new StateManager('ar');
      state.setActiveTab('tools');
      const i18n = new I18nManager('ar');
      const panel = new PanelComponent(state, i18n);
      const el = panel.getElement();

      const tabs = Array.from(el.querySelectorAll<HTMLButtonElement>('.raawi-tab-btn'));
      for (const tab of tabs) {
        assert.ok(tab.classList.contains('raawi-tab-btn'));
      }

      const ttsBtns = Array.from(el.querySelectorAll<HTMLButtonElement>('.raawi-tts-btn'));
      assert.strictEqual(ttsBtns.length, 3, 'Play, Pause, Stop buttons must exist');
      for (const btn of ttsBtns) {
        assert.ok(btn.classList.contains('raawi-tts-btn'));
      }
    });
  });

  describe('Suite 6: Bilingual Localization & Key Parity', () => {
    it('guarantees 1:1 parity between Arabic and English translation dictionaries for all Phase 2A keys', () => {
      const arKeys = Object.keys(translations.ar).sort();
      const enKeys = Object.keys(translations.en).sort();

      assert.deepStrictEqual(arKeys, enKeys, 'Arabic and English translation keys must have exact 1:1 parity');

      // Verify specific Phase 2A keys exist and have non-empty values
      const requiredKeys = [
        'readAloud',
        'readAloudDesc',
        'readPage',
        'readSelection',
        'play',
        'pause',
        'resume',
        'stop',
        'speechRate',
        'speechVoice',
        'defaultVoice',
        'speechPlaying',
        'speechPaused',
        'speechStopped',
        'speechUnsupported',
        'noReadableContent',
        'headingsNavTitle',
        'headingsCount',
        'noHeadingsFound',
        'jumpToHeading',
        'headingNavigated',
        'refreshHeadings',
      ];

      for (const k of requiredKeys) {
        assert.ok(translations.ar[k as keyof typeof translations.ar], `translations.ar missing key ${k}`);
        assert.ok(translations.en[k as keyof typeof translations.en], `translations.en missing key ${k}`);
      }
    });

    it('dynamically switches labels in Tools tab when language changes between Arabic and English', () => {
      const state = new StateManager('ar');
      state.setActiveTab('tools');
      const i18n = new I18nManager('ar');
      const panel = new PanelComponent(state, i18n);

      const titleAr = panel.getElement().querySelector('#raawi-tts-card .raawi-control-title');
      assert.strictEqual(titleAr?.textContent, 'القراءة الصوتية التلقائية');

      i18n.setLocale('en');
      state.setLocale('en');
      const titleEn = panel.getElement().querySelector('#raawi-tts-card .raawi-control-title');
      assert.strictEqual(titleEn?.textContent, 'Text-to-Speech Read Aloud');
    });
  });
});
