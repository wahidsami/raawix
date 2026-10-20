/**
 * Non-destructive display and reading preference manager for Raawi X Widget
 * 
 * Manages host-page visual adjustments (text scaling, line spacing, high contrast,
 * animations, cursor, and images) and Shadow DOM-contained reading overlays (ruler and mask).
 * 
 * Guarantees 100% reversible lifecycle: resetting or destroying the widget removes
 * all attributes, styles, overlays, and event listeners with zero persistent host modifications.
 */

import type { StateManager } from './state';
import type { WidgetSettings } from './types';

export class DisplayManager {
  private state: StateManager;
  private shadow: ShadowRoot;
  private styleElement: HTMLStyleElement | null = null;
  private unsubscribe: (() => void) | null = null;

  // Reading overlays (contained strictly within Shadow DOM)
  private readingRuler: HTMLElement | null = null;
  private readingMaskTop: HTMLElement | null = null;
  private readingMaskBottom: HTMLElement | null = null;

  // Event handlers & RAF tracking
  private isTrackingMouse: boolean = false;
  private rafId: number | null = null;
  private currentY: number = 200;
  private targetY: number = 200;

  // Tracked host modifications
  private pausedVideos: WeakSet<HTMLMediaElement> = new WeakSet();

  constructor(state: StateManager, shadow: ShadowRoot) {
    this.state = state;
    this.shadow = shadow;

    this.ensureStyleElement();
    this.applySettings(this.state.getSettings());

    // Subscribe to state updates
    this.unsubscribe = this.state.subscribe(() => {
      this.applySettings(this.state.getSettings());
    });

    // Bound listeners for reading helpers
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleFocusIn = this.handleFocusIn.bind(this);
    this.animateOverlays = this.animateOverlays.bind(this);
  }

  /**
   * Applies all active display preferences to the host page and Shadow DOM overlays
   */
  public applySettings(settings: WidgetSettings): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    // 1. Text scaling (proportional typography hierarchy preservation)
    if (settings.textSize !== 1.0) {
      root.style.setProperty('--raawi-text-size', String(settings.textSize));
      root.setAttribute('data-raawi-text-size', String(settings.textSize));
    } else {
      root.style.removeProperty('--raawi-text-size');
      root.removeAttribute('data-raawi-text-size');
    }

    // 2. Line spacing (content blocks only, preserving compact controls & tables)
    if (settings.lineSpacing !== 1.0) {
      root.style.setProperty('--raawi-line-spacing', String(settings.lineSpacing));
      root.setAttribute('data-raawi-line-spacing', String(settings.lineSpacing));
    } else {
      root.style.removeProperty('--raawi-line-spacing');
      root.removeAttribute('data-raawi-line-spacing');
    }

    // 3. Curated High-Contrast Dark Theme
    if (settings.contrastMode) {
      root.setAttribute('data-raawi-contrast-mode', 'true');
    } else {
      root.removeAttribute('data-raawi-contrast-mode');
    }

    // 4. Stop Animations & Reduced Motion
    if (settings.stopAnimations) {
      root.setAttribute('data-raawi-stop-animations', 'true');
      this.pauseHostMedia();
    } else {
      root.removeAttribute('data-raawi-stop-animations');
    }

    // 5. High-Visibility Cursor
    if (settings.bigCursor !== 'off') {
      root.setAttribute('data-raawi-cursor', settings.bigCursor);
    } else {
      root.removeAttribute('data-raawi-cursor');
    }

    // 6. Hide Images
    if (settings.hideImages) {
      root.setAttribute('data-raawi-hide-images', 'true');
    } else {
      root.removeAttribute('data-raawi-hide-images');
    }

    // 7. Reading Ruler Overlay (Shadow DOM contained)
    this.syncReadingRuler(settings.readingGuide);

    // 8. Reading Mask Overlay (Shadow DOM contained)
    this.syncReadingMask(settings.readingMask, settings.readingMaskWindowHeight);

    // 9. Sync mouse/focus tracking if either reading guide or mask is active
    this.syncTrackingListeners(settings.readingGuide || settings.readingMask);
  }

  /**
   * Reading Guide Ruler lifecycle
   */
  private syncReadingRuler(active: boolean): void {
    if (active) {
      if (!this.readingRuler) {
        this.readingRuler = document.createElement('div');
        this.readingRuler.id = 'raawi-reading-ruler';
        this.readingRuler.className = 'raawi-reading-ruler';
        this.readingRuler.setAttribute('aria-hidden', 'true');
        this.readingRuler.setAttribute('data-testid', 'raawi-reading-ruler');
        this.shadow.appendChild(this.readingRuler);
        this.updateRulerPosition(this.currentY);
      }
      this.readingRuler.style.display = 'block';
    } else if (this.readingRuler) {
      this.readingRuler.style.display = 'none';
    }
  }

  /**
   * Reading Focus Mask lifecycle
   */
  private syncReadingMask(active: boolean, windowHeightKey: 'small' | 'medium' | 'large'): void {
    if (active) {
      if (!this.readingMaskTop || !this.readingMaskBottom) {
        this.readingMaskTop = document.createElement('div');
        this.readingMaskTop.id = 'raawi-reading-mask-top';
        this.readingMaskTop.className = 'raawi-reading-mask-overlay raawi-reading-mask-top';
        this.readingMaskTop.setAttribute('aria-hidden', 'true');
        this.readingMaskTop.setAttribute('data-testid', 'raawi-reading-mask-overlay');
        this.shadow.appendChild(this.readingMaskTop);

        this.readingMaskBottom = document.createElement('div');
        this.readingMaskBottom.id = 'raawi-reading-mask-bottom';
        this.readingMaskBottom.className = 'raawi-reading-mask-overlay raawi-reading-mask-bottom';
        this.readingMaskBottom.setAttribute('aria-hidden', 'true');
        this.readingMaskBottom.setAttribute('data-testid', 'raawi-reading-mask-overlay');
        this.shadow.appendChild(this.readingMaskBottom);
      }
      this.readingMaskTop.style.display = 'block';
      this.readingMaskBottom.style.display = 'block';
      this.updateMaskPosition(this.currentY, windowHeightKey);
    } else {
      if (this.readingMaskTop) this.readingMaskTop.style.display = 'none';
      if (this.readingMaskBottom) this.readingMaskBottom.style.display = 'none';
    }
  }

  /**
   * Start or stop mousemove and focusin tracking for reading helpers
   */
  private syncTrackingListeners(needed: boolean): void {
    if (needed && !this.isTrackingMouse) {
      this.isTrackingMouse = true;
      document.addEventListener('mousemove', this.handleMouseMove, { passive: true });
      document.addEventListener('focusin', this.handleFocusIn, { passive: true });
    } else if (!needed && this.isTrackingMouse) {
      this.isTrackingMouse = false;
      document.removeEventListener('mousemove', this.handleMouseMove);
      document.removeEventListener('focusin', this.handleFocusIn);
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    this.targetY = e.clientY;
    this.requestOverlayUpdate();
  }

  private handleFocusIn(e: FocusEvent): void {
    const target = e.target as HTMLElement | null;
    if (target && typeof target.getBoundingClientRect === 'function') {
      const rect = target.getBoundingClientRect();
      this.targetY = Math.round(rect.top + rect.height / 2);
      this.requestOverlayUpdate();
    }
  }

  private requestOverlayUpdate(): void {
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(this.animateOverlays);
    }
  }

  private animateOverlays(): void {
    this.rafId = null;
    // Smooth dampening towards target
    this.currentY = this.targetY;

    if (this.readingRuler && this.readingRuler.style.display !== 'none') {
      this.updateRulerPosition(this.currentY);
    }

    if (this.readingMaskTop && this.readingMaskTop.style.display !== 'none') {
      this.updateMaskPosition(this.currentY, this.state.getSettings().readingMaskWindowHeight);
    }
  }

  private updateRulerPosition(y: number): void {
    if (!this.readingRuler) return;
    const rulerHeight = 4;
    const top = Math.max(0, Math.min(y - rulerHeight / 2, window.innerHeight - rulerHeight));
    this.readingRuler.style.top = `${top}px`;
  }

  private updateMaskPosition(y: number, heightKey: 'small' | 'medium' | 'large'): void {
    if (!this.readingMaskTop || !this.readingMaskBottom) return;

    const windowHeights = {
      small: 80,
      medium: 120,
      large: 180,
    };
    const apertureHeight = windowHeights[heightKey] || 120;
    const half = apertureHeight / 2;

    const topHeight = Math.max(0, y - half);
    const bottomStart = y + half;
    const bottomHeight = Math.max(0, (typeof window !== 'undefined' ? window.innerHeight : 800) - bottomStart);

    this.readingMaskTop.style.top = '0px';
    this.readingMaskTop.style.height = `${topHeight}px`;

    this.readingMaskBottom.style.top = `${bottomStart}px`;
    this.readingMaskBottom.style.height = `${bottomHeight}px`;
  }

  /**
   * Pauses playing HTML5 videos safely without permanently altering media state
   */
  private pauseHostMedia(): void {
    if (typeof document === 'undefined') return;
    const videos = document.querySelectorAll('video');
    videos.forEach((video) => {
      if (!video.paused) {
        this.pausedVideos.add(video);
        try {
          video.pause();
        } catch {
          // Ignore autoplay restriction failures
        }
      }
    });
  }

  /**
   * Injects the single, managed style element into document.head
   */
  private ensureStyleElement(): void {
    if (typeof document === 'undefined') return;

    let existing = document.getElementById('raawi-display-styles') as HTMLStyleElement | null;
    if (!existing) {
      existing = document.createElement('style');
      existing.id = 'raawi-display-styles';
      existing.textContent = this.generateManagedStyles();
      document.head.appendChild(existing);
    }
    this.styleElement = existing;
  }

  /**
   * Generates non-destructive host CSS rules for display preferences
   */
  private generateManagedStyles(): string {
    const darkCursorSvg = encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><path d="M4 4 L4 28 L11 21 L17 33 L21 31 L15 19 L24 19 Z" fill="#000000" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round"/></svg>`
    );
    const lightCursorSvg = encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><path d="M4 4 L4 28 L11 21 L17 33 L21 31 L15 19 L24 19 Z" fill="#ffffff" stroke="#000000" stroke-width="2.5" stroke-linejoin="round"/></svg>`
    );

    return `
      /* =========================================================================
         RAAWI X MANAGED DISPLAY PREFERENCES (Phase 5.3)
         Scoped strictly to [data-raawi-*] attributes. Fully reversible.
         Does NOT modify widget internal Shadow DOM.
         ========================================================================= */

      /* 1. Proportional Text Scaling (Preserves Heading & Body Hierarchy) */
      html[data-raawi-text-size] {
        font-size: calc(100% * var(--raawi-text-size, 1)) !important;
      }

      /* 2. Proportional Line Spacing (Content Blocks Only) */
      html[data-raawi-line-spacing] p,
      html[data-raawi-line-spacing] li,
      html[data-raawi-line-spacing] dd,
      html[data-raawi-line-spacing] dt,
      html[data-raawi-line-spacing] blockquote,
      html[data-raawi-line-spacing] figcaption {
        line-height: calc(1.6 * var(--raawi-line-spacing, 1)) !important;
      }

      /* 3. Curated High-Contrast Dark Theme (WCAG AAA 21:1 Ratio) */
      html[data-raawi-contrast-mode="true"] {
        background-color: #000000 !important;
        color: #ffffff !important;
      }

      html[data-raawi-contrast-mode="true"] body,
      html[data-raawi-contrast-mode="true"] main,
      html[data-raawi-contrast-mode="true"] header,
      html[data-raawi-contrast-mode="true"] footer,
      html[data-raawi-contrast-mode="true"] section,
      html[data-raawi-contrast-mode="true"] article,
      html[data-raawi-contrast-mode="true"] aside,
      html[data-raawi-contrast-mode="true"] nav,
      html[data-raawi-contrast-mode="true"] .card,
      html[data-raawi-contrast-mode="true"] .hero {
        background: #000000 !important;
        color: #ffffff !important;
        border-color: #555555 !important;
      }

      html[data-raawi-contrast-mode="true"] h1,
      html[data-raawi-contrast-mode="true"] h2,
      html[data-raawi-contrast-mode="true"] h3,
      html[data-raawi-contrast-mode="true"] h4,
      html[data-raawi-contrast-mode="true"] h5,
      html[data-raawi-contrast-mode="true"] h6 {
        color: #ffffff !important;
      }

      html[data-raawi-contrast-mode="true"] p,
      html[data-raawi-contrast-mode="true"] span:not(raawi-accessibility-widget *):not(.raawi-theme *),
      html[data-raawi-contrast-mode="true"] li {
        color: #f0f0f0 !important;
      }

      html[data-raawi-contrast-mode="true"] a:not(raawi-accessibility-widget *) {
        color: #ffff00 !important;
        text-decoration: underline !important;
      }

      html[data-raawi-contrast-mode="true"] a:not(raawi-accessibility-widget *):hover,
      html[data-raawi-contrast-mode="true"] a:not(raawi-accessibility-widget *):focus {
        color: #00ffff !important;
      }

      html[data-raawi-contrast-mode="true"] input:not(raawi-accessibility-widget *),
      html[data-raawi-contrast-mode="true"] select:not(raawi-accessibility-widget *),
      html[data-raawi-contrast-mode="true"] textarea:not(raawi-accessibility-widget *) {
        background-color: #111111 !important;
        color: #ffffff !important;
        border: 2px solid #ffffff !important;
      }

      html[data-raawi-contrast-mode="true"] button:not(raawi-accessibility-widget *),
      html[data-raawi-contrast-mode="true"] .button:not(raawi-accessibility-widget *) {
        background-color: #222222 !important;
        color: #ffffff !important;
        border: 2px solid #ffff00 !important;
      }

      html[data-raawi-contrast-mode="true"] :focus-visible:not(raawi-accessibility-widget *) {
        outline: 3px solid #ffff00 !important;
        outline-offset: 3px !important;
      }

      /* 4. Stop Animations & Reduced Motion */
      html[data-raawi-stop-animations="true"] *,
      html[data-raawi-stop-animations="true"] *::before,
      html[data-raawi-stop-animations="true"] *::after {
        animation-duration: 0.001ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001ms !important;
        scroll-behavior: auto !important;
      }

      /* 5. High-Visibility Cursors */
      html[data-raawi-cursor="dark"] *,
      html[data-raawi-cursor="dark"] *::before,
      html[data-raawi-cursor="dark"] *::after {
        cursor: url("data:image/svg+xml,${darkCursorSvg}") 4 4, auto !important;
      }

      html[data-raawi-cursor="light"] *,
      html[data-raawi-cursor="light"] *::before,
      html[data-raawi-cursor="light"] *::after {
        cursor: url("data:image/svg+xml,${lightCursorSvg}") 4 4, auto !important;
      }

      /* 6. Hide Images */
      html[data-raawi-hide-images="true"] img:not(raawi-accessibility-widget *),
      html[data-raawi-hide-images="true"] svg:not(raawi-accessibility-widget *):not(.raawi-icon),
      html[data-raawi-hide-images="true"] picture:not(raawi-accessibility-widget *),
      html[data-raawi-hide-images="true"] video:not(raawi-accessibility-widget *) {
        opacity: 0 !important;
        visibility: hidden !important;
      }

      /* 7. Ensure Widget Host & Internal Elements are 100% Protected */
      raawi-accessibility-widget {
        font-size: 14px !important;
        line-height: normal !important;
        color: initial !important;
      }
    `;
  }

  /**
   * Cleanly restores original host-page state
   */
  public reset(): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    root.style.removeProperty('--raawi-text-size');
    root.style.removeProperty('--raawi-line-spacing');
    root.removeAttribute('data-raawi-text-size');
    root.removeAttribute('data-raawi-line-spacing');
    root.removeAttribute('data-raawi-contrast-mode');
    root.removeAttribute('data-raawi-stop-animations');
    root.removeAttribute('data-raawi-cursor');
    root.removeAttribute('data-raawi-hide-images');

    if (this.readingRuler) {
      this.readingRuler.style.display = 'none';
    }
    if (this.readingMaskTop) {
      this.readingMaskTop.style.display = 'none';
    }
    if (this.readingMaskBottom) {
      this.readingMaskBottom.style.display = 'none';
    }

    this.syncTrackingListeners(false);
  }

  /**
   * Widget teardown: cleanly cleans up listeners, styles, and DOM elements
   */
  public destroy(): void {
    this.reset();

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    if (this.styleElement && this.styleElement.parentNode) {
      this.styleElement.parentNode.removeChild(this.styleElement);
      this.styleElement = null;
    }

    if (this.readingRuler && this.readingRuler.parentNode) {
      this.readingRuler.parentNode.removeChild(this.readingRuler);
      this.readingRuler = null;
    }

    if (this.readingMaskTop && this.readingMaskTop.parentNode) {
      this.readingMaskTop.parentNode.removeChild(this.readingMaskTop);
      this.readingMaskTop = null;
    }

    if (this.readingMaskBottom && this.readingMaskBottom.parentNode) {
      this.readingMaskBottom.parentNode.removeChild(this.readingMaskBottom);
      this.readingMaskBottom = null;
    }
  }

  public getReadingRuler(): HTMLElement | null {
    return this.readingRuler;
  }

  public getReadingMaskTop(): HTMLElement | null {
    return this.readingMaskTop;
  }

  public getReadingMaskBottom(): HTMLElement | null {
    return this.readingMaskBottom;
  }
}
