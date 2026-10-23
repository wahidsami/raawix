/**
 * Accessible Panel Dialog Component for Raawi X Widget
 */

import type { I18nManager, TranslationDictionary } from '../core/i18n';
import type { StateManager } from '../core/state';
import type { TabId } from '../core/types';
import type { MapApiClient } from '../core/api-client';
import type { DomRemediator } from '../core/dom-remediator';
import { LandmarkNavigator } from '../core/landmark-navigator';
import type { SpeechReader } from '../core/speech-reader';
import { HeadingsNavigator, type HeadingItem } from '../core/headings-navigator';

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[m] || m));
}

export class PanelComponent {
  private element: HTMLElement;
  private state: StateManager;
  private i18n: I18nManager;
  private apiClient?: MapApiClient;
  private remediator?: DomRemediator;
  private speechReader?: SpeechReader;
  private headingsCache: HeadingItem[] = [];

  private lastTab: TabId;

  constructor(
    state: StateManager,
    i18n: I18nManager,
    apiClient?: MapApiClient,
    remediator?: DomRemediator,
    speechReader?: SpeechReader
  ) {
    this.state = state;
    this.i18n = i18n;
    this.apiClient = apiClient;
    this.remediator = remediator;
    this.speechReader = speechReader;
    this.lastTab = this.state.getActiveTab();

    this.element = document.createElement('section');
    this.element.id = 'raawi-accessibility-panel';
    this.element.className = 'raawi-panel-container';
    this.element.setAttribute('data-testid', 'raawi-panel');
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-labelledby', 'raawi-panel-title');

    this.render();
    this.updateVisibility();

    // Subscribe to state and i18n updates
    this.state.subscribe(() => {
      this.updateVisibility();
      const currentTab = this.state.getActiveTab();
      if (currentTab !== this.lastTab) {
        this.lastTab = currentTab;
        this.render();
      }
    });
    this.i18n.subscribe(() => this.render());

    if (this.speechReader) {
      this.speechReader.subscribe(() => {
        if (this.state.getActiveTab() === 'tools') {
          this.render();
        }
      });
      this.speechReader.onVoicesChanged(() => {
        if (this.state.getActiveTab() === 'tools') {
          this.render();
        }
      });
    }

    if (this.apiClient) {
      this.apiClient.subscribe(() => {
        this.render();
      });
    }
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  /**
   * Returns all currently visible, non-disabled focusable controls inside the dialog.
   */
  public getFocusableElements(): HTMLElement[] {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const candidates = Array.from(this.element.querySelectorAll<HTMLElement>(selector));

    return candidates.filter((el) => {
      if (el.hasAttribute('disabled')) return false;
      if (el.getAttribute('aria-hidden') === 'true') return false;

      // Filter out elements residing inside inactive/hidden tab panels
      const parentPanel = el.closest('[role="tabpanel"]') as HTMLElement | null;
      if (parentPanel && parentPanel.style.display === 'none') {
        return false;
      }

      // Check offsetParent if available (in real browsers)
      if (el.offsetParent === null && el.offsetWidth === 0 && el.offsetHeight === 0) {
        if (parentPanel && parentPanel.style.display === 'none') return false;
      }

      return true;
    });
  }

  /**
   * Transfers focus to the dialog initial target (close button or first focusable element).
   */
  public focusFirstElement(): void {
    const focusables = this.getFocusableElements();
    const closeBtn = this.element.querySelector<HTMLElement>('[data-testid="raawi-close"]');
    if (closeBtn && focusables.includes(closeBtn)) {
      closeBtn.focus();
      return;
    }

    if (focusables.length > 0) {
      focusables[0].focus();
      return;
    }

    // Fallback: focus dialog heading
    const title = this.element.querySelector<HTMLElement>('#raawi-panel-title');
    if (title) {
      title.focus();
    } else {
      this.element.focus();
    }
  }

  /**
   * Transfers focus to the last focusable element in the dialog (for Shift+Tab wrap).
   */
  public focusLastElement(): void {
    const focusables = this.getFocusableElements();
    if (focusables.length > 0) {
      focusables[focusables.length - 1].focus();
    } else {
      this.focusFirstElement();
    }
  }

  private updateVisibility(): void {
    const isOpen = this.state.getIsOpen();
    if (isOpen) {
      this.element.classList.add('open');
      this.element.removeAttribute('hidden');
      this.element.setAttribute('aria-modal', 'true');
    } else {
      this.element.classList.remove('open');
      this.element.setAttribute('hidden', '');
      this.element.setAttribute('aria-modal', 'false');
    }
  }

  private render(): void {
    const t = this.i18n.t();
    const locale = this.state.getLocale();
    const settings = this.state.getSettings();
    const activeTab = this.state.getActiveTab();

    if (activeTab === 'tools') {
      this.headingsCache = HeadingsNavigator.discoverHeadings();
    }

    this.element.setAttribute('dir', this.state.getDirection());

    this.element.innerHTML = `
      <!-- Topbar Header -->
      <header class="raawi-panel-header">
        <div class="raawi-brand-group">
          <svg class="raawi-brand-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="12" cy="12" r="10" fill="#0d9488" fill-opacity="0.15"/>
            <circle cx="12" cy="7" r="2.5" fill="#0d9488"/>
            <path d="M6 11C9 10 15 10 18 11" stroke="#0d9488" stroke-width="2" stroke-linecap="round"/>
            <path d="M12 9.5V16" stroke="#0d9488" stroke-width="2" stroke-linecap="round"/>
            <path d="M12 16L8.5 21" stroke="#0d9488" stroke-width="2" stroke-linecap="round"/>
            <path d="M12 16L15.5 21" stroke="#0d9488" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <h2 id="raawi-panel-title" class="raawi-brand-title" tabindex="-1">${t.widgetTitle}</h2>
        </div>
        
        <div class="raawi-header-actions">
          <div class="raawi-lang-switch">
            <button type="button" class="raawi-lang-btn ${locale === 'ar' ? 'active' : ''}" data-lang="ar" data-testid="raawi-lang-switch" aria-label="العربية">العربية</button>
            <button type="button" class="raawi-lang-btn ${locale === 'en' ? 'active' : ''}" data-lang="en" data-testid="raawi-lang-switch" aria-label="English">EN</button>
          </div>

          <button type="button" class="raawi-icon-btn" id="raawi-reset-btn" data-testid="raawi-reset-all" aria-label="${t.resetAll}" title="${t.resetAll}">↻</button>
          <button type="button" class="raawi-icon-btn" id="raawi-close-btn" data-testid="raawi-close" aria-label="${t.closeOptions}" title="${t.closeOptions}">✕</button>
        </div>
      </header>

      <!-- Tab Navigation (WAI-ARIA Tablist Pattern) -->
      <nav class="raawi-tab-bar" role="tablist" aria-label="${t.widgetTitle}">
        <button type="button" class="raawi-tab-btn ${activeTab === 'assist' ? 'active' : ''}" data-tab="assist" id="raawi-tab-assist" data-testid="raawi-tab-assist" role="tab" aria-selected="${activeTab === 'assist'}" aria-controls="raawi-tabpanel-assist" tabindex="${activeTab === 'assist' ? '0' : '-1'}">${t.assist}</button>
        <button type="button" class="raawi-tab-btn ${activeTab === 'vision' ? 'active' : ''}" data-tab="vision" id="raawi-tab-vision" data-testid="raawi-tab-vision" role="tab" aria-selected="${activeTab === 'vision'}" aria-controls="raawi-tabpanel-vision" tabindex="${activeTab === 'vision' ? '0' : '-1'}">${t.vision}</button>
        <button type="button" class="raawi-tab-btn ${activeTab === 'reading' ? 'active' : ''}" data-tab="reading" id="raawi-tab-reading" data-testid="raawi-tab-reading" role="tab" aria-selected="${activeTab === 'reading'}" aria-controls="raawi-tabpanel-reading" tabindex="${activeTab === 'reading' ? '0' : '-1'}">${t.reading}</button>
        <button type="button" class="raawi-tab-btn ${activeTab === 'tools' ? 'active' : ''}" data-tab="tools" id="raawi-tab-tools" data-testid="raawi-tab-tools" role="tab" aria-selected="${activeTab === 'tools'}" aria-controls="raawi-tabpanel-tools" tabindex="${activeTab === 'tools' ? '0' : '-1'}">${t.tools}</button>
      </nav>

      <!-- Tab Content: Assist -->
      <div id="raawi-tabpanel-assist" class="raawi-tab-body" role="tabpanel" aria-labelledby="raawi-tab-assist" tabindex="0" style="display: ${activeTab === 'assist' ? 'flex' : 'none'};">
        ${this.renderPageInsightsCard(t, settings)}

        <!-- Presets -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <span class="raawi-control-title">${t.presets}</span>
          </div>
          <div class="raawi-preset-grid">
            <button type="button" class="raawi-preset-btn ${settings.activePreset === 'blind' ? 'active' : ''}" data-preset="blind" data-testid="raawi-preset-blind">${t.presetBlind}</button>
            <button type="button" class="raawi-preset-btn ${settings.activePreset === 'low-vision' ? 'active' : ''}" data-preset="low-vision" data-testid="raawi-preset-lowvision">${t.presetLowVision}</button>
            <button type="button" class="raawi-preset-btn ${settings.activePreset === 'dyslexia' ? 'active' : ''}" data-preset="dyslexia" data-testid="raawi-preset-dyslexia">${t.presetDyslexia}</button>
            <button type="button" class="raawi-preset-btn ${settings.activePreset === 'none' ? 'active' : ''}" data-preset="none">${t.presetNone}</button>
          </div>
        </div>
      </div>

      <!-- Tab Content: Vision -->
      <div id="raawi-tabpanel-vision" class="raawi-tab-body" role="tabpanel" aria-labelledby="raawi-tab-vision" tabindex="0" style="display: ${activeTab === 'vision' ? 'flex' : 'none'};">
        <!-- Text Size -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <div>
              <div class="raawi-control-title">${t.textSize}</div>
              <div class="raawi-control-desc">80% - 200%</div>
            </div>
            <div class="raawi-stepper-group">
              <button type="button" class="raawi-stepper-btn" id="raawi-btn-text-dec" aria-label="${t.decreaseTextSize}">-</button>
              <span class="raawi-stepper-value" id="raawi-text-size-val" aria-live="polite">${Math.round(settings.textSize * 100)}%</span>
              <button type="button" class="raawi-stepper-btn" id="raawi-btn-text-inc" aria-label="${t.increaseTextSize}">+</button>
            </div>
          </div>
        </div>

        <!-- Line Spacing -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <div>
              <div class="raawi-control-title">${t.lineSpacing}</div>
              <div class="raawi-control-desc">80% - 200%</div>
            </div>
            <div class="raawi-stepper-group">
              <button type="button" class="raawi-stepper-btn" id="raawi-btn-line-dec" aria-label="${t.decreaseLineSpacing}">-</button>
              <span class="raawi-stepper-value" id="raawi-line-spacing-val" aria-live="polite">${Math.round(settings.lineSpacing * 100)}%</span>
              <button type="button" class="raawi-stepper-btn" id="raawi-btn-line-inc" aria-label="${t.increaseLineSpacing}">+</button>
            </div>
          </div>
        </div>

        <!-- Contrast Mode Toggle -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <span class="raawi-control-title">${t.highContrastMode}</span>
            <label class="raawi-toggle">
              <input type="checkbox" id="raawi-toggle-contrast" ${settings.contrastMode ? 'checked' : ''} aria-label="${t.toggleHighContrast}">
              <span class="raawi-toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Focus Highlight Toggle -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <span class="raawi-control-title">${t.focusHighlight}</span>
            <label class="raawi-toggle">
              <input type="checkbox" id="raawi-toggle-focus-highlight" data-testid="raawi-tool-focus-highlight" ${settings.focusHighlight ? 'checked' : ''} aria-label="${t.toggleFocusHighlight}">
              <span class="raawi-toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Readable Font Override Toggle -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <span class="raawi-control-title">${t.readableFont}</span>
            <label class="raawi-toggle">
              <input type="checkbox" id="raawi-toggle-readable-font" data-testid="raawi-tool-readable-font" ${settings.readableFont ? 'checked' : ''} aria-label="${t.toggleReadableFont}">
              <span class="raawi-toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Highlight Links & Action Controls Toggle -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <span class="raawi-control-title">${t.highlightLinks}</span>
            <label class="raawi-toggle">
              <input type="checkbox" id="raawi-toggle-highlight-links" data-testid="raawi-tool-highlight-links" ${settings.highlightLinks ? 'checked' : ''} aria-label="${t.toggleHighlightLinks}">
              <span class="raawi-toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Stop Animations Toggle -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <span class="raawi-control-title">${t.stopAnimations}</span>
            <label class="raawi-toggle">
              <input type="checkbox" id="raawi-toggle-stop-animations" data-testid="raawi-tool-stop-animations" ${settings.stopAnimations ? 'checked' : ''} aria-label="${t.toggleStopAnimations}">
              <span class="raawi-toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Large Cursor Toggle -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <span class="raawi-control-title">${t.bigCursor}</span>
            <div class="raawi-lang-switch">
              <button type="button" class="raawi-lang-btn ${settings.bigCursor === 'off' ? 'active' : ''}" data-cursor="off">${t.off}</button>
              <button type="button" class="raawi-lang-btn ${settings.bigCursor === 'dark' ? 'active' : ''}" data-cursor="dark">${t.bigDarkCursor}</button>
              <button type="button" class="raawi-lang-btn ${settings.bigCursor === 'light' ? 'active' : ''}" data-cursor="light">${t.bigLightCursor}</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab Content: Reading -->
      <div id="raawi-tabpanel-reading" class="raawi-tab-body" role="tabpanel" aria-labelledby="raawi-tab-reading" tabindex="0" style="display: ${activeTab === 'reading' ? 'flex' : 'none'};">
        <!-- Reading Guide Ruler -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <span class="raawi-control-title">${t.readingGuide}</span>
            <label class="raawi-toggle">
              <input type="checkbox" id="raawi-toggle-reading-guide" data-testid="raawi-tool-reading-guide" ${settings.readingGuide ? 'checked' : ''} aria-label="${t.toggleReadingGuide}">
              <span class="raawi-toggle-slider"></span>
            </label>
          </div>
          <div id="raawi-guide-thickness-container" style="display: ${settings.readingGuide ? 'flex' : 'none'}; margin-top: 10px; justify-content: space-between; align-items: center;">
            <span style="font-size: 12px; color: var(--text-secondary);">${t.guideThickness}</span>
            <div class="raawi-lang-switch">
              <button type="button" class="raawi-lang-btn ${settings.readingGuideThickness === 'thin' ? 'active' : ''}" data-guide-thickness="thin" data-testid="raawi-guide-thin">${t.thin}</button>
              <button type="button" class="raawi-lang-btn ${settings.readingGuideThickness === 'medium' ? 'active' : ''}" data-guide-thickness="medium" data-testid="raawi-guide-medium">${t.medium}</button>
              <button type="button" class="raawi-lang-btn ${settings.readingGuideThickness === 'thick' ? 'active' : ''}" data-guide-thickness="thick" data-testid="raawi-guide-thick">${t.thick}</button>
            </div>
          </div>
        </div>

        <!-- Reading Focus Mask -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <span class="raawi-control-title">${t.readingMask}</span>
            <label class="raawi-toggle">
              <input type="checkbox" id="raawi-toggle-reading-mask" data-testid="raawi-tool-reading-mask" ${settings.readingMask ? 'checked' : ''} aria-label="${t.toggleReadingMask}">
              <span class="raawi-toggle-slider"></span>
            </label>
          </div>
          <div id="raawi-mask-height-container" style="display: ${settings.readingMask ? 'flex' : 'none'}; margin-top: 10px; justify-content: space-between; align-items: center;">
            <span style="font-size: 12px; color: var(--text-secondary);">${t.maskWindowHeight}</span>
            <div class="raawi-lang-switch">
              <button type="button" class="raawi-lang-btn ${settings.readingMaskWindowHeight === 'small' ? 'active' : ''}" data-mask-height="small">${t.small}</button>
              <button type="button" class="raawi-lang-btn ${settings.readingMaskWindowHeight === 'medium' ? 'active' : ''}" data-mask-height="medium">${t.medium}</button>
              <button type="button" class="raawi-lang-btn ${settings.readingMaskWindowHeight === 'large' ? 'active' : ''}" data-mask-height="large">${t.large}</button>
            </div>
          </div>
        </div>

        <!-- Phase 2C: Standalone Magnified Reading Strip -->
        <div class="raawi-control-card" id="raawi-magnifier-strip-card">
          <div class="raawi-control-header">
            <div>
              <div class="raawi-control-title">${t.magnifierStrip}</div>
              <div class="raawi-control-desc">${t.magnifierFallback}</div>
            </div>
            <label class="raawi-toggle">
              <input type="checkbox" id="raawi-toggle-magnifier-strip" data-testid="raawi-tool-magnifier-strip" ${settings.magnifierStrip ? 'checked' : ''} aria-label="${t.toggleMagnifierStrip}">
              <span class="raawi-toggle-slider"></span>
            </label>
          </div>
          <div id="raawi-magnifier-scale-container" style="display: ${settings.magnifierStrip ? 'flex' : 'none'}; margin-top: 10px; justify-content: space-between; align-items: center;">
            <span style="font-size: 12px; color: var(--text-secondary);">${t.magnifierScale}</span>
            <div class="raawi-lang-switch">
              <button type="button" class="raawi-lang-btn ${settings.magnifierScale === 1.5 ? 'active' : ''}" data-panel-magnifier-scale="1.5" data-testid="raawi-panel-scale-150">${t.magnifierZoom150}</button>
              <button type="button" class="raawi-lang-btn ${settings.magnifierScale === 2.0 ? 'active' : ''}" data-panel-magnifier-scale="2.0" data-testid="raawi-panel-scale-200">${t.magnifierZoom200}</button>
              <button type="button" class="raawi-lang-btn ${settings.magnifierScale === 2.5 ? 'active' : ''}" data-panel-magnifier-scale="2.5" data-testid="raawi-panel-scale-250">${t.magnifierZoom250}</button>
              <button type="button" class="raawi-lang-btn ${settings.magnifierScale === 3.0 ? 'active' : ''}" data-panel-magnifier-scale="3.0" data-testid="raawi-panel-scale-300">${t.magnifierZoom300}</button>
            </div>
          </div>
        </div>

        <!-- Hide Images -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <span class="raawi-control-title">${t.hideImages}</span>
            <label class="raawi-toggle">
              <input type="checkbox" id="raawi-toggle-hide-images" ${settings.hideImages ? 'checked' : ''} aria-label="${t.toggleHideImages}">
              <span class="raawi-toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- Tab Content: Tools -->
      <div id="raawi-tabpanel-tools" class="raawi-tab-body" role="tabpanel" aria-labelledby="raawi-tab-tools" tabindex="0" style="display: ${activeTab === 'tools' ? 'flex' : 'none'};">
        <!-- 1. Standalone TTS Read Aloud -->
        <div class="raawi-control-card" id="raawi-tts-card" data-testid="raawi-tts-card">
          <div class="raawi-control-header">
            <div>
              <div class="raawi-control-title">${t.readAloud}</div>
              <div class="raawi-control-desc">${t.readAloudDesc}</div>
            </div>
            <span class="raawi-badge raawi-badge-${this.getSpeechStatusBadgeType()}" id="raawi-tts-status-badge">
              ${this.getSpeechStatusBadgeText(t)}
            </span>
          </div>

          <!-- Playback Action Buttons -->
          <div class="raawi-tts-controls">
            <button type="button" class="raawi-tts-btn raawi-tts-btn-primary" id="raawi-btn-tts-play" data-testid="raawi-btn-tts-play" aria-label="${t.readPage}">
              <span aria-hidden="true">${this.speechReader?.getState() === 'playing' ? '🔊' : '▶'}</span>
              <span>${this.speechReader?.getState() === 'paused' ? t.resume : t.play}</span>
            </button>
            <button type="button" class="raawi-tts-btn" id="raawi-btn-tts-pause" data-testid="raawi-btn-tts-pause" aria-label="${t.pause}" ${this.speechReader?.getState() !== 'playing' ? 'disabled' : ''}>
              <span aria-hidden="true">⏸</span>
              <span>${t.pause}</span>
            </button>
            <button type="button" class="raawi-tts-btn" id="raawi-btn-tts-stop" data-testid="raawi-btn-tts-stop" aria-label="${t.stop}" ${this.speechReader?.getState() !== 'playing' && this.speechReader?.getState() !== 'paused' ? 'disabled' : ''}>
              <span aria-hidden="true">⏹</span>
              <span>${t.stop}</span>
            </button>
          </div>

          <!-- Rate and Voice Options -->
          <div class="raawi-tts-options">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 12px; color: var(--text-secondary);">${t.speechRate}</span>
              <div class="raawi-lang-switch">
                <button type="button" class="raawi-lang-btn ${(this.speechReader?.getRate() ?? 1.0) === 0.75 ? 'active' : ''}" data-speech-rate="0.75">0.75x</button>
                <button type="button" class="raawi-lang-btn ${(this.speechReader?.getRate() ?? 1.0) === 1.0 ? 'active' : ''}" data-speech-rate="1.0">1.0x</button>
                <button type="button" class="raawi-lang-btn ${(this.speechReader?.getRate() ?? 1.0) === 1.25 ? 'active' : ''}" data-speech-rate="1.25">1.25x</button>
                <button type="button" class="raawi-lang-btn ${(this.speechReader?.getRate() ?? 1.0) === 1.5 ? 'active' : ''}" data-speech-rate="1.5">1.5x</button>
              </div>
            </div>

            ${this.renderVoiceSelect(t)}
          </div>
        </div>

        <!-- 2. Page Headings Navigator -->
        <div class="raawi-control-card" id="raawi-headings-card" data-testid="raawi-headings-card">
          <div class="raawi-control-header">
            <div>
              <div class="raawi-control-title">${t.headingsNavTitle}</div>
              <div class="raawi-control-desc">${this.headingsCache.length} ${t.headingsCount}</div>
            </div>
            <button type="button" class="raawi-btn-refresh" id="raawi-btn-headings-refresh" data-testid="raawi-btn-headings-refresh" aria-label="${t.refreshHeadings}">
              🔄 ${t.refresh}
            </button>
          </div>

          <div class="raawi-headings-list" role="navigation" aria-label="${t.headingsNavTitle}">
            ${this.renderHeadingsList(t)}
          </div>
        </div>
      </div>

      <!-- Footer Bar -->
      <footer class="raawi-panel-footer">
        <div class="raawi-status-badge">
          <span class="raawi-status-dot"></span>
          <span>${t.statusReady}</span>
        </div>
        <p class="raawi-disclaimer">${t.disclaimer}</p>
      </footer>
    `;

    this.attachDomEvents();
    this.updateVisibility();
  }

  private attachDomEvents(): void {
    // Close button
    const closeBtn = this.element.querySelector('#raawi-close-btn');
    closeBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.state.setOpen(false);
    });

    // Reset button
    const resetBtn = this.element.querySelector('#raawi-reset-btn');
    resetBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.speechReader?.stop();
      this.state.resetSettings();
      this.render();
    });

    // Language buttons
    const langBtns = this.element.querySelectorAll<HTMLButtonElement>('.raawi-lang-btn[data-lang]');
    langBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const lang = btn.getAttribute('data-lang') as 'ar' | 'en';
        if (lang) {
          this.state.setLocale(lang);
          this.i18n.setLocale(lang);
        }
      });
    });

    // Tab buttons click and keyboard navigation (WAI-ARIA tabs pattern)
    const tabList = this.element.querySelector('.raawi-tab-bar');
    tabList?.addEventListener('keydown', (e: Event) => {
      const keyEvent = e as KeyboardEvent;
      const tabOrder: TabId[] = ['assist', 'vision', 'reading', 'tools'];
      const isRtl = this.state.getDirection() === 'rtl';
      let nextTab: TabId | null = null;
      const currentIndex = tabOrder.indexOf(this.state.getActiveTab());

      if (keyEvent.key === 'ArrowRight') {
        keyEvent.preventDefault();
        const nextIndex = isRtl
          ? (currentIndex - 1 + tabOrder.length) % tabOrder.length
          : (currentIndex + 1) % tabOrder.length;
        nextTab = tabOrder[nextIndex];
      } else if (keyEvent.key === 'ArrowLeft') {
        keyEvent.preventDefault();
        const prevIndex = isRtl
          ? (currentIndex + 1) % tabOrder.length
          : (currentIndex - 1 + tabOrder.length) % tabOrder.length;
        nextTab = tabOrder[prevIndex];
      } else if (keyEvent.key === 'ArrowDown') {
        keyEvent.preventDefault();
        nextTab = tabOrder[(currentIndex + 1) % tabOrder.length];
      } else if (keyEvent.key === 'ArrowUp') {
        keyEvent.preventDefault();
        nextTab = tabOrder[(currentIndex - 1 + tabOrder.length) % tabOrder.length];
      } else if (keyEvent.key === 'Home') {
        keyEvent.preventDefault();
        nextTab = tabOrder[0];
      } else if (keyEvent.key === 'End') {
        keyEvent.preventDefault();
        nextTab = tabOrder[tabOrder.length - 1];
      }

      if (nextTab) {
        this.state.setActiveTab(nextTab);
        this.render();
        const targetBtn = this.element.querySelector<HTMLButtonElement>(`#raawi-tab-${nextTab}`);
        targetBtn?.focus();
      }
    });

    const tabBtns = this.element.querySelectorAll<HTMLButtonElement>('.raawi-tab-btn[data-tab]');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = btn.getAttribute('data-tab') as TabId;
        if (tab) {
          this.state.setActiveTab(tab);
          this.render();
        }
      });
    });

    // Preset buttons
    const presetBtns = this.element.querySelectorAll<HTMLButtonElement>('.raawi-preset-btn[data-preset]');
    presetBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const preset = btn.getAttribute('data-preset') as any;
        if (preset) {
          this.state.applyPreset(preset);
          this.render();
        }
      });
    });

    // Stepper text size
    const textDec = this.element.querySelector('#raawi-btn-text-dec');
    textDec?.addEventListener('click', (e) => {
      e.preventDefault();
      const current = this.state.getSettings().textSize;
      const next = Math.max(0.8, Math.round((current - 0.1) * 10) / 10);
      this.state.updateSetting('textSize', next);
      this.render();
    });

    const textInc = this.element.querySelector('#raawi-btn-text-inc');
    textInc?.addEventListener('click', (e) => {
      e.preventDefault();
      const current = this.state.getSettings().textSize;
      const next = Math.min(2.0, Math.round((current + 0.1) * 10) / 10);
      this.state.updateSetting('textSize', next);
      this.render();
    });

    // Stepper line spacing
    const lineDec = this.element.querySelector('#raawi-btn-line-dec');
    lineDec?.addEventListener('click', (e) => {
      e.preventDefault();
      const current = this.state.getSettings().lineSpacing;
      const next = Math.max(0.8, Math.round((current - 0.1) * 10) / 10);
      this.state.updateSetting('lineSpacing', next);
      this.render();
    });

    const lineInc = this.element.querySelector('#raawi-btn-line-inc');
    lineInc?.addEventListener('click', (e) => {
      e.preventDefault();
      const current = this.state.getSettings().lineSpacing;
      const next = Math.min(2.0, Math.round((current + 0.1) * 10) / 10);
      this.state.updateSetting('lineSpacing', next);
      this.render();
    });

    // Contrast toggle
    const contrastToggle = this.element.querySelector('#raawi-toggle-contrast') as HTMLInputElement | null;
    contrastToggle?.addEventListener('change', () => {
      this.state.updateSetting('contrastMode', contrastToggle.checked);
    });

    // Focus highlight toggle
    const focusHighlightToggle = this.element.querySelector('#raawi-toggle-focus-highlight') as HTMLInputElement | null;
    focusHighlightToggle?.addEventListener('change', () => {
      this.state.updateSetting('focusHighlight', focusHighlightToggle.checked);
    });

    // Readable font toggle
    const readableFontToggle = this.element.querySelector('#raawi-toggle-readable-font') as HTMLInputElement | null;
    readableFontToggle?.addEventListener('change', () => {
      this.state.updateSetting('readableFont', readableFontToggle.checked);
    });

    // Highlight links toggle
    const highlightLinksToggle = this.element.querySelector('#raawi-toggle-highlight-links') as HTMLInputElement | null;
    highlightLinksToggle?.addEventListener('change', () => {
      this.state.updateSetting('highlightLinks', highlightLinksToggle.checked);
    });

    // Stop animations toggle
    const stopAnimationsToggle = this.element.querySelector('#raawi-toggle-stop-animations') as HTMLInputElement | null;
    stopAnimationsToggle?.addEventListener('change', () => {
      this.state.updateSetting('stopAnimations', stopAnimationsToggle.checked);
    });

    // Reading guide toggle
    const readingGuideToggle = this.element.querySelector('#raawi-toggle-reading-guide') as HTMLInputElement | null;
    readingGuideToggle?.addEventListener('change', () => {
      this.state.updateSetting('readingGuide', readingGuideToggle.checked);
      this.render();
    });

    // Reading guide thickness buttons
    const guideThicknessBtns = this.element.querySelectorAll<HTMLButtonElement>('button[data-guide-thickness]');
    guideThicknessBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const thickness = btn.getAttribute('data-guide-thickness') as 'thin' | 'medium' | 'thick';
        if (thickness) {
          this.state.updateSetting('readingGuideThickness', thickness);
          this.render();
        }
      });
    });

    // Reading mask toggle
    const readingMaskToggle = this.element.querySelector('#raawi-toggle-reading-mask') as HTMLInputElement | null;
    readingMaskToggle?.addEventListener('change', () => {
      this.state.updateSetting('readingMask', readingMaskToggle.checked);
      this.render();
    });

    // Reading mask height buttons
    const maskHeightBtns = this.element.querySelectorAll<HTMLButtonElement>('button[data-mask-height]');
    maskHeightBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const height = btn.getAttribute('data-mask-height') as 'small' | 'medium' | 'large';
        if (height) {
          this.state.updateSetting('readingMaskWindowHeight', height);
          this.render();
        }
      });
    });

    // Magnified reading strip toggle (Phase 2C)
    const magnifierStripToggle = this.element.querySelector('#raawi-toggle-magnifier-strip') as HTMLInputElement | null;
    magnifierStripToggle?.addEventListener('change', () => {
      this.state.updateSetting('magnifierStrip', magnifierStripToggle.checked);
      this.render();
    });

    // Magnified reading strip scale buttons (Phase 2C)
    const magnifierScaleBtns = this.element.querySelectorAll<HTMLButtonElement>('button[data-panel-magnifier-scale]');
    magnifierScaleBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const scale = parseFloat(btn.getAttribute('data-panel-magnifier-scale') || '2.0') as any;
        if ([1.5, 2.0, 2.5, 3.0].includes(scale)) {
          this.state.updateSetting('magnifierScale', scale);
          this.render();
        }
      });
    });

    // Remediation toggle
    const remediationToggle = this.element.querySelector('#raawi-toggle-remediation') as HTMLInputElement | null;
    remediationToggle?.addEventListener('change', () => {
      this.state.updateSetting('remediationEnabled', remediationToggle.checked);
      this.render();
    });

    // Hide images toggle
    const hideImagesToggle = this.element.querySelector('#raawi-toggle-hide-images') as HTMLInputElement | null;
    hideImagesToggle?.addEventListener('change', () => {
      this.state.updateSetting('hideImages', hideImagesToggle.checked);
    });

    // Cursor buttons
    const cursorBtns = this.element.querySelectorAll<HTMLButtonElement>('button[data-cursor]');
    cursorBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const cursor = btn.getAttribute('data-cursor') as any;
        if (cursor) {
          this.state.updateSetting('bigCursor', cursor);
          this.render();
        }
      });
    });

    // Refresh button
    const refreshBtn = this.element.querySelector('#raawi-btn-refresh') as HTMLButtonElement | null;
    refreshBtn?.addEventListener('click', async (e) => {
      e.preventDefault();
      if (this.apiClient) {
        refreshBtn.disabled = true;
        await this.apiClient.refresh();
        this.render();
      }
    });

    // Landmark jump buttons
    const jumpBtns = this.element.querySelectorAll<HTMLButtonElement>('.raawi-landmark-jump-btn');
    jumpBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const selector = btn.getAttribute('data-landmark-selector');
        if (!selector) return;

        const settings = this.state.getSettings();
        const res = LandmarkNavigator.navigateToLandmark(
          { selector },
          { reduceMotion: settings.reduceMotion || settings.stopAnimations }
        );

        const t = this.i18n.t();
        if (res.success) {
          // 1. Close panel so modal focus trap releases before focusing host element
          this.element.dispatchEvent(
            new CustomEvent('raawi-close-dialog', {
              bubbles: true,
              composed: true,
              detail: { skipFocusRestore: true },
            })
          );

          // 2. Announce navigation
          this.element.dispatchEvent(
            new CustomEvent('raawi-announce', {
              bubbles: true,
              composed: true,
              detail: { message: t.landmarkNavigated || 'Navigated to landmark', priority: 'polite' },
            })
          );

          // 3. Ensure target retains focus now that modal is closed
          const targetToFocus = res.target;
          if (targetToFocus) {
            setTimeout(() => {
              if (!targetToFocus.hasAttribute('tabindex')) {
                targetToFocus.setAttribute('tabindex', '-1');
                targetToFocus.setAttribute('data-raawi-temp-focus', 'true');
                targetToFocus.addEventListener(
                  'blur',
                  () => {
                    targetToFocus.removeAttribute('data-raawi-temp-focus');
                    targetToFocus.removeAttribute('tabindex');
                  },
                  { once: true }
                );
              }
              try {
                targetToFocus.focus({ preventScroll: true });
              } catch {
                targetToFocus.focus();
              }
            }, 0);
          }
        } else {
          this.element.dispatchEvent(
            new CustomEvent('raawi-announce', {
              bubbles: true,
              composed: true,
              detail: {
                message: res.message || t.landmarkNotFound || 'Landmark target not found on page',
                priority: 'polite',
              },
            })
          );
        }
      });
    });

    // TTS Controls: Play
    const ttsPlayBtn = this.element.querySelector('#raawi-btn-tts-play');
    ttsPlayBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      if (!this.speechReader) return;
      const res = this.speechReader.read();
      const t = this.i18n.t();
      if (res.success) {
        this.element.dispatchEvent(
          new CustomEvent('raawi-announce', {
            bubbles: true,
            composed: true,
            detail: { message: t.speechPlaying, priority: 'polite' },
          })
        );
      } else if (res.message) {
        this.element.dispatchEvent(
          new CustomEvent('raawi-announce', {
            bubbles: true,
            composed: true,
            detail: { message: res.message, priority: 'polite' },
          })
        );
      }
      this.render();
    });

    // TTS Controls: Pause
    const ttsPauseBtn = this.element.querySelector('#raawi-btn-tts-pause');
    ttsPauseBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.speechReader?.pause();
      const t = this.i18n.t();
      this.element.dispatchEvent(
        new CustomEvent('raawi-announce', {
          bubbles: true,
          composed: true,
          detail: { message: t.speechPaused, priority: 'polite' },
        })
      );
      this.render();
    });

    // TTS Controls: Stop
    const ttsStopBtn = this.element.querySelector('#raawi-btn-tts-stop');
    ttsStopBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.speechReader?.stop();
      const t = this.i18n.t();
      this.element.dispatchEvent(
        new CustomEvent('raawi-announce', {
          bubbles: true,
          composed: true,
          detail: { message: t.speechStopped, priority: 'polite' },
        })
      );
      this.render();
    });

    // TTS Speed Rate Buttons
    const rateBtns = this.element.querySelectorAll<HTMLButtonElement>('button[data-speech-rate]');
    rateBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const rateVal = parseFloat(btn.getAttribute('data-speech-rate') || '1.0');
        this.speechReader?.setRate(rateVal);
        this.render();
      });
    });

    // TTS Voice Select
    const voiceSelect = this.element.querySelector('#raawi-tts-voice-select') as HTMLSelectElement | null;
    voiceSelect?.addEventListener('change', () => {
      if (voiceSelect.value) {
        this.speechReader?.setSelectedVoice(voiceSelect.value);
      }
    });

    // Headings Navigator: Refresh
    const headingsRefreshBtn = this.element.querySelector('#raawi-btn-headings-refresh');
    headingsRefreshBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.headingsCache = HeadingsNavigator.discoverHeadings();
      this.render();
      const t = this.i18n.t();
      this.element.dispatchEvent(
        new CustomEvent('raawi-announce', {
          bubbles: true,
          composed: true,
          detail: {
            message: `${this.headingsCache.length} ${t.headingsCount}`,
            priority: 'polite',
          },
        })
      );
    });

    // Headings Navigator: Jump
    const headingJumpBtns = this.element.querySelectorAll<HTMLButtonElement>('.raawi-heading-jump-btn');
    headingJumpBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const headingId = btn.getAttribute('data-heading-id');
        const targetHeading = this.headingsCache.find((h) => h.id === headingId);
        if (!targetHeading) return;

        // Close panel dialog first so modal focus trap releases
        this.element.dispatchEvent(
          new CustomEvent('raawi-close-dialog', {
            bubbles: true,
            composed: true,
            detail: { skipFocusRestore: true },
          })
        );

        const settings = this.state.getSettings();
        const res = HeadingsNavigator.navigateToHeading(targetHeading, {
          reduceMotion: settings.reduceMotion || settings.stopAnimations,
        });

        const t = this.i18n.t();
        if (res.success) {
          this.element.dispatchEvent(
            new CustomEvent('raawi-announce', {
              bubbles: true,
              composed: true,
              detail: {
                message: `${t.headingNavigated}: ${targetHeading.text}`,
                priority: 'polite',
              },
            })
          );
        }
      });
    });
  }

  private getSpeechStatusBadgeType(): string {
    const s = this.speechReader?.getState() || 'idle';
    switch (s) {
      case 'playing':
        return 'success';
      case 'paused':
        return 'warning';
      case 'unsupported':
      case 'error':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  private getSpeechStatusBadgeText(t: TranslationDictionary): string {
    const s = this.speechReader?.getState() || 'idle';
    switch (s) {
      case 'playing':
        return t.speechPlaying;
      case 'paused':
        return t.speechPaused;
      case 'unsupported':
        return t.speechUnsupported;
      case 'error':
        return t.errorOccurred;
      default:
        return t.statusReady;
    }
  }

  private renderVoiceSelect(t: TranslationDictionary): string {
    if (!this.speechReader || this.speechReader.getState() === 'unsupported') {
      return '';
    }

    const voices = this.speechReader.getVoices();
    if (voices.length === 0) {
      return `
        <div style="font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 4px;">
          <span>🎙️</span> <span>${t.defaultVoice}</span>
        </div>
      `;
    }

    const selectedUri = this.speechReader.getSelectedVoiceUri();

    return `
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <label for="raawi-tts-voice-select" style="font-size: 12px; color: var(--text-secondary);">${t.speechVoice}</label>
        <select id="raawi-tts-voice-select" class="raawi-select" aria-label="${t.speechVoice}">
          <option value="">${t.defaultVoice}</option>
          ${voices.map((v) => `
            <option value="${escapeHtml(v.voiceURI)}" ${v.voiceURI === selectedUri ? 'selected' : ''}>
              ${escapeHtml(v.name)} (${escapeHtml(v.lang)})
            </option>
          `).join('')}
        </select>
      </div>
    `;
  }

  private renderHeadingsList(t: TranslationDictionary): string {
    if (this.headingsCache.length === 0) {
      return `
        <div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 14px 8px;" data-testid="raawi-no-headings">
          ${t.noHeadingsFound}
        </div>
      `;
    }

    return this.headingsCache.map((h, idx) => `
      <div class="raawi-heading-item" data-testid="raawi-heading-item-${idx}">
        <span class="raawi-heading-badge">H${h.level}</span>
        <span class="raawi-heading-text" title="${escapeHtml(h.text)}">${escapeHtml(h.text)}</span>
        <button type="button" class="raawi-heading-jump-btn" data-heading-id="${escapeHtml(h.id)}" data-testid="raawi-heading-jump-${idx}" aria-label="${t.jumpToHeading}: ${escapeHtml(h.text)}">
          ${t.jumpToLandmark || 'Jump'} ↗
        </button>
      </div>
    `).join('');
  }

  private getStatusBadgeType(status?: string): string {
    switch (status) {
      case 'ready':
        return 'success';
      case 'loading':
        return 'info';
      case 'unknown':
      case 'outdated':
      case 'mismatch':
        return 'warning';
      case 'offline':
      case 'invalid':
      case 'error':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  private getStatusBadgeText(status: string | undefined, t: TranslationDictionary): string {
    switch (status) {
      case 'ready':
        return t.mapStatusReady || 'Ready';
      case 'loading':
        return t.mapStatusLoading || 'Loading...';
      case 'not-scanned':
        return t.mapStatusNotScanned || 'Not Scanned';
      case 'offline':
        return t.mapStatusOffline || 'Offline';
      case 'outdated':
        return t.mapStatusOutdated || 'Outdated (Page Changed)';
      case 'mismatch':
        return t.mapStatusMismatch || 'Outdated / Mismatched';
      case 'invalid':
        return t.mapStatusInvalid || 'Invalid Package';
      case 'unknown':
        return t.mapStatusUnknown || 'Unknown / Unverified';
      case 'error':
        return t.errorOccurred || 'Error';
      default:
        return t.statusReady || 'Ready';
    }
  }

  private getLocalizedLandmarkRole(role: string | undefined, t: TranslationDictionary): string {
    switch (role?.toLowerCase()) {
      case 'main':
        return t.landmarkRoleMain || 'Main Content';
      case 'navigation':
      case 'nav':
        return t.landmarkRoleNav || 'Navigation';
      case 'banner':
      case 'header':
        return t.landmarkRoleHeader || 'Header / Banner';
      case 'contentinfo':
      case 'footer':
        return t.landmarkRoleFooter || 'Footer';
      case 'complementary':
      case 'aside':
        return t.landmarkRoleAside || 'Aside';
      case 'search':
        return t.landmarkRoleSearch || 'Search';
      case 'form':
        return t.landmarkRoleForm || 'Form';
      default:
        return role || 'Landmark';
    }
  }

  private renderPageInsightsCard(t: TranslationDictionary, settings: any): string {
    const status = this.apiClient?.getStatus() || 'idle';
    const data = this.apiClient?.getData();
    const map = data?.assistiveMap;
    const guidance = data?.guidance;
    const activeChanges = this.remediator?.getActiveChangesCount() ?? 0;
    const isReady = status === 'ready';

    const landmarksCount = guidance?.landmarks?.length || 0;
    const imgCount = Array.isArray(map?.imageDescriptions)
      ? map.imageDescriptions.length
      : Object.keys(map?.imageDescriptions || {}).length;
    const labelCount = Array.isArray(map?.labelOverrides)
      ? map.labelOverrides.length
      : Object.keys(map?.labelOverrides || {}).length;
    const totalEnhancements = imgCount + labelCount;

    return `
      <!-- Page Insights Card -->
      <div class="raawi-control-card raawi-insights-card" data-testid="raawi-insights-card">
        <div class="raawi-control-header">
          <span class="raawi-control-title">${t.pageInsights || 'Page Insights'}</span>
          <div style="display: flex; align-items: center; gap: 6px;">
            <button type="button" class="raawi-btn-refresh" id="raawi-btn-refresh" data-testid="raawi-btn-refresh" aria-label="${t.refreshStatus || 'Refresh'}" ${status === 'loading' ? 'disabled' : ''}>
              ${status === 'loading' ? t.refreshing : `🔄 ${t.refresh || 'Refresh'}`}
            </button>
            <span class="raawi-badge raawi-badge-${this.getStatusBadgeType(status)}" data-testid="raawi-map-status-badge">
              ${this.getStatusBadgeText(status, t)}
            </span>
          </div>
        </div>

        ${guidance?.summary ? `
          <div class="raawi-insights-summary" style="font-size: 13px; line-height: 1.4; color: var(--raawi-text-muted, #64748b); margin: 6px 0 10px;">
            ${escapeHtml(guidance.summary)}
          </div>
        ` : ''}

        ${data ? `
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; font-size: 12px;">
            ${landmarksCount > 0 ? `<span class="raawi-badge raawi-badge-neutral">🏛️ ${landmarksCount} ${t.landmarksCount || 'Landmarks'}</span>` : ''}
            ${totalEnhancements > 0 ? `<span class="raawi-badge raawi-badge-neutral">✨ ${totalEnhancements} ${t.enhancementsAvailable || 'Enhancements'}</span>` : ''}
          </div>
        ` : ''}

        <!-- Non-invasive Form Guidance Hints -->
        ${guidance?.formSteps && guidance.formSteps.length > 0 ? `
          <div class="raawi-form-guidance" data-testid="raawi-form-guidance">
            <span>📋</span>
            <span><strong>${t.formGuidanceTitle || 'Form Guidance'}:</strong> ${guidance.formSteps.length} ${t.formStepsCount || 'Steps'}${guidance.formSteps[0]?.purpose ? ` (${escapeHtml(guidance.formSteps[0].purpose)})` : ''}</span>
          </div>
        ` : ''}

        <!-- Landmark Quick Navigation Drawer -->
        ${isReady && guidance?.landmarks && guidance.landmarks.length > 0 ? `
          <div class="raawi-landmarks-nav" data-testid="raawi-landmarks-nav">
            <div class="raawi-landmarks-title">
              <span>🏛️ ${t.landmarksNavTitle || 'Landmark Quick Navigation'}</span>
            </div>
            <div class="raawi-landmark-list">
              ${guidance.landmarks.map((lm, idx) => `
                <div class="raawi-landmark-item">
                  <div class="raawi-landmark-info">
                    <span class="raawi-badge raawi-badge-neutral" style="font-size: 10px;">${this.getLocalizedLandmarkRole(lm.role || lm.type, t)}</span>
                    <span class="raawi-landmark-name" title="${escapeHtml(lm.label || lm.description || lm.selector)}">${escapeHtml(lm.label || lm.description || lm.selector)}</span>
                  </div>
                  <button type="button" class="raawi-landmark-jump-btn" data-landmark-selector="${escapeHtml(lm.selector)}" data-testid="raawi-jump-landmark-${idx}" aria-label="${t.jumpToLandmark || 'Jump to'} ${escapeHtml(lm.label || lm.selector)}">
                    ${t.jumpToLandmark || 'Jump'} ↗
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Safe DOM Remediation Toggle -->
        <div style="border-top: 1px solid var(--raawi-border, #e2e8f0); padding-top: 10px; margin-top: 6px;">
          <div class="raawi-control-header" style="align-items: flex-start;">
            <div style="flex: 1; padding-inline-end: 8px;">
              <div class="raawi-control-title" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                ${t.enableRemediation || 'Safe Auto-Remediation'}
                ${settings.remediationEnabled && activeChanges > 0 ? `<span class="raawi-badge raawi-badge-success" style="font-size: 10px;">${t.remediationActiveBadge || 'Active'} (${activeChanges})</span>` : ''}
              </div>
              <div class="raawi-control-desc" style="font-size: 12px; color: var(--raawi-text-muted, #64748b); margin-top: 2px;">
                ${t.remediationDesc || 'Opt-in accessible labels without overwriting author intent'}
              </div>
            </div>
            <label class="raawi-toggle" style="margin-top: 2px;">
              <input type="checkbox" id="raawi-toggle-remediation" data-testid="raawi-tool-remediation" ${settings.remediationEnabled ? 'checked' : ''} ${!isReady ? 'disabled' : ''} aria-label="${t.enableRemediation || 'Enable Remediation'}">
              <span class="raawi-toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
    `;
  }
}

