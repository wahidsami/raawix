/**
 * Widget State Management with persistence and subscription
 */

import { DEFAULT_SETTINGS, type Locale, type Direction, type TabId, type WidgetSettings } from './types';

const STORAGE_KEY = 'raawi_accessibility_settings_v2';
const LOCALE_KEY = 'raawi_accessibility_locale';

export class StateManager {
  private settings: WidgetSettings;
  private locale: Locale;
  private isOpen: boolean = false;
  private activeTab: TabId = 'assist';
  private listeners: Array<() => void> = [];

  constructor(defaultLocale: Locale = 'ar') {
    this.locale = this.loadLocale(defaultLocale);
    this.settings = this.loadSettings();
  }

  public getSettings(): WidgetSettings {
    return { ...this.settings };
  }

  public getLocale(): Locale {
    return this.locale;
  }

  public getDirection(): Direction {
    return this.locale === 'ar' ? 'rtl' : 'ltr';
  }

  public getIsOpen(): boolean {
    return this.isOpen;
  }

  public getActiveTab(): TabId {
    return this.activeTab;
  }

  public setOpen(open: boolean): void {
    if (this.isOpen === open) return;
    this.isOpen = open;
    this.notify();
  }

  public toggleOpen(): void {
    this.setOpen(!this.isOpen);
  }

  public setActiveTab(tab: TabId): void {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.notify();
  }

  public setLocale(locale: Locale): void {
    if (this.locale === locale) return;
    this.locale = locale;
    this.saveLocale(locale);
    this.notify();
  }

  public updateSetting<K extends keyof WidgetSettings>(key: K, value: WidgetSettings[K]): void {
    this.settings[key] = value;
    // Clear active preset if user customizes settings
    if (key !== 'activePreset' && this.settings.activePreset !== 'none') {
      this.settings.activePreset = 'none';
    }
    this.saveSettings();
    this.notify();
  }

  public applyPreset(preset: WidgetSettings['activePreset']): void {
    if (preset === 'none') {
      this.resetSettings();
      return;
    }

    if (preset === 'blind') {
      this.settings = {
        ...DEFAULT_SETTINGS,
        activePreset: 'blind',
      };
    } else if (preset === 'low-vision') {
      this.settings = {
        ...DEFAULT_SETTINGS,
        activePreset: 'low-vision',
        textSize: 1.3,
        contrastMode: true,
        bigCursor: 'dark',
      };
    } else if (preset === 'dyslexia') {
      this.settings = {
        ...DEFAULT_SETTINGS,
        activePreset: 'dyslexia',
        lineSpacing: 1.4,
        readingGuide: true,
        stopAnimations: true,
      };
    }

    this.saveSettings();
    this.notify();
  }

  public resetSettings(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveSettings();
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('[RaawiX Widget] State listener error:', err);
      }
    }
  }

  private loadSettings(): WidgetSettings {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            const settings: WidgetSettings = { ...DEFAULT_SETTINGS, ...parsed };
            if (!['thin', 'medium', 'thick'].includes(settings.readingGuideThickness)) {
              settings.readingGuideThickness = 'medium';
            }
            if (!['small', 'medium', 'large'].includes(settings.readingMaskWindowHeight)) {
              settings.readingMaskWindowHeight = 'medium';
            }
            if (typeof settings.textSize !== 'number' || isNaN(settings.textSize)) {
              settings.textSize = 1.0;
            }
            if (typeof settings.lineSpacing !== 'number' || isNaN(settings.lineSpacing)) {
              settings.lineSpacing = 1.0;
            }
            return settings;
          }
        }
      }
    } catch {
      // Fallback on security/quota errors
    }
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      }
    } catch {
      // Ignored
    }
  }

  private loadLocale(defaultLocale: Locale): Locale {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(LOCALE_KEY);
        if (saved === 'ar' || saved === 'en') {
          return saved;
        }
      }
    } catch {
      // Ignored
    }
    return defaultLocale;
  }

  private saveLocale(locale: Locale): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(LOCALE_KEY, locale);
      }
    } catch {
      // Ignored
    }
  }
}
