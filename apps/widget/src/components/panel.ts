/**
 * Accessible Panel Dialog Component for Raawi X Widget
 */

import type { I18nManager, TranslationDictionary } from '../core/i18n';
import type { StateManager } from '../core/state';
import type { TabId } from '../core/types';
import type { MapApiClient } from '../core/api-client';
import type { DomRemediator } from '../core/dom-remediator';

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

  private lastTab: TabId;

  constructor(
    state: StateManager,
    i18n: I18nManager,
    apiClient?: MapApiClient,
    remediator?: DomRemediator
  ) {
    this.state = state;
    this.i18n = i18n;
    this.apiClient = apiClient;
    this.remediator = remediator;
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

    this.element.innerHTML = `
      <!-- Topbar Header -->
      <header class="raawi-panel-header">
        <div class="raawi-brand-group">
          <svg class="raawi-brand-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="12" cy="12" r="10" fill="#27ae60" fill-opacity="0.15"/>
            <circle cx="12" cy="7" r="2.5" fill="#27ae60"/>
            <path d="M6 11C9 10 15 10 18 11" stroke="#27ae60" stroke-width="2" stroke-linecap="round"/>
            <path d="M12 9.5V16" stroke="#27ae60" stroke-width="2" stroke-linecap="round"/>
            <path d="M12 16L8.5 21" stroke="#27ae60" stroke-width="2" stroke-linecap="round"/>
            <path d="M12 16L15.5 21" stroke="#27ae60" stroke-width="2" stroke-linecap="round"/>
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

      <!-- Tab Navigation -->
      <nav class="raawi-tab-bar" role="tablist" aria-label="${t.widgetTitle}">
        <button type="button" class="raawi-tab-btn ${activeTab === 'assist' ? 'active' : ''}" data-tab="assist" data-testid="raawi-tab-assist" role="tab" aria-selected="${activeTab === 'assist'}">${t.assist}</button>
        <button type="button" class="raawi-tab-btn ${activeTab === 'vision' ? 'active' : ''}" data-tab="vision" data-testid="raawi-tab-vision" role="tab" aria-selected="${activeTab === 'vision'}">${t.vision}</button>
        <button type="button" class="raawi-tab-btn ${activeTab === 'reading' ? 'active' : ''}" data-tab="reading" data-testid="raawi-tab-reading" role="tab" aria-selected="${activeTab === 'reading'}">${t.reading}</button>
        <button type="button" class="raawi-tab-btn ${activeTab === 'tools' ? 'active' : ''}" data-tab="tools" data-testid="raawi-tab-tools" role="tab" aria-selected="${activeTab === 'tools'}">${t.tools}</button>
      </nav>

      <!-- Tab Content: Assist -->
      <div id="raawi-tabpanel-assist" class="raawi-tab-body" role="tabpanel" style="display: ${activeTab === 'assist' ? 'flex' : 'none'};">
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

        <!-- Quick AI Tools -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <span class="raawi-control-title">${t.assist}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button type="button" class="raawi-action-btn" id="raawi-btn-describe-image" data-testid="raawi-tool-describe-image">
              <span aria-hidden="true">🖼️</span> ${t.describeImage}
            </button>
            <button type="button" class="raawi-action-btn" id="raawi-btn-describe-focused" data-testid="raawi-tool-describe-focused">
              <span aria-hidden="true">🎯</span> ${t.describeFocusedElement}
            </button>
            <button type="button" class="raawi-action-btn" id="raawi-btn-what-can-i-do" data-testid="raawi-tool-what-can-i-do">
              <span aria-hidden="true">🧭</span> ${t.whatCanIDoHere}
            </button>
          </div>
        </div>
      </div>

      <!-- Tab Content: Vision -->
      <div id="raawi-tabpanel-vision" class="raawi-tab-body" role="tabpanel" style="display: ${activeTab === 'vision' ? 'flex' : 'none'};">
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
      <div id="raawi-tabpanel-reading" class="raawi-tab-body" role="tabpanel" style="display: ${activeTab === 'reading' ? 'flex' : 'none'};">
        <!-- Reading Guide Ruler -->
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <span class="raawi-control-title">${t.readingGuide}</span>
            <label class="raawi-toggle">
              <input type="checkbox" id="raawi-toggle-reading-guide" data-testid="raawi-tool-reading-guide" ${settings.readingGuide ? 'checked' : ''} aria-label="${t.toggleReadingGuide}">
              <span class="raawi-toggle-slider"></span>
            </label>
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
      <div id="raawi-tabpanel-tools" class="raawi-tab-body" role="tabpanel" style="display: ${activeTab === 'tools' ? 'flex' : 'none'};">
        <div class="raawi-control-card">
          <div class="raawi-control-header">
            <span class="raawi-control-title">${t.tools}</span>
          </div>
          <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
            ${t.statusReady} • ${t.poweredBy}
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

    // Tab buttons
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

    // Stop animations toggle
    const stopAnimationsToggle = this.element.querySelector('#raawi-toggle-stop-animations') as HTMLInputElement | null;
    stopAnimationsToggle?.addEventListener('change', () => {
      this.state.updateSetting('stopAnimations', stopAnimationsToggle.checked);
    });

    // Reading guide toggle
    const readingGuideToggle = this.element.querySelector('#raawi-toggle-reading-guide') as HTMLInputElement | null;
    readingGuideToggle?.addEventListener('change', () => {
      this.state.updateSetting('readingGuide', readingGuideToggle.checked);
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
  }

  private getStatusBadgeType(status?: string): string {
    switch (status) {
      case 'ready':
        return 'success';
      case 'loading':
        return 'info';
      case 'mismatch':
      case 'error':
        return 'warning';
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
      case 'mismatch':
        return t.mapStatusMismatch || 'Outdated';
      case 'error':
        return t.errorOccurred || 'Error';
      default:
        return t.statusReady || 'Ready';
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
          <span class="raawi-badge raawi-badge-${this.getStatusBadgeType(status)}" data-testid="raawi-map-status-badge">
            ${this.getStatusBadgeText(status, t)}
          </span>
        </div>

        ${guidance?.summary ? `
          <div class="raawi-insights-summary" style="font-size: 13px; line-height: 1.4; color: var(--raawi-text-muted, #64748b); margin: 6px 0 10px;">
            ${escapeHtml(guidance.summary)}
          </div>
        ` : ''}

        ${data ? `
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; font-size: 12px;">
            ${landmarksCount > 0 ? `<span class="raawi-badge raawi-badge-neutral">🏛️ ${landmarksCount} ${t.landmarksCount || 'Landmarks'}</span>` : ''}
            ${totalEnhancements > 0 ? `<span class="raawi-badge raawi-badge-neutral">✨ ${totalEnhancements} ${t.enhancementsAvailable || 'Enhancements'}</span>` : ''}
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

