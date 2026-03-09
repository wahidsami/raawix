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
  private logger: StructuredLogger;
  private apiKey: string;
  private baseUrl: string = 'https://generativelanguage.googleapis.com/v1/models';
  private model: string;

  constructor() {
    this.logger = new StructuredLogger();
    this.apiKey = config.gemini.apiKey || '';
    this.model = config.gemini.model;
  }
  
  private get apiUrl(): string {
    // Use v1beta for gemini-1.5-flash model (not available in v1)
    return `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
  }

  /**
   * Check if Gemini provider is enabled and configured
   */
  static isEnabled(): boolean {
    return config.gemini.enabled && !!config.gemini.apiKey;
  }

  /**
   * Extract text from image using Gemini Vision API (OCR)
   */
  async extractText(imagePath: string): Promise<{ text: string | null; rawResponse: any }> {
    if (!GeminiVisionProvider.isEnabled()) {
      return { text: null, rawResponse: null };
    }

    try {
      // Read image as base64
      const imageBuffer = await readFile(imagePath);
      const imageBase64 = imageBuffer.toString('base64');

      const response = await fetch(
        `${this.apiUrl}?key=${this.apiKey}`,
        {
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
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn('Gemini API request failed', {
          status: response.status,
          error: errorText.substring(0, 200),
        });
        return { text: null, rawResponse: { error: errorText, status: response.status } };
      }

      const data = await response.json();
      const rawResponse = data;

      // Extract text from Gemini response
      const text = this.extractTextFromResponse(data);

      return { text, rawResponse };
    } catch (error) {
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
  async describeElement(
    imagePath: string,
    elementKind: string,
    context?: string
  ): Promise<{ description: string | null; rawResponse: any }> {
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

      const response = await fetch(
        `${this.apiUrl}?key=${this.apiKey}`,
        {
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
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn('Gemini API request failed', {
          status: response.status,
          error: errorText.substring(0, 200),
        });
        return { description: null, rawResponse: { error: errorText, status: response.status } };
      }

      const data = await response.json();
      const rawResponse = data;

      // Extract description from Gemini response
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
    } catch (error) {
      this.logger.warn('Gemini element description failed', {
        imagePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { description: null, rawResponse: { error: error instanceof Error ? error.message : 'Unknown error' } };
    }
  }

  /**
   * Extract text content from Gemini API response
   */
  private extractTextFromResponse(response: any): string | null {
    try {
      if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          const text = candidate.content.parts
            .map((part: any) => part.text || '')
            .join(' ')
            .trim();
          return text || null;
        }
      }
      return null;
    } catch (error) {
      this.logger.warn('Failed to extract text from Gemini response', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }
}

