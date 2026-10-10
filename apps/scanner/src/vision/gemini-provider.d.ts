/**
 * Gemini Vision API provider
 * Used ONLY for:
 * - OCR/text extraction from screenshot crops
 * - UI element description to improve user guidance text
 *
 * Rules:
 * - Never marks WCAG pass/fail based solely on Gemini
 * - All outputs tagged as confidence: low/medium, status: needs_review
 * - Raw provider output stored in evidenceJson for auditability
 */
export declare class GeminiVisionProvider {
    private logger;
    private apiKey;
    private baseUrl;
    private model;
    constructor();
    private get apiUrl();
    /**
     * Check if Gemini provider is enabled and configured
     */
    static isEnabled(): boolean;
    /**
     * Extract text from image using Gemini Vision API (OCR)
     */
    extractText(imagePath: string): Promise<{
        text: string | null;
        rawResponse: any;
    }>;
    /**
     * Get UI element description from image using Gemini Vision API
     * Uses constrained prompt: 1 sentence max, factual, no identity guesses
     */
    describeElement(imagePath: string, elementKind: string, context?: string): Promise<{
        description: string | null;
        rawResponse: any;
    }>;
    /**
     * Extract text content from Gemini API response
     */
    private extractTextFromResponse;
}
//# sourceMappingURL=gemini-provider.d.ts.map