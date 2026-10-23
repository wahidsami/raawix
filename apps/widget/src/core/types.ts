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

export interface PageFingerprint {
  title?: string;
  firstHeading?: string; // First H1 or H2 text
  mainTextHash?: string; // SHA-256 hash of normalized main content (truncated)
}

export interface LandmarkItem {
  role?: string;
  type?: string;
  label?: string;
  selector: string;
  description?: string;
}

export interface FormFieldInfo {
  label?: string;
  type?: string;
  required?: boolean;
  selector?: string;
  description?: string;
}

export interface FormStepInfo {
  stepNumber?: number;
  step?: number;
  label?: string;
  title?: string;
  fields?: FormFieldInfo[] | string[];
  description?: string;
  purpose?: string;
}

export interface GuidanceData {
  summary?: string;
  landmarks?: LandmarkItem[];
  formSteps?: FormStepInfo[];
  keyActions?: Array<{ action?: string; label?: string; selector?: string; href?: string }>;
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
  fingerprint?: PageFingerprint | null;
  assistiveMap?: AssistiveMap | null;
  confidenceSummary?: ConfidenceSummary | null;
  guidance?: GuidanceData | null;
  issuesSummary?: { total: number; critical: number; important: number };
  scanTimestamp?: string | null;
}

export type MapFetchStatus = 'idle' | 'loading' | 'ready' | 'not-scanned' | 'error' | 'mismatch' | 'offline' | 'outdated' | 'invalid' | 'unknown';

export type MagnifierScale = 1.5 | 2.0 | 2.5 | 3.0;

export interface WidgetSettings {
  textSize: number; // 0.8 to 2.0 (1.0 default)
  lineSpacing: number; // 0.8 to 2.0 (1.0 default)
  contrastMode: boolean;
  focusHighlight: boolean; // Standalone high-visibility focus indicator
  readableFont: boolean; // Standalone legible typography override
  highlightLinks: boolean; // Standalone links and action controls highlighter
  stopAnimations: boolean;
  reduceMotion: boolean;
  bigCursor: 'off' | 'dark' | 'light';
  readingGuide: boolean;
  readingGuideThickness: 'thin' | 'medium' | 'thick';
  readingMask: boolean;
  readingMaskWindowHeight: 'small' | 'medium' | 'large';
  magnifierStrip: boolean; // Phase 2C: Standalone magnified reading strip
  magnifierScale: MagnifierScale; // 1.5 | 2.0 | 2.5 | 3.0 (2.0 default)
  hideImages: boolean;
  activePreset: 'none' | 'blind' | 'low-vision' | 'dyslexia';
  remediationEnabled: boolean; // Phase 5.4: opt-in DOM remediation
}

export const DEFAULT_SETTINGS: WidgetSettings = {
  textSize: 1.0,
  lineSpacing: 1.0,
  contrastMode: false,
  focusHighlight: false,
  readableFont: false,
  highlightLinks: false,
  stopAnimations: false,
  reduceMotion: false,
  bigCursor: 'off',
  readingGuide: false,
  readingGuideThickness: 'medium',
  readingMask: false,
  readingMaskWindowHeight: 'medium',
  magnifierStrip: false,
  magnifierScale: 2.0,
  hideImages: false,
  activePreset: 'none',
  remediationEnabled: false,
};

