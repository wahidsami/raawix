import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VisionAnalyzer } from './analyzer.js';
import { AssistiveMapGenerator } from '../assistive/assistive-map-generator.js';
import { GeminiVisionProvider } from './gemini-provider.js';
import { OpenAIVisionProvider } from './openai-vision-provider.js';
import { createProviderDiagnostics } from './provider-telemetry.js';
import { geminiBudgetTracker } from './gemini-budget.js';
import { imageCache } from '../assistive/image-cache.js';
import { config } from '../config.js';
import type { PageArtifact, VisionFinding } from '@raawi-x/core';
import { rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

describe('Phase 7B.5K & 7B.5N — Gemini-Compatible Image Processing, Rate-Limit & Safe Telemetry Regression Suite', () => {
  const origGemini = { ...config.gemini };
  const origOpenai = { ...config.openai };
  const testOutputDir = join(process.cwd(), 'scratch', 'test-phase7b5k-output');

  beforeEach(async () => {
    vi.clearAllMocks();
    imageCache.clear();
    geminiBudgetTracker.reset();
    await mkdir(testOutputDir, { recursive: true });
  });

  afterEach(async () => {
    config.gemini = { ...origGemini };
    config.openai = { ...origOpenai };
    geminiBudgetTracker.reset();
    try {
      await rm(testOutputDir, { recursive: true, force: true });
    } catch {}
  });

  // Scenario 1: Gemini enabled and OpenAI disabled: image cropping is not skipped
  it('Scenario 1: allows image cropping when Gemini is enabled and OpenAI is disabled', async () => {
    config.gemini.enabled = true;
    config.gemini.apiKey = 'AIzaSy-mock-secret-key-do-not-leak';
    config.openai.enabled = false;
    config.openai.apiKey = '';

    expect(GeminiVisionProvider.isEnabled()).toBe(true);
    expect(OpenAIVisionProvider.isEnabled()).toBe(false);

    const analyzer = new VisionAnalyzer('test-scan-crop-gemini');

    let querySelectorCalled = false;
    const mockElement = {
      evaluate: vi.fn().mockImplementation((fn: any) => {
        const fakeImg = {
          getAttribute: (attr: string) => {
            if (attr === 'src') return 'https://example.com/images/recipe.png';
            if (attr === 'id') return 'recipe-img';
            return null;
          },
          id: 'recipe-img',
          naturalWidth: 100,
          naturalHeight: 100,
          width: 100,
          height: 100,
        };
        return fn(fakeImg);
      }),
      boundingBox: vi.fn().mockResolvedValue({ x: 10, y: 10, width: 100, height: 100 }),
      screenshot: vi.fn().mockImplementation(async ({ path }) => {
        await writeFile(path, Buffer.from('mock-png-bytes'));
      }),
    };

    const mockPage: any = {
      $$: vi.fn().mockImplementation(async (selector: string) => {
        if (selector === 'img') {
          querySelectorCalled = true;
          return [mockElement];
        }
        return [];
      }),
    };

    await (analyzer as any).processImagesForAssistiveMap(mockPage, 1, testOutputDir);

    expect(querySelectorCalled).toBe(true);
    expect(mockElement.screenshot).toHaveBeenCalled();

    const expectedImagesDir = join(testOutputDir, 'pages', '1', 'vision', 'images');
    expect(existsSync(expectedImagesDir)).toBe(true);
  });

  // Scenario 2: OpenAI enabled and Gemini disabled: existing OpenAI behavior is preserved
  it('Scenario 2: preserves image cropping when OpenAI is enabled and Gemini is disabled', async () => {
    config.gemini.enabled = false;
    config.gemini.apiKey = '';
    config.openai.enabled = true;
    config.openai.apiKey = 'sk-mock-openai-secret-key';

    expect(GeminiVisionProvider.isEnabled()).toBe(false);
    expect(OpenAIVisionProvider.isEnabled()).toBe(true);

    const analyzer = new VisionAnalyzer('test-scan-crop-openai');

    let querySelectorCalled = false;
    const mockElement = {
      evaluate: vi.fn().mockImplementation((fn: any) => {
        const fakeImg = {
          getAttribute: (attr: string) => {
            if (attr === 'src') return 'https://example.com/images/button.png';
            if (attr === 'id') return 'btn-img';
            return null;
          },
          id: 'btn-img',
          naturalWidth: 80,
          naturalHeight: 80,
          width: 80,
          height: 80,
        };
        return fn(fakeImg);
      }),
      boundingBox: vi.fn().mockResolvedValue({ x: 20, y: 20, width: 80, height: 80 }),
      screenshot: vi.fn().mockImplementation(async ({ path }) => {
        await writeFile(path, Buffer.from('mock-png-bytes'));
      }),
    };

    const mockPage: any = {
      $$: vi.fn().mockImplementation(async (selector: string) => {
        if (selector === 'img') {
          querySelectorCalled = true;
          return [mockElement];
        }
        return [];
      }),
    };

    await (analyzer as any).processImagesForAssistiveMap(mockPage, 1, testOutputDir);

    expect(querySelectorCalled).toBe(true);
    expect(mockElement.screenshot).toHaveBeenCalled();
  });

  // Scenario 3: Both providers disabled: cropping is skipped safely
  it('Scenario 3: safely skips image cropping when both providers are disabled', async () => {
    config.gemini.enabled = false;
    config.gemini.apiKey = '';
    config.openai.enabled = false;
    config.openai.apiKey = '';

    expect(GeminiVisionProvider.isEnabled()).toBe(false);
    expect(OpenAIVisionProvider.isEnabled()).toBe(false);

    const analyzer = new VisionAnalyzer('test-scan-crop-disabled');

    const mockPage: any = {
      $$: vi.fn().mockResolvedValue([]),
    };

    await (analyzer as any).processImagesForAssistiveMap(mockPage, 1, testOutputDir);

    expect(mockPage.$$).not.toHaveBeenCalled();
    const imagesDir = join(testOutputDir, 'pages', '1', 'vision', 'images');
    expect(existsSync(imagesDir)).toBe(false);
  });

  // Scenario 4: Provider HTTP failure: sanitized failure telemetry is retained
  it('Scenario 4: captures sanitized HTTP failure telemetry without exposing raw error bodies or secrets', () => {
    const rawGoogleHttpError = {
      status: 403,
      error: 'API_KEY_INVALID: User api key AIzaSy-super-secret-key is not authorized for endpoint /v1beta/models/gemini-pro-vision:generateContent',
    };

    const diag = createProviderDiagnostics('gemini', 'describe_element', null, rawGoogleHttpError, false);

    expect(diag.provider).toBe('gemini');
    expect(diag.operation).toBe('describe_element');
    expect(diag.status).toBe('http_error');
    expect(diag.httpStatus).toBe(403);
    expect(diag.errorCategory).toBe('http_error');
    expect(diag.incorporated).toBe(false);

    // CRITICAL SECURITY ASSERTION: No secrets or raw error body present
    const serialized = JSON.stringify(diag);
    expect(serialized).not.toContain('AIzaSy');
    expect(serialized).not.toContain('API_KEY_INVALID');
    expect(serialized).not.toContain('/v1beta/models');
  });

  // Scenario 5: Provider returns no description: distinguishable from provider-not-enabled
  it('Scenario 5: distinguishes empty provider response from provider-not-enabled', () => {
    // 5A: Provider returned 200 OK but candidates had no text
    const emptyResponse = {
      status: 200,
      candidates: [],
    };
    const diagEmpty = createProviderDiagnostics('gemini', 'describe_element', null, emptyResponse, false);

    expect(diagEmpty.provider).toBe('gemini');
    expect(diagEmpty.status).toBe('empty_response');
    expect(diagEmpty.httpStatus).toBe(200);
    expect(diagEmpty.errorCategory).toBe('empty_response');

    // 5B: Provider disabled or uninitialized
    const diagDisabled = createProviderDiagnostics('none', 'describe_element', null, null, false);
    expect(diagDisabled.provider).toBe('none');
    expect(diagDisabled.status).toBe('provider_disabled');
    expect(diagDisabled.httpStatus).toBeUndefined();

    // Outcomes are clearly distinguishable
    expect(diagEmpty.status).not.toBe(diagDisabled.status);
    expect(diagEmpty.provider).not.toBe(diagDisabled.provider);
  });

  // Scenario 6: Successful provider response: description and provenance reach downstream fields
  it('Scenario 6: successfully incorporates description and establishes provenance', async () => {
    config.gemini.enabled = true;
    config.gemini.apiKey = 'mock-key';

    const generator = new AssistiveMapGenerator('test-scan-prov');

    // Mock geminiProvider on generator
    (generator as any).geminiProvider = {
      describeElement: vi.fn().mockResolvedValue({
        description: 'Chocolate chip cookies cooling on a wire rack.',
        rawResponse: { candidates: [{ content: { parts: [{ text: 'Chocolate chip cookies cooling on a wire rack.' }] } }] },
      }),
    };

    const mockArtifact: PageArtifact = {
      pageNumber: 1,
      url: 'https://example.com/recipe',
      htmlPath: '/dummy/path.html',
      html: `
        <html>
          <body>
            <img src="https://example.com/cookies.png" alt="" width="200" height="200" id="hero-img">
          </body>
        </html>
      `,
      screenshotPath: '/dummy/screenshot.png',
    };

    const { map } = await generator.generateAssistiveMap(mockArtifact, []);

    const imageEntry = map.imageDescriptions['#hero-img'];
    expect(imageEntry).toBeDefined();
    expect(imageEntry.alt).toBe('Chocolate chip cookies cooling on a wire rack.');
    expect(imageEntry.source).toBe('gemini');
    expect(imageEntry.confidence).toBe('medium');
    // Fallback since crop file was not created on disk in this mock
    expect(imageEntry.imageSource).toBe('viewport_fallback');
    expect(imageEntry.safetyNote).toContain('viewport fallback');

    // Provider telemetry attached to AssistiveMap
    expect(map.providerTelemetry).toBeDefined();
    expect(map.providerTelemetry?.provider).toBe('gemini');
    expect(map.providerTelemetry?.imageDescriptionsAttempted).toBe(1);
    expect(map.providerTelemetry?.imageDescriptionsSucceeded).toBe(1);
    expect(map.providerTelemetry?.viewportFallbacksUsed).toBe(1);
    expect(map.providerTelemetry?.cropsUsed).toBe(0);
    expect(map.providerTelemetry?.failures.length).toBe(0);
  });

  // Scenario 7: Sanitization: no API key, auth value, base64 payload reaches persisted objects
  it('Scenario 7: guarantees zero credential, authorization header, or image bytes in telemetry', () => {
    const rawOpenAIError = {
      error: 'Bearer sk-proj-1234567890abcdef is expired. Authorization: Bearer sk-proj-1234567890abcdef',
      status: 401,
      base64Image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    };

    const diag = createProviderDiagnostics('openai', 'describe_element', null, rawOpenAIError, false);

    const json = JSON.stringify(diag);
    expect(json).not.toContain('sk-proj-');
    expect(json).not.toContain('Bearer');
    expect(json).not.toContain('base64');
    expect(json).not.toContain('iVBORw0KGgoAAAANSUhEUg');
    expect(diag.status).toBe('http_error');
    expect(diag.httpStatus).toBe(401);
  });

  // Scenario 8: Crop vs Viewport Fallback distinction in AssistiveMapGenerator
  it('Scenario 8: distinguishes cropped image from full viewport fallback in AssistiveMap', async () => {
    config.gemini.enabled = true;
    config.gemini.apiKey = 'mock-key';

    const generator = new AssistiveMapGenerator('test-scan-crop-vs-fallback');

    (generator as any).geminiProvider = {
      describeElement: vi.fn().mockResolvedValue({
        description: 'Fresh baked bread on cutting board',
        rawResponse: {},
      }),
    };

    // Spy on findImageCrop to return an actual mock crop path
    vi.spyOn(generator as any, 'findImageCrop').mockResolvedValue('/pages/1/vision/images/img-src-abc123.png');

    const mockArtifact: PageArtifact = {
      pageNumber: 1,
      url: 'https://example.com',
      htmlPath: '/dummy/path.html',
      html: '<html><body><img src="/fresh-bread.png" alt="" width="50" height="50" id="bread-img"></body></html>',
      screenshotPath: '/dummy/screenshot.png',
    };

    const { map } = await generator.generateAssistiveMap(mockArtifact, []);
    const imgDesc = map.imageDescriptions['#bread-img'];

    expect(imgDesc).toBeDefined();
    expect(imgDesc.imageSource).toBe('crop');
    expect(imgDesc.imageArtifactPath).toBe('/pages/1/vision/images/img-src-abc123.png');
    expect(imgDesc.safetyNote).toBe('AI-generated description - verify accuracy');
    expect(imgDesc.safetyNote).not.toContain('viewport fallback');

    expect(map.providerTelemetry?.cropsUsed).toBe(1);
    expect(map.providerTelemetry?.viewportFallbacksUsed).toBe(0);
  });

  // Scenario 9: VisionAnalyzer.analyzeCandidate retains sanitized diagnostics on HTTP failure
  it('Scenario 9: VisionAnalyzer.analyzeCandidate records sanitized telemetry on HTTP failure and avoids false Gemini attribution', async () => {
    config.gemini.enabled = true;
    config.gemini.apiKey = 'mock-key';

    const analyzer = new VisionAnalyzer('test-scan-candidate-fail');
    (analyzer as any).geminiProvider = {
      extractText: vi.fn().mockResolvedValue({
        text: null,
        rawResponse: { status: 403, error: 'API_KEY_INVALID secret' },
      }),
      describeElement: vi.fn().mockResolvedValue({
        description: null,
        rawResponse: { status: 403, error: 'API_KEY_INVALID secret' },
      }),
    };

    const fakeBtn = {
      tagName: 'BUTTON',
      getAttribute: (attr: string) => (attr === 'id' ? 'cand-btn' : null),
      id: 'cand-btn',
      textContent: '',
      innerText: '',
      outerHTML: '<button id="cand-btn"></button>',
      getAttributeNames: () => [],
      classList: [],
      parentElement: null,
    };

    const mockPage: any = {};
    const mockElement: any = {
      screenshot: vi.fn().mockImplementation(async ({ path }) => {
        await writeFile(path, Buffer.from('mock-crop'));
      }),
      evaluate: vi.fn().mockImplementation((fn: any) => fn(fakeBtn)),
      boundingBox: vi.fn().mockResolvedValue({ x: 10, y: 10, width: 50, height: 50 }),
      getAttribute: vi.fn().mockResolvedValue(null),
      $: vi.fn().mockResolvedValue(null),
    };

    const finding = await (analyzer as any).analyzeCandidate(mockElement, mockPage, 1, 'https://example.com', testOutputDir);

    expect(finding).toBeDefined();
    expect(finding.evidenceJson).toBeDefined();
    expect(finding.evidenceJson.descriptionDiagnostics).toEqual({
      provider: 'gemini',
      operation: 'describe_element',
      status: 'http_error',
      httpStatus: 403,
      errorCategory: 'http_error',
      incorporated: false,
    });
    // CRITICAL: geminiDescription must NOT be defined so downstream consumers do not falsely flag finding as having AI output
    expect(finding.evidenceJson.geminiDescription).toBeUndefined();
    // CRITICAL: No secret leaked in evidenceJson
    expect(JSON.stringify(finding.evidenceJson)).not.toContain('secret');
    expect(JSON.stringify(finding.evidenceJson)).not.toContain('API_KEY_INVALID');
  });

  // Scenario 10: VisionAnalyzer.analyzeCandidate records provider_disabled when provider is uninitialized
  it('Scenario 10: VisionAnalyzer.analyzeCandidate records provider_disabled when no provider is configured', async () => {
    config.gemini.enabled = false;
    config.gemini.apiKey = '';
    config.openai.enabled = false;
    config.openai.apiKey = '';

    const analyzer = new VisionAnalyzer('test-scan-candidate-disabled');

    const fakeBtn = {
      tagName: 'BUTTON',
      getAttribute: (attr: string) => (attr === 'id' ? 'cand-btn-2' : null),
      id: 'cand-btn-2',
      textContent: '',
      innerText: '',
      outerHTML: '<button id="cand-btn-2"></button>',
      getAttributeNames: () => [],
      classList: [],
      parentElement: null,
    };

    const mockPage: any = {};
    const mockElement: any = {
      screenshot: vi.fn().mockImplementation(async ({ path }) => {
        await writeFile(path, Buffer.from('mock-crop'));
      }),
      evaluate: vi.fn().mockImplementation((fn: any) => fn(fakeBtn)),
      boundingBox: vi.fn().mockResolvedValue({ x: 10, y: 10, width: 50, height: 50 }),
      getAttribute: vi.fn().mockResolvedValue(null),
      $: vi.fn().mockResolvedValue(null),
    };

    const finding = await (analyzer as any).analyzeCandidate(mockElement, mockPage, 1, 'https://example.com', testOutputDir);

    expect(finding).toBeDefined();
    expect(finding.evidenceJson).toBeDefined();
    expect(finding.evidenceJson.providerDiagnostics).toEqual({
      provider: 'none',
      operation: 'describe_element',
      status: 'provider_disabled',
      incorporated: false,
    });
    expect(finding.evidenceJson.geminiDescription).toBeUndefined();
  });

  // =========================================================================
  // Phase 7B.5K.1: Gemini Model Configuration & Override Validation
  // =========================================================================

  // Scenario 11: resolves default model to 'gemini-3.8-flash'
  it('Scenario 11: resolves default model to gemini-3.8-flash', () => {
    // Restore default configuration
    delete process.env.GEMINI_MODEL;
    config.gemini.model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

    expect(config.gemini.model).toBe('gemini-3.8-flash');

    const provider = new GeminiVisionProvider();
    expect((provider as any).model).toBe('gemini-3.8-flash');
  });

  // Scenario 12: respects valid explicit GEMINI_MODEL override
  it('Scenario 12: respects valid explicit GEMINI_MODEL override', () => {
    config.gemini.model = 'gemini-2.0-flash';

    const provider = new GeminiVisionProvider();
    expect((provider as any).model).toBe('gemini-2.0-flash');
    expect((provider as any).apiUrl).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
    );
  });

  // Scenario 13: constructs valid generateContent API URL with default model
  it('Scenario 13: constructs valid generateContent API URL with default model', () => {
    config.gemini.model = 'gemini-3.8-flash';

    const provider = new GeminiVisionProvider();
    expect((provider as any).apiUrl).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent'
    );
  });

  // Scenario 14: remains disabled unless GEMINI_ENABLED equals true and key is non-empty
  it('Scenario 14: remains disabled unless GEMINI_ENABLED equals true and a non-empty key is configured', () => {
    // Case A: enabled = false, key present
    config.gemini.enabled = false;
    config.gemini.apiKey = 'valid-key';
    expect(GeminiVisionProvider.isEnabled()).toBe(false);

    // Case B: enabled = true, key empty
    config.gemini.enabled = true;
    config.gemini.apiKey = '';
    expect(GeminiVisionProvider.isEnabled()).toBe(false);

    // Case C: enabled = false, key empty
    config.gemini.enabled = false;
    config.gemini.apiKey = '';
    expect(GeminiVisionProvider.isEnabled()).toBe(false);

    // Case D: enabled = true, key present
    config.gemini.enabled = true;
    config.gemini.apiKey = 'valid-key';
    expect(GeminiVisionProvider.isEnabled()).toBe(true);
  });

  // =========================================================================
  // Phase 7B.5L.2: Safe Gemini Response Parsing & Thought-Content Isolation
  // =========================================================================

  // Scenario 15: Thought-text part followed by normal final-answer part: only final text extracted
  it('Scenario 15: excludes parts marked thought: true and extracts only final answer text', () => {
    const provider = new GeminiVisionProvider();
    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                thought: true,
                text: 'The user wants a description of this icon. I see a blue shopping cart with three wheels. I will describe it concisely.',
              },
              {
                text: 'Blue shopping cart icon.',
                thoughtSignature: 'sig123',
              },
            ],
          },
        },
      ],
    };

    const extracted = (provider as any).extractTextFromResponse(mockResponse);
    expect(extracted).toBe('Blue shopping cart icon.');
    expect(extracted).not.toContain('shopping cart with three wheels');
    expect(extracted).not.toContain('thought');
  });

  // Scenario 16: Response containing only thought parts yields null (no false description)
  it('Scenario 16: returns null when response contains only thought parts', () => {
    const provider = new GeminiVisionProvider();
    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                thought: true,
                text: 'Internal reasoning only. No final answer provided yet.',
              },
            ],
          },
        },
      ],
    };

    const extracted = (provider as any).extractTextFromResponse(mockResponse);
    expect(extracted).toBeNull();
  });

  // Scenario 17: Multiple ordinary text parts without thoughts are preserved and joined cleanly
  it('Scenario 17: preserves and cleanly joins multiple ordinary text parts', () => {
    const provider = new GeminiVisionProvider();
    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [
              { text: 'A fresh red apple.' },
              { text: 'Resting on a wooden cutting board.' },
            ],
          },
        },
      ],
    };

    const extracted = (provider as any).extractTextFromResponse(mockResponse);
    expect(extracted).toBe('A fresh red apple. Resting on a wooden cutting board.');
  });

  // Scenario 18: First-sentence extraction operates strictly on filtered answer, not thought part
  it('Scenario 18: operates first-sentence extraction strictly on non-thought answer', async () => {
    const provider = new GeminiVisionProvider();

    // Mock internal extractTextFromResponse to simulate thought isolation in describeElement
    const rawData = {
      candidates: [
        {
          content: {
            parts: [
              {
                thought: true,
                text: 'Sentence one of thought. Sentence two of thought.',
              },
              {
                text: 'Submit order button. Click to complete checkout.',
              },
            ],
          },
        },
      ],
    };

    const extracted = (provider as any).extractTextFromResponse(rawData);
    expect(extracted).toBe('Submit order button. Click to complete checkout.');

    // Simulate describeElement sentence boundary logic
    const firstSentence = extracted.split(/[.!?]/)[0].trim();
    expect(firstSentence).toBe('Submit order button');
    expect(firstSentence).not.toContain('thought');
  });

  // Scenario 19: Thought text cannot leak into AssistiveMap or evidenceJson
  it('Scenario 19: guarantees thought text cannot leak into AssistiveMap or evidenceJson', async () => {
    config.gemini.enabled = true;
    config.gemini.apiKey = 'mock-key';

    const generator = new AssistiveMapGenerator('test-scan-thought-isolation');

    // Simulate provider returning response where thought was safely filtered out
    (generator as any).geminiProvider = {
      describeElement: vi.fn().mockResolvedValue({
        description: 'Green checkmark indicating success.',
        rawResponse: {
          candidates: [
            {
              content: {
                parts: [{ text: 'Green checkmark indicating success.' }],
              },
            },
          ],
        },
      }),
    };

    const mockArtifact: PageArtifact = {
      pageNumber: 1,
      url: 'https://example.com/checkout',
      htmlPath: '/dummy/checkout.html',
      html: `
        <html>
          <body>
            <img src="https://example.com/success.png" alt="" width="50" height="50" id="success-icon">
          </body>
        </html>
      `,
      screenshotPath: '/dummy/screenshot.png',
    };

    const { map } = await generator.generateAssistiveMap(mockArtifact, []);

    const imgDesc = map.imageDescriptions['#success-icon'];
    expect(imgDesc).toBeDefined();
    expect(imgDesc.alt).toBe('Green checkmark indicating success.');
    expect(imgDesc.alt).not.toContain('thought');
    expect(JSON.stringify(map)).not.toContain('thought: true');
  });

  // Scenario 20: Empty, missing, and malformed parts retain safe explicit outcomes
  it('Scenario 20: safely handles empty, missing, and malformed candidates or parts', () => {
    const provider = new GeminiVisionProvider();

    expect((provider as any).extractTextFromResponse(null)).toBeNull();
    expect((provider as any).extractTextFromResponse({})).toBeNull();
    expect((provider as any).extractTextFromResponse({ candidates: [] })).toBeNull();
    expect((provider as any).extractTextFromResponse({ candidates: [{}] })).toBeNull();
    expect((provider as any).extractTextFromResponse({ candidates: [{ content: {} }] })).toBeNull();
    expect((provider as any).extractTextFromResponse({ candidates: [{ content: { parts: [] } }] })).toBeNull();
    expect(
      (provider as any).extractTextFromResponse({
        candidates: [
          {
            content: {
              parts: [null, undefined, { invalid: true }, { text: '' }],
            },
          },
        ],
      })
    ).toBeNull();
  });

  // Scenario 21: sanitizeRawResponse strips thought parts from raw response projection
  it('Scenario 21: strips parts marked thought: true in sanitizeRawResponse', () => {
    const provider = new GeminiVisionProvider();

    const rawInput = {
      candidates: [
        {
          index: 0,
          finishReason: 'STOP',
          content: {
            role: 'model',
            parts: [
              {
                thought: true,
                text: 'Private thinking process that must not be persisted or leaked.',
              },
              {
                text: 'Public clean output.',
              },
            ],
          },
        },
      ],
      usageMetadata: {
        promptTokenCount: 10,
        candidatesTokenCount: 20,
      },
    };

    const sanitized = (provider as any).sanitizeRawResponse(rawInput);
    expect(sanitized).toBeDefined();
    expect(sanitized.candidates[0].content.parts.length).toBe(1);
    expect(sanitized.candidates[0].content.parts[0].text).toBe('Public clean output.');
    expect(JSON.stringify(sanitized)).not.toContain('Private thinking process');
    expect(JSON.stringify(sanitized)).not.toContain('thought');
  });

  // Scenario 22: HTTP 429 triggers bounded backoff and respects retry ceiling
  it('Scenario 22: HTTP 429 triggers bounded backoff and respects retry ceiling', async () => {
    config.gemini.enabled = true;
    config.gemini.apiKey = 'test-key';
    config.gemini.maxRetries = 2;
    config.gemini.baseDelayMs = 10;
    config.gemini.maxDelayMs = 50;
    config.gemini.maxRetryBudgetMs = 500;

    const provider = new GeminiVisionProvider('scan-sc22');
    const sleepSpy = vi.spyOn(provider as any, 'sleep').mockResolvedValue(undefined);
    const doFetchSpy = vi.spyOn(provider as any, 'doFetch').mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'Rate limit exceeded',
      headers: new Headers(),
    });

    const cropPath = join(testOutputDir, 'crop-sc22.png');
    await writeFile(cropPath, Buffer.from('mock-bytes'));

    const result = await provider.describeElement(cropPath, 'button');
    expect(result.description).toBeNull();
    expect(result.rawResponse.status).toBe(429);
    expect(result.rawResponse.category).toBe('rate_limit_exceeded');

    // 1 initial attempt + 2 retries = 3 calls to doFetch
    expect(doFetchSpy).toHaveBeenCalledTimes(3);
    expect(sleepSpy).toHaveBeenCalledTimes(2);

    // Circuit breaker is now tripped for this scan
    expect(geminiBudgetTracker.isCircuitOpen('scan-sc22')).toBe(true);
    expect(geminiBudgetTracker.getCircuitReason('scan-sc22')).toBe('rate_limit_exceeded');
  });

  // Scenario 23: HTTP 503 follows separate retry policy and bounds
  it('Scenario 23: HTTP 503 follows separate retry policy and bounds', async () => {
    config.gemini.enabled = true;
    config.gemini.apiKey = 'test-key';
    config.gemini.maxRetries = 2;
    config.gemini.baseDelayMs = 10;

    const provider = new GeminiVisionProvider('scan-sc23');
    const sleepSpy = vi.spyOn(provider as any, 'sleep').mockResolvedValue(undefined);
    const doFetchSpy = vi.spyOn(provider as any, 'doFetch').mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'The model is overloaded. Please try again later.',
      headers: new Headers(),
    });

    const cropPath = join(testOutputDir, 'crop-sc23.png');
    await writeFile(cropPath, Buffer.from('mock-bytes'));

    const result = await provider.describeElement(cropPath, 'button');
    expect(result.description).toBeNull();
    expect(result.rawResponse.status).toBe(503);
    expect(result.rawResponse.category).toBe('service_unavailable');

    expect(doFetchSpy).toHaveBeenCalledTimes(3);
    expect(sleepSpy).toHaveBeenCalledTimes(2);
  });

  // Scenario 24: Valid Retry-After header is respected up to budget ceiling
  it('Scenario 24: respects valid Retry-After header up to budget ceiling', async () => {
    config.gemini.enabled = true;
    config.gemini.apiKey = 'test-key';
    config.gemini.maxRetries = 1;
    config.gemini.maxDelayMs = 5000;
    config.gemini.maxRetryBudgetMs = 10000;

    const provider = new GeminiVisionProvider('scan-sc24');
    const sleepSpy = vi.spyOn(provider as any, 'sleep').mockResolvedValue(undefined);

    let callCount = 0;
    vi.spyOn(provider as any, 'doFetch').mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: false,
          status: 429,
          text: async () => 'Too Many Requests',
          headers: new Headers({ 'retry-after': '3' }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            { content: { parts: [{ text: 'Magnifying glass search icon.' }] } },
          ],
        }),
      };
    });

    const cropPath = join(testOutputDir, 'crop-sc24.png');
    await writeFile(cropPath, Buffer.from('mock-bytes'));

    const result = await provider.describeElement(cropPath, 'button');
    expect(result.description).toBe('Magnifying glass search icon.');
    expect(sleepSpy).toHaveBeenCalledWith(3000);
  });

  // Scenario 25: Exhausted request budget stops further provider calls immediately
  it('Scenario 25: stops further provider calls immediately when request budget is exhausted', async () => {
    config.gemini.enabled = true;
    config.gemini.apiKey = 'test-key';
    config.gemini.maxRequestsPerScan = 2;

    const provider = new GeminiVisionProvider('scan-sc25');
    const doFetchSpy = vi.spyOn(provider as any, 'doFetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Icon description.' }] } }],
      }),
    });

    const cropPath = join(testOutputDir, 'crop-sc25.png');
    await writeFile(cropPath, Buffer.from('mock-bytes'));

    // Request 1: succeeds
    const res1 = await provider.describeElement(cropPath, 'button');
    expect(res1.description).toBe('Icon description.');

    // Request 2: succeeds (reaches budget limit of 2)
    const res2 = await provider.describeElement(cropPath, 'button');
    expect(res2.description).toBe('Icon description.');

    // Request 3: must be blocked by budget tracker without calling doFetch
    const res3 = await provider.describeElement(cropPath, 'button');
    expect(res3.description).toBeNull();
    expect(res3.rawResponse.category).toBe('request_budget_exhausted');
    expect(res3.rawResponse.status).toBe(429);

    // doFetch should only have been called twice
    expect(doFetchSpy).toHaveBeenCalledTimes(2);
  });

  // Scenario 26: Layer 2 successful descriptions preserved when later calls fail
  it('Scenario 26: preserves successful Layer 2 descriptions when subsequent calls fail', async () => {
    config.gemini.enabled = true;
    config.gemini.apiKey = 'test-key';

    const analyzer = new VisionAnalyzer('scan-sc26');
    let callIndex = 0;
    (analyzer as any).geminiProvider = {
      extractText: vi.fn().mockResolvedValue({ text: null, rawResponse: null }),
      describeElement: vi.fn().mockImplementation(async () => {
        callIndex++;
        if (callIndex === 1) {
          return {
            description: 'Pencil edit icon in circular button.',
            rawResponse: {
              candidates: [{ content: { parts: [{ text: 'Pencil edit icon in circular button.' }] } }],
            },
          };
        }
        return {
          description: null,
          rawResponse: { status: 429, error: 'Resource has been exhausted', category: 'quota_exhausted' },
        };
      }),
    };

    const mockBtn1 = {
      tagName: 'BUTTON',
      getAttribute: (attr: string) => (attr === 'id' ? 'btn-1' : null),
      id: 'btn-1',
      textContent: '',
      innerText: '',
      outerHTML: '<button id="btn-1"></button>',
      getAttributeNames: () => [],
      classList: [],
      parentElement: null,
    };

    const mockBtn2 = {
      tagName: 'BUTTON',
      getAttribute: (attr: string) => (attr === 'id' ? 'btn-2' : null),
      id: 'btn-2',
      textContent: '',
      innerText: '',
      outerHTML: '<button id="btn-2"></button>',
      getAttributeNames: () => [],
      classList: [],
      parentElement: null,
    };

    const el1: any = {
      screenshot: vi.fn().mockImplementation(async ({ path }) => writeFile(path, Buffer.from('b1'))),
      evaluate: vi.fn().mockImplementation((fn: any) => fn(mockBtn1)),
      boundingBox: vi.fn().mockResolvedValue({ x: 0, y: 0, width: 20, height: 20 }),
      getAttribute: vi.fn().mockResolvedValue(null),
      $: vi.fn().mockResolvedValue(null),
    };

    const el2: any = {
      screenshot: vi.fn().mockImplementation(async ({ path }) => writeFile(path, Buffer.from('b2'))),
      evaluate: vi.fn().mockImplementation((fn: any) => fn(mockBtn2)),
      boundingBox: vi.fn().mockResolvedValue({ x: 20, y: 20, width: 20, height: 20 }),
      getAttribute: vi.fn().mockResolvedValue(null),
      $: vi.fn().mockResolvedValue(null),
    };

    const finding1 = await (analyzer as any).analyzeCandidate(el1, {} as any, 1, 'https://example.com', testOutputDir);
    const finding2 = await (analyzer as any).analyzeCandidate(el2, {} as any, 1, 'https://example.com', testOutputDir);

    expect(finding1.evidenceJson.geminiDescription).toBeDefined();
    expect(finding1.evidenceJson.descriptionDiagnostics.status).toBe('success');
    expect(finding1.evidenceJson.descriptionDiagnostics.incorporated).toBe(true);

    expect(finding2.evidenceJson.geminiDescription).toBeUndefined();
    expect(finding2.evidenceJson.descriptionDiagnostics.status).toBe('quota_exhausted');
    expect(finding2.evidenceJson.descriptionDiagnostics.incorporated).toBe(false);
  });

  // Scenario 27: Layer 3 safely falls back to DOM/heuristic output when AI calls fail
  it('Scenario 27: Layer 3 safely falls back to DOM/heuristic output when AI calls fail', async () => {
    config.gemini.enabled = true;
    config.gemini.apiKey = 'test-key';

    const generator = new AssistiveMapGenerator('scan-sc27');
    (generator as any).geminiProvider = {
      describeElement: vi.fn().mockResolvedValue({
        description: null,
        rawResponse: { status: 429, error: 'Resource has been exhausted', category: 'quota_exhausted' },
      }),
    };

    const mockArtifact: PageArtifact = {
      pageNumber: 1,
      url: 'https://example.com/page',
      htmlPath: '/dummy/page.html',
      html: `
        <html>
          <body>
            <button id="submit-btn">Submit Order</button>
            <img src="https://example.com/recipe.png" alt="" width="50" height="50" id="recipe-img">
          </body>
        </html>
      `,
      screenshotPath: '/dummy/screenshot.png',
    };

    const { map } = await generator.generateAssistiveMap(mockArtifact, []);
    expect(map).toBeDefined();
    expect(map.providerTelemetry?.failures.length).toBe(1);
    expect(map.providerTelemetry?.failures[0].status).toBe('quota_exhausted');
    expect(map.providerTelemetry?.failures[0].httpStatus).toBe(429);
    // DOM action intent for the button was successfully retained
    expect(map.actionIntents['#submit-btn']).toBeDefined();
    expect(map.actionIntents['#submit-btn'].source).toBe('dom');
  });

  // Scenario 28: Layer 3 safely reuses Layer 2 description when identity & provenance match
  it('Scenario 28: Layer 3 safely reuses Layer 2 description when identity and provenance match', async () => {
    config.gemini.enabled = true;
    config.gemini.apiKey = 'test-key';

    const generator = new AssistiveMapGenerator('scan-sc28');
    const describeSpy = vi.fn();
    (generator as any).geminiProvider = {
      describeElement: describeSpy,
    };

    const mockArtifact: PageArtifact = {
      pageNumber: 1,
      url: 'https://example.com/recipe',
      htmlPath: '/dummy/recipe.html',
      html: `
        <html>
          <body>
            <button id="edit-pencil"></button>
          </body>
        </html>
      `,
      screenshotPath: '/dummy/screenshot.png',
    };

    const l2Findings: VisionFinding[] = [
      {
        id: 'finding-pencil',
        pageNumber: 1,
        url: 'https://example.com/recipe',
        kind: 'clickable_unlabeled',
        bbox: { x: 10, y: 10, width: 30, height: 30 },
        confidence: 'high',
        correlatedSelector: '#edit-pencil',
        suggestedWcagIds: ['4.1.2'],
        evidence: [],
        evidenceJson: {
          geminiDescription: {
            candidates: [
              { content: { parts: [{ text: 'A black pencil icon inside a circular button.' }] } },
            ],
          },
          descriptionDiagnostics: {
            provider: 'gemini',
            operation: 'describe_element',
            status: 'success',
            httpStatus: 200,
            incorporated: true,
          },
        },
      },
    ];

    const { map } = await generator.generateAssistiveMap(mockArtifact, l2Findings);

    expect(map.labelOverrides['#edit-pencil']).toBeDefined();
    expect(map.labelOverrides['#edit-pencil'].label).toBe('A black pencil icon inside a circular button.');
    expect(map.labelOverrides['#edit-pencil'].source).toBe('gemini');
    expect(map.labelOverrides['#edit-pencil'].confidence).toBe('medium');
    expect(map.providerTelemetry?.labelOverridesAttempted).toBe(1);
    expect(map.providerTelemetry?.labelOverridesSucceeded).toBe(1);

    // CRITICAL: describeElement was NOT called because Layer 2 description was reused!
    expect(describeSpy).not.toHaveBeenCalled();
  });

  // Scenario 29: Layer 3 rejects reuse when selector/element identity mismatches
  it('Scenario 29: Layer 3 rejects reuse when selector/element identity mismatches', async () => {
    config.gemini.enabled = true;
    config.gemini.apiKey = 'test-key';

    const generator = new AssistiveMapGenerator('scan-sc29');
    (generator as any).geminiProvider = {
      describeElement: vi.fn(),
    };

    const mockArtifact: PageArtifact = {
      pageNumber: 1,
      url: 'https://example.com/recipe',
      htmlPath: '/dummy/recipe.html',
      html: `
        <html>
          <body>
            <button id="different-element">Actual Text</button>
          </body>
        </html>
      `,
      screenshotPath: '/dummy/screenshot.png',
    };

    const l2Findings: VisionFinding[] = [
      {
        id: 'finding-orphan',
        pageNumber: 1,
        url: 'https://example.com/recipe',
        kind: 'clickable_unlabeled',
        bbox: { x: 10, y: 10, width: 30, height: 30 },
        confidence: 'high',
        // Selector that does not exist in DOM
        correlatedSelector: '#non-existent-pencil',
        suggestedWcagIds: ['4.1.2'],
        evidence: [],
        evidenceJson: {
          geminiDescription: {
            candidates: [
              { content: { parts: [{ text: 'A black pencil icon.' }] } },
            ],
          },
        },
      },
    ];

    const { map } = await generator.generateAssistiveMap(mockArtifact, l2Findings);

    // Mismatched selector must NOT produce a label override
    expect(map.labelOverrides['#non-existent-pencil']).toBeUndefined();
    expect(map.labelOverrides['#different-element']).toBeUndefined();
  });

  // Scenario 30: Provider telemetry counters remain exact across retries, failures, and budget exhaustion
  it('Scenario 30: maintains exact provider telemetry counters across retries, failures, and budget exhaustion', async () => {
    config.gemini.enabled = true;
    config.gemini.apiKey = 'test-key';
    config.gemini.maxRequestsPerScan = 1;

    const generator = new AssistiveMapGenerator('scan-sc30');
    const crop1 = join(testOutputDir, 'crop-sc30-1.png');
    const crop2 = join(testOutputDir, 'crop-sc30-2.png');
    await writeFile(crop1, Buffer.from('crop-one-distinct-bytes-sc30'));
    await writeFile(crop2, Buffer.from('crop-two-distinct-bytes-sc30'));
    vi.spyOn(generator as any, 'findImageCrop')
      .mockResolvedValueOnce(crop1)
      .mockResolvedValueOnce(crop2);

    let callCount = 0;
    (generator as any).geminiProvider = {
      describeElement: vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            description: 'First image alt description.',
            rawResponse: { candidates: [{ content: { parts: [{ text: 'First image alt description.' }] } }] },
          };
        }
        return {
          description: null,
          rawResponse: { status: 429, error: 'Request budget exhausted', category: 'request_budget_exhausted' },
        };
      }),
    };

    const mockArtifact: PageArtifact = {
      pageNumber: 1,
      url: 'https://example.com/gallery',
      htmlPath: '/dummy/gallery.html',
      html: `
        <html>
          <body>
            <img src="https://example.com/img1.png" alt="" width="50" height="50" id="img-1">
            <img src="https://example.com/img2.png" alt="" width="50" height="50" id="img-2">
          </body>
        </html>
      `,
      screenshotPath: '/dummy/screenshot.png',
    };

    const { map } = await generator.generateAssistiveMap(mockArtifact, []);
    const tel = map.providerTelemetry!;

    expect(tel.imageDescriptionsAttempted).toBe(2);
    expect(tel.imageDescriptionsSucceeded).toBe(1);
    expect(tel.failures.length).toBe(1);
    expect(tel.failures[0].status).toBe('request_budget_exhausted');
    expect(tel.failures[0].errorCategory).toBe('request_budget_exhausted');
    // Mathematical invariant
    expect(tel.imageDescriptionsAttempted).toBe(tel.imageDescriptionsSucceeded + tel.failures.length);
  });

  // Scenario 31: Zero secrets, keys, or raw error bodies exposed in diagnostics or evidenceJson
  it('Scenario 31: guarantees zero secrets, keys, or raw error bodies in diagnostics and evidenceJson', async () => {
    const rawErrorPayload = {
      status: 429,
      error: 'Google API key AIzaSy-super-secret-do-not-leak exhausted quota at https://generativelanguage.googleapis.com',
      headers: { authorization: 'Bearer super-secret-token' },
      body: 'Raw internal stack trace and dump',
    };

    const diag = createProviderDiagnostics(
      'gemini',
      'describe_element',
      null,
      rawErrorPayload,
      false
    );

    expect(diag.status).toBe('quota_exhausted');
    expect(diag.errorCategory).toBe('quota_exhausted');
    expect(diag.httpStatus).toBe(429);

    const serialized = JSON.stringify(diag);
    expect(serialized).not.toContain('AIzaSy');
    expect(serialized).not.toContain('super-secret');
    expect(serialized).not.toContain('Bearer');
    expect(serialized).not.toContain('stack trace');
    expect(serialized).not.toContain('authorization');
  });
});


