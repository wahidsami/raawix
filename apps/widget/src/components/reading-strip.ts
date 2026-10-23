/**
 * Standalone Magnified Reading Strip for Raawi X Widget (Phase 2C)
 * 
 * Provides an accessible, docked reading mirror inside Shadow DOM:
 * - Visual-only mirror: marked aria-hidden="true" to prevent duplicating text in accessibility tree
 * - Accessible toolbar: interactive magnification scale buttons (150%, 200%, 250%, 300%) & immediate close button
 * - Predictable context tracking: prioritizes active text selections and keyboard focus over mouse hover
 * - Keyboard priority guard: suppresses ambient mouse hover updates while user navigates with keyboard
 * - Form privacy: strictly suppresses input values, password fields, hidden fields, and file contents
 * - Language-aware typography: bundled Cairo font for Arabic; Latin font stack for English
 * - Complete teardown: removes all listeners, RAFs, and DOM nodes on disable, reset, or destroy
 */

import type { StateManager } from '../core/state';
import type { I18nManager } from '../core/i18n';
import type { MagnifierScale, WidgetSettings } from '../core/types';

export interface ExtractedContent {
  text: string;
  source: 'selection' | 'focus' | 'hover' | 'control' | 'protected' | 'fallback';
  isArabic: boolean;
}

export class ReadingStripComponent {
  private state: StateManager;
  private i18n: I18nManager;
  private shadow: ShadowRoot;

  private stripElement: HTMLElement | null = null;
  private mirrorTextElement: HTMLElement | null = null;
  private currentContent: ExtractedContent;
  private currentScale: MagnifierScale = 2.0;
  private dockPosition: 'bottom' | 'top' = 'bottom';

  // Tracking state & guards
  private lastKeyboardTime: number = 0;
  private pointerDebounceTimer: any = null;
  private isDestroyed: boolean = false;
  private unsubscribeState: (() => void) | null = null;
  private unsubscribeI18n: (() => void) | null = null;

  // Bound event listeners
  private boundSelectionChange: () => void;
  private boundFocusIn: (e: FocusEvent) => void;
  private boundPointerOver: (e: PointerEvent | MouseEvent) => void;
  private boundKeyDown: (e: KeyboardEvent) => void;

  constructor(state: StateManager, i18n: I18nManager, shadow: ShadowRoot) {
    this.state = state;
    this.i18n = i18n;
    this.shadow = shadow;

    this.currentScale = this.state.getSettings().magnifierScale || 2.0;
    this.currentContent = {
      text: '',
      source: 'fallback',
      isArabic: this.state.getLocale() === 'ar',
    };

    // Bind event handlers
    this.boundSelectionChange = this.handleSelectionChange.bind(this);
    this.boundFocusIn = this.handleFocusIn.bind(this);
    this.boundPointerOver = this.handlePointerOver.bind(this);
    this.boundKeyDown = this.handleKeyDown.bind(this);

    // Subscribe to state and i18n changes
    this.unsubscribeState = this.state.subscribe(() => {
      this.syncState(this.state.getSettings());
    });

    this.unsubscribeI18n = this.i18n.subscribe(() => {
      this.render();
    });

    // Initialize state
    this.syncState(this.state.getSettings());
  }

  /**
   * Synchronizes strip visibility and magnification scale with widget settings
   */
  public syncState(settings: WidgetSettings): void {
    if (this.isDestroyed) return;

    if (settings.magnifierScale && [1.5, 2.0, 2.5, 3.0].includes(settings.magnifierScale)) {
      this.currentScale = settings.magnifierScale;
    }

    if (settings.magnifierStrip) {
      this.mount();
      this.bindTrackingListeners();
      this.render();
    } else {
      this.unmount();
      this.unbindTrackingListeners();
    }
  }

  /**
   * Mounts the docked reading strip element inside the Shadow DOM
   */
  private mount(): void {
    if (this.stripElement || typeof document === 'undefined') return;

    this.stripElement = document.createElement('div');
    this.stripElement.className = 'raawi-reading-strip';
    this.stripElement.id = 'raawi-reading-strip';
    this.stripElement.setAttribute('data-testid', 'raawi-reading-strip');
    this.stripElement.setAttribute('role', 'region');
    this.stripElement.setAttribute('aria-label', this.i18n.t().magnifierStrip);

    this.shadow.appendChild(this.stripElement);
  }

  /**
   * Removes the reading strip element from the Shadow DOM
   */
  private unmount(): void {
    if (this.stripElement) {
      if (this.stripElement.parentNode) {
        this.stripElement.parentNode.removeChild(this.stripElement);
      }
      this.stripElement = null;
      this.mirrorTextElement = null;
    }
  }

  /**
   * Renders the strip UI: toolbar with accessible controls + aria-hidden mirror display
   */
  private render(): void {
    if (!this.stripElement) return;

    const t = this.i18n.t();
    const isArabic = this.currentContent.text ? this.currentContent.isArabic : this.state.getLocale() === 'ar';
    const direction = isArabic ? 'rtl' : 'ltr';
    const scale = this.currentScale;
    const settings = this.state.getSettings();

    // High contrast styling class
    const highContrastClass = settings.contrastMode ? 'raawi-strip-contrast' : '';
    // Reduced motion class
    const reducedMotionClass = settings.reduceMotion || settings.stopAnimations ? 'raawi-strip-reduced-motion' : '';
    // Dock position class
    const dockClass = this.dockPosition === 'top' ? 'raawi-strip-dock-top' : '';

    this.stripElement.className = `raawi-reading-strip ${highContrastClass} ${reducedMotionClass} ${dockClass}`.trim();
    this.stripElement.setAttribute('dir', this.state.getDirection());
    this.stripElement.setAttribute('aria-label', t.magnifierStrip);

    const dockLabel = this.dockPosition === 'bottom' ? t.dockTop : t.dockBottom;

    this.stripElement.innerHTML = `
      <div class="raawi-strip-toolbar">
        <div class="raawi-strip-brand">
          <svg class="raawi-strip-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="9" cy="9" r="6"/>
            <path d="m13.5 13.5 4.5 4.5"/>
          </svg>
          <span class="raawi-strip-title">${t.magnifierStrip}</span>
          <span class="raawi-strip-badge" data-testid="raawi-strip-badge">${Math.round(scale * 100)}%</span>
        </div>
        <div class="raawi-strip-controls">
          <div class="raawi-strip-scale-group" role="group" aria-label="${t.magnifierScale}">
            <button type="button" class="raawi-strip-scale-btn ${scale === 1.5 ? 'active' : ''}" data-scale="1.5" aria-pressed="${scale === 1.5}" data-testid="raawi-scale-150">${t.magnifierZoom150}</button>
            <button type="button" class="raawi-strip-scale-btn ${scale === 2.0 ? 'active' : ''}" data-scale="2.0" aria-pressed="${scale === 2.0}" data-testid="raawi-scale-200">${t.magnifierZoom200}</button>
            <button type="button" class="raawi-strip-scale-btn ${scale === 2.5 ? 'active' : ''}" data-scale="2.5" aria-pressed="${scale === 2.5}" data-testid="raawi-scale-250">${t.magnifierZoom250}</button>
            <button type="button" class="raawi-strip-scale-btn ${scale === 3.0 ? 'active' : ''}" data-scale="3.0" aria-pressed="${scale === 3.0}" data-testid="raawi-scale-300">${t.magnifierZoom300}</button>
          </div>
          <button type="button" class="raawi-strip-dock-btn" id="raawi-strip-dock-toggle" data-testid="raawi-strip-dock-btn" aria-label="${dockLabel}" title="${dockLabel}">
            ${this.dockPosition === 'bottom'
              ? '<svg class="raawi-strip-action-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 12V4M4 7l4-4 4 4"/></svg>'
              : '<svg class="raawi-strip-action-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 4v8M4 9l4 4 4-4"/></svg>'
            }
          </button>
          <button type="button" class="raawi-strip-close-btn" id="raawi-strip-close" data-testid="raawi-strip-close" aria-label="${t.closeReadingStrip}" title="${t.closeReadingStrip}">
            <svg class="raawi-strip-action-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>
          </button>
        </div>
      </div>
      <div class="raawi-strip-mirror" id="raawi-strip-mirror" data-testid="raawi-strip-mirror" aria-hidden="true">
        <div class="raawi-strip-text raawi-scale-${Math.round(scale * 100)} ${isArabic ? 'raawi-font-cairo' : 'raawi-font-latin'}" id="raawi-strip-text" data-testid="raawi-strip-text" dir="${direction}"></div>
      </div>
    `;

    this.mirrorTextElement = this.stripElement.querySelector('#raawi-strip-text');
    this.updateMirrorTextDisplay();
    this.bindToolbarEvents();
  }

  /**
   * Safely updates the text content of the mirror element without innerHTML injection
   */
  private updateMirrorTextDisplay(): void {
    if (!this.mirrorTextElement) return;

    const t = this.i18n.t();
    const hasText = Boolean(this.currentContent.text && this.currentContent.text.trim());
    const isArabic = hasText ? this.currentContent.isArabic : this.state.getLocale() === 'ar';

    this.mirrorTextElement.setAttribute('dir', isArabic ? 'rtl' : 'ltr');
    this.mirrorTextElement.className = `raawi-strip-text raawi-scale-${Math.round(this.currentScale * 100)} ${isArabic ? 'raawi-font-cairo' : 'raawi-font-latin'} ${!hasText ? 'fallback' : ''}`.trim();

    if (hasText) {
      this.mirrorTextElement.textContent = this.currentContent.text;
    } else {
      this.mirrorTextElement.textContent = t.magnifierFallback;
    }
  }

  /**
   * Binds toolbar button events inside the strip
   */
  private bindToolbarEvents(): void {
    if (!this.stripElement) return;

    // Scale buttons
    const scaleButtons = this.stripElement.querySelectorAll<HTMLButtonElement>('.raawi-strip-scale-btn');
    scaleButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const scaleVal = parseFloat(btn.getAttribute('data-scale') || '2.0') as MagnifierScale;
        if ([1.5, 2.0, 2.5, 3.0].includes(scaleVal)) {
          this.state.updateSetting('magnifierScale', scaleVal);
        }
      });
    });

    // Dock toggle button
    const dockBtn = this.stripElement.querySelector<HTMLButtonElement>('#raawi-strip-dock-toggle');
    if (dockBtn) {
      dockBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dockPosition = this.dockPosition === 'bottom' ? 'top' : 'bottom';
        this.render();
      });
    }

    // Close button
    const closeBtn = this.stripElement.querySelector<HTMLButtonElement>('#raawi-strip-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.state.updateSetting('magnifierStrip', false);
      });
    }
  }

  /**
   * Binds host document tracking listeners (selection, keyboard focus, pointer)
   */
  private bindTrackingListeners(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('selectionchange', this.boundSelectionChange, { passive: true });
    document.addEventListener('focusin', this.boundFocusIn, { passive: true });
    document.addEventListener('pointerover', this.boundPointerOver, { passive: true });
    document.addEventListener('keydown', this.boundKeyDown, { passive: true });
  }

  /**
   * Unbinds host document tracking listeners
   */
  private unbindTrackingListeners(): void {
    if (typeof document === 'undefined') return;

    document.removeEventListener('selectionchange', this.boundSelectionChange);
    document.removeEventListener('focusin', this.boundFocusIn);
    document.removeEventListener('pointerover', this.boundPointerOver);
    document.removeEventListener('keydown', this.boundKeyDown);

    if (this.pointerDebounceTimer) {
      clearTimeout(this.pointerDebounceTimer);
      this.pointerDebounceTimer = null;
    }
  }

  /**
   * Handles keyboard navigation events to prioritize keyboard focus over ambient hover
   */
  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Tab' || e.key.startsWith('Arrow')) {
      this.lastKeyboardTime = Date.now();
    }
  }

  /**
   * Handles active text selection on the page (highest priority source)
   */
  private handleSelectionChange(): void {
    if (this.isDestroyed || !this.stripElement) return;

    const selection = typeof window !== 'undefined' && window.getSelection ? window.getSelection() : null;
    const selectedText = selection?.toString()?.trim();

    if (selectedText) {
      this.currentContent = {
        text: selectedText,
        source: 'selection',
        isArabic: ReadingStripComponent.detectIsArabic(selectedText),
      };
      this.updateMirrorTextDisplay();
    } else if (this.currentContent.source === 'selection') {
      // Revert to fallback when selection is cleared
      this.currentContent = {
        text: '',
        source: 'fallback',
        isArabic: this.state.getLocale() === 'ar',
      };
      this.updateMirrorTextDisplay();
    }
  }

  /**
   * Handles keyboard focus transfer (`focusin`)
   */
  private handleFocusIn(e: FocusEvent): void {
    if (this.isDestroyed || !this.stripElement) return;

    this.lastKeyboardTime = Date.now();
    const target = e.target as HTMLElement | null;
    if (!target || this.isWidgetElement(target)) return;

    // Active selection maintains priority over focus
    if (this.hasActiveSelection()) return;

    const extracted = this.extractElementContent(target, 'focus');
    if (extracted) {
      this.currentContent = extracted;
      this.updateMirrorTextDisplay();
    }
  }

  /**
   * Handles pointer hover (`pointerover` / `mousemove`) with debounce and keyboard guard
   */
  private handlePointerOver(e: PointerEvent | MouseEvent): void {
    if (this.isDestroyed || !this.stripElement) return;

    // 1. Touch device protection: avoid hover-based triggers on touch
    if ('pointerType' in e && e.pointerType === 'touch') return;

    // 2. Keyboard guard: ignore ambient hover if keyboard was used recently (within 1200ms)
    if (Date.now() - this.lastKeyboardTime < 1200) return;

    // 3. Selection guard: never overwrite user's active selection with hover
    if (this.hasActiveSelection()) return;

    const target = e.target as HTMLElement | null;
    if (!target || this.isWidgetElement(target)) return;

    if (this.pointerDebounceTimer) {
      clearTimeout(this.pointerDebounceTimer);
    }

    this.pointerDebounceTimer = setTimeout(() => {
      if (this.isDestroyed || !this.stripElement) return;
      if (Date.now() - this.lastKeyboardTime < 1200) return;
      if (this.hasActiveSelection()) return;

      const extracted = this.extractElementContent(target, 'hover');
      if (extracted) {
        this.currentContent = extracted;
        this.updateMirrorTextDisplay();
      }
    }, 60);
  }

  /**
   * Safely extracts readable, non-sensitive content from a target element
   */
  public extractElementContent(
    target: HTMLElement,
    source: 'focus' | 'hover' = 'focus'
  ): ExtractedContent | null {
    // Exclude widget elements
    if (this.isWidgetElement(target)) return null;

    // Resolve small/inline elements to nearest meaningful semantic container
    const semanticContainer = target.closest(
      'button, [role="button"], a[href], p, h1, h2, h3, h4, h5, h6, li, label, legend, figcaption, blockquote, dt, dd, summary, input, select, textarea'
    ) as HTMLElement | null;

    const el = semanticContainer || target;
    const tagName = el.tagName.toLowerCase();

    // 1. Form Privacy Protection
    if (tagName === 'input' || tagName === 'select' || tagName === 'textarea') {
      const inputType = (el as HTMLInputElement).type?.toLowerCase() || '';

      // High-risk fields: password, hidden, file
      if (inputType === 'password' || inputType === 'hidden' || inputType === 'file') {
        const protectedText = `[${this.i18n.t().protectedContentHidden}]`;
        return {
          text: protectedText,
          source: 'protected',
          isArabic: this.state.getLocale() === 'ar',
        };
      }

      // Safe control descriptive info (accessible label, role, state) - NEVER raw input value
      const label = this.getAccessibleName(el);
      let desc = '';
      const isAr = this.state.getLocale() === 'ar';

      if (inputType === 'checkbox') {
        const isChecked = (el as HTMLInputElement).checked;
        desc = isAr
          ? `خانة اختيار: ${label || ''} (${isChecked ? 'محددة' : 'غير محددة'})`
          : `Checkbox: ${label || ''} (${isChecked ? 'Checked' : 'Unchecked'})`;
      } else if (inputType === 'radio') {
        const isChecked = (el as HTMLInputElement).checked;
        desc = isAr
          ? `زر اختيار بديل: ${label || ''} (${isChecked ? 'محدد' : 'غير محدد'})`
          : `Radio: ${label || ''} (${isChecked ? 'Selected' : 'Unselected'})`;
      } else if (tagName === 'select') {
        desc = isAr ? `قائمة منسدلة: ${label || ''}` : `Dropdown: ${label || ''}`;
      } else {
        const placeholder = (el as HTMLInputElement).placeholder || '';
        desc = isAr ? `حقل إدخال: ${label || placeholder}` : `Input field: ${label || placeholder}`;
      }

      desc = desc.trim();
      return {
        text: desc,
        source: 'control',
        isArabic: ReadingStripComponent.detectIsArabic(desc, el),
      };
    }

    // 2. Contenteditable protection: do not mirror user-entered text without explicit selection
    if (el.isContentEditable || el.getAttribute('contenteditable') === 'true' || (typeof el.closest === 'function' && el.closest('[contenteditable="true"]'))) {
      return null;
    }

    // 3. Buttons and Links: extract accessible label
    if (tagName === 'button' || el.getAttribute('role') === 'button' || (tagName === 'a' && el.hasAttribute('href'))) {
      const accessibleName = this.getAccessibleName(el);
      if (accessibleName) {
        return {
          text: accessibleName,
          source,
          isArabic: ReadingStripComponent.detectIsArabic(accessibleName, el),
        };
      }
    }

    // 4. Headings, Paragraphs, Lists, and General Text Content
    const text = (el.textContent || '').trim();
    if (text) {
      return {
        text,
        source,
        isArabic: ReadingStripComponent.detectIsArabic(text, el),
      };
    }

    return null;
  }

  /**
   * Extracts the accessible name of an element
   */
  private getAccessibleName(el: HTMLElement): string {
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

    const ariaLabelledBy = el.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const labelEl = document.getElementById(ariaLabelledBy);
      if (labelEl && labelEl.textContent && labelEl.textContent.trim()) {
        return labelEl.textContent.trim();
      }
    }

    const tagName = el.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'select' || tagName === 'textarea') {
      if (el.id) {
        const labelEl = document.querySelector(`label[for="${el.id}"]`);
        if (labelEl && labelEl.textContent && labelEl.textContent.trim()) {
          return labelEl.textContent.trim();
        }
      }
      const parentLabel = el.closest('label');
      if (parentLabel && parentLabel.textContent && parentLabel.textContent.trim()) {
        return parentLabel.textContent.trim();
      }
    }

    return (el.textContent || '').trim();
  }

  /**
   * Detects whether an element belongs to the widget or its Shadow DOM
   */
  private isWidgetElement(el: Node): boolean {
    if (!el) return false;
    if (el.nodeType === 1) {
      const elem = el as Element;
      if (elem.tagName && elem.tagName.toLowerCase() === 'raawi-accessibility-widget') return true;
      if (typeof elem.closest === 'function') {
        if (elem.closest('raawi-accessibility-widget')) return true;
        if (elem.closest('.raawi-theme')) return true;
        if (elem.closest('.raawi-reading-strip')) return true;
      }
    }
    return false;
  }

  /**
   * Checks whether the user has an active text selection on the page
   */
  private hasActiveSelection(): boolean {
    if (typeof window === 'undefined' || !window.getSelection) return false;
    const sel = window.getSelection();
    return Boolean(sel && sel.toString() && sel.toString().trim().length > 0);
  }

  /**
   * Determines whether text or an element should use Cairo/Arabic typography.
   * Strictly relies on explicit language attributes and Arabic Unicode script.
   * Direction (dir="rtl") alone NEVER establishes Arabic language.
   */
  public static detectIsArabic(text: string, element?: Element | null): boolean {
    // 1. Explicit element or ancestor lang attribute
    if (element && typeof element.closest === 'function') {
      const langEl = element.closest('[lang]');
      if (langEl) {
        const langVal = (langEl.getAttribute('lang') || '').toLowerCase();
        if (langVal.startsWith('ar')) return true;
        if (langVal.startsWith('en')) return false;
      }
    }

    // 2. Reliable Unicode Arabic script check
    // Arabic, Arabic Supplement, Arabic Extended-A/B, Presentation Forms
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    if (arabicRegex.test(text)) {
      return true;
    }

    // 3. Document-level explicit lang="ar" fallback (if text is not purely Latin)
    if (typeof document !== 'undefined' && document.documentElement) {
      const docLang = (document.documentElement.getAttribute('lang') || '').toLowerCase();
      if (docLang.startsWith('ar')) {
        const latinRegex = /[a-zA-Z]/;
        if (latinRegex.test(text) && !arabicRegex.test(text)) {
          return false;
        }
        return true;
      }
    }

    return false;
  }

  /**
   * Public getter for the current content (for test assertions)
   */
  public getCurrentContent(): ExtractedContent {
    return { ...this.currentContent };
  }

  /**
   * Public getter for the strip element (for test assertions)
   */
  public getElement(): HTMLElement | null {
    return this.stripElement;
  }

  /**
   * Public getter for the current dock position ('bottom' | 'top')
   */
  public getDockPosition(): 'bottom' | 'top' {
    return this.dockPosition;
  }

  /**
   * Public setter for the dock position ('bottom' | 'top')
   */
  public setDockPosition(pos: 'bottom' | 'top'): void {
    if (this.dockPosition !== pos) {
      this.dockPosition = pos;
      this.render();
    }
  }

  /**
   * Completely tears down the reading strip and cleans up all listeners and DOM nodes
   */
  public destroy(): void {
    this.isDestroyed = true;
    this.unbindTrackingListeners();

    if (this.unsubscribeState) {
      this.unsubscribeState();
      this.unsubscribeState = null;
    }
    if (this.unsubscribeI18n) {
      this.unsubscribeI18n();
      this.unsubscribeI18n = null;
    }

    this.unmount();
  }
}
