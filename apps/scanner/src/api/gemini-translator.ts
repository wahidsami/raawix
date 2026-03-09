import { config } from '../config.js';
import { createHash } from 'node:crypto';

/**
 * Gemini Translation Service
 * Server-side only - never expose API keys to browser
 */
export class GeminiTranslator {
  private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta/models';
  private apiKey: string;
  private model: string;
  private maxChars: number;

  constructor() {
    this.apiKey = config.gemini.apiKey || '';
    this.model = config.gemini.model;
    this.maxChars = config.gemini.maxChars;
  }

  /**
   * Check if Gemini translation is enabled and configured
   */
  static isEnabled(): boolean {
    return config.gemini.enabled && !!config.gemini.apiKey;
  }

  /**
   * Translate text using Gemini API
   * @param text Text to translate
   * @param targetLang Target language ('ar' or 'en')
   * @param sourceLang Source language (optional, auto-detect if not provided)
   * @returns Translated text
   */
  async translate(text: string, targetLang: 'ar' | 'en', sourceLang?: string): Promise<string> {
    if (!GeminiTranslator.isEnabled()) {
      throw new Error('Gemini translation is not enabled');
    }

    // Truncate text to maxChars
    const truncatedText = text.length > this.maxChars ? text.substring(0, this.maxChars) : text;

    // Build prompt
    const targetLanguage = targetLang === 'ar' ? 'Arabic' : 'English';
    const sourceLanguage = sourceLang ? (sourceLang === 'ar' ? 'Arabic' : 'English') : 'the source language';
    
    const prompt = `Translate the following text from ${sourceLanguage} to ${targetLanguage}.

Requirements:
- Translate accurately and preserve meaning
- Keep UI labels short and concise
- Do not add extra commentary or explanations
- Return only the translated text, nothing else

Text to translate:
${truncatedText}`;

    try {
      const url = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;
      const response = await fetch(url, {
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
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      // Extract translated text from response
      const translatedText = this.extractTextFromResponse(data);
      
      if (!translatedText) {
        throw new Error('Failed to extract translated text from Gemini response');
      }

      return translatedText;
    } catch (error) {
      console.error('Gemini translation failed:', error);
      throw error;
    }
  }

  /**
   * Extract text from Gemini API response
   */
  private extractTextFromResponse(data: any): string | null {
    try {
      if (data.candidates && data.candidates.length > 0) {
        const candidate = data.candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          return candidate.content.parts[0].text || null;
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to extract text from Gemini response:', error);
      return null;
    }
  }

  /**
   * Generate hash for text (for caching)
   */
  static hashText(text: string, targetLang: string): string {
    return createHash('sha256').update(`${text}:${targetLang}`).digest('hex');
  }
}

