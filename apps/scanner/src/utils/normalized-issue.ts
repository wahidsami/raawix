import type { EvidenceItem } from '@raawi-x/core';
import type { ReportCategory, TaxonomyMatch } from './report-taxonomy.js';
import { defaultTaxonomyMatch, normalizeTaxonomyMatch } from './report-taxonomy.js';

export type NormalizedIssueResult = 'working' | 'not_working' | 'needs_review' | 'not_applicable';
export type NormalizedIssueSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type NormalizedIssueSource = 'dom' | 'vision' | 'raawi-agent' | 'assistive-map' | 'combined';

export interface NormalizedIssue {
  issueCode: string;
  serviceName: string;
  issueTitle: string;
  result: NormalizedIssueResult;
  severity: NormalizedIssueSeverity;
  category: ReportCategory;
  subcategory: string;
  pageUrl: string;
  pageNumber: number;
  source: NormalizedIssueSource;
  sourceLabel: string;
  wcagIds: string[];
  evidence: string;
  selector?: string;
  recommendation?: string;
  howToVerify?: string;
}

export interface NormalizableRuleFinding {
  id?: string;
  ruleId?: string;
  wcagId?: string | null;
  level?: string | null;
  status?: string | null;
  confidence?: string | null;
  message?: string | null;
  evidence?: unknown;
  evidenceJson?: unknown;
  howToVerify?: string | null;
}

export interface NormalizableAgentFinding {
  id?: string;
  kind?: string | null;
  message?: string | null;
  confidence?: string | number | null;
  evidence?: unknown;
  evidenceJson?: unknown;
  howToVerify?: string | null;
  suggestedWcagIds?: unknown;
  suggestedWcagIdsJson?: unknown;
  source?: string | null;
  category?: string | null;
  subcategory?: string | null;
}

export interface NormalizableVisionFinding {
  id?: string;
  kind?: string | null;
  detectedText?: string | null;
  confidence?: string | null;
  correlatedSelector?: string | null;
  evidence?: unknown;
  evidenceJson?: unknown;
  suggestedWcagIds?: unknown;
  suggestedWcagIdsJson?: unknown;
  url?: string | null;
}

const wcagTaxonomy: Record<string, TaxonomyMatch> = {
  '1.1.1': { category: 'Images', subcategory: 'Missing alt text' },
  '1.2.1': { category: 'Multimedia', subcategory: 'Missing transcripts' },
  '1.2.2': { category: 'Multimedia', subcategory: 'Missing captions' },
  '1.2.3': { category: 'Multimedia', subcategory: 'No audio descriptions' },
  '1.3.1': { category: 'Structure & Semantics', subcategory: 'Improper HTML structure' },
  '1.4.1': { category: 'Color & Contrast', subcategory: 'Reliance on color alone' },
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
  ambiguous_control: { category: 'Structure & Semantics', subcategory: 'Inaccessible custom components' },
  confusing_focus_order: { category: 'Keyboard & Navigation', subcategory: 'Incorrect tab order' },
  focus_lost: { category: 'Keyboard & Navigation', subcategory: 'Incorrect tab order' },
  form_blocked: { category: 'Forms & Inputs', subcategory: 'No input instructions' },
  inaccessible_action: { category: 'Keyboard & Navigation', subcategory: 'Not accessible via keyboard' },
  keyboard_trap: { category: 'Keyboard & Navigation', subcategory: 'Keyboard traps' },
  missing_focus_indicator: { category: 'Keyboard & Navigation', subcategory: 'Missing focus indicator' },
  modal_probe_failed: { category: 'Keyboard & Navigation', subcategory: 'Keyboard traps' },
  poor_label_quality: { category: 'Forms & Inputs', subcategory: 'Missing labels' },
  unclear_error_recovery: { category: 'Forms & Inputs', subcategory: 'Errors not explained' },
};

const visionKindTaxonomy: Record<string, TaxonomyMatch> = {
  clickable_unlabeled: { category: 'Images', subcategory: 'Icons without labels' },
  focus_indicator_missing_visual: { category: 'Keyboard & Navigation', subcategory: 'Missing focus indicator' },
  icon_button_unlabeled: { category: 'Images', subcategory: 'Icons without labels' },
  looks_like_button_not_button: { category: 'Structure & Semantics', subcategory: 'Inaccessible custom components' },
  text_contrast_risk: { category: 'Color & Contrast', subcategory: 'Low text contrast' },
};

export function mapWcagIdToTaxonomy(wcagId?: string | null): TaxonomyMatch {
  if (!wcagId) return defaultTaxonomyMatch;
  return wcagTaxonomy[wcagId] || defaultTaxonomyMatch;
}

export function mapAgentKindToTaxonomy(kind?: string | null): TaxonomyMatch {
  if (!kind) return defaultTaxonomyMatch;
  return agentKindTaxonomy[kind] || defaultTaxonomyMatch;
}

export function mapVisionKindToTaxonomy(kind?: string | null): TaxonomyMatch {
  if (!kind) return defaultTaxonomyMatch;
  return visionKindTaxonomy[kind] || defaultTaxonomyMatch;
}

export function createIssueCode(source: NormalizedIssueSource, pageNumber: number, sequence: number): string {
  const prefix =
    source === 'raawi-agent'
      ? 'RA'
      : source === 'assistive-map'
        ? 'AM'
        : source === 'vision'
          ? 'VI'
          : source === 'combined'
            ? 'CX'
            : 'WC';
  return `${prefix}-${String(pageNumber).padStart(3, '0')}-${String(sequence).padStart(3, '0')}`;
}

function parseJsonish(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function stringifyEvidence(raw: unknown): string {
  const parsed = parseJsonish(raw);
  if (!parsed) return '';

  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => {
        if (typeof item === 'string') return item;
        if (!item || typeof item !== 'object') return '';
        const evidence = item as Partial<EvidenceItem> & Record<string, unknown>;
        return evidence.description || evidence.value || evidence.selector || JSON.stringify(evidence);
      })
      .filter(Boolean)
      .join(' | ');
  }

  if (typeof parsed === 'object') {
    const objectValue = parsed as Record<string, unknown>;
    if (Array.isArray(objectValue.evidence)) return stringifyEvidence(objectValue.evidence);
    if (typeof objectValue.selector === 'string') return objectValue.selector;
    if (typeof objectValue.message === 'string') return objectValue.message;
    return JSON.stringify(objectValue);
  }

  return String(parsed);
}

function extractSelector(raw: unknown): string | undefined {
  const parsed = parseJsonish(raw);
  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      if (item && typeof item === 'object' && typeof (item as Record<string, unknown>).selector === 'string') {
        return (item as Record<string, string>).selector;
      }
    }
    return undefined;
  }
  if (parsed && typeof parsed === 'object') {
    const objectValue = parsed as Record<string, unknown>;
    if (typeof objectValue.selector === 'string') return objectValue.selector;
    if (Array.isArray(objectValue.evidence)) return extractSelector(objectValue.evidence);
  }
  return undefined;
}

function parseStringArray(raw: unknown): string[] {
  const parsed = parseJsonish(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function readObject(raw: unknown): Record<string, unknown> | null {
  const parsed = parseJsonish(raw);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : null;
}

function taxonomyFromAgentFinding(finding: NormalizableAgentFinding): TaxonomyMatch | null {
  const direct = normalizeTaxonomyMatch({
    category: finding.category as any,
    subcategory: finding.subcategory ?? undefined,
  });
  if (finding.category && direct.category === finding.category) {
    return direct;
  }

  const evidence = readObject(finding.evidence ?? finding.evidenceJson);
  const taxonomy = evidence?.taxonomy;
  if (taxonomy && typeof taxonomy === 'object') {
    const normalized = normalizeTaxonomyMatch(taxonomy as Partial<TaxonomyMatch>);
    if ((taxonomy as Partial<TaxonomyMatch>).category === normalized.category) {
      return normalized;
    }
  }

  return null;
}

function ruleResultFromStatus(status?: string | null): NormalizedIssueResult {
  if (status === 'pass') return 'working';
  if (status === 'fail') return 'not_working';
  if (status === 'needs_review') return 'needs_review';
  return 'not_applicable';
}

function severityFromRule(finding: NormalizableRuleFinding): NormalizedIssueSeverity {
  if (finding.status === 'pass' || finding.status === 'na') return 'info';
  if (finding.status === 'needs_review') return 'low';
  if (finding.level === 'A') return 'high';
  if (finding.level === 'AA') return 'medium';
  return finding.confidence === 'high' ? 'medium' : 'low';
}

function severityFromAgentConfidence(confidence: unknown): NormalizedIssueSeverity {
  if (typeof confidence === 'number') {
    if (confidence >= 0.85) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  }
  if (confidence === 'high') return 'high';
  if (confidence === 'medium') return 'medium';
  if (confidence === 'low') return 'low';
  return 'medium';
}

function severityFromVisionConfidence(confidence: unknown): NormalizedIssueSeverity {
  if (confidence === 'high') return 'high';
  if (confidence === 'medium') return 'medium';
  return 'low';
}

function titleFromRule(finding: NormalizableRuleFinding): string {
  return finding.message || finding.howToVerify || finding.ruleId || 'WCAG finding';
}

function titleFromAgent(finding: NormalizableAgentFinding): string {
  return finding.message || finding.kind || 'Raawi interaction finding';
}

function titleFromVision(finding: NormalizableVisionFinding): string {
  return finding.detectedText || finding.kind || 'Vision finding';
}

export function normalizeRuleFinding(
  finding: NormalizableRuleFinding,
  pageUrl: string,
  pageNumber: number,
  sequence: number,
  serviceName = 'Classic audit'
): NormalizedIssue {
  const taxonomy = normalizeTaxonomyMatch(mapWcagIdToTaxonomy(finding.wcagId));
  const evidenceSource = finding.evidence ?? finding.evidenceJson;
  return {
    issueCode: createIssueCode('dom', pageNumber, sequence),
    serviceName,
    issueTitle: titleFromRule(finding),
    result: ruleResultFromStatus(finding.status),
    severity: severityFromRule(finding),
    category: taxonomy.category,
    subcategory: taxonomy.subcategory,
    pageUrl,
    pageNumber,
    source: 'dom',
    sourceLabel: 'DOM/WCAG',
    wcagIds: finding.wcagId ? [finding.wcagId] : [],
    evidence: stringifyEvidence(evidenceSource),
    selector: extractSelector(evidenceSource),
    recommendation: finding.howToVerify ?? undefined,
    howToVerify: finding.howToVerify ?? undefined,
  };
}

export function normalizeAgentFinding(
  finding: NormalizableAgentFinding,
  pageUrl: string,
  pageNumber: number,
  sequence: number,
  serviceName = 'Raawi agent'
): NormalizedIssue {
  const taxonomy = normalizeTaxonomyMatch(taxonomyFromAgentFinding(finding) || mapAgentKindToTaxonomy(finding.kind));
  const evidenceSource = finding.evidence ?? finding.evidenceJson;
  const wcagIds = parseStringArray(finding.suggestedWcagIds ?? finding.suggestedWcagIdsJson);
  return {
    issueCode: createIssueCode('raawi-agent', pageNumber, sequence),
    serviceName,
    issueTitle: titleFromAgent(finding),
    result: 'not_working',
    severity: severityFromAgentConfidence(finding.confidence),
    category: taxonomy.category,
    subcategory: taxonomy.subcategory,
    pageUrl,
    pageNumber,
    source: 'raawi-agent',
    sourceLabel: finding.source === 'openai' ? 'Raawi analyst' : 'Raawi interaction',
    wcagIds,
    evidence: stringifyEvidence(evidenceSource),
    selector: extractSelector(evidenceSource),
    recommendation: finding.howToVerify ?? undefined,
    howToVerify: finding.howToVerify ?? undefined,
  };
}

export function normalizeVisionFinding(
  finding: NormalizableVisionFinding,
  pageUrl: string,
  pageNumber: number,
  sequence: number,
  serviceName = 'Classic audit'
): NormalizedIssue {
  const taxonomy = normalizeTaxonomyMatch(mapVisionKindToTaxonomy(finding.kind));
  const evidenceSource = finding.evidence ?? finding.evidenceJson;
  return {
    issueCode: createIssueCode('vision', pageNumber, sequence),
    serviceName,
    issueTitle: titleFromVision(finding),
    result: 'needs_review',
    severity: severityFromVisionConfidence(finding.confidence),
    category: taxonomy.category,
    subcategory: taxonomy.subcategory,
    pageUrl: finding.url || pageUrl,
    pageNumber,
    source: 'vision',
    sourceLabel: 'Vision',
    wcagIds: parseStringArray(finding.suggestedWcagIds ?? finding.suggestedWcagIdsJson),
    evidence: stringifyEvidence(evidenceSource || finding.detectedText),
    selector: finding.correlatedSelector || extractSelector(evidenceSource),
    recommendation: undefined,
  };
}

export function compareNormalizedIssues(a: NormalizedIssue, b: NormalizedIssue): number {
  const resultRank: Record<NormalizedIssueResult, number> = {
    not_working: 0,
    needs_review: 1,
    working: 2,
    not_applicable: 3,
  };
  const severityRank: Record<NormalizedIssueSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    info: 4,
  };
  return (
    resultRank[a.result] - resultRank[b.result] ||
    severityRank[a.severity] - severityRank[b.severity] ||
    a.pageNumber - b.pageNumber ||
    a.category.localeCompare(b.category) ||
    a.subcategory.localeCompare(b.subcategory)
  );
}
