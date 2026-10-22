import { readFile } from 'node:fs/promises';
import { config } from '../config.js';
import { StructuredLogger } from '../utils/logger.js';
import { geminiBudgetTracker } from './gemini-budget.js';

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
  private scanId?: string;

  constructor(scanId?: string) {
    this.logger = new StructuredLogger(scanId);
    this.apiKey = config.gemini.apiKey || '';
    this.model = config.gemini.model;
    this.scanId = scanId;
  }
  
  private get apiUrl(): string {
    // Use v1beta generateContent endpoint for Gemini models (e.g., gemini-3.8-flash)
    return `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
  }

  /**
   * Check if Gemini provider is enabled and configured
   */
  static isEnabled(): boolean {
    return config.gemini.enabled && !!config.gemini.apiKey;
  }

  /**
   * Performs the underlying fetch call. Can be spied or overridden in tests.
   */
  protected async doFetch(payload: any): Promise<Response> {
    return fetch(`${this.apiUrl}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Bounded backoff delay. Can be spied or overridden in tests.
   */
  protected async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Parses standard Retry-After header (seconds or HTTP date) to milliseconds.
   */
  private parseRetryAfter(headerValue: string | null | undefined): number | null {
    if (!headerValue) return null;
    const seconds = parseInt(headerValue, 10);
    if (!isNaN(seconds) && seconds >= 0) {
      return seconds * 1000;
    }
    const dateMs = new Date(headerValue).getTime();
    if (!isNaN(dateMs) && dateMs > Date.now()) {
      return dateMs - Date.now();
    }
    return null;
  }

  /**
   * Executes Gemini API request with bounded retries, backoff with jitter,
   * request budgeting, and circuit breaking upon quota exhaustion.
   */
  private async executeWithRetry(
    payload: any,
    operation: 'extract_text' | 'describe_element'
  ): Promise<{ data: any | null; rawResponse: any }> {
    const maxRetries = config.gemini.maxRetries;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      // Acquire dispatch slot enforcing per-scan budget and process-wide rolling 60s window
      const slot = await geminiBudgetTracker.acquireDispatchSlot(this.scanId);
      if (!slot.allowed) {
        this.logger.warn('Gemini dispatch halted by scheduler or circuit breaker', {
          scanId: this.scanId,
          reason: slot.reason,
          attempt,
          operation,
        });
        return {
          data: null,
          rawResponse: {
            status: slot.reason === 'service_unavailable' ? 503 : 429,
            error: slot.reason === 'request_budget_exhausted'
              ? 'Request budget exhausted'
              : (slot.reason === 'quota_exhausted'
                  ? 'Google Gemini quota exhausted'
                  : (slot.reason === 'service_unavailable'
                      ? 'Service unavailable'
                      : 'Rate limit exceeded')),
            category: slot.reason,
          },
        };
      }

      try {
        const response = await this.doFetch(payload);

        if (response.ok) {
          const data = await response.json();
          const rawResponse = this.sanitizeRawResponse(data);
          return { data, rawResponse };
        }

        const status = response.status;
        const errorText = await response.text();
        const isQuota = /quota|RESOURCE_EXHAUSTED|Resource has been exhausted/i.test(errorText);

        // 1. HTTP 429: Rate Limit or Quota Exhaustion
        if (status === 429) {
          if (isQuota) {
            geminiBudgetTracker.tripCircuit(this.scanId, 'quota_exhausted');
            return {
              data: null,
              rawResponse: {
                status: 429,
                error: 'Google Gemini quota exhausted',
                category: 'quota_exhausted',
              },
            };
          }

          if (attempt < maxRetries) {
            const retryAfterHeader = response.headers?.get?.('retry-after');
            let delay = this.parseRetryAfter(retryAfterHeader);
            if (delay === null) {
              delay = Math.min(
                config.gemini.maxDelayMs,
                config.gemini.baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 200)
              );
            } else {
              delay = Math.min(delay, config.gemini.maxDelayMs);
            }

            const canRetry = geminiBudgetTracker.recordRetryDelay(this.scanId, delay);
            if (canRetry) {
              this.logger.info('Gemini rate limited (429); backing off', {
                scanId: this.scanId,
                attempt: attempt + 1,
                delay,
              });
              await this.sleep(delay);
              continue;
            }
          }

          geminiBudgetTracker.tripCircuit(this.scanId, 'rate_limit_exceeded');
          return {
            data: null,
            rawResponse: {
              status: 429,
              error: 'Rate limit exceeded',
              category: 'rate_limit_exceeded',
            },
          };
        }

        // 2. HTTP 503: Service Unavailable
        if (status === 503) {
          if (attempt < maxRetries) {
            const delay = Math.min(
              config.gemini.maxDelayMs,
              config.gemini.baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 200)
            );
            const canRetry = geminiBudgetTracker.recordRetryDelay(this.scanId, delay);
            if (canRetry) {
              this.logger.info('Gemini service unavailable (503); backing off', {
                scanId: this.scanId,
                attempt: attempt + 1,
                delay,
              });
              await this.sleep(delay);
              continue;
            }
          }

          return {
            data: null,
            rawResponse: {
              status: 503,
              error: 'Service unavailable',
              category: 'service_unavailable',
            },
          };
        }

        // 3. Non-retryable HTTP Error (400, 401, 403, 404, etc.)
        return {
          data: null,
          rawResponse: {
            status,
            error: errorText.substring(0, 200),
            category: 'http_error',
          },
        };
      } catch (error) {
        if (attempt < maxRetries) {
          const delay = Math.min(
            config.gemini.maxDelayMs,
            config.gemini.baseDelayMs * Math.pow(2, attempt)
          );
          const canRetry = geminiBudgetTracker.recordRetryDelay(this.scanId, delay);
          if (canRetry) {
            this.logger.warn('Gemini network error; retrying', {
              scanId: this.scanId,
              attempt: attempt + 1,
              delay,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            await this.sleep(delay);
            continue;
          }
        }

        return {
          data: null,
          rawResponse: {
            status: 0,
            error: error instanceof Error ? error.message : 'Unknown network error',
            category: 'network_error',
          },
        };
      } finally {
        slot.release?.();
      }
    }

    return {
      data: null,
      rawResponse: {
        status: 429,
        error: 'Retry budget exhausted',
        category: 'rate_limit_exceeded',
      },
    };
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

      if (imageBuffer.length > config.gemini.maxImageBytes) {
        this.logger.warn('Image too large for Gemini processing', {
          imagePath,
          size: imageBuffer.length,
          maxBytes: config.gemini.maxImageBytes,
        });
        return {
          text: null,
          rawResponse: { error: 'Image exceeds maximum size limit', category: 'size_limit_exceeded' },
        };
      }

      const imageBase64 = imageBuffer.toString('base64');
      const payload = {
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
      };

      const { data, rawResponse } = await this.executeWithRetry(payload, 'extract_text');
      if (!data) {
        return { text: null, rawResponse };
      }

      const text = this.extractTextFromResponse(data);
      return { text, rawResponse };
    } catch (error) {
      this.logger.warn('Gemini text extraction failed', {
        imagePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        text: null,
        rawResponse: {
          error: error instanceof Error ? error.message : 'Unknown error',
          category: 'unknown_error',
        },
      };
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
          rawResponse: { error: 'Image exceeds maximum size limit', category: 'size_limit_exceeded' },
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

      const payload = {
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
      };

      const { data, rawResponse } = await this.executeWithRetry(payload, 'describe_element');
      if (!data) {
        return { description: null, rawResponse };
      }

      // Extract description from Gemini response (excluding thought parts)
      let description = this.extractTextFromResponse(data);

      // Constrain to 1 sentence max
      if (description) {
        const firstSentence = description.split(/[.!?]/)[0].trim();
        if (firstSentence.length > 0) {
          description = firstSentence;
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
      return {
        description: null,
        rawResponse: {
          error: error instanceof Error ? error.message : 'Unknown error',
          category: 'unknown_error',
        },
      };
    }
  }

  /**
   * Sanitizes raw provider response before returning.
   * Strips out parts marked thought: true, raw error dumps, or sensitive internal data.
   */
  private sanitizeRawResponse(response: any): any {
    if (!response || typeof response !== 'object') {
      return response;
    }

    try {
      const sanitized: any = {};
      if (response.candidates && Array.isArray(response.candidates)) {
        sanitized.candidates = response.candidates.map((cand: any) => {
          if (!cand || typeof cand !== 'object') return cand;
          const cleanCand: any = { ...cand };
          if (cand.content?.parts && Array.isArray(cand.content.parts)) {
            cleanCand.content = {
              ...cand.content,
              parts: cand.content.parts
                .filter((part: any) => part && !part.thought && typeof part.text === 'string')
                .map((part: any) => ({
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
    } catch {
      return null;
    }
  }

  /**
   * Extract text content from Gemini API response.
   * Excludes any parts explicitly marked thought: true, non-text, or empty parts.
   */
  private extractTextFromResponse(response: any): string | null {
    try {
      if (response && Array.isArray(response.candidates) && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (candidate?.content?.parts && Array.isArray(candidate.content.parts)) {
          // Filter out parts marked thought: true, missing, empty, or non-text parts
          const nonThoughtParts = candidate.content.parts.filter(
            (part: any) => part && !part.thought && typeof part.text === 'string'
          );

          if (nonThoughtParts.length === 0) {
            return null;
          }

          const text = nonThoughtParts
            .map((part: any) => part.text.trim())
            .filter((t: string) => t.length > 0)
            .join(' ')
            .trim();

          return text.length > 0 ? text : null;
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

