/**
 * Localized ARIA Live Announcer for Raawi X Widget
 * 
 * Provides polite, concise screen-reader announcements via an ARIA live region.
 * Completely separate from Web Speech TTS; never speaks automatically aloud.
 */

import type { I18nManager } from '../core/i18n';

export class LiveAnnouncerComponent {
  private element: HTMLElement;
  private i18n: I18nManager;
  private clearTimer: any = null;

  constructor(i18n: I18nManager) {
    this.i18n = i18n;

    this.element = document.createElement('div');
    this.element.id = 'raawi-live-announcer';
    this.element.className = 'raawi-sr-only';
    this.element.setAttribute('data-testid', 'raawi-live-announcer');
    this.element.setAttribute('role', 'status');
    this.element.setAttribute('aria-live', 'polite');
    this.element.setAttribute('aria-atomic', 'true');
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  /**
   * Announce a message to assistive technology
   * @param message Text to announce
   */
  public announce(message: string): void {
    if (!message || message.trim() === '') return;

    if (this.clearTimer) {
      clearTimeout(this.clearTimer);
    }

    // Briefly clear text before updating to ensure screen readers re-announce identical strings
    this.element.textContent = '';
    
    // Set text in next tick
    setTimeout(() => {
      this.element.textContent = message.trim();
    }, 50);

    // Auto-clear after 6 seconds to keep DOM tidy
    this.clearTimer = setTimeout(() => {
      this.element.textContent = '';
    }, 6000);
  }

  /**
   * Announce dialog open in active locale
   */
  public announceOpen(): void {
    const isAr = this.i18n.getLocale() === 'ar';
    this.announce(isAr ? 'تم فتح لوحة سهولة الاستخدام' : 'Accessibility options dialog opened');
  }

  /**
   * Announce dialog close in active locale
   */
  public announceClose(): void {
    const isAr = this.i18n.getLocale() === 'ar';
    this.announce(isAr ? 'تم إغلاق لوحة سهولة الاستخدام' : 'Accessibility options dialog closed');
  }

  /**
   * Announce language change
   */
  public announceLanguageChange(newLocale: 'ar' | 'en'): void {
    this.announce(
      newLocale === 'ar' ? 'تم التبديل إلى اللغة العربية' : 'Switched interface language to English'
    );
  }

  /**
   * Announce preset activation
   */
  public announcePreset(presetLabel: string): void {
    const isAr = this.i18n.getLocale() === 'ar';
    this.announce(
      isAr ? `تم تفعيل ملف الوصول: ${presetLabel}` : `Activated accessibility profile: ${presetLabel}`
    );
  }

  /**
   * Announce settings reset
   */
  public announceReset(): void {
    this.announce(this.i18n.t().resetAllConfirm);
  }
}
