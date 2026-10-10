/**
 * Shared formatting for Analysis AI agent (interaction + enrichment) in exports.
 */
export declare function escapeHtml(text: string): string;
/** Prisma AgentFinding.confidence is 0..1 */
export declare function formatAgentConfidenceScore(confidence: number | null | undefined): string;
export declare function agentSourceLabel(source: string | null | undefined, locale: 'en' | 'ar'): string;
export declare function formatSuggestedWcagIds(ids: unknown): string;
//# sourceMappingURL=agent-report-format.d.ts.map