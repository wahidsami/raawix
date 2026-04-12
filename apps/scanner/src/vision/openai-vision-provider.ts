import { readFile } from 'node:fs/promises';
import OpenAI from 'openai';
import { config } from '../config.js';
import { StructuredLogger } from '../utils/logger.js';

export class OpenAIVisionProvider {
  private logger: StructuredLogger;
  private client: OpenAI;
  private model: string;

  constructor() {
    this.logger = new StructuredLogger();
    this.client = new OpenAI({ apiKey: config.openai.apiKey });
    this.model = config.openai.visionModel;
  }

  static isEnabled(): boolean {
    return config.openai.enabled && !!config.openai.apiKey;
  }

  async extractText(imagePath: string): Promise<{ text: string | null; rawResponse: any }> {
    if (!OpenAIVisionProvider.isEnabled()) return { text: null, rawResponse: null };
    try {
      const imageBuffer = await readFile(imagePath);
      if (imageBuffer.length > config.openai.maxImageBytes) {
        return { text: null, rawResponse: { error: 'Image exceeds maximum size limit' } };
      }
      const imageBase64 = imageBuffer.toString('base64');
      const response = await this.client.responses.create(
        {
          model: this.model,
          input: [
            {
              role: 'user',
              content: [
                { type: 'input_text', text: 'Extract all visible text from this image. Return only the text content.' },
                { type: 'input_image', image_url: `data:image/png;base64,${imageBase64}`, detail: 'low' },
              ],
            },
          ],
        },
        { timeout: config.openai.requestTimeoutMs }
      );
      const text = response.output_text?.trim() || null;
      return { text, rawResponse: response };
    } catch (error) {
      this.logger.warn('OpenAI text extraction failed', {
        imagePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { text: null, rawResponse: { error: error instanceof Error ? error.message : 'Unknown error' } };
    }
  }

  async describeElement(
    imagePath: string,
    elementKind: string,
    context?: string
  ): Promise<{ description: string | null; rawResponse: any }> {
    if (!OpenAIVisionProvider.isEnabled()) return { description: null, rawResponse: null };
    try {
      const imageBuffer = await readFile(imagePath);
      if (imageBuffer.length > config.openai.maxImageBytes) {
        return { description: null, rawResponse: { error: 'Image exceeds maximum size limit' } };
      }
      const imageBase64 = imageBuffer.toString('base64');
      let prompt = `Describe this ${elementKind} in exactly one sentence. Be factual and specific. `;
      prompt += `Do not guess identities or emotions. If uncertain, prefix with "Appears to show". `;
      if (context) prompt += `Context: ${context.substring(0, 100)}. `;
      prompt += 'Return only the description.';

      const response = await this.client.responses.create(
        {
          model: this.model,
          input: [
            {
              role: 'user',
              content: [
                { type: 'input_text', text: prompt },
                { type: 'input_image', image_url: `data:image/png;base64,${imageBase64}`, detail: 'low' },
              ],
            },
          ],
        },
        { timeout: config.openai.requestTimeoutMs }
      );

      let description = response.output_text?.trim() || null;
      if (description) {
        const firstSentence = description.split(/[.!?]/)[0].trim();
        description = firstSentence ? `${firstSentence}.` : null;
      }
      return { description, rawResponse: response };
    } catch (error) {
      this.logger.warn('OpenAI element description failed', {
        imagePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { description: null, rawResponse: { error: error instanceof Error ? error.message : 'Unknown error' } };
    }
  }
}

