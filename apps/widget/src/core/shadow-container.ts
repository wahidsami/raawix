/**
 * RaawiAccessibilityWidget Custom Element with Shadow DOM Encapsulation
 * 
 * Implements complete WAI-ARIA Dialog (Modal) interaction pattern:
 * - Proper modal semantics: aria-modal="true" while active
 * - Strict focus containment: Tab forward wrap and Shift+Tab reverse wrap
 * - Initial focus handoff and clean focus restoration on close
 * - Backdrop dismissal without false triggers from inner clicks
 * - Localized polite ARIA live announcements (zero unprompted TTS)
 */

import { I18nManager } from './i18n';
import { StateManager } from './state';
import { DisplayManager } from './display-manager';
import { MapApiClient } from './api-client';
import { DomRemediator } from './dom-remediator';
import { PageTracker } from './page-tracker';
import { LauncherComponent } from '../components/launcher';
import { PanelComponent } from '../components/panel';
import { LiveAnnouncerComponent } from '../components/live-announcer';
import { SpeechReader } from './speech-reader';
import { WIDGET_CSS } from '../styles/widget-styles';
import type { Locale } from './types';

export class RaawiAccessibilityWidget extends HTMLElement {
  public static readonly TAG_NAME = 'raawi-accessibility-widget';

  private shadow: ShadowRoot;
  private state: StateManager;
  private i18n: I18nManager;
  private launcher: LauncherComponent;
  private panel: PanelComponent;
  private announcer: LiveAnnouncerComponent;
  private displayManager: DisplayManager;
  private apiClient: MapApiClient;
  private remediator: DomRemediator;
  private pageTracker: PageTracker;
  private speechReader: SpeechReader;
  private backdrop: HTMLElement;

  private onDocumentKeyDown: (e: KeyboardEvent) => void;
  private onDocumentFocusIn: (e: FocusEvent) => void;
  private wasOpen: boolean = false;
  private skipNextFocusRestore: boolean = false;

  constructor() {
    super();

    // 1. Resolve initial locale from document or host environment
    const initialLocale = this.detectInitialLocale();

    this.state = new StateManager(initialLocale);
    this.i18n = new I18nManager(this.state.getLocale());

    // Initialize MapApiClient and DomRemediator
    this.apiClient = new MapApiClient();
    this.remediator = new DomRemediator(this.state);

    // 2. Attach open Shadow Root for complete CSS and DOM isolation
    this.shadow = this.attachShadow({ mode: 'open' });

    // 3. Inject scoped styles into Shadow Root (NO global styles in document.head)
    const styleEl = document.createElement('style');
    styleEl.textContent = WIDGET_CSS;
    this.shadow.appendChild(styleEl);

    // 4. Create backdrop layer inside Shadow Root (intercepts clicks outside modal)
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'raawi-backdrop';
    this.backdrop.setAttribute('aria-hidden', 'true');
    this.shadow.appendChild(this.backdrop);

    // 5. Create root container inside Shadow Root
    const container = document.createElement('div');
    container.className = 'raawi-theme';

    const launcherWrapper = document.createElement('div');
    launcherWrapper.className = 'raawi-launcher-container';

    this.launcher = new LauncherComponent(this.state, this.i18n);
    launcherWrapper.appendChild(this.launcher.getElement());

    // Initialize standalone speech reader
    this.speechReader = new SpeechReader({ locale: this.state.getLocale() });

    this.panel = new PanelComponent(
      this.state,
      this.i18n,
      this.apiClient,
      this.remediator,
      this.speechReader
    );

    container.appendChild(launcherWrapper);
    container.appendChild(this.panel.getElement());
    this.shadow.appendChild(container);

    // 6. Create polite live announcer inside Shadow Root
    this.announcer = new LiveAnnouncerComponent(this.i18n);
    this.shadow.appendChild(this.announcer.getElement());

    // 7. Initialize Display Manager for non-destructive visual and reading preferences
    this.displayManager = new DisplayManager(this.state, this.shadow);

    // Wire MapApiClient changes to remediator
    this.apiClient.subscribe((status, data) => {
      if (status === 'ready' && data?.assistiveMap) {
        this.remediator.setAssistiveMap(data.assistiveMap);
        if (this.state.getSettings().remediationEnabled) {
          this.remediator.apply();
        }
      } else {
        this.remediator.setAssistiveMap(null);
      }
    });

    // 8. Initialize PageTracker for SPA navigation and DOM mutation tracking
    this.pageTracker = new PageTracker({
      apiClient: this.apiClient,
      domRemediator: this.remediator,
      onStaleDetected: () => {
        this.announcer.announcePolite(this.i18n.t().statusStale || 'Page content changed since last scan');
      },
    });

    // 9. Subscribe to state and i18n changes
    let wasRemediationEnabled = this.state.getSettings().remediationEnabled;
    this.state.subscribe(() => {
      if (this.isConnected) {
        this.updateHostDirection();
      }
      const isRemediationEnabled = this.state.getSettings().remediationEnabled;
      if (isRemediationEnabled !== wasRemediationEnabled) {
        wasRemediationEnabled = isRemediationEnabled;
        if (isRemediationEnabled) {
          this.remediator.apply();
        } else {
          this.remediator.revert();
        }
      }
      this.handleStateChange();
    });

    this.i18n.subscribe((locale) => {
      this.announcer.announceLanguageChange(locale);
    });

    // 10. Event listener bindings
    this.onDocumentKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);
    this.onDocumentFocusIn = (e: FocusEvent) => this.handleFocusIn(e);

    // 11. Custom events inside Shadow Root
    this.shadow.addEventListener('raawi-close-dialog', (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.skipFocusRestore) {
        this.skipNextFocusRestore = true;
      }
      this.close();
    });

    this.shadow.addEventListener('raawi-announce', (e: any) => {
      if (e.detail?.message) {
        this.announcer.announcePolite(e.detail.message);
      }
    });

    // 12. Backdrop click dismissal
    this.backdrop.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.close();
    });
  }

  public connectedCallback(): void {
    document.addEventListener('keydown', this.onDocumentKeyDown, true);
    document.addEventListener('focusin', this.onDocumentFocusIn, true);
    this.updateHostDirection();
    this.apiClient.fetchPagePackage().catch(() => {
      // Graceful error fallback
    });
  }

  public disconnectedCallback(): void {
    document.removeEventListener('keydown', this.onDocumentKeyDown, true);
    document.removeEventListener('focusin', this.onDocumentFocusIn, true);
    if (this.pageTracker) {
      this.pageTracker.destroy();
    }
    if (this.displayManager) {
      this.displayManager.destroy();
    }
    if (this.remediator) {
      this.remediator.destroy();
    }
    if (this.apiClient) {
      this.apiClient.destroy();
    }
    if (this.speechReader) {
      this.speechReader.destroy();
    }
  }

  public open(): void {
    this.state.setOpen(true);
  }

  public close(): void {
    if (this.speechReader) {
      this.speechReader.stop();
    }
    this.state.setOpen(false);
  }

  public toggle(): void {
    this.state.toggleOpen();
  }

  public setLocale(locale: Locale): void {
    this.state.setLocale(locale);
    this.i18n.setLocale(locale);
    if (this.speechReader) {
      this.speechReader.setLocale(locale);
    }
  }

  public getStateManager(): StateManager {
    return this.state;
  }

  public getI18nManager(): I18nManager {
    return this.i18n;
  }

  public getAnnouncer(): LiveAnnouncerComponent {
    return this.announcer;
  }

  public getDisplayManager(): DisplayManager {
    return this.displayManager;
  }

  public getApiClient(): MapApiClient {
    return this.apiClient;
  }

  public getDomRemediator(): DomRemediator {
    return this.remediator;
  }

  public getRemediator(): DomRemediator {
    return this.remediator;
  }

  public getPageTracker(): PageTracker {
    return this.pageTracker;
  }

  public getSpeechReader(): SpeechReader {
    return this.speechReader;
  }

  public getShadowRoot(): ShadowRoot {
    return this.shadow;
  }

  public getPanelComponent(): PanelComponent {
    return this.panel;
  }

  public getLauncherComponent(): LauncherComponent {
    return this.launcher;
  }

  private detectInitialLocale(): Locale {
    if (typeof document !== 'undefined') {
      const docLang = document.documentElement.lang?.toLowerCase() || '';
      const docDir = document.documentElement.dir?.toLowerCase() || '';
      const hostname = (typeof window !== 'undefined' ? window.location.hostname : '').toLowerCase();

      if (docDir === 'rtl' || docLang.startsWith('ar') || hostname.endsWith('.sa')) {
        return 'ar';
      }
    }
    return 'en';
  }

  private updateHostDirection(): void {
    const dir = this.state.getDirection();
    const locale = this.state.getLocale();
    this.setAttribute('dir', dir);
    this.setAttribute('lang', locale);
  }

  private handleStateChange(): void {
    const isOpen = this.state.getIsOpen();

    if (isOpen) {
      // Backdrop activation
      this.backdrop.classList.add('open');

      if (!this.wasOpen) {
        this.wasOpen = true;
        this.announcer.announceOpen();

        // Initial focus handoff into modal dialog
        setTimeout(() => {
          this.panel.focusFirstElement();
        }, 50);
      }
    } else {
      // Backdrop deactivation
      this.backdrop.classList.remove('open');

      if (this.wasOpen) {
        this.wasOpen = false;
        this.announcer.announceClose();

        // Focus restoration to launcher button (unless explicitly skipped for landmark navigation)
        if (this.skipNextFocusRestore) {
          this.skipNextFocusRestore = false;
        } else if (this.launcher && this.launcher.getElement() && this.launcher.getElement().isConnected) {
          this.launcher.focus();
        }
      }
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.state.getIsOpen()) return;

    // 1. Escape key dismissal
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.close();
      return;
    }

    // 2. Modal Keyboard Containment (Focus Trap)
    if (e.key === 'Tab') {
      this.trapTabKey(e);
    }
  }

  /**
   * Complete bidirectional Tab key focus containment
   */
  private trapTabKey(e: KeyboardEvent): void {
    const focusables = this.panel.getFocusableElements();
    if (focusables.length === 0) {
      e.preventDefault();
      this.panel.focusFirstElement();
      return;
    }

    const firstElement = focusables[0];
    const lastElement = focusables[focusables.length - 1];

    // Determine currently focused element within Shadow Root or activeElement
    const active = (this.shadow.activeElement || document.activeElement) as HTMLElement | null;

    if (e.shiftKey) {
      // Reverse Tab: Wrap from first to last
      if (!active || active === firstElement || !focusables.includes(active)) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Forward Tab: Wrap from last to first
      if (!active || active === lastElement || !focusables.includes(active)) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }

  /**
   * Prevents focus from escaping to host page while modal is active
   */
  private handleFocusIn(e: FocusEvent): void {
    if (!this.state.getIsOpen()) return;

    // Check if target is outside this custom element (i.e. inside host document)
    const target = e.target as HTMLElement | null;
    if (target && target !== this && !this.contains(target)) {
      // Bring focus back to dialog
      this.panel.focusFirstElement();
    }
  }
}

export function registerRaawiWidget(registry?: CustomElementRegistry): void {
  const targetRegistry = registry || (typeof customElements !== 'undefined' ? customElements : null);
  if (targetRegistry && !targetRegistry.get(RaawiAccessibilityWidget.TAG_NAME)) {
    targetRegistry.define(RaawiAccessibilityWidget.TAG_NAME, RaawiAccessibilityWidget);
  }
}

// Auto-register custom element in current global registry
registerRaawiWidget();
