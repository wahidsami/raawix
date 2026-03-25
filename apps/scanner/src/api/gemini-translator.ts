import { config } from '../config.js';
import { createHash } from 'node:crypto';
import OpenAI from 'openai';

/**
 * Gemini Translation Service
 * Server-side only - never expose API keys to browser
 */
export class GeminiTranslator {
  private maxChars: number;
  private client: OpenAI;
  private model: string;

  constructor() {
    this.model = config.openai.model;
    this.maxChars = config.openai.maxChars;
    this.client = new OpenAI({ apiKey: config.openai.apiKey });
  }

  /**
   * Check if Gemini translation is enabled and configured
   */
  static isEnabled(): boolean {
    return config.openai.enabled && !!config.openai.apiKey;
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
      throw new Error('OpenAI translation is not enabled');
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
      const completion = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content:
              'You are a professional translator for accessibility UI strings. Return only the translated text with no extra commentary.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const translatedText = completion.choices[0]?.message?.content?.trim() || '';
      if (!translatedText) throw new Error('Failed to extract translated text from OpenAI response');
      return translatedText;
    } catch (error) {
      console.error('OpenAI translation failed:', error);
      throw error;
    }
  }

  /**
   * Generate hash for text (for caching)
   */
  static hashText(text: string, targetLang: string): string {
    return createHash('sha256').update(`${text}:${targetLang}`).digest('hex');
  }
}

