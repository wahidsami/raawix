/**
 * Core type definitions for Raawi X Accessibility Widget
 */

export type Locale = 'ar' | 'en';
export type Direction = 'rtl' | 'ltr';
export type TabId = 'assist' | 'vision' | 'reading' | 'tools';

export interface WidgetContext {
  locale: Locale;
  direction: Direction;
  apiUrl: string;
  entityCode: string;
  scanId: string;
  voiceEnabled: boolean;
}

export interface WidgetSettings {
  textSize: number; // 0.8 to 2.0 (1.0 default)
  lineSpacing: number; // 0.8 to 2.0 (1.0 default)
  contrastMode: boolean;
  stopAnimations: boolean;
  reduceMotion: boolean;
  bigCursor: 'off' | 'dark' | 'light';
  readingGuide: boolean;
  readingMask: boolean;
  readingMaskWindowHeight: 'small' | 'medium' | 'large';
  hideImages: boolean;
  imageCaptions: boolean;
  magnifier: boolean;
  magnifierZoom: number;
  activePreset: 'none' | 'blind' | 'low-vision' | 'dyslexia';
}

export const DEFAULT_SETTINGS: WidgetSettings = {
  textSize: 1.0,
  lineSpacing: 1.0,
  contrastMode: false,
  stopAnimations: false,
  reduceMotion: false,
  bigCursor: 'off',
  readingGuide: false,
  readingMask: false,
  readingMaskWindowHeight: 'medium',
  hideImages: false,
  imageCaptions: false,
  magnifier: false,
  magnifierZoom: 2.0,
  activePreset: 'none',
};
