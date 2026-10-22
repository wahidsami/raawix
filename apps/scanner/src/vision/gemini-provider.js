import { readFile } from 'node:fs/promises';
import { config } from '../config.js';
import { StructuredLogger } from '../utils/logger.js';
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
export class GeminiVisionProvider {
    logger;
    apiKey;
    baseUrl = 'https://generativelanguage.googleapis.com/v1/models';
    model;
    constructor() {
        this.logger = new StructuredLogger();
        this.apiKey = config.gemini.apiKey || '';
        this.model = config.gemini.model;
    }
    get apiUrl() {
        // Use v1beta generateContent endpoint for Gemini models (e.g., gemini-3.8-flash)
        return `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
    }
    /**
     * Check if Gemini provider is enabled and configured
     */
    static isEnabled() {
        return config.gemini.enabled && !!config.gemini.apiKey;
    }
    /**
     * Extract text from image using Gemini Vision API (OCR)
     */
    async extractText(imagePath) {
        if (!GeminiVisionProvider.isEnabled()) {
            return { text: null, rawResponse: null };
        }
        try {
            // Read image as base64
            const imageBuffer = await readFile(imagePath);
            const imageBase64 = imageBuffer.toString('base64');
            const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: 'Extract all visible text from this image. Return only the text content, no explanations.',
                                },
                                {
                                    inline_data: {
                                        mime_type: 'image/png',
                                        data: imageBase64,
                                    },
                                },
                            ],
                        },
                    ],
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                this.logger.warn('Gemini API request failed', {
                    status: response.status,
                    error: errorText.substring(0, 200),
                });
                return { text: null, rawResponse: { error: errorText, status: response.status } };
            const data = await response.json();
            const rawResponse = this.sanitizeRawResponse(data);
            // Extract text from Gemini response (excluding thought parts)
            const text = this.extractTextFromResponse(data);
            return { text, rawResponse };
        }
        catch (error) {
            this.logger.warn('Gemini text extraction failed', {
                imagePath,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return { text: null, rawResponse: { error: error instanceof Error ? error.message : 'Unknown error' } };
        }
    }
    /**
     * Get UI element description from image using Gemini Vision API
     * Uses constrained prompt: 1 sentence max, factual, no identity guesses
     */
    async describeElement(imagePath, elementKind, context) {
        if (!GeminiVisionProvider.isEnabled()) {
            return { description: null, rawResponse: null };
        }
        try {
            // Read image as base64
            const imageBuffer = await readFile(imagePath);
            // Safety: Enforce max image bytes
            if (imageBuffer.length > config.gemini.maxImageBytes) {
                this.logger.warn('Image too large for Gemini processing', {
                    imagePath,
                    size: imageBuffer.length,
                    maxBytes: config.gemini.maxImageBytes,
                });
                return {
                    description: null,
                    rawResponse: { error: 'Image exceeds maximum size limit' },
                };
            }
            const imageBase64 = imageBuffer.toString('base64');
            // Constrained prompt: 1 sentence max, factual, no identity guesses, no emotions
            let prompt = `Describe this ${elementKind} in exactly one sentence. Be factual and specific. `;
            prompt += `Do not guess identities, emotions, or make assumptions. `;
            prompt += `If uncertain, prefix with "Appears to show". `;
            if (context) {
                prompt += `Context: ${context.substring(0, 100)}. `;
            }
            prompt += `Return only the description, no explanations.`;
            const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt,
                                },
                                {
                                    inline_data: {
                                        mime_type: 'image/png',
                                        data: imageBase64,
                                    },
                                },
                            ],
                        },
                    ],
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                this.logger.warn('Gemini API request failed', {
                    status: response.status,
                    error: errorText.substring(0, 200),
                });
                return { description: null, rawResponse: { error: errorText, status: response.status } };
            }
            const data = await response.json();
            const rawResponse = this.sanitizeRawResponse(data);
            // Extract description from Gemini response (excluding thought parts)
            let description = this.extractTextFromResponse(data);
            // Constrain to 1 sentence max
            if (description) {
                // Take first sentence only
                const firstSentence = description.split(/[.!?]/)[0].trim();
                if (firstSentence.length > 0) {
                    description = firstSentence;
                    // Add period if missing
                    if (!description.endsWith('.') && !description.endsWith('!') && !description.endsWith('?')) {
                        description += '.';
                    }
                }
            }
            return { description, rawResponse };
        }
        catch (error) {
            this.logger.warn('Gemini element description failed', {
                imagePath,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return { description: null, rawResponse: { error: error instanceof Error ? error.message : 'Unknown error' } };
        }
    }
    /**
     * Sanitizes raw provider response before returning.
     * Strips out parts marked thought: true, raw error dumps, or sensitive internal data.
     */
    sanitizeRawResponse(response) {
        if (!response || typeof response !== 'object') {
            return response;
        }
        try {
            const sanitized = {};
            if (response.candidates && Array.isArray(response.candidates)) {
                sanitized.candidates = response.candidates.map((cand) => {
                    if (!cand || typeof cand !== 'object') return cand;
                    const cleanCand = { ...cand };
                    if (cand.content?.parts && Array.isArray(cand.content.parts)) {
                        cleanCand.content = {
                            ...cand.content,
                            parts: cand.content.parts
                                .filter((part) => part && !part.thought && typeof part.text === 'string')
                                .map((part) => ({
                                    text: part.text,
                                })),
                        };
                    }
                    return cleanCand;
                });
            }
            if (response.usageMetadata && typeof response.usageMetadata === 'object') {
                sanitized.usageMetadata = response.usageMetadata;
            }
            return sanitized;
        }
        catch {
            return null;
        }
    }
    /**
     * Extract text content from Gemini API response.
     * Excludes any parts explicitly marked thought: true, non-text, or empty parts.
     */
    extractTextFromResponse(response) {
        try {
            if (response && Array.isArray(response.candidates) && response.candidates.length > 0) {
                const candidate = response.candidates[0];
                if (candidate?.content?.parts && Array.isArray(candidate.content.parts)) {
                    // Filter out parts marked thought: true, missing, empty, or non-text parts
                    const nonThoughtParts = candidate.content.parts.filter((part) => part && !part.thought && typeof part.text === 'string');
                    if (nonThoughtParts.length === 0) {
                        return null;
                    }
                    const text = nonThoughtParts
                        .map((part) => part.text.trim())
                        .filter((t) => t.length > 0)
                        .join(' ')
                        .trim();
                    return text.length > 0 ? text : null;
                }
            }
            return null;
        }
        catch (error) {
            this.logger.warn('Failed to extract text from Gemini response', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return null;
        }
    }
}
//# sourceMappingURL=gemini-provider.js.map