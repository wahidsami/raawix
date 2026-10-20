/**
 * Accessible Launcher Button Component for Raawi X Widget
 */

import type { I18nManager } from '../core/i18n';
import type { StateManager } from '../core/state';

// High-resolution inline SVG accessibility logo (< 1.5 KB, replacing 2.5MB raster asset)
const RAAWI_ICON_SVG = `
<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="raawi-launcher-icon">
  <circle cx="24" cy="24" r="22" fill="white" fill-opacity="0.15"/>
  <!-- Figure head -->
  <circle cx="24" cy="12" r="4.5" fill="#ffffff"/>
  <!-- Figure torso and welcoming arms (universal accessibility symbol) -->
  <path d="M12 21C16 19 32 19 36 21" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M24 18V30" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
  <!-- Figure legs -->
  <path d="M24 30L17 40" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M24 30L31 40" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
</svg>
`;

export class LauncherComponent {
  private element: HTMLButtonElement;
  private state: StateManager;
  private i18n: I18nManager;

  constructor(state: StateManager, i18n: I18nManager) {
    this.state = state;
    this.i18n = i18n;

    this.element = document.createElement('button');
    this.element.className = 'raawi-launcher-btn';
    this.element.setAttribute('type', 'button');
    this.element.setAttribute('data-testid', 'raawi-launcher');
    this.element.setAttribute('aria-haspopup', 'dialog');
    this.element.setAttribute('aria-controls', 'raawi-accessibility-panel');
    this.element.innerHTML = RAAWI_ICON_SVG;

    this.updateAria();
    this.setupEvents();

    // Subscribe to state and i18n changes
    this.state.subscribe(() => this.updateAria());
    this.i18n.subscribe(() => this.updateAria());
  }

  public getElement(): HTMLButtonElement {
    return this.element;
  }

  public focus(): void {
    this.element.focus();
  }

  private updateAria(): void {
    const isOpen = this.state.getIsOpen();
    this.element.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    this.element.setAttribute('aria-label', isOpen ? this.i18n.t().closeOptions : this.i18n.t().openOptions);
    this.element.setAttribute('title', isOpen ? this.i18n.t().closeOptions : this.i18n.t().openOptions);
  }

  private setupEvents(): void {
    this.element.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.state.toggleOpen();
    });

    this.element.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        this.state.toggleOpen();
      }
    });
  }
}
