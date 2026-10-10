/**
 * AI-Powered Report Content Generator
 *
 * Uses OpenAI to generate professional, contextual report content
 * especially tailored for government entities
 */
export interface ReportContent {
    introduction: string;
    executiveSummary: string;
    keyFindings: string;
    recommendations?: string;
}
export interface ScanData {
    entityName: string;
    entityType: 'government' | 'private';
    propertyName: string;
    scanDate: string;
    totalPages: number;
    totalFindings: number;
    scoreA: number | null;
    scoreAA: number | null;
    needsReviewRate: number | null;
    failedRules: number;
    needsReviewRules: number;
    topFindings: Array<{
        wcagId: string;
        level: string;
        status: string;
        message: string;
        pageUrl: string;
    }>;
    locale: 'en' | 'ar';
}
export declare class ReportContentGenerator {
    private logger;
    private client;
    constructor(scanId?: string);
    /**
     * Generate professional report content using AI
     */
    generateContent(data: ScanData): Promise<ReportContent>;
    /**
     * Build prompt for AI content generation
     */
    private buildPrompt;
    /**
     * Parse AI response into structured content
     */
    private parseAIResponse;
    /**
     * Generate fallback content (when AI is unavailable)
     */
    private generateFallbackContent;
    private getFallbackIntroduction;
    private getFallbackExecutiveSummary;
    private getFallbackKeyFindings;
}
//# sourceMappingURL=report-content-generator.d.ts.map