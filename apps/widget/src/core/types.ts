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

export interface LabelOverride {
  selector: string;
  label: string;
  confidence: 'high' | 'medium' | 'low';
  source?: string;
  safetyNote?: string;
}

export interface ImageDescription {
  selector: string;
  alt: string;
  confidence: 'high' | 'medium' | 'low';
  source?: string;
  safetyNote?: string;
}

export interface ActionIntent {
  selector: string;
  intent: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  source?: string;
}

export interface LandmarkItem {
  role: string;
  label?: string;
  selector?: string;
}

export interface GuidanceData {
  summary?: string;
  landmarks?: LandmarkItem[];
  formSteps?: Array<{ step: number; title: string; fields?: string[] }>;
  keyActions?: Array<{ action: string; selector?: string }>;
}

export interface AssistiveMap {
  labelOverrides: Record<string, LabelOverride>;
  imageDescriptions: Record<string, ImageDescription>;
  actionIntents: Record<string, ActionIntent>;
  forms?: any[];
}

export interface ConfidenceSummary {
  labelOverrides: { high: number; medium: number; low: number };
  imageDescriptions: { high: number; medium: number; low: number };
  actionIntents: { high: number; medium: number; low: number };
}

export interface PagePackageResponse {
  siteId?: string | null;
  entityId?: string | null;
  entityCode?: string | null;
  propertyId?: string | null;
  propertyDomain?: string | null;
  url: string;
  matchedUrl?: string | null;
  matchConfidence?: 'high' | 'medium' | 'low' | string | null;
  generatedAt?: string | null;
  fingerprint?: any;
  assistiveMap?: AssistiveMap | null;
  confidenceSummary?: ConfidenceSummary | null;
  guidance?: GuidanceData | null;
  issuesSummary?: { total: number; critical: number; important: number };
  scanTimestamp?: string | null;
}

export type MapFetchStatus = 'idle' | 'loading' | 'ready' | 'not-scanned' | 'error' | 'mismatch';

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
  remediationEnabled: boolean; // Phase 5.4: opt-in DOM remediation
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
  remediationEnabled: false,
};
