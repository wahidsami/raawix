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

  // Scenario 32: Physical request accounting includes retries
  it('Scenario 32: records every outbound dispatch including retries against scan and process budgets', async () => {
    config.gemini.enabled = true;
    config.gemini.apiKey = 'test-key';
    config.gemini.maxRetries = 2;
    config.gemini.maxRequestsPerScan = 15;
    config.gemini.maxRequestsPerMinute = 15;

    const provider = new GeminiVisionProvider('scan-sc32');
    vi.spyOn(provider as any, 'sleep').mockResolvedValue(undefined);

    let attempts = 0;
    const doFetchSpy = vi.spyOn(provider as any, 'doFetch').mockImplementation(async () => {
      attempts++;
      if (attempts < 3) {
        return {
          ok: false,
          status: 503,
          text: async () => 'Service Unavailable',
          headers: new Headers(),
        } as any;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Visual description succeeded on retry 2.' }] } }],
        }),
        headers: new Headers(),
      } as any;
    });

    const cropPath = join(testOutputDir, 'crop-sc32.png');
    await writeFile(cropPath, Buffer.from('mock-bytes-32'));

    const result = await provider.describeElement(cropPath, 'icon');
    expect(result.description).toBe('Visual description succeeded on retry 2.');
    expect(doFetchSpy).toHaveBeenCalledTimes(3);

    // Physical request accounting must show all 3 physical attempts
    const state = geminiBudgetTracker.getState('scan-sc32');
    expect(state.requestsAttempted).toBe(3);
    expect(geminiBudgetTracker.getDispatchedCountInLastMinute()).toBe(3);
    expect(state.pendingRequests).toBe(0);
  });

  // Scenario 33: Rolling-window pacing with concurrent requests
  it('Scenario 33: paces concurrent requests without race conditions using a rolling 60s window', async () => {
    config.gemini.maxRequestsPerMinute = 3;
    config.gemini.maxRequestsPerScan = 15;

    let virtualClock = 1000000;
    const sleepCalls: number[] = [];
    geminiBudgetTracker.setCustomTimer(
      () => virtualClock,
      async (ms: number) => {
        sleepCalls.push(ms);
        virtualClock += ms;
      }
    );

    // Launch 5 concurrent requests simultaneously
    const acquisitions = [
      geminiBudgetTracker.acquireDispatchSlot('scan-pace'),
      geminiBudgetTracker.acquireDispatchSlot('scan-pace'),
      geminiBudgetTracker.acquireDispatchSlot('scan-pace'),
      geminiBudgetTracker.acquireDispatchSlot('scan-pace'),
      geminiBudgetTracker.acquireDispatchSlot('scan-pace'),
    ];

    const slots = await Promise.all(acquisitions);

    // All 5 requests must eventually be permitted
    expect(slots.every((s) => s.allowed)).toBe(true);

    // Because maxRequestsPerMinute = 3 and 5 requests arrived simultaneously,
    // requests beyond capacity must trigger rolling-window pacing delays
    expect(sleepCalls.length).toBeGreaterThanOrEqual(1);
    expect(sleepCalls[0]).toBeGreaterThanOrEqual(60000);
    expect(virtualClock).toBeGreaterThanOrEqual(1000000 + 60000);

    // Clean up slots
    for (const s of slots) {
      s.release?.();
    }

    const state = geminiBudgetTracker.getState('scan-pace');
    expect(state.requestsAttempted).toBe(5);
    expect(state.pendingRequests).toBe(0);
  });

  // Scenario 34: Concurrent scans sharing the process-level limit
  it('Scenario 34: shares the process-level limit across multiple concurrent scans', async () => {
    config.gemini.maxRequestsPerMinute = 2;

    let virtualClock = 2000000;
    const sleepCalls: number[] = [];
    geminiBudgetTracker.setCustomTimer(
      () => virtualClock,
      async (ms: number) => {
        sleepCalls.push(ms);
        virtualClock += ms;
      }
    );

    // Scan A and Scan B claim 1 slot each, filling the process-wide limit of 2
    const slotA = await geminiBudgetTracker.acquireDispatchSlot('scan-A');
    const slotB = await geminiBudgetTracker.acquireDispatchSlot('scan-B');

    expect(slotA.allowed).toBe(true);
    expect(slotB.allowed).toBe(true);
    expect(sleepCalls.length).toBe(0);

    // Scan C now attempts to acquire a slot; process limit is full, so it must be paced
    const slotCPromise = geminiBudgetTracker.acquireDispatchSlot('scan-C');
    const slotC = await slotCPromise;

    expect(slotC.allowed).toBe(true);
    expect(sleepCalls.length).toBe(1);
    expect(sleepCalls[0]).toBeGreaterThanOrEqual(60000);

    // Release all slots
    slotA.release?.();
    slotB.release?.();
    slotC.release?.();

    expect(geminiBudgetTracker.getState('scan-A').requestsAttempted).toBe(1);
    expect(geminiBudgetTracker.getState('scan-B').requestsAttempted).toBe(1);
    expect(geminiBudgetTracker.getState('scan-C').requestsAttempted).toBe(1);
  });

  // Scenario 35: Confirmed quota exhaustion stopping subsequent requests
  it('Scenario 35: stops subsequent requests process-wide upon confirmed quota exhaustion', async () => {
    config.gemini.enabled = true;
    config.gemini.apiKey = 'test-key';

    const providerA = new GeminiVisionProvider('scan-quota-A');
    const providerB = new GeminiVisionProvider('scan-quota-B');

    const doFetchA = vi.spyOn(providerA as any, 'doFetch').mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'RESOURCE_EXHAUSTED: Quota exceeded for project 99999',
      headers: new Headers(),
    });

    const doFetchB = vi.spyOn(providerB as any, 'doFetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [] }),
      headers: new Headers(),
    });

    const cropPath = join(testOutputDir, 'crop-sc35.png');
    await writeFile(cropPath, Buffer.from('mock-bytes-35'));

    // Scan A encounters quota exhaustion
    const resA = await providerA.describeElement(cropPath, 'link');
    expect(resA.description).toBeNull();
    expect(resA.rawResponse.status).toBe(429);
    expect(resA.rawResponse.category).toBe('quota_exhausted');
    expect(doFetchA).toHaveBeenCalledTimes(1);

    // Process circuit breaker must be open
    expect(geminiBudgetTracker.isGlobalCircuitOpen()).toBe(true);
    expect(geminiBudgetTracker.getGlobalCircuitReason()).toBe('quota_exhausted');

    // Scan B now attempts a request; it MUST be blocked before network dispatch
    const resB = await providerB.describeElement(cropPath, 'button');
    expect(resB.description).toBeNull();
    expect(resB.rawResponse.category).toBe('quota_exhausted');
    expect(doFetchB).not.toHaveBeenCalled();

    // Verify scan B did not increment requestsAttempted for pre-rejected call
    expect(geminiBudgetTracker.getState('scan-quota-B').requestsAttempted).toBe(0);
  });

  // Scenario 36: HTTP 503 retry behavior remaining bounded
  it('Scenario 36: bounds HTTP 503 retries and records physical attempts', async () => {
    config.gemini.enabled = true;
    config.gemini.apiKey = 'test-key';
    config.gemini.maxRetries = 2;
    config.gemini.baseDelayMs = 10;
    config.gemini.maxDelayMs = 50;

    const provider = new GeminiVisionProvider('scan-503-bound');
    const sleepSpy = vi.spyOn(provider as any, 'sleep').mockResolvedValue(undefined);
    const doFetchSpy = vi.spyOn(provider as any, 'doFetch').mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'Service Unavailable',
      headers: new Headers(),
    });

    const cropPath = join(testOutputDir, 'crop-sc36.png');
    await writeFile(cropPath, Buffer.from('mock-bytes-36'));

    const result = await provider.describeElement(cropPath, 'table');
    expect(result.description).toBeNull();
    expect(result.rawResponse.status).toBe(503);
    expect(result.rawResponse.category).toBe('service_unavailable');

    // Exactly 1 initial + 2 retries = 3 physical attempts
    expect(doFetchSpy).toHaveBeenCalledTimes(3);
    expect(sleepSpy).toHaveBeenCalledTimes(2);

    const state = geminiBudgetTracker.getState('scan-503-bound');
    expect(state.requestsAttempted).toBe(3);
    expect(state.pendingRequests).toBe(0);
  });

  // Scenario 37: Per-scan budget exhaustion stopping dispatches
  it('Scenario 37: stops outbound dispatches when per-scan budget is exhausted', async () => {
    config.gemini.enabled = true;
    config.gemini.apiKey = 'test-key';
    config.gemini.maxRequestsPerScan = 2;

    const provider = new GeminiVisionProvider('scan-scan-exhaust');
    const doFetchSpy = vi.spyOn(provider as any, 'doFetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Element description.' }] } }],
      }),
      headers: new Headers(),
    });

    const cropPath = join(testOutputDir, 'crop-sc37.png');
    await writeFile(cropPath, Buffer.from('mock-bytes-37'));

    // Request 1: succeeds
    const res1 = await provider.describeElement(cropPath, 'img');
    expect(res1.description).toBe('Element description.');

    // Request 2: succeeds
    const res2 = await provider.describeElement(cropPath, 'img');
    expect(res2.description).toBe('Element description.');

    expect(doFetchSpy).toHaveBeenCalledTimes(2);
    expect(geminiBudgetTracker.getState('scan-scan-exhaust').requestsAttempted).toBe(2);

    // Request 3: must be stopped by per-scan budget limiter
    const res3 = await provider.describeElement(cropPath, 'img');
    expect(res3.description).toBeNull();
    expect(res3.rawResponse.category).toBe('request_budget_exhausted');

    // doFetch must NOT have been called for request 3
    expect(doFetchSpy).toHaveBeenCalledTimes(2);
    expect(geminiBudgetTracker.getState('scan-scan-exhaust').requestsAttempted).toBe(2);
  });

  // Scenario 38: Cleanup without cross-scan state leakage
  it('Scenario 38: isolates un-keyed scans and defers cleanup safely while requests are in-flight', async () => {
    // 1. Un-keyed callers receive unique ephemeral IDs (no shared 'default' state)
    const stateEphemeral1 = geminiBudgetTracker.getState();
    const stateEphemeral2 = geminiBudgetTracker.getState('');
    expect(stateEphemeral1.scanId).toMatch(/^_ephemeral_1_/);
    expect(stateEphemeral2.scanId).toMatch(/^_ephemeral_2_/);
    expect(stateEphemeral1.scanId).not.toBe(stateEphemeral2.scanId);

    // 2. Idle scan cleanup removes state immediately
    geminiBudgetTracker.getState('scan-idle');
    expect(geminiBudgetTracker.cleanup('scan-idle')).toBe(true);

    // 3. Scan with pending requests defers cleanup until slot is released
    const slot = await geminiBudgetTracker.acquireDispatchSlot('scan-in-flight');
    const inFlightState = geminiBudgetTracker.getState('scan-in-flight');
    expect(inFlightState.pendingRequests).toBe(1);

    // Attempting cleanup while request is in-flight must NOT delete state
    const cleaned = geminiBudgetTracker.cleanup('scan-in-flight');
    expect(cleaned).toBe(false);
    expect(inFlightState.markedForCleanup).toBe(true);

    // Releasing the slot completes deferred cleanup
    slot.release?.();
    expect(inFlightState.pendingRequests).toBe(0);

    // Evict stale states check
    geminiBudgetTracker.evictStaleStates(0); // Evict all idle states
  });

  // Scenario 39: Fetch timeout aborts at configured requestTimeoutMs without hanging
  it('Scenario 39: aborts stalled fetch at configured requestTimeoutMs', async () => {
    config.gemini.enabled = true;
    config.gemini.apiKey = 'test-timeout-key';
    config.gemini.requestTimeoutMs = 60; // 60ms timeout

    const provider = new GeminiVisionProvider('scan-sc39-timeout');

    // Spy on global fetch to verify signal abort behavior
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((_url: any, init: any) => {
      return new Promise((resolve, reject) => {
        if (init?.signal) {
          init.signal.addEventListener('abort', () => {
            const err = new DOMException('The operation was aborted due to timeout', 'TimeoutError');
            reject(err);
          });
        }
      });
    });

    const start = Date.now();
    await expect((provider as any).doFetch({})).rejects.toThrow(/timeout|aborted/i);
    const elapsed = Date.now() - start;

    expect(fetchSpy).toHaveBeenCalled();
    expect(elapsed).toBeGreaterThanOrEqual(40);
    expect(elapsed).toBeLessThan(1500); // Must abort quickly, not hang
  });

  // Scenario 40: Timeout telemetry records sanitized diagnostics without leaking secrets
  it('Scenario 40: records sanitized timeout diagnostics with latencyMs and zero secret leakage', () => {
    const rawTimeoutResponse = {
      status: 408,
      error: 'Request timeout',
      category: 'request_timeout',
      latencyMs: 15002,
      secretPayload: 'AIzaSy-do-not-leak-this-key',
    };

    const diag = createProviderDiagnostics(
      'gemini',
      'describe_element',
      null,
      rawTimeoutResponse,
      false
    );

    expect(diag.status).toBe('timeout');
    expect(diag.httpStatus).toBe(408);
    expect(diag.errorCategory).toBe('request_timeout');
    expect(diag.latencyMs).toBe(15002);
    expect(diag.incorporated).toBe(false);

    // Verify zero secret leakage
    const serialized = JSON.stringify(diag);
    expect(serialized).not.toContain('AIzaSy');
    expect(serialized).not.toContain('secretPayload');
    expect(serialized).not.toContain('headers');
  });

  // Scenario 41: Timeout releases dispatch slot and does not hang the scan
  it('Scenario 41: releases dispatch slot upon timeout so subsequent dispatches proceed', async () => {
    config.gemini.enabled = true;
    config.gemini.apiKey = 'test-key';
    config.gemini.maxRetries = 0; // No retries for immediate timeout check
    config.gemini.requestTimeoutMs = 20;

    const provider = new GeminiVisionProvider('scan-slot-release');
    vi.spyOn(provider as any, 'doFetch').mockRejectedValue(
      new DOMException('The operation was aborted due to timeout', 'TimeoutError')
    );

    const cropPath = join(testOutputDir, 'crop-sc41.png');
    await writeFile(cropPath, Buffer.from('mock-bytes-41'));

    const result = await provider.describeElement(cropPath, 'button');
    expect(result.description).toBeNull();
    expect(result.rawResponse.status).toBe(408);
    expect(result.rawResponse.category).toBe('request_timeout');
    expect(result.rawResponse.latencyMs).toBeDefined();

    // Verify dispatch slot was released in finally block
    const state = geminiBudgetTracker.getState('scan-slot-release');
    expect(state.pendingRequests).toBe(0);
    expect(state.requestsAttempted).toBe(1);

    // Next request immediately succeeds without hanging
    vi.spyOn(provider as any, 'doFetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Recovered button description.' }] } }],
      }),
      headers: new Headers(),
    });

    const recovered = await provider.describeElement(cropPath, 'button');
    expect(recovered.description).toBe('Recovered button description.');
    expect(state.pendingRequests).toBe(0);
    expect(state.requestsAttempted).toBe(2);
  });

  // Scenario 42: Retries remain bounded and each actual dispatch consumes a physical request slot
  it('Scenario 42: bounds retries on timeout, consuming a physical dispatch slot per attempt', async () => {
    config.gemini.enabled = true;
    config.gemini.apiKey = 'test-key';
    config.gemini.maxRetries = 2; // Initial + 2 retries = 3 attempts
    config.gemini.baseDelayMs = 5;

    const provider = new GeminiVisionProvider('scan-bounded-retry');
    const doFetchSpy = vi.spyOn(provider as any, 'doFetch').mockRejectedValue(
      new DOMException('The operation was aborted due to timeout', 'TimeoutError')
    );
    const sleepSpy = vi.spyOn(provider as any, 'sleep').mockResolvedValue(undefined);

    const cropPath = join(testOutputDir, 'crop-sc42.png');
    await writeFile(cropPath, Buffer.from('mock-bytes-42'));

    const result = await provider.describeElement(cropPath, 'img');
    expect(result.description).toBeNull();
    expect(result.rawResponse.status).toBe(408);
    expect(result.rawResponse.category).toBe('request_timeout');

    // Exactly 3 physical attempts: 1 initial + 2 retries
    expect(doFetchSpy).toHaveBeenCalledTimes(3);
    expect(sleepSpy).toHaveBeenCalledTimes(2);

    // State accounting: exactly 3 physical dispatches consumed, 0 pending
    const state = geminiBudgetTracker.getState('scan-bounded-retry');
    expect(state.requestsAttempted).toBe(3);
    expect(state.pendingRequests).toBe(0);
  });

  // Scenario 43: Layer 2 passes the real scan ID into VisionAnalyzer and the Gemini budget tracker
  it('Scenario 43: propagates scanId from PageCapture through VisionAnalyzer to Gemini provider', async () => {
    config.gemini.enabled = true;
    config.gemini.apiKey = 'test-key';

    const testScanId = 'scan_test_propagation_123';
    const analyzer = new VisionAnalyzer(testScanId);

    // Analyzer has scanId and geminiProvider has matching scanId
    expect((analyzer as any).scanId).toBe(testScanId);
    expect((analyzer as any).geminiProvider).toBeDefined();
    expect((analyzer as any).geminiProvider.scanId).toBe(testScanId);

    // PageCapture propagates scanId to VisionAnalyzer
    const { PageCapture } = await import('../crawler/page-capture.js');
    const capture = new PageCapture(testScanId);
    expect((capture as any).scanId).toBe(testScanId);

    // When scanId is missing or empty, unique ephemeral ID is generated (no 'default' leak)
    const emptyAnalyzer = new VisionAnalyzer();
    expect((emptyAnalyzer as any).scanId).toBeUndefined();
    const ephemeralState = geminiBudgetTracker.getState((emptyAnalyzer as any).geminiProvider.scanId);
    expect(ephemeralState.scanId).toMatch(/^_ephemeral_/);
    expect(ephemeralState.scanId).not.toBe('default');
  });

  // Scenario 44: Existing quota circuit-breaker behavior remains intact with timeout support
  it('Scenario 44: maintains instant quota circuit breaker tripping and blocks subsequent calls without timeout delay', async () => {
    config.gemini.enabled = true;
    config.gemini.apiKey = 'test-key';
    config.gemini.requestTimeoutMs = 15000;

    const provider = new GeminiVisionProvider('scan-quota-cb-intact');
    const doFetchSpy = vi.spyOn(provider as any, 'doFetch').mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => 'Resource has been exhausted (e.g. check quota). RESOURCE_EXHAUSTED',
      headers: new Headers(),
    });

    const cropPath = join(testOutputDir, 'crop-sc44.png');
    await writeFile(cropPath, Buffer.from('mock-bytes-44'));

    // First call encounters quota exhaustion and trips circuit breaker
    const res1 = await provider.describeElement(cropPath, 'div');
    expect(res1.description).toBeNull();
    expect(res1.rawResponse.category).toBe('quota_exhausted');
    expect(geminiBudgetTracker.isGlobalCircuitOpen()).toBe(true);

    // Second call is immediately halted before network dispatch (< 1ms, zero timeout delay)
    const start2 = Date.now();
    const res2 = await provider.describeElement(cropPath, 'div');
    const elapsed2 = Date.now() - start2;

    expect(res2.description).toBeNull();
    expect(res2.rawResponse.category).toBe('quota_exhausted');
    expect(elapsed2).toBeLessThan(100);
    // doFetch must NOT have been called for request 2
    expect(doFetchSpy).toHaveBeenCalledTimes(1);
  });
});


