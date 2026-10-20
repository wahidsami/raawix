/**
 * Phase 5.2 Acceptance Tests: Accessible Dialog, Focus Management and Live Announcements
 */

import { describe, it, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { JSDOM } = require('../../../node_modules/.pnpm/node_modules/jsdom');

describe('Phase 5.2: Accessible Dialog, Focus Containment & Live Announcer', () => {
  let dom: JSDOM;
  let window: any;
  let document: Document;
  let AccessibilityWidget: any;
  let RaawiAccessibilityWidget: any;

  before(async () => {
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
        <head>
          <title>Test Government Portal</title>
        </head>
        <body>
          <header>
            <h1 id="host-h1">البوابة الوطنية</h1>
            <button id="host-btn-1">خدمة 1</button>
            <a href="/about" id="host-link-1">عن البوابة</a>
          </header>
          <main>
            <input type="text" id="host-input" placeholder="ابحث هنا...">
            <button id="host-btn-2">بحث</button>
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

    const widgetModule = await import('../src/index');
    AccessibilityWidget = widgetModule.AccessibilityWidget;
    RaawiAccessibilityWidget = widgetModule.RaawiAccessibilityWidget;
  });

  beforeEach(() => {
    document.body.innerHTML = `
      <header>
        <h1 id="host-h1">البوابة الوطنية</h1>
        <button id="host-btn-1">خدمة 1</button>
        <a href="/about" id="host-link-1">عن البوابة</a>
      </header>
      <main>
        <input type="text" id="host-input" placeholder="ابحث هنا...">
        <button id="host-btn-2">بحث</button>
      </main>
    `;
    window.localStorage.clear();
  });

  afterEach(() => {
    if (AccessibilityWidget) {
      AccessibilityWidget.destroy();
    }
  });

  it('1. Dialog has persistent accessible name and accurate aria-modal semantics', () => {
    const widget = AccessibilityWidget.init();
    const panel = widget.getPanelComponent().getElement();

    // Dialog must reference heading id
    assert.equal(panel.getAttribute('role'), 'dialog');
    assert.equal(panel.getAttribute('aria-labelledby'), 'raawi-panel-title');

    const heading = panel.querySelector('#raawi-panel-title')!;
    assert.ok(heading, 'Heading #raawi-panel-title must exist');
    assert.equal(heading.getAttribute('tabindex'), '-1', 'Heading should have tabindex="-1" for programmatic focus');

    // Initially closed: aria-modal is false and hidden is set
    assert.equal(panel.getAttribute('aria-modal'), 'false');
    assert.ok(panel.hasAttribute('hidden'));

    // When opened: aria-modal is true and hidden is removed
    widget.open();
    assert.equal(panel.getAttribute('aria-modal'), 'true');
    assert.equal(panel.hasAttribute('hidden'), false);

    // When closed: aria-modal returns to false
    widget.close();
    assert.equal(panel.getAttribute('aria-modal'), 'false');
    assert.ok(panel.hasAttribute('hidden'));
  });

  it('2. Synchronizes launcher aria-expanded and aria-controls attributes', () => {
    const widget = AccessibilityWidget.init();
    const launcher = widget.getLauncherComponent().getElement();

    assert.equal(launcher.getAttribute('aria-expanded'), 'false');
    assert.equal(launcher.getAttribute('aria-controls'), 'raawi-accessibility-panel');
    assert.equal(launcher.getAttribute('aria-haspopup'), 'dialog');

    widget.open();
    assert.equal(launcher.getAttribute('aria-expanded'), 'true');

    widget.close();
    assert.equal(launcher.getAttribute('aria-expanded'), 'false');
  });

  it('3. Initial focus transfers into dialog upon opening', async () => {
    const widget = AccessibilityWidget.init();
    const launcher = widget.getLauncherComponent().getElement();

    // Focus launcher first
    launcher.focus();
    widget.open();

    // Wait for focus handoff tick
    await new Promise((r) => setTimeout(r, 60));

    const shadow = widget.getShadowRoot();
    const closeBtn = shadow.querySelector('[data-testid="raawi-close"]');

    assert.equal(
      shadow.activeElement,
      closeBtn,
      'Active element inside shadow root should be the close button on open'
    );
  });

  it('4. Filters inactive tab controls from focus trap candidates', () => {
    const widget = AccessibilityWidget.init();
    widget.open();
    const panel = widget.getPanelComponent();

    // On initial open, active tab is "assist"
    assert.equal(widget.getStateManager().getActiveTab(), 'assist');

    const focusables = panel.getFocusableElements();
    assert.ok(focusables.length > 0, 'Must have focusable controls');

    // Controls inside Vision tab (which has display: none) must NOT be in focusables list
    const incBtn = panel.getElement().querySelector('#raawi-btn-text-inc') as HTMLElement;
    assert.ok(incBtn, 'Stepper button exists in DOM');
    assert.equal(
      focusables.includes(incBtn),
      false,
      'Inactive tab controls must not be included in focusable trap list'
    );

    // Switch to Vision tab
    widget.getStateManager().setActiveTab('vision');
    const updatedIncBtn = panel.getElement().querySelector('#raawi-btn-text-inc') as HTMLElement;
    const visionFocusables = panel.getFocusableElements();
    assert.ok(
      visionFocusables.includes(updatedIncBtn),
      'Active vision tab controls must be included in focusable trap list'
    );
  });

  it('5. Forward Tab wraps from last focusable element to the first', () => {
    const widget = AccessibilityWidget.init();
    widget.open();
    const panel = widget.getPanelComponent();
    const focusables = panel.getFocusableElements();

    const firstEl = focusables[0];
    const lastEl = focusables[focusables.length - 1];

    // Focus the last element
    lastEl.focus();

    // Trigger Tab keydown
    const tabEvent = new window.KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: false,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(tabEvent);

    assert.equal(tabEvent.defaultPrevented, true, 'Tab default must be prevented on wrap');
    assert.equal(
      widget.getShadowRoot().activeElement,
      firstEl,
      'Focus must wrap to first element'
    );
  });

  it('6. Shift+Tab wraps from first focusable element to the last', () => {
    const widget = AccessibilityWidget.init();
    widget.open();
    const panel = widget.getPanelComponent();
    const focusables = panel.getFocusableElements();

    const firstEl = focusables[0];
    const lastEl = focusables[focusables.length - 1];

    // Focus the first element
    firstEl.focus();

    // Trigger Shift+Tab keydown
    const shiftTabEvent = new window.KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(shiftTabEvent);

    assert.equal(shiftTabEvent.defaultPrevented, true, 'Shift+Tab default must be prevented on wrap');
    assert.equal(
      widget.getShadowRoot().activeElement,
      lastEl,
      'Focus must wrap to last element'
    );
  });

  it('7. Focus cannot escape to host-page elements while modal dialog is open', () => {
    const widget = AccessibilityWidget.init();
    widget.open();

    const hostInput = document.getElementById('host-input') as HTMLInputElement;
    assert.ok(hostInput);

    // Attempt to focus host element while modal is open
    hostInput.focus();
    document.dispatchEvent(new window.FocusEvent('focusin', { bubbles: true }));

    // Focus must be redirected back inside the dialog
    assert.notEqual(document.activeElement, hostInput, 'Host element must not retain focus');
    assert.ok(widget.getShadowRoot().activeElement, 'Shadow root must retain active element');
  });

  it('8. Escape key closes dialog and safely restores focus to launcher', () => {
    const widget = AccessibilityWidget.init();
    const launcher = widget.getLauncherComponent().getElement();
    launcher.focus();

    widget.open();
    assert.equal(widget.getStateManager().getIsOpen(), true);

    // Press Escape
    const escEvent = new window.KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(escEvent);

    assert.equal(widget.getStateManager().getIsOpen(), false, 'Dialog must close on Escape');
    assert.equal(
      widget.getShadowRoot().activeElement,
      launcher,
      'Focus must return to launcher on close'
    );
  });

  it('9. Backdrop click dismisses dialog; inner click does NOT dismiss', () => {
    const widget = AccessibilityWidget.init();
    widget.open();
    assert.equal(widget.getStateManager().getIsOpen(), true);

    const shadow = widget.getShadowRoot();
    const backdrop = shadow.querySelector('.raawi-backdrop') as HTMLElement;
    const panel = shadow.querySelector('[data-testid="raawi-panel"]') as HTMLElement;

    // Click inside panel: must NOT dismiss
    panel.click();
    assert.equal(widget.getStateManager().getIsOpen(), true, 'Click inside panel must not close dialog');

    // Click backdrop: must dismiss
    backdrop.click();
    assert.equal(widget.getStateManager().getIsOpen(), false, 'Backdrop click must close dialog');
  });

  it('10. ARIA Live Announcer announces open, close, and language switch politely', async () => {
    const widget = AccessibilityWidget.init();
    const announcerEl = widget.getAnnouncer().getElement();

    assert.equal(announcerEl.getAttribute('role'), 'status');
    assert.equal(announcerEl.getAttribute('aria-live'), 'polite');
    assert.equal(announcerEl.getAttribute('aria-atomic'), 'true');

    // Open widget: should announce open
    widget.open();
    await new Promise((r) => setTimeout(r, 60));
    assert.ok(announcerEl.textContent!.includes('تم فتح لوحة سهولة الاستخدام'));

    // Switch language to English: should announce language change
    widget.setLocale('en');
    await new Promise((r) => setTimeout(r, 60));
    assert.ok(announcerEl.textContent!.includes('English'));

    // Close widget: should announce close
    widget.close();
    await new Promise((r) => setTimeout(r, 60));
    assert.ok(announcerEl.textContent!.includes('closed'));
  });

  it('11. Zero automatic Web Speech TTS narration starts during dialog operations', () => {
    let ttsCallCount = 0;
    (window as any).speechSynthesis = {
      speak: () => {
        ttsCallCount++;
      },
      cancel: () => {},
    };

    const widget = AccessibilityWidget.init();
    widget.open();
    widget.setLocale('en');
    widget.setLocale('ar');
    widget.close();

    assert.equal(ttsCallCount, 0, 'No automatic TTS narration must be triggered during dialog operations');
  });

  it('12. Disconnected launcher resilience: closing disconnected widget does not throw', () => {
    const widget = AccessibilityWidget.init();
    widget.open();

    // Detach custom element while open
    widget.remove();

    // Closing should execute safely without throwing errors
    assert.doesNotThrow(() => {
      widget.close();
    });
  });
});
