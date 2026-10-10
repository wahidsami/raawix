/**
 * Shared formatting for Analysis AI agent (interaction + enrichment) in exports.
 */
export function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
/** Prisma AgentFinding.confidence is 0..1 */
export function formatAgentConfidenceScore(confidence) {
    if (confidence == null || Number.isNaN(Number(confidence)))
        return '—';
    const n = Number(confidence);
    const pct = n <= 1 && n >= 0 ? Math.round(n * 100) : Math.round(n);
    return `${pct}%`;
}
export function agentSourceLabel(source, locale) {
    const s = source || 'agent';
    if (locale === 'ar') {
        return s === 'openai' ? 'إثراء بالذكاء الاصطناعي' : 'محاكاة لوحة المفاتيح';
    }
    return s === 'openai' ? 'AI enrichment' : 'Keyboard simulation';
}
export function formatSuggestedWcagIds(ids) {
    if (!ids)
        return '—';
    if (Array.isArray(ids))
        return ids.join(', ') || '—';
    return String(ids);
}
//# sourceMappingURL=agent-report-format.js.map