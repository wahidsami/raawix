// Shared types and utilities

/** Screenshot capture when Layer 2 is enabled. */
export type ScreenshotCaptureMode = 'none' | 'viewport' | 'full';

/** Per-scan toggles for pipeline stages (all default true if omitted). */
export interface ScanPipelineOptions {
  /** DOM/structure: barriers, HTML snapshot, a11y.json (feeds WCAG rules). */
  layer1?: boolean;
  /** Screenshot + vision AI analysis. */
  layer2?: boolean;
  /** Assistive map generation during the report phase (Layer 3). */
  layer3?: boolean;
  /** Keyboard interaction trace + detectors (“Analysis AI agent”). */
  analysisAgent?: boolean;
  /**
   * When layer2 is on: full-page screenshot (default), viewport-only, or no capture.
   * Resolver treats `none` as Layer 2 off (no screenshot, no vision).
   */
  screenshotMode?: ScreenshotCaptureMode;
  /**
   * Request-only hint: `fast` expands to DOM/rules-only (L1 on, L2/L3/agent off).
   * Not present on the resolved pipeline; explicit layer flags override if both sent (preset applied first).
   */
  scanPreset?: 'full' | 'fast';
}

/** Normalized pipeline after `resolveScanPipeline` (no scanPreset). */
export interface ResolvedScanPipeline {
  layer1: boolean;
  layer2: boolean;
  layer3: boolean;
  analysisAgent: boolean;
  screenshotMode: ScreenshotCaptureMode;
}

/** Report methodology selected for the scan. */
export type AuditMode = 'classic' | 'raawi-agent';

export interface ScanRequest {
  seedUrl?: string;
  maxPages?: number;
  maxDepth?: number;
  /** Distinguishes the current layered audit from the future Raawi agent methodology. */
  auditMode?: AuditMode;
  includePatterns?: string[];
  excludePatterns?: string[];
  // Authenticated scanning
  authProfileId?: string;
  seedUrls?: string[]; // Additional absolute URLs to seed (for SPA route seeding)
  sitemapUrl?: string; // Optional sitemap.xml URL to parse and seed
  // Two-phase workflow
  discoveryOnly?: boolean; // If true, only discover pages (no scanning)
  selectedUrls?: string[]; // URLs selected by user for scanning (after discovery)
  /** Optional: disable layers to speed up scans (e.g. rules-only without vision). */
  scanPipeline?: ScanPipelineOptions;
  // Legacy support
  url?: string;
  options?: ScanOptions;
}

export interface ScanOptions {
  rules?: string[];
  timeout?: number;
  depth?: number;
}

export interface ScanResult {
  scanId: string;
  seedUrl?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  error?: string;
  findings?: Finding[];
  summary?: ScanSummary;
  pages?: PageScanResult[];
  // Legacy support
  url?: string;
}

export interface PageFingerprint {
  title?: string;
  firstHeading?: string; // First H1 or H2 text
  mainTextHash?: string; // Hash of normalized main content (truncated)
}

export interface PageCaptureTimings {
  totalMs?: number;
  validationMs?: number;
  navigationMs?: number;
  stabilizationMs?: number;
  metadataMs?: number;
  accessibilityBarrierMs?: number;
  screenshotMs?: number;
  domCaptureMs?: number;
  linkExtractionMs?: number;
  a11ySnapshotMs?: number;
  visionMs?: number;
  agentMs?: number;
  metadataWriteMs?: number;
}

export interface ManualCheckpoint {
  kind: 'verification_code';
  pageNumber: number;
  pageUrl: string;
  message: string;
  source: 'analysis-agent';
  formPurpose?: 'login' | 'register' | 'contact' | 'search' | 'generic';
  checkpointHeading?: string | null;
  otpLikeFields?: number;
  hasResendCode?: boolean;
  hasForgotPassword?: boolean;
}

export type AuthScanCoverageStatus =
  | 'authenticated'
  | 'unauthenticated'
  | 'configured_but_failed'
  | 'profile_inactive'
  | 'unsupported_profile';

export interface AuthScanContext {
  timestamp: string;
  propertyId?: string;
  configured: boolean;
  attempted: boolean;
  authenticated: boolean;
  profileActive: boolean;
  method: 'none' | 'cookie' | 'scripted_login';
  status: AuthScanCoverageStatus;
  loginUrl?: string | null;
  successSignal?: string | null;
  postLoginSeedPathCount?: number;
  message: string;
}

export type ManualCheckpointHistoryEvent = 'paused' | 'resumed' | 'resume_failed';

export interface ManualCheckpointHistoryEntry {
  id: string;
  event: ManualCheckpointHistoryEvent;
  timestamp: string;
  pageNumber: number;
  pageUrl: string;
  message: string;
  source: 'analysis-agent';
  formPurpose?: 'login' | 'register' | 'contact' | 'search' | 'generic';
  checkpointHeading?: string | null;
  otpLikeFields?: number;
  hasResendCode?: boolean;
  hasForgotPassword?: boolean;
  verificationCodeLength?: number;
}

export interface PageScanResult {
  pageNumber: number;
  url: string;
  title?: string;
  finalUrl?: string;
  canonicalUrl?: string; // Normalized URL (strip hash, normalize trailing slash, lowercase host)
  pageFingerprint?: PageFingerprint;
  error?: string;
  screenshotPath?: string;
  htmlPath?: string;
  a11yPath?: string;
  semanticPath?: string;
  visionPath?: string;
  agentPath?: string;
  metadataPath?: string;
  timings?: PageCaptureTimings;
  manualCheckpoint?: ManualCheckpoint;
  status: 'success' | 'failed';
}

export interface Finding {
  id: string;
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  element?: string;
  selector?: string;
  line?: number;
  column?: number;
}

export interface ScanSummary {
  total: number;
  errors: number;
  warnings: number;
  info: number;
}

// Rule engine types
export interface EvidenceItem {
  type: 'element' | 'screenshot' | 'html' | 'text' | 'url' | 'style';
  value: string;
  selector?: string;
  description?: string;
  property?: string; // For style evidence
}

export type RuleStatus = 'pass' | 'fail' | 'needs_review' | 'na';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface RuleResult {
  ruleId: string;
  wcagId?: string;
  level?: 'A' | 'AA' | 'AAA';
  status: RuleStatus;
  confidence: ConfidenceLevel;
  evidence: EvidenceItem[];
  howToVerify: string;
  message?: string;
}

export interface PageArtifact {
  pageNumber: number;
  url: string;
  title?: string;
  finalUrl?: string;
  canonicalUrl?: string;
  pageFingerprint?: PageFingerprint;
  htmlPath?: string;
  screenshotPath?: string;
  a11yPath?: string;
  semanticPath?: string;
  visionPath?: string; // Path to vision.json
  agentPath?: string;
  metadataPath?: string;
  timings?: PageCaptureTimings;
  html?: string;
  a11y?: unknown;
  error?: string;
}

/**
 * Agent finding from interaction/automation layer (placeholder schema)
 */
export interface AgentFinding {
  kind: string;
  message?: string;
  confidence: 'high' | 'medium' | 'low';
  evidenceJson: Record<string, unknown>;
  howToVerify?: string;
  suggestedWcagIds?: string[];
}

/**
 * Vision finding from visual analysis of page
 */
export interface VisionFinding {
  id: string;
  pageNumber: number;
  url: string;
  kind: 'clickable_unlabeled' | 'icon_button_unlabeled' | 'text_contrast_risk' | 'looks_like_button_not_button' | 'focus_indicator_missing_visual';
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  detectedText?: string;
  confidence: 'high' | 'medium' | 'low';
  correlatedSelector?: string;
  evidence: EvidenceItem[];
  suggestedWcagIds: string[];
  evidenceJson?: Record<string, any>; // Raw provider outputs (e.g., Gemini API responses) for auditability
}

export interface ScanRun {
  scanId: string;
  seedUrl: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
  manualCheckpoint?: ManualCheckpoint;
  pages: PageArtifact[];
  results: PageRuleResults[];
  summary: ScanRunSummary;
}

export interface PageRuleResults {
  pageNumber: number;
  url: string;
  ruleResults: RuleResult[];
}

export interface ScanRunSummary {
  totalPages: number;
  totalRules: number;
  byLevel: {
    A: LevelSummary;
    AA: LevelSummary;
  };
  byStatus: {
    pass: number;
    fail: number;
    needs_review: number;
    na: number;
  };
}

export interface LevelSummary {
  pass: number;
  fail: number;
  needs_review: number;
  na: number;
  total: number;
}

export function generateScanId(): string {
  return `scan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Phase 4: Journey types (deterministic steps; no LLM, no conditionals, no loops).
 * Credentials must be referenced via env placeholders (e.g. ${env:VAR}). Execution in Phase 4.1.
 */
export type JourneyWhen = 'before_crawl' | 'after_crawl';

export type JourneyStep =
  | { action: 'goto'; url: string }
  | { action: 'click'; selector: string }
  | { action: 'press'; key: string }
  | { action: 'type'; selector: string; text: string }
  | { action: 'waitFor'; selector?: string; timeoutMs?: number }
  | { action: 'assertVisible'; selector: string }
  | { action: 'assertUrl'; pattern: string }
  | { action: 'saveStorageState' }
  | { action: 'runAgentCapture'; url?: string };

export interface Journey {
  id: string;
  propertyId: string;
  name: string;
  when: JourneyWhen;
  steps: JourneyStep[];
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}
