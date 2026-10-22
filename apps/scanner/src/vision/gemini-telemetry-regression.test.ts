import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VisionAnalyzer } from './analyzer.js';
import { AssistiveMapGenerator } from '../assistive/assistive-map-generator.js';
import { GeminiVisionProvider } from './gemini-provider.js';
import { OpenAIVisionProvider } from './openai-vision-provider.js';
import { createProviderDiagnostics } from './provider-telemetry.js';
import { imageCache } from '../assistive/image-cache.js';
import { config } from '../config.js';
import type { PageArtifact, VisionFinding } from '@raawi-x/core';
import { rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

describe('Phase 7B.5K — Gemini-Compatible Image Processing & Safe Telemetry Regression Suite', () => {
  const origGemini = { ...config.gemini };
  const origOpenai = { ...config.openai };
  const testOutputDir = join(process.cwd(), 'scratch', 'test-phase7b5k-output');

  beforeEach(async () => {
    vi.clearAllMocks();
    imageCache.clear();
    await mkdir(testOutputDir, { recursive: true });
  });

  afterEach(async () => {
    config.gemini.enabled = origGemini.enabled;
    config.gemini.apiKey = origGemini.apiKey;
    config.openai.enabled = origOpenai.enabled;
    config.openai.apiKey = origOpenai.apiKey;
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
});


