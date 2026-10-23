/**
 * Phase 2.1 Closeout Regression Test Suite
 * 
 * Verifies:
 * 1. Arabic & English RTL Numeric Range ordering (<bdi class="raawi-numeric-range" dir="ltr">80% – 200%</bdi>)
 * 2. BiDi CSS isolation rules in widget-styles.ts
 * 3. DOM Remediation copy accuracy for English and Arabic (accessible control labels, not button labels)
 * 4. Blind Profile copy accuracy and applyPreset('blind') behavior (standard layout for native screen readers, no audio guidance promise)
 */

import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { JSDOM } = require('../../../node_modules/.pnpm/node_modules/jsdom');

import { StateManager } from '../src/core/state';
import { I18nManager, translations } from '../src/core/i18n';
import { PanelComponent } from '../src/components/panel';
import { WIDGET_CSS } from '../src/styles/widget-styles';
import { DEFAULT_SETTINGS } from '../src/core/types';

describe('Phase 2.1 Closeout: RTL Numeric Range & Assist Copy Accuracy', () => {
  let dom: JSDOM;
  let window: any;
  let document: Document;
  let stateManager: StateManager;
  let i18nManager: I18nManager;

  before(() => {
    dom = new JSDOM(`<!DOCTYPE html><html><head></head><body></body></html>`, {
      url: 'https://example.com/test',
    });
    window = dom.window;
    document = window.document;
    (global as any).window = window;
    (global as any).document = document;
  });

  beforeEach(() => {
    stateManager = new StateManager();
    i18nManager = new I18nManager('en');
  });

  describe('1. Vision Tab Numeric Range BiDi Isolation', () => {
    it('should render <bdi class="raawi-numeric-range" dir="ltr">80% – 200%</bdi> in English (LTR)', () => {
      i18nManager.setLocale('en');
      stateManager.setActiveTab('vision');
      const panel = new PanelComponent(stateManager, i18nManager);
      const el = panel.getElement();

      const numericRanges = el.querySelectorAll('.raawi-numeric-range');
      assert.ok(numericRanges.length >= 2, 'Expected at least 2 numeric range elements (Text Size and Line Spacing)');

      numericRanges.forEach((rangeEl) => {
        assert.equal(rangeEl.tagName.toLowerCase(), 'bdi');
        assert.equal(rangeEl.getAttribute('dir'), 'ltr');
        assert.equal(rangeEl.textContent?.trim(), '80% – 200%');
      });
    });

    it('should render <bdi class="raawi-numeric-range" dir="ltr">80% – 200%</bdi> in Arabic (RTL)', () => {
      i18nManager.setLocale('ar');
      stateManager.setActiveTab('vision');
      const panel = new PanelComponent(stateManager, i18nManager);
      const el = panel.getElement();

      const numericRanges = el.querySelectorAll('.raawi-numeric-range');
      assert.ok(numericRanges.length >= 2, 'Expected at least 2 numeric range elements in Arabic');

      numericRanges.forEach((rangeEl) => {
        assert.equal(rangeEl.tagName.toLowerCase(), 'bdi');
        assert.equal(rangeEl.getAttribute('dir'), 'ltr');
        assert.equal(rangeEl.textContent?.trim(), '80% – 200%');
      });
    });

    it('should include bidi isolation styles in WIDGET_CSS', () => {
      assert.ok(WIDGET_CSS.includes('.raawi-numeric-range'), 'WIDGET_CSS should define .raawi-numeric-range');
      assert.ok(WIDGET_CSS.includes('direction: ltr;'), 'should enforce direction: ltr');
      assert.ok(WIDGET_CSS.includes('unicode-bidi: isolate;'), 'should enforce unicode-bidi: isolate');
      assert.ok(WIDGET_CSS.includes('display: inline-block;'), 'should specify display: inline-block');
    });
  });

  describe('2. Assist Remediation Copy Accuracy', () => {
    it('English copy accurately references accessible control labels instead of button labels', () => {
      const enDesc = translations.en.remediationDesc;
      assert.ok(
        enDesc.includes('accessible control labels'),
        `Expected "accessible control labels" in English remediationDesc, got: "${enDesc}"`
      );
      assert.ok(
        !enDesc.includes('button labels'),
        `Should not refer to "button labels" in English remediationDesc, got: "${enDesc}"`
      );
      assert.ok(
        enDesc.includes('missing image alt descriptions'),
        `Should maintain reference to image alt descriptions, got: "${enDesc}"`
      );
    });

    it('Arabic copy accurately references control labels (تسميات وصول لعناصر التحكم)', () => {
      const arDesc = translations.ar.remediationDesc;
      assert.ok(
        arDesc.includes('تسميات وصول لعناصر التحكم'),
        `Expected "تسميات وصول لعناصر التحكم" in Arabic remediationDesc, got: "${arDesc}"`
      );
      assert.ok(
        !arDesc.includes('تسميات للأزرار'),
        `Should not refer to "تسميات للأزرار" in Arabic remediationDesc, got: "${arDesc}"`
      );
      assert.ok(
        arDesc.includes('نصوص بديلة للصور'),
        `Should maintain reference to image alt descriptions in Arabic, got: "${arDesc}"`
      );
    });

    it('DOM remediation remains strictly opt-in and disabled by default', () => {
      assert.equal(DEFAULT_SETTINGS.remediationEnabled, false, 'remediationEnabled must default to false');
      assert.equal(stateManager.getSettings().remediationEnabled, false, 'initial stateManager remediation must be false');
    });
  });

  describe('3. Blind Profile Copy Accuracy and Preset Behavior', () => {
    it('English Blind profile copy accurately reflects screen reader optimization without overpromising audio guidance', () => {
      const enBlind = translations.en.presetBlindDesc;
      assert.ok(
        enBlind.includes('Standard layout optimized for native screen readers'),
        `Expected screen reader layout phrasing in English, got: "${enBlind}"`
      );
      assert.ok(
        !enBlind.toLowerCase().includes('audio guidance'),
        `Should not promise "audio guidance" in English presetBlindDesc, got: "${enBlind}"`
      );
    });

    it('Arabic Blind profile copy accurately reflects screen reader optimization without overpromising speech/audio', () => {
      const arBlind = translations.ar.presetBlindDesc;
      assert.ok(
        arBlind.includes('تنسيق قياسي مهيّأ لقارئات الشاشة'),
        `Expected screen reader layout phrasing in Arabic, got: "${arBlind}"`
      );
      assert.ok(
        !arBlind.includes('صوتية'),
        `Should not promise audio in Arabic presetBlindDesc, got: "${arBlind}"`
      );
    });

    it('applyPreset("blind") resets visual settings to defaults and does not mutate audio/remediation settings', () => {
      // Set non-default settings first
      stateManager.updateSetting('textSize', 1.5);
      stateManager.updateSetting('lineSpacing', 1.8);
      stateManager.updateSetting('contrastMode', true);
      stateManager.updateSetting('remediationEnabled', false);

      stateManager.applyPreset('blind');
      const settings = stateManager.getSettings();

      assert.equal(settings.activePreset, 'blind', 'activePreset should be "blind"');
      assert.equal(settings.textSize, 1.0, 'textSize should be reset to 1.0 for standard screen reader layout');
      assert.equal(settings.lineSpacing, 1.0, 'lineSpacing should be reset to 1.0');
      assert.equal(settings.contrastMode, false, 'contrastMode should be reset to false');
      assert.equal(settings.remediationEnabled, false, 'remediation must remain false');
    });
  });
});
