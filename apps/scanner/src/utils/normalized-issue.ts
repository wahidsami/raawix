import type { AgentFinding, RuleResult, VisionFinding } from '@raawi-x/core';
import type { ReportCategory, TaxonomyMatch } from './report-taxonomy.js';
import { defaultTaxonomyMatch } from './report-taxonomy.js';

export type NormalizedIssueResult = 'pass' | 'fail' | 'needs_review' | 'not_applicable' | 'working';
export type NormalizedIssueSeverity = 'critical' | 'important' | 'minor' | 'info';
export type NormalizedIssueSource = 'dom' | 'vision' | 'raawi-agent' | 'assistive-map';

export interface NormalizedIssue {
  issueCode: string;
  serviceName: string;
  issueTitle: string;
  result: NormalizedIssueResult;
  severity: NormalizedIssueSeverity;
  category: ReportCategory;
  subcategory: string;
  pageUrl: string;
  source: NormalizedIssueSource;
  wcagId?: string;
  evidence?: string;
  selector?: string;
  howToVerify?: string;
}

const wcagTaxonomy: Record<string, TaxonomyMatch> = {
  '1.1.1': { category: 'Images', subcategory: 'Missing alt text' },
  '1.3.1': { category: 'Structure & Semantics', subcategory: 'Improper HTML structure' },
  '1.4.3': { category: 'Color & Contrast', subcategory: 'Low text contrast' },
  '1.4.10': { category: 'Touch & Mobile', subcategory: 'No orientation support' },
  '2.1.1': { category: 'Keyboard & Navigation', subcategory: 'Not accessible via keyboard' },
  '2.1.2': { category: 'Keyboard & Navigation', subcategory: 'Keyboard traps' },
  '2.2.1': { category: 'Timing & Interaction', subcategory: 'Time limits without warning' },
  '2.2.2': { category: 'Timing & Interaction', subcategory: 'Unstoppable animations' },
  '2.4.1': { category: 'Keyboard & Navigation', subcategory: 'Missing skip links' },
  '2.4.2': { category: 'Content', subcategory: 'Missing page titles' },
  '2.4.3': { category: 'Keyboard & Navigation', subcategory: 'Incorrect tab order' },
  '2.4.4': { category: 'Content', subcategory: 'Poor readability (complex language)' },
  '2.4.7': { category: 'Keyboard & Navigation', subcategory: 'Missing focus indicator' },
  '3.1.1': { category: 'Content', subcategory: 'Incorrect language declaration' },
  '3.3.1': { category: 'Forms & Inputs', subcategory: 'Missing error messages' },
  '3.3.2': { category: 'Forms & Inputs', subcategory: 'No input instructions' },
  '4.1.1': { category: 'Structure & Semantics', subcategory: 'Duplicate IDs' },
  '4.1.2': { category: 'Forms & Inputs', subcategory: 'Missing labels' },
};

const agentKindTaxonomy: Record<string, TaxonomyMatch> = {
  keyboard_trap: { category: 'Keyboard & Navigation', subcategory: 'Keyboard traps' },
  focus_lost: { category: 'Keyboard & Navigation', subcategory: 'Incorrect tab order' },
  missing_focus_indicator: { category: 'Keyboard & Navigation', subcategory: 'Missing focus indicator' },
  inaccessible_action: { category: 'Keyboard & Navigation', subcategory: 'Not accessible via keyboard' },
  form_blocked: { category: 'Forms & Inputs', subcategory: 'No input instructions' },
  unclear_error_recovery: { category: 'Forms & Inputs', subcategory: 'Errors not explained' },
};

const visionKindTaxonomy: Record<string, TaxonomyMatch> = {
  clickable_unlabeled: { category: 'Images', subcategory: 'Icons without labels' },
  icon_button_unlabeled: { category: 'Images', subcategory: 'Icons without labels' },
  text_contrast_risk: { category: 'Color & Contrast', subcategory: 'Low text contrast' },
  looks_like_button_not_button: { category: 'Structure & Semantics', subcategory: 'Inaccessible custom components' },
  focus_indicator_missing_visual: { category: 'Keyboard & Navigation', subcategory: 'Missing focus indicator' },
};

export function mapWcagIdToTaxonomy(wcagId?: string): TaxonomyMatch {
  if (!wcagId) return defaultTaxonomyMatch;
  return wcagTaxonomy[wcagId] || defaultTaxonomyMatch;
}

export function mapAgentKindToTaxonomy(kind?: string): TaxonomyMatch {
  if (!kind) return defaultTaxonomyMatch;
  return agentKindTaxonomy[kind] || defaultTaxonomyMatch;
}

export function mapVisionKindToTaxonomy(kind?: string): TaxonomyMatch {
  if (!kind) return defaultTaxonomyMatch;
  return visionKindTaxonomy[kind] || defaultTaxonomyMatch;
}

export function createIssueCode(source: NormalizedIssueSource, pageNumber: number, sequence: number): string {
  const prefix = source === 'raawi-agent' ? 'RA' : source === 'assistive-map' ? 'AM' : source === 'vision' ? 'VI' : 'WC';
  return `${prefix}-${String(pageNumber).padStart(3, '0')}-${String(sequence).padStart(3, '0')}`;
}

export function normalizeRuleFinding(
  finding: RuleResult,
  pageUrl: string,
  pageNumber: number,
  sequence: number,
  serviceName = 'Classic audit'
): NormalizedIssue {
  const taxonomy = mapWcagIdToTaxonomy(finding.wcagId);
  const result = finding.status === 'na' ? 'not_applicable' : finding.status;
  return {
    issueCode: createIssueCode('dom', pageNumber, sequence),
    serviceName,
    issueTitle: finding.message || finding.howToVerify || finding.ruleId,
    result,
    severity: finding.status === 'fail' ? 'important' : finding.status === 'needs_review' ? 'minor' : 'info',
    category: taxonomy.category,
    subcategory: taxonomy.subcategory,
    pageUrl,
    source: 'dom',
    wcagId: finding.wcagId,
    evidence: finding.evidence?.map((item) => item.description || item.value).filter(Boolean).join(' | '),
    howToVerify: finding.howToVerify,
  };
}

export function normalizeAgentFinding(
  finding: AgentFinding,
  pageUrl: string,
  pageNumber: number,
  sequence: number,
  serviceName = 'Raawi agent'
): NormalizedIssue {
  const taxonomy = mapAgentKindToTaxonomy(finding.kind);
  return {
    issueCode: createIssueCode('raawi-agent', pageNumber, sequence),
    serviceName,
    issueTitle: finding.message || finding.kind,
    result: 'fail',
    severity: finding.confidence === 'high' ? 'important' : 'minor',
    category: taxonomy.category,
    subcategory: taxonomy.subcategory,
    pageUrl,
    source: 'raawi-agent',
    wcagId: finding.suggestedWcagIds?.[0],
    evidence: JSON.stringify(finding.evidenceJson || {}),
    howToVerify: finding.howToVerify,
  };
}

export function normalizeVisionFinding(
  finding: VisionFinding,
  pageNumber: number,
  sequence: number,
  serviceName = 'Classic audit'
): NormalizedIssue {
  const taxonomy = mapVisionKindToTaxonomy(finding.kind);
  return {
    issueCode: createIssueCode('vision', pageNumber, sequence),
    serviceName,
    issueTitle: finding.detectedText || finding.kind,
    result: 'needs_review',
    severity: finding.confidence === 'high' ? 'important' : 'minor',
    category: taxonomy.category,
    subcategory: taxonomy.subcategory,
    pageUrl: finding.url,
    source: 'vision',
    wcagId: finding.suggestedWcagIds?.[0],
    evidence: finding.detectedText,
  };
}
