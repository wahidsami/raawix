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
import { CAIRO_FONT_FACE_CSS } from '../assets/fonts/cairo-data';

export class DisplayManager {
  public static readonly MANAGED_ATTRIBUTES = [
    'data-raawi-text-size',
    'data-raawi-line-spacing',
    'data-raawi-contrast-mode',
    'data-raawi-focus-highlight',
    'data-raawi-readable-font',
    'data-raawi-highlight-links',
    'data-raawi-stop-animations',
    'data-raawi-cursor',
    'data-raawi-hide-images',
  ] as const;

  public static readonly MANAGED_PROPERTIES = [
    '--raawi-text-size',
    '--raawi-line-spacing',
  ] as const;

  private state: StateManager;
  private shadow: ShadowRoot;
  private styleElement: HTMLStyleElement | null = null;
  private unsubscribe: (() => void) | null = null;

  // Ownership tracking: captures initial host baseline before widget modifies DOM
  private initialHostAttributes: Map<string, string | null> = new Map();
  private initialHostProperties: Map<string, string> = new Map();
  // Exact values applied by this widget instance
  private lastAppliedAttributes: Map<string, string> = new Map();
  private lastAppliedProperties: Map<string, string> = new Map();

  // Reading overlays (contained strictly within Shadow DOM)
  private readingRuler: HTMLElement | null = null;
  private readingMaskTop: HTMLElement | null = null;
  private readingMaskBottom: HTMLElement | null = null;

  // Event handlers & RAF tracking
  private isTrackingMouse: boolean = false;
  private rafId: number | null = null;
  private currentY: number = 200;
  private targetY: number = 200;

  // Tracked host modifications: video playback state preservation
  private pausedByWidgetVideos: Set<HTMLVideoElement> = new Set();
  private videoObserver: MutationObserver | null = null;

  constructor(state: StateManager, shadow: ShadowRoot) {
    this.state = state;
    this.shadow = shadow;

    // 1. Capture initial host baseline for managed attributes and properties
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      for (const attr of DisplayManager.MANAGED_ATTRIBUTES) {
        this.initialHostAttributes.set(attr, root.hasAttribute(attr) ? root.getAttribute(attr) : null);
      }
      for (const prop of DisplayManager.MANAGED_PROPERTIES) {
        this.initialHostProperties.set(prop, root.style.getPropertyValue(prop));
      }
    }

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
   * Sets a managed host attribute, tracking widget ownership.
   */
  private setManagedAttribute(attr: string, value: string): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    if (!this.initialHostAttributes.has(attr)) {
      this.initialHostAttributes.set(attr, root.hasAttribute(attr) ? root.getAttribute(attr) : null);
    }

    root.setAttribute(attr, value);
    this.lastAppliedAttributes.set(attr, value);
  }

  /**
   * Restores a managed host attribute according to the ownership-aware policy:
   * 1. If current value on root matches lastAppliedAttributes[attr], restore to initial baseline.
   * 2. If current value does NOT match lastAppliedAttributes[attr], an external actor modified it — preserve host change.
   */
  private restoreManagedAttribute(attr: string): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    if (!this.lastAppliedAttributes.has(attr)) {
      return;
    }

    const currentVal = root.getAttribute(attr);
    const lastApplied = this.lastAppliedAttributes.get(attr);

    if (currentVal === lastApplied) {
      const initialVal = this.initialHostAttributes.get(attr);
      if (initialVal !== null && initialVal !== undefined) {
        root.setAttribute(attr, initialVal);
      } else {
        root.removeAttribute(attr);
      }
    }
    this.lastAppliedAttributes.delete(attr);
  }

  /**
   * Sets a managed CSS custom property on root.style, tracking widget ownership.
   */
  private setManagedProperty(prop: string, value: string): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    if (!this.initialHostProperties.has(prop)) {
      this.initialHostProperties.set(prop, root.style.getPropertyValue(prop));
    }

    root.style.setProperty(prop, value);
    this.lastAppliedProperties.set(prop, value);
  }

  /**
   * Restores a managed CSS custom property on root.style according to ownership-aware policy.
   */
  private restoreManagedProperty(prop: string): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    if (!this.lastAppliedProperties.has(prop)) {
      return;
    }

    const currentVal = root.style.getPropertyValue(prop);
    const lastApplied = this.lastAppliedProperties.get(prop);

    if (currentVal === lastApplied) {
      const initialVal = this.initialHostProperties.get(prop);
      if (initialVal) {
        root.style.setProperty(prop, initialVal);
      } else {
        root.style.removeProperty(prop);
      }
    }
    this.lastAppliedProperties.delete(prop);
  }

  /**
   * Applies all active display preferences to the host page and Shadow DOM overlays
   */
  public applySettings(settings: WidgetSettings): void {
    // 1. Text scaling (proportional typography hierarchy preservation)
    if (settings.textSize !== 1.0) {
      this.setManagedProperty('--raawi-text-size', String(settings.textSize));
      this.setManagedAttribute('data-raawi-text-size', String(settings.textSize));
    } else {
      this.restoreManagedProperty('--raawi-text-size');
      this.restoreManagedAttribute('data-raawi-text-size');
    }

    // 2. Line spacing (content blocks only, preserving compact controls & tables)
    if (settings.lineSpacing !== 1.0) {
      this.setManagedProperty('--raawi-line-spacing', String(settings.lineSpacing));
      this.setManagedAttribute('data-raawi-line-spacing', String(settings.lineSpacing));
    } else {
      this.restoreManagedProperty('--raawi-line-spacing');
      this.restoreManagedAttribute('data-raawi-line-spacing');
    }

    // 3. Curated High-Contrast Dark Theme
    if (settings.contrastMode) {
      this.setManagedAttribute('data-raawi-contrast-mode', 'true');
    } else {
      this.restoreManagedAttribute('data-raawi-contrast-mode');
    }

    // 4. Standalone High-Visibility Focus Indicator
    if (settings.focusHighlight) {
      this.setManagedAttribute('data-raawi-focus-highlight', 'true');
    } else {
      this.restoreManagedAttribute('data-raawi-focus-highlight');
    }

    // 5. Readable Font Selection Override
    if (settings.readableFont) {
      this.setManagedAttribute('data-raawi-readable-font', 'true');
    } else {
      this.restoreManagedAttribute('data-raawi-readable-font');
    }

    // 6. Interactive Links & Control Highlighter
    if (settings.highlightLinks) {
      this.setManagedAttribute('data-raawi-highlight-links', 'true');
    } else {
      this.restoreManagedAttribute('data-raawi-highlight-links');
    }

    // 7. Stop Animations & Reduced Motion
    if (settings.stopAnimations) {
      this.setManagedAttribute('data-raawi-stop-animations', 'true');
      this.pauseHostMedia();
    } else {
      this.restoreManagedAttribute('data-raawi-stop-animations');
      this.resumeHostMedia();
    }

    // 8. High-Visibility Cursor
    if (settings.bigCursor !== 'off') {
      this.setManagedAttribute('data-raawi-cursor', settings.bigCursor);
    } else {
      this.restoreManagedAttribute('data-raawi-cursor');
    }

    // 9. Hide Images
    if (settings.hideImages) {
      this.setManagedAttribute('data-raawi-hide-images', 'true');
    } else {
      this.restoreManagedAttribute('data-raawi-hide-images');
    }

    // 10. Reading Ruler Overlay (Shadow DOM contained)
    this.syncReadingRuler(settings.readingGuide, settings.readingGuideThickness);

    // 11. Reading Mask Overlay (Shadow DOM contained)
    this.syncReadingMask(settings.readingMask, settings.readingMaskWindowHeight);

    // 12. Sync mouse/focus tracking if either reading guide or mask is active
    this.syncTrackingListeners(settings.readingGuide || settings.readingMask);
  }

  /**
   * Reading Guide Ruler lifecycle
   */
  private syncReadingRuler(
    active: boolean,
    thicknessKey: 'thin' | 'medium' | 'thick' = 'medium'
  ): void {
    if (active) {
      if (!this.readingRuler) {
        this.readingRuler = document.createElement('div');
        this.readingRuler.id = 'raawi-reading-ruler';
        this.readingRuler.className = 'raawi-reading-ruler';
        this.readingRuler.setAttribute('aria-hidden', 'true');
        this.readingRuler.setAttribute('data-testid', 'raawi-reading-ruler');
        this.shadow.appendChild(this.readingRuler);
      }
      this.updateRulerPosition(this.currentY, thicknessKey);
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
      this.updateRulerPosition(this.currentY, this.state.getSettings().readingGuideThickness);
    }

    if (this.readingMaskTop && this.readingMaskTop.style.display !== 'none') {
      this.updateMaskPosition(this.currentY, this.state.getSettings().readingMaskWindowHeight);
    }
  }

  private updateRulerPosition(
    y: number,
    thicknessKey: 'thin' | 'medium' | 'thick' = 'medium'
  ): void {
    if (!this.readingRuler) return;
    const rulerHeights: Record<'thin' | 'medium' | 'thick', number> = {
      thin: 3,
      medium: 6,
      thick: 12,
    };
    const rulerHeight = rulerHeights[thicknessKey] || 6;
    this.readingRuler.style.height = `${rulerHeight}px`;

    const isReducedMotion = Boolean(
      this.state.getSettings().reduceMotion ||
      this.state.getSettings().stopAnimations ||
      (typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    );
    this.readingRuler.style.transition = isReducedMotion ? 'none' : 'top 0.04s ease-out';

    const winHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    const top = Math.max(0, Math.min(y - rulerHeight / 2, winHeight - rulerHeight));
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
   * Pauses playing HTML5 videos safely, recording strictly which videos were playing
   * before activation so only those videos are resumed upon deactivation.
   */
  private pauseHostMedia(): void {
    if (typeof document === 'undefined') return;
    const videos = document.querySelectorAll('video');
    videos.forEach((video) => {
      // Record and pause only videos that were actively playing
      if (!video.paused && !video.ended) {
        this.pausedByWidgetVideos.add(video);
        try {
          video.pause();
        } catch {
          // Ignore autoplay restriction failures
        }
      }
    });

    // Observe dynamically inserted videos while stopAnimations is enabled
    const ObserverClass = typeof MutationObserver !== 'undefined' 
      ? MutationObserver 
      : (typeof window !== 'undefined' ? (window as any).MutationObserver : null);

    if (!this.videoObserver && ObserverClass && document.body) {
      const observer = new ObserverClass((mutations: MutationRecord[]) => {
        for (const mutation of mutations) {
          for (const node of Array.from(mutation.addedNodes)) {
            if (node instanceof HTMLElement) {
              const insertedVideos: HTMLVideoElement[] = [];
              if (node.tagName.toLowerCase() === 'video') {
                insertedVideos.push(node as HTMLVideoElement);
              }
              insertedVideos.push(...Array.from(node.querySelectorAll('video')));
              for (const v of insertedVideos) {
                if (!v.paused && !v.ended) {
                  this.pausedByWidgetVideos.add(v);
                  try {
                    v.pause();
                  } catch {}
                }
              }
            }
          }
        }
      });
      this.videoObserver = observer;
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  /**
   * Resumes only the videos that this widget paused, clearing tracking state
   * to prevent stale references or duplicate actions.
   */
  private resumeHostMedia(): void {
    if (this.videoObserver) {
      this.videoObserver.disconnect();
      this.videoObserver = null;
    }

    if (this.pausedByWidgetVideos.size === 0) return;

    this.pausedByWidgetVideos.forEach((video) => {
      // Resume only if video is still in DOM, still paused, and was paused by widget
      if (video.isConnected && video.paused) {
        try {
          const playPromise = video.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {});
          }
        } catch {
          // Ignore play rejection
        }
      }
    });

    this.pausedByWidgetVideos.clear();
  }

  /**
   * Injects the single, managed style element into document.head,
   * tagged as owned by this DisplayManager instance.
   */
  private ensureStyleElement(): void {
    if (typeof document === 'undefined') return;

    if (!this.styleElement) {
      const style = document.createElement('style');
      style.id = 'raawi-display-styles';
      style.setAttribute('data-raawi-owned', 'true');
      style.textContent = this.generateManagedStyles();
      document.head.appendChild(style);
      this.styleElement = style;
    }
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
      ${CAIRO_FONT_FACE_CSS}

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

      /* Enhanced Standalone Focus Visibility Indicator */
      html[data-raawi-focus-highlight="true"] :focus-visible:not(raawi-accessibility-widget *):not(.raawi-theme *) {
        outline: 3px solid #2563eb !important;
        outline-offset: 3px !important;
        box-shadow: 0 0 0 5px rgba(37, 99, 235, 0.35) !important;
      }

      html[data-raawi-contrast-mode="true"][data-raawi-focus-highlight="true"] :focus-visible:not(raawi-accessibility-widget *):not(.raawi-theme *) {
        outline: 4px solid #ffff00 !important;
        outline-offset: 4px !important;
        box-shadow: 0 0 0 6px #000000, 0 0 0 8px #00ffff !important;
      }

      /* Standalone Legible Typography Override (Phase 2B.1 Language-Aware Selection) */
      /* 1. Base readable font for Latin/default host content */
      html[data-raawi-readable-font="true"] body,
      html[data-raawi-readable-font="true"] p,
      html[data-raawi-readable-font="true"] h1,
      html[data-raawi-readable-font="true"] h2,
      html[data-raawi-readable-font="true"] h3,
      html[data-raawi-readable-font="true"] h4,
      html[data-raawi-readable-font="true"] h5,
      html[data-raawi-readable-font="true"] h6,
      html[data-raawi-readable-font="true"] li,
      html[data-raawi-readable-font="true"] dd,
      html[data-raawi-readable-font="true"] dt,
      html[data-raawi-readable-font="true"] blockquote,
      html[data-raawi-readable-font="true"] figcaption,
      html[data-raawi-readable-font="true"] span:not(raawi-accessibility-widget *):not(.raawi-theme *),
      html[data-raawi-readable-font="true"] a:not(raawi-accessibility-widget *):not(.raawi-theme *) {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
        letter-spacing: 0.015em;
      }

      /* 2. Arabic document root or RTL context: primary font is Cairo */
      html[data-raawi-readable-font="true"][lang^="ar"] body,
      html[data-raawi-readable-font="true"][lang^="ar"] p,
      html[data-raawi-readable-font="true"][lang^="ar"] h1,
      html[data-raawi-readable-font="true"][lang^="ar"] h2,
      html[data-raawi-readable-font="true"][lang^="ar"] h3,
      html[data-raawi-readable-font="true"][lang^="ar"] h4,
      html[data-raawi-readable-font="true"][lang^="ar"] h5,
      html[data-raawi-readable-font="true"][lang^="ar"] h6,
      html[data-raawi-readable-font="true"][lang^="ar"] li,
      html[data-raawi-readable-font="true"][lang^="ar"] dd,
      html[data-raawi-readable-font="true"][lang^="ar"] dt,
      html[data-raawi-readable-font="true"][lang^="ar"] blockquote,
      html[data-raawi-readable-font="true"][lang^="ar"] figcaption,
      html[data-raawi-readable-font="true"][lang^="ar"] span:not(raawi-accessibility-widget *):not(.raawi-theme *),
      html[data-raawi-readable-font="true"][lang^="ar"] a:not(raawi-accessibility-widget *):not(.raawi-theme *),
      html[data-raawi-readable-font="true"][dir="rtl"] body,
      html[data-raawi-readable-font="true"][dir="rtl"] p,
      html[data-raawi-readable-font="true"][dir="rtl"] h1,
      html[data-raawi-readable-font="true"][dir="rtl"] h2,
      html[data-raawi-readable-font="true"][dir="rtl"] h3,
      html[data-raawi-readable-font="true"][dir="rtl"] h4,
      html[data-raawi-readable-font="true"][dir="rtl"] h5,
      html[data-raawi-readable-font="true"][dir="rtl"] h6,
      html[data-raawi-readable-font="true"][dir="rtl"] li,
      html[data-raawi-readable-font="true"][dir="rtl"] dd,
      html[data-raawi-readable-font="true"][dir="rtl"] dt,
      html[data-raawi-readable-font="true"][dir="rtl"] blockquote,
      html[data-raawi-readable-font="true"][dir="rtl"] figcaption,
      html[data-raawi-readable-font="true"][dir="rtl"] span:not(raawi-accessibility-widget *):not(.raawi-theme *),
      html[data-raawi-readable-font="true"][dir="rtl"] a:not(raawi-accessibility-widget *):not(.raawi-theme *) {
        font-family: 'Cairo', 'Noto Naskh Arabic', 'Tahoma', Arial, sans-serif !important;
        letter-spacing: 0.015em;
      }

      /* 3. Explicit Arabic language sections or elements (including inside LTR/English pages) */
      html[data-raawi-readable-font="true"] [lang^="ar"]:not(raawi-accessibility-widget *):not(.raawi-theme *),
      html[data-raawi-readable-font="true"] [lang^="ar"] p,
      html[data-raawi-readable-font="true"] [lang^="ar"] h1,
      html[data-raawi-readable-font="true"] [lang^="ar"] h2,
      html[data-raawi-readable-font="true"] [lang^="ar"] h3,
      html[data-raawi-readable-font="true"] [lang^="ar"] h4,
      html[data-raawi-readable-font="true"] [lang^="ar"] h5,
      html[data-raawi-readable-font="true"] [lang^="ar"] h6,
      html[data-raawi-readable-font="true"] [lang^="ar"] li,
      html[data-raawi-readable-font="true"] [lang^="ar"] span:not(raawi-accessibility-widget *):not(.raawi-theme *),
      html[data-raawi-readable-font="true"] [lang^="ar"] a:not(raawi-accessibility-widget *):not(.raawi-theme *),
      html[data-raawi-readable-font="true"] :lang(ar):not(raawi-accessibility-widget *):not(.raawi-theme *),
      html[data-raawi-readable-font="true"] :lang(ar) p,
      html[data-raawi-readable-font="true"] :lang(ar) h1,
      html[data-raawi-readable-font="true"] :lang(ar) h2,
      html[data-raawi-readable-font="true"] :lang(ar) h3,
      html[data-raawi-readable-font="true"] :lang(ar) h4,
      html[data-raawi-readable-font="true"] :lang(ar) h5,
      html[data-raawi-readable-font="true"] :lang(ar) h6,
      html[data-raawi-readable-font="true"] :lang(ar) li,
      html[data-raawi-readable-font="true"] :lang(ar) span:not(raawi-accessibility-widget *):not(.raawi-theme *),
      html[data-raawi-readable-font="true"] :lang(ar) a:not(raawi-accessibility-widget *):not(.raawi-theme *) {
        font-family: 'Cairo', 'Noto Naskh Arabic', 'Tahoma', Arial, sans-serif !important;
        letter-spacing: 0.015em;
      }

      /* 4. Explicit English/Latin language sections or elements (including inside RTL/Arabic pages) */
      html[data-raawi-readable-font="true"] [lang^="en"]:not(raawi-accessibility-widget *):not(.raawi-theme *),
      html[data-raawi-readable-font="true"] [lang^="en"] p,
      html[data-raawi-readable-font="true"] [lang^="en"] h1,
      html[data-raawi-readable-font="true"] [lang^="en"] h2,
      html[data-raawi-readable-font="true"] [lang^="en"] h3,
      html[data-raawi-readable-font="true"] [lang^="en"] h4,
      html[data-raawi-readable-font="true"] [lang^="en"] h5,
      html[data-raawi-readable-font="true"] [lang^="en"] h6,
      html[data-raawi-readable-font="true"] [lang^="en"] li,
      html[data-raawi-readable-font="true"] [lang^="en"] span:not(raawi-accessibility-widget *):not(.raawi-theme *),
      html[data-raawi-readable-font="true"] [lang^="en"] a:not(raawi-accessibility-widget *):not(.raawi-theme *),
      html[data-raawi-readable-font="true"] :lang(en):not(raawi-accessibility-widget *):not(.raawi-theme *),
      html[data-raawi-readable-font="true"] :lang(en) p,
      html[data-raawi-readable-font="true"] :lang(en) h1,
      html[data-raawi-readable-font="true"] :lang(en) h2,
      html[data-raawi-readable-font="true"] :lang(en) h3,
      html[data-raawi-readable-font="true"] :lang(en) h4,
      html[data-raawi-readable-font="true"] :lang(en) h5,
      html[data-raawi-readable-font="true"] :lang(en) h6,
      html[data-raawi-readable-font="true"] :lang(en) li,
      html[data-raawi-readable-font="true"] :lang(en) span:not(raawi-accessibility-widget *):not(.raawi-theme *),
      html[data-raawi-readable-font="true"] :lang(en) a:not(raawi-accessibility-widget *):not(.raawi-theme *) {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
        letter-spacing: 0.015em;
      }

      /* Standalone Interactive Controls & Links Highlighter */
      html[data-raawi-highlight-links="true"] a[href]:not(raawi-accessibility-widget *):not(.raawi-theme *) {
        outline: 2px solid #2563eb !important;
        outline-offset: 2px !important;
        text-decoration: underline !important;
        text-decoration-thickness: 2px !important;
      }

      html[data-raawi-highlight-links="true"] button:not(raawi-accessibility-widget *):not(.raawi-theme *),
      html[data-raawi-highlight-links="true"] [role="button"]:not(raawi-accessibility-widget *):not(.raawi-theme *),
      html[data-raawi-highlight-links="true"] input[type="button"]:not(raawi-accessibility-widget *):not(.raawi-theme *),
      html[data-raawi-highlight-links="true"] input[type="submit"]:not(raawi-accessibility-widget *):not(.raawi-theme *),
      html[data-raawi-highlight-links="true"] input[type="reset"]:not(raawi-accessibility-widget *):not(.raawi-theme *) {
        outline: 2px dashed #7c3aed !important;
        outline-offset: 2px !important;
      }

      html[data-raawi-highlight-links="true"] input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="hidden"]):not(raawi-accessibility-widget *):not(.raawi-theme *),
      html[data-raawi-highlight-links="true"] select:not(raawi-accessibility-widget *):not(.raawi-theme *),
      html[data-raawi-highlight-links="true"] textarea:not(raawi-accessibility-widget *):not(.raawi-theme *) {
        outline: 2px dotted #059669 !important;
        outline-offset: 2px !important;
      }

      html[data-raawi-contrast-mode="true"][data-raawi-highlight-links="true"] a[href]:not(raawi-accessibility-widget *):not(.raawi-theme *) {
        outline: 2px solid #ffff00 !important;
        color: #ffff00 !important;
      }

      html[data-raawi-contrast-mode="true"][data-raawi-highlight-links="true"] button:not(raawi-accessibility-widget *):not(.raawi-theme *),
      html[data-raawi-contrast-mode="true"][data-raawi-highlight-links="true"] [role="button"]:not(raawi-accessibility-widget *):not(.raawi-theme *) {
        outline: 2px dashed #00ffff !important;
      }

      /* 5. Stop Animations & Reduced Motion */
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
   * Cleanly restores original host-page state according to ownership-aware policy
   */
  public reset(): void {
    // 1. Restore all managed attributes and properties
    for (const attr of DisplayManager.MANAGED_ATTRIBUTES) {
      this.restoreManagedAttribute(attr);
    }

    for (const prop of DisplayManager.MANAGED_PROPERTIES) {
      this.restoreManagedProperty(prop);
    }

    // 2. Resume only videos paused by this widget
    this.resumeHostMedia();

    // 3. Hide Shadow DOM reading overlays
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
   * Widget teardown: cleanly cleans up listeners, styles, overlays, and tracking collections
   */
  public destroy(): void {
    this.reset();

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    // Remove only the exact stylesheet element created and owned by this instance
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

    // Clear tracking collections
    this.initialHostAttributes.clear();
    this.initialHostProperties.clear();
    this.lastAppliedAttributes.clear();
    this.lastAppliedProperties.clear();
    this.pausedByWidgetVideos.clear();
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

  public getPausedVideosCount(): number {
    return this.pausedByWidgetVideos.size;
  }

  public isVideoTracked(video: HTMLVideoElement): boolean {
    return this.pausedByWidgetVideos.has(video);
  }

  public getManagedStyleElement(): HTMLStyleElement | null {
    return this.styleElement;
  }
}
