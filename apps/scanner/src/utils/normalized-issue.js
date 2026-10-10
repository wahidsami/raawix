import { defaultTaxonomyMatch, normalizeTaxonomyMatch } from './report-taxonomy.js';
const wcagTaxonomy = {
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
const agentKindTaxonomy = {
    ambiguous_control: { category: 'Structure & Semantics', subcategory: 'Inaccessible custom components' },
    authenticated_workspace_navigation_unclear: { category: 'Authentication & Security', subcategory: 'Cognitive complexity' },
    confusing_focus_order: { category: 'Keyboard & Navigation', subcategory: 'Incorrect tab order' },
    dynamic_updates_not_announced: { category: 'Assistive Technology', subcategory: 'Screen reader issues' },
    focus_lost: { category: 'Keyboard & Navigation', subcategory: 'Incorrect tab order' },
    form_blocked: { category: 'Forms & Inputs', subcategory: 'No input instructions' },
    inaccessible_action: { category: 'Keyboard & Navigation', subcategory: 'Not accessible via keyboard' },
    image_alt_task_issue: { category: 'Images', subcategory: 'Missing alt text' },
    keyboard_trap: { category: 'Keyboard & Navigation', subcategory: 'Keyboard traps' },
    missing_page_structure: { category: 'Structure & Semantics', subcategory: 'Missing landmarks' },
    missing_skip_link: { category: 'Keyboard & Navigation', subcategory: 'Missing skip links' },
    missing_form_instructions: { category: 'Forms & Inputs', subcategory: 'No input instructions' },
    missing_focus_indicator: { category: 'Keyboard & Navigation', subcategory: 'Missing focus indicator' },
    media_autoplay_without_control: { category: 'Multimedia', subcategory: 'Auto-play without control' },
    media_controls_not_exposed: { category: 'Multimedia', subcategory: 'No pause/stop controls' },
    modal_probe_failed: { category: 'Keyboard & Navigation', subcategory: 'Keyboard traps' },
    poor_label_quality: { category: 'Forms & Inputs', subcategory: 'Missing labels' },
    unnamed_task_control: { category: 'Forms & Inputs', subcategory: 'Missing labels' },
    unclear_error_recovery: { category: 'Forms & Inputs', subcategory: 'Errors not explained' },
    silent_update: { category: 'Assistive Technology', subcategory: 'Screen reader issues' },
    verification_checkpoint_requires_manual_input: { category: 'Authentication & Security', subcategory: 'Memory-based challenges' },
};
const visionKindTaxonomy = {
    clickable_unlabeled: { category: 'Images', subcategory: 'Icons without labels' },
    focus_indicator_missing_visual: { category: 'Keyboard & Navigation', subcategory: 'Missing focus indicator' },
    icon_button_unlabeled: { category: 'Images', subcategory: 'Icons without labels' },
    looks_like_button_not_button: { category: 'Structure & Semantics', subcategory: 'Inaccessible custom components' },
    text_contrast_risk: { category: 'Color & Contrast', subcategory: 'Low text contrast' },
};
export function mapWcagIdToTaxonomy(wcagId) {
    if (!wcagId)
        return defaultTaxonomyMatch;
    return wcagTaxonomy[wcagId] || defaultTaxonomyMatch;
}
export function mapAgentKindToTaxonomy(kind) {
    if (!kind)
        return defaultTaxonomyMatch;
    return agentKindTaxonomy[kind] || defaultTaxonomyMatch;
}
export function mapVisionKindToTaxonomy(kind) {
    if (!kind)
        return defaultTaxonomyMatch;
    return visionKindTaxonomy[kind] || defaultTaxonomyMatch;
}
export function createIssueCode(source, pageNumber, sequence) {
    const prefix = source === 'raawi-agent'
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
function parseJsonish(raw) {
    if (typeof raw !== 'string')
        return raw;
    try {
        return JSON.parse(raw);
    }
    catch {
        return raw;
    }
}
function compactWhitespace(value) {
    return value.replace(/\s+/g, ' ').trim();
}
function truncateEvidenceText(value, maxLength = 220) {
    if (value.length <= maxLength)
        return value;
    return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}
function normalizeEvidenceEntry(raw) {
    if (typeof raw === 'string')
        return compactWhitespace(raw);
    if (!raw || typeof raw !== 'object')
        return '';
    const evidence = raw;
    const candidate = evidence.description || evidence.value || evidence.selector;
    if (typeof candidate === 'string')
        return compactWhitespace(candidate);
    return compactWhitespace(JSON.stringify(evidence));
}
function summarizeEvidenceParts(parts) {
    const counts = new Map();
    const orderedParts = [];
    for (const part of parts) {
        const normalized = compactWhitespace(part);
        if (!normalized)
            continue;
        if (!counts.has(normalized)) {
            orderedParts.push(normalized);
            counts.set(normalized, 1);
        }
        else {
            counts.set(normalized, (counts.get(normalized) || 0) + 1);
        }
    }
    const summarized = orderedParts.map((part) => {
        const count = counts.get(part) || 1;
        return count > 1 ? `${part} (repeated ${count}x)` : part;
    });
    return truncateEvidenceText(summarized.join(' | '));
}
function stringifyEvidence(raw) {
    const parsed = parseJsonish(raw);
    if (!parsed)
        return '';
    if (Array.isArray(parsed)) {
        return summarizeEvidenceParts(parsed.map((item) => normalizeEvidenceEntry(item)).filter(Boolean));
    }
    if (typeof parsed === 'object') {
        const objectValue = parsed;
        if (Array.isArray(objectValue.evidence))
            return stringifyEvidence(objectValue.evidence);
        if (typeof objectValue.selector === 'string')
            return truncateEvidenceText(compactWhitespace(objectValue.selector));
        if (typeof objectValue.message === 'string')
            return truncateEvidenceText(compactWhitespace(objectValue.message));
        return truncateEvidenceText(compactWhitespace(JSON.stringify(objectValue)));
    }
    return truncateEvidenceText(compactWhitespace(String(parsed)));
}
function extractSelector(raw) {
    const parsed = parseJsonish(raw);
    if (Array.isArray(parsed)) {
        for (const item of parsed) {
            if (item && typeof item === 'object' && typeof item.selector === 'string') {
                return item.selector;
            }
        }
        return undefined;
    }
    if (parsed && typeof parsed === 'object') {
        const objectValue = parsed;
        if (typeof objectValue.selector === 'string')
            return objectValue.selector;
        if (Array.isArray(objectValue.evidence))
            return extractSelector(objectValue.evidence);
    }
    return undefined;
}
function parseStringArray(raw) {
    const parsed = parseJsonish(raw);
    if (!Array.isArray(parsed))
        return [];
    return parsed.filter((item) => typeof item === 'string' && item.trim().length > 0);
}
function readObject(raw) {
    const parsed = parseJsonish(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed
        : null;
}
function taxonomyFromAgentFinding(finding) {
    const direct = normalizeTaxonomyMatch({
        category: finding.category,
        subcategory: finding.subcategory ?? undefined,
    });
    if (finding.category && direct.category === finding.category) {
        return direct;
    }
    const evidence = readObject(finding.evidence ?? finding.evidenceJson);
    const taxonomy = evidence?.taxonomy;
    if (taxonomy && typeof taxonomy === 'object') {
        const normalized = normalizeTaxonomyMatch(taxonomy);
        if (taxonomy.category === normalized.category) {
            return normalized;
        }
    }
    return null;
}
function ruleResultFromStatus(status) {
    if (status === 'pass')
        return 'working';
    if (status === 'fail')
        return 'not_working';
    if (status === 'needs_review')
        return 'needs_review';
    return 'not_applicable';
}
function severityFromRule(finding) {
    if (finding.status === 'pass' || finding.status === 'na')
        return 'info';
    if (finding.status === 'needs_review')
        return 'low';
    if (finding.level === 'A')
        return 'high';
    if (finding.level === 'AA')
        return 'medium';
    return finding.confidence === 'high' ? 'medium' : 'low';
}
function severityFromAgentConfidence(confidence) {
    if (typeof confidence === 'number') {
        if (confidence >= 0.85)
            return 'high';
        if (confidence >= 0.6)
            return 'medium';
        return 'low';
    }
    if (confidence === 'high')
        return 'high';
    if (confidence === 'medium')
        return 'medium';
    if (confidence === 'low')
        return 'low';
    return 'medium';
}
function severityFromVisionConfidence(confidence) {
    if (confidence === 'high')
        return 'high';
    if (confidence === 'medium')
        return 'medium';
    return 'low';
}
function titleFromRule(finding) {
    return finding.message || finding.howToVerify || finding.ruleId || 'WCAG finding';
}
function titleFromAgent(finding) {
    return finding.message || finding.kind || 'Raawi interaction finding';
}
function titleFromVision(finding) {
    return finding.detectedText || finding.kind || 'Vision finding';
}
export function normalizeRuleFinding(finding, pageUrl, pageNumber, sequence, serviceName = 'Classic audit') {
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
export function normalizeAgentFinding(finding, pageUrl, pageNumber, sequence, serviceName = 'Raawi agent') {
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
export function normalizeVisionFinding(finding, pageUrl, pageNumber, sequence, serviceName = 'Classic audit') {
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
export function compareNormalizedIssues(a, b) {
    const resultRank = {
        not_working: 0,
        needs_review: 1,
        working: 2,
        not_applicable: 3,
    };
    const severityRank = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
        info: 4,
    };
    return (resultRank[a.result] - resultRank[b.result] ||
        severityRank[a.severity] - severityRank[b.severity] ||
        a.pageNumber - b.pageNumber ||
        a.category.localeCompare(b.category) ||
        a.subcategory.localeCompare(b.subcategory));
}
//# sourceMappingURL=normalized-issue.js.map