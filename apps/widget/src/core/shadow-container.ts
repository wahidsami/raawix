/**
 * RaawiAccessibilityWidget Custom Element with Shadow DOM Encapsulation
 */

import { I18nManager } from './i18n';
import { StateManager } from './state';
import { LauncherComponent } from '../components/launcher';
import { PanelComponent } from '../components/panel';
import { WIDGET_CSS } from '../styles/widget-styles';
import type { Locale } from './types';

export class RaawiAccessibilityWidget extends HTMLElement {
  public static readonly TAG_NAME = 'raawi-accessibility-widget';

  private shadow: ShadowRoot;
  private state: StateManager;
  private i18n: I18nManager;
  private launcher: LauncherComponent;
  private panel: PanelComponent;

  private onDocumentKeyDown: (e: KeyboardEvent) => void;
  private onDocumentClick: (e: MouseEvent) => void;

  constructor() {
    super();

    // 1. Resolve initial locale from document or host environment
    const initialLocale = this.detectInitialLocale();

    this.state = new StateManager(initialLocale);
    this.i18n = new I18nManager(this.state.getLocale());

    // 2. Attach open Shadow Root for complete CSS and DOM isolation
    this.shadow = this.attachShadow({ mode: 'open' });

    // 3. Inject scoped styles into Shadow Root (NO global styles in document.head)
    const styleEl = document.createElement('style');
    styleEl.textContent = WIDGET_CSS;
    this.shadow.appendChild(styleEl);

    // 4. Create root container inside Shadow Root
    const container = document.createElement('div');
    container.className = 'raawi-theme';

    const launcherWrapper = document.createElement('div');
    launcherWrapper.className = 'raawi-launcher-container';

    this.launcher = new LauncherComponent(this.state, this.i18n);
    launcherWrapper.appendChild(this.launcher.getElement());

    this.panel = new PanelComponent(this.state, this.i18n);

    container.appendChild(launcherWrapper);
    container.appendChild(this.panel.getElement());
    this.shadow.appendChild(container);

    // 5. Subscribe to state changes
    this.state.subscribe(() => {
      if (this.isConnected) {
        this.updateHostDirection();
      }
      this.handleStateChange();
    });

    // 6. Global event handlers
    this.onDocumentKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);
    this.onDocumentClick = (e: MouseEvent) => this.handleOutsideClick(e);
  }

  public connectedCallback(): void {
    document.addEventListener('keydown', this.onDocumentKeyDown);
    document.addEventListener('click', this.onDocumentClick);
    this.updateHostDirection();
  }

  public disconnectedCallback(): void {
    document.removeEventListener('keydown', this.onDocumentKeyDown);
    document.removeEventListener('click', this.onDocumentClick);
  }

  public open(): void {
    this.state.setOpen(true);
  }

  public close(): void {
    this.state.setOpen(false);
  }

  public toggle(): void {
    this.state.toggleOpen();
  }

  public setLocale(locale: Locale): void {
    this.state.setLocale(locale);
    this.i18n.setLocale(locale);
  }

  public getStateManager(): StateManager {
    return this.state;
  }

  public getI18nManager(): I18nManager {
    return this.i18n;
  }

  public getShadowRoot(): ShadowRoot {
    return this.shadow;
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
    this.setAttribute('dir', dir);
  }

  private handleStateChange(): void {
    if (this.state.getIsOpen()) {
      // Accessible handoff: focus into panel upon open
      setTimeout(() => {
        this.panel.focusFirstElement();
      }, 50);
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.state.getIsOpen()) {
      e.preventDefault();
      this.state.setOpen(false);
      // Clean focus return to launcher
      this.launcher.focus();
    }
  }

  private handleOutsideClick(e: MouseEvent): void {
    if (!this.state.getIsOpen()) return;

    // Check if the click occurred inside the shadow root
    const path = e.composedPath();
    if (!path.includes(this)) {
      this.state.setOpen(false);
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

