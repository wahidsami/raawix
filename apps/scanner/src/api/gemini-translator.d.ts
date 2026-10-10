/**
 * Gemini Translation Service
 * Server-side only - never expose API keys to browser
 */
export declare class GeminiTranslator {
    private maxChars;
    private client;
    private model;
    constructor();
    /**
     * Check if Gemini translation is enabled and configured
     */
    static isEnabled(): boolean;
    /**
     * Translate text using Gemini API
     * @param text Text to translate
     * @param targetLang Target language ('ar' or 'en')
     * @param sourceLang Source language (optional, auto-detect if not provided)
     * @returns Translated text
     */
    translate(text: string, targetLang: 'ar' | 'en', sourceLang?: string): Promise<string>;
    /**
     * Generate hash for text (for caching)
     */
    static hashText(text: string, targetLang: string): string;
}
//# sourceMappingURL=gemini-translator.d.ts.map