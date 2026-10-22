import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { join, dirname } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import type { PageArtifact, VisionFinding } from '@raawi-x/core';
import { config } from '../config.js';
import { StructuredLogger } from '../utils/logger.js';
import { GeminiVisionProvider } from '../vision/gemini-provider.js';
import { OpenAIVisionProvider } from '../vision/openai-vision-provider.js';
import { createHash } from 'node:crypto';
import { ImageCandidateSelector } from './image-candidate-selector.js';
import { imageCache } from './image-cache.js';
import { FormAssistExtractor, type FormAssistPlan } from './form-assist-extractor.js';
import {
  createProviderDiagnostics,
  type AssistiveMapProviderTelemetry,
  type ProviderName,
} from '../vision/provider-telemetry.js';

export interface AssistiveMap {
  labelOverrides: Record<string, LabelOverride>;
  imageDescriptions: Record<string, ImageDescription>;
  actionIntents: Record<string, ActionIntent>;
  forms?: FormAssistPlan[]; // Form Assist Plan (new)
  providerTelemetry?: AssistiveMapProviderTelemetry;
}

export interface LabelOverride {
  selector: string;
  label: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'vision' | 'gemini' | 'dom';
  safetyNote?: string;
}

export interface ImageDescription {
  selector: string;
  alt: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'gemini' | 'dom' | 'vision';
  safetyNote?: string;
  imageArtifactPath?: string; // Path to cropped image
  imageVisualHash?: string; // SHA256 hash of image bytes for deduplication
  imageSource?: 'crop' | 'viewport_fallback';
}

export interface ActionIntent {
  selector: string;
  intent: string; // What the action does
  description: string; // Longer description
  confidence: 'high' | 'medium' | 'low';
  source: 'vision' | 'gemini' | 'dom';
}

export interface ConfidenceSummary {
  labelOverrides: { high: number; medium: number; low: number };
  imageDescriptions: { high: number; medium: number; low: number };
  actionIntents: { high: number; medium: number; low: number };
  forms?: { count: number; fieldsCount: number; uploadsCount: number; actionsCount: number }; // Form summary (new)
}

/**
 * Generate Third Layer Assistive Map from Layer 1 (DOM) + Layer 2 (Vision + optional Gemini)
 */
export type VisionModelProvider = GeminiVisionProvider | OpenAIVisionProvider;

export class AssistiveMapGenerator {
  private logger: StructuredLogger;
  private geminiProvider?: VisionModelProvider;
  private providerName: ProviderName = 'none';
  private scanId?: string;
  private geminiImageCount: number = 0; // Track images processed per scan for rate limiting

  constructor(scanId?: string) {
    this.logger = new StructuredLogger(scanId);
    this.scanId = scanId;

    if (GeminiVisionProvider.isEnabled()) {
      this.geminiProvider = new GeminiVisionProvider(this.scanId);
      this.providerName = 'gemini';
    } else if (OpenAIVisionProvider.isEnabled()) {
      this.geminiProvider = new OpenAIVisionProvider();
      this.providerName = 'openai';
    } else {
      this.providerName = 'none';
    }
  }

  /**
   * Generate assistive map for a page
   */
  async generateAssistiveMap(
    artifact: PageArtifact,
    visionFindings: VisionFinding[],
    scanId?: string
  ): Promise<{ map: AssistiveMap; confidenceSummary: ConfidenceSummary }> {
    const providerName: ProviderName = this.geminiProvider
      ? (this.geminiProvider instanceof GeminiVisionProvider ? 'gemini' : (this.geminiProvider instanceof OpenAIVisionProvider ? 'openai' : this.providerName))
      : 'none';

    const telemetry: AssistiveMapProviderTelemetry = {
      provider: providerName,
      labelOverridesAttempted: 0,
      labelOverridesSucceeded: 0,
      imageDescriptionsAttempted: 0,
      imageDescriptionsSucceeded: 0,
      cropsUsed: 0,
      viewportFallbacksUsed: 0,
      failures: [],
    };

    const map: AssistiveMap = {
      labelOverrides: {},
      imageDescriptions: {},
      actionIntents: {},
      providerTelemetry: telemetry,
    };

    if (!artifact.htmlPath || !artifact.html) {
      return { map, confidenceSummary: this.computeConfidenceSummary(map) };
    }

    try {
      const dom = new JSDOM(artifact.html);
      const document = dom.window.document;

      // 1. Process vision findings for unlabeled controls
      await this.processVisionFindings(document, visionFindings, map, artifact, scanId);

      // 2. Process images missing alt text
      await this.processImages(document, map, artifact, scanId);

      // 3. Process action intents (buttons, links)
      await this.processActions(document, map, artifact, scanId);

      // 4. Process forms (Form Assist Plan)
      await this.processForms(document, visionFindings, map, artifact, scanId);

      const confidenceSummary = this.computeConfidenceSummary(map);

      return { map, confidenceSummary };
    } catch (error) {
      this.logger.error('Failed to generate assistive map', {
        error: error instanceof Error ? error.message : 'Unknown error',
        url: artifact.url,
      });
      return { map, confidenceSummary: this.computeConfidenceSummary(map) };
    }
  }

  /**
   * Process vision findings to generate label overrides for unlabeled controls
   */
  private async processVisionFindings(
    document: Document,
    visionFindings: VisionFinding[],
    map: AssistiveMap,
    artifact: PageArtifact,
    scanId?: string
  ): Promise<void> {
    for (const finding of visionFindings) {
      if (finding.kind === 'clickable_unlabeled' || finding.kind === 'icon_button_unlabeled') {
        const selector = finding.correlatedSelector;
        if (!selector) continue;

        // Check if element exists in DOM
        const element = document.querySelector(selector);
        if (!element) continue;

        // Check if already has accessible name
        const hasAccessibleName = this.hasAccessibleName(element);
        if (hasAccessibleName) continue; // Skip if already labeled

        // Try to get label from vision finding
        let label: string | null = finding.detectedText || null;
        let confidence: 'high' | 'medium' | 'low' = finding.confidence as 'high' | 'medium' | 'low';
        let source: 'vision' | 'gemini' | 'dom' = 'vision';

        // Safe Layer 2 reuse: If Layer 2 already generated a Gemini description, reuse it
        const l2GeminiDesc = finding.evidenceJson?.geminiDescription?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!label && l2GeminiDesc && typeof l2GeminiDesc === 'string' && l2GeminiDesc.trim().length > 0) {
          label = l2GeminiDesc.trim();
          source = 'gemini';
          confidence = 'medium';
          if (map.providerTelemetry) {
            map.providerTelemetry.labelOverridesAttempted++;
            map.providerTelemetry.labelOverridesSucceeded++;
          }
          this.logger.info('Reusing Layer 2 Gemini description for label override', {
            selector,
            label,
          });
        }

        // If provider enabled and no label found, try AI vision description
        if (!label && this.geminiProvider && artifact.screenshotPath) {
          const providerName: ProviderName =
            this.geminiProvider instanceof GeminiVisionProvider ? 'gemini' : 'openai';
          if (map.providerTelemetry) {
            map.providerTelemetry.labelOverridesAttempted++;
          }
          try {
            // Get element bounding box from vision finding
            const bbox = finding.bbox as { x: number; y: number; width: number; height: number };

            // For MVP, use the full screenshot (in production, crop to bbox)
            const geminiResult = await this.geminiProvider.describeElement(
              artifact.screenshotPath,
              finding.kind
            );

            const diag = createProviderDiagnostics(
              providerName,
              'describe_element',
              geminiResult.description,
              geminiResult.rawResponse,
              !!geminiResult.description
            );

            if (geminiResult.description) {
              label = geminiResult.description;
              source = 'gemini';
              confidence = 'medium'; // AI vision outputs are medium confidence
              if (map.providerTelemetry) {
                map.providerTelemetry.labelOverridesSucceeded++;
              }
            } else if (map.providerTelemetry) {
              map.providerTelemetry.failures.push({
                operation: 'label_override',
                status: diag.status,
                httpStatus: diag.httpStatus,
                errorCategory: diag.errorCategory,
              });
            }
          } catch (error) {
            this.logger.warn('AI vision description failed for unlabeled control', {
              selector,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            if (map.providerTelemetry) {
              map.providerTelemetry.failures.push({
                operation: 'label_override',
                status: 'unknown_error',
                errorCategory: 'unknown_error',
              });
            }
          }
        }

        if (label) {
          map.labelOverrides[selector] = {
            selector,
            label,
            confidence,
            source,
            safetyNote: source === 'gemini' ? 'AI-generated label - verify accuracy' : undefined,
          };
        }
      }
    }
  }

  /**
   * Process images missing alt text with hardened candidate selection and caching
   */
  private async processImages(
    document: Document,
    map: AssistiveMap,
    artifact: PageArtifact,
    scanId?: string
  ): Promise<void> {
    const images = document.querySelectorAll('img');

    for (const img of Array.from(images)) {
      // A) Candidate selection rules
      const candidateCheck = ImageCandidateSelector.isCandidate(img);
      if (!candidateCheck.isCandidate) {
        this.logger.info('Skipping image candidate', {
          selector: this.generateSelector(img),
          reason: candidateCheck.reason,
        });
        continue;
      }

      // Generate selector
      const selector = this.generateSelector(img);
      const src = img.getAttribute('src') || '';

      // If Gemini or OpenAI enabled, generate alt text
      if (this.geminiProvider && artifact.screenshotPath) {
        const maxImages = GeminiVisionProvider.isEnabled()
          ? config.gemini.maxImagesPerScan
          : config.openai.maxImagesPerScan;

        // E) Safety controls: Rate limit per scan
        if (this.geminiImageCount >= maxImages) {
          this.logger.warn('Vision AI image processing rate limit reached', {
            scanId,
            maxImages,
          });
          continue;
        }

        try {
          // B) Pixel extraction: Try to use cropped image if available
          // Look for image crop in vision/images/ folder (use src for reliable matching)
          const imageCropPath = await this.findImageCrop(artifact, selector, src, scanId);
          const imagePath = imageCropPath || artifact.screenshotPath;
          const imageSource: 'crop' | 'viewport_fallback' = imageCropPath ? 'crop' : 'viewport_fallback';

          if (map.providerTelemetry) {
            map.providerTelemetry.imageDescriptionsAttempted++;
            if (imageCropPath) {
              map.providerTelemetry.cropsUsed++;
            } else {
              map.providerTelemetry.viewportFallbacksUsed++;
            }
          }

          // D) Caching & dedupe: Compute visual hash and check cache
          const visualHash = await imageCache.computeVisualHash(imagePath);
          const cachedEntry = imageCache.get(visualHash);

          let description: string | null = null;
          let confidence: 'high' | 'medium' | 'low' = 'medium';

          if (cachedEntry) {
            // Use cached description
            description = cachedEntry.description;
            confidence = cachedEntry.confidence;
            if (map.providerTelemetry) {
              map.providerTelemetry.imageDescriptionsSucceeded++;
            }
            this.logger.info('Using cached image description', { visualHash, selector });
          } else {
            const providerName: ProviderName =
              this.geminiProvider instanceof GeminiVisionProvider ? 'gemini' : 'openai';
            // Call AI provider with constrained prompt
            const context = ImageCandidateSelector.getNearbyContext(img);
            const geminiResult = await this.geminiProvider.describeElement(
              imagePath,
              'image',
              context || undefined
            );

            const diag = createProviderDiagnostics(
              providerName,
              'describe_element',
              geminiResult.description,
              geminiResult.rawResponse,
              !!geminiResult.description
            );

            if (geminiResult.description) {
              description = geminiResult.description;
              confidence = 'medium'; // AI vision outputs are always medium confidence
              this.geminiImageCount++;
              if (map.providerTelemetry) {
                map.providerTelemetry.imageDescriptionsSucceeded++;
              }

              // Cache the result
              imageCache.set(visualHash, description, confidence, imageCropPath || undefined);
            } else if (map.providerTelemetry) {
              map.providerTelemetry.failures.push({
                operation: 'image_description',
                status: diag.status,
                httpStatus: diag.httpStatus,
                errorCategory: diag.errorCategory,
              });
            }
          }

          if (description) {
            map.imageDescriptions[selector] = {
              selector,
              alt: description,
              confidence,
              source: 'gemini',
              safetyNote: imageSource === 'crop'
                ? 'AI-generated description - verify accuracy'
                : 'AI-generated description (viewport fallback) - verify accuracy',
              imageArtifactPath: imageCropPath || undefined,
              imageVisualHash: visualHash,
              imageSource,
            };
          }
        } catch (error) {
          this.logger.warn('AI vision alt text generation failed', {
            selector,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          if (map.providerTelemetry) {
            map.providerTelemetry.failures.push({
              operation: 'image_description',
              status: 'unknown_error',
              errorCategory: 'unknown_error',
            });
          }
        }
      }
    }
  }

  /**
   * Find cropped image in vision/images/ folder if it exists
   * Images are cropped during page capture/vision analysis phase
   * 
   * IMPORTANT: Uses src attribute hash for matching since Layer 2 and Layer 3
   * might generate different selectors (async vs sync, live DOM vs JSDOM)
   */
  private async findImageCrop(
    artifact: PageArtifact,
    selector: string,
    src: string,
    scanId?: string
  ): Promise<string | null> {
    if (!artifact.screenshotPath || !scanId) {
      return null;
    }

    // Construct path to vision/images/ folder
    const pageDir = dirname(artifact.screenshotPath);
    const imagesDir = join(pageDir, 'vision', 'images');

    if (!existsSync(imagesDir)) {
      return null;
    }

    // Strategy 1: Try src-based filename (most reliable - Layer 2 uses this now)
    if (src) {
      const srcHash = createHash('sha256').update(src).digest('hex').substring(0, 16);
      const srcBasedPath = join(imagesDir, `img-src-${srcHash}.png`);
      if (existsSync(srcBasedPath)) {
        return srcBasedPath;
      }
    }

    // Strategy 2: Try selector hash (for backward compatibility with old scans)
    const selectorHash = createHash('sha256').update(selector).digest('hex').substring(0, 16);
    const selectorBasedPath = join(imagesDir, `img-${selectorHash}.png`);
    if (existsSync(selectorBasedPath)) {
      return selectorBasedPath;
    }

    // Not found - Layer 3 will fall back to full screenshot
    return null;
  }

  /**
   * Process action intents (buttons, links)
   */
  private async processActions(
    document: Document,
    map: AssistiveMap,
    artifact: PageArtifact,
    scanId?: string
  ): Promise<void> {
    const actions = document.querySelectorAll('button, a[href], [role="button"], [role="link"]');

    for (const action of Array.from(actions)) {
      const selector = this.generateSelector(action);
      const tagName = action.tagName.toLowerCase();

      // Get accessible name
      const accessibleName = this.getAccessibleName(action);

      // Infer intent from context
      const intent = this.inferActionIntent(action, accessibleName);
      const description = this.generateActionDescription(action, accessibleName, intent);

      if (intent) {
        map.actionIntents[selector] = {
          selector,
          intent,
          description,
          confidence: accessibleName ? 'high' : 'medium',
          source: 'dom',
        };
      }
    }
  }

  /**
   * Check if element has accessible name
   */
  private hasAccessibleName(element: Element): boolean {
    const name = this.getAccessibleName(element);
    return Boolean(name && name.trim().length > 0);
  }

  /**
   * Get accessible name from element
   */
  private getAccessibleName(element: Element): string {
    // Try aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

    // Try aria-labelledby
    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const labelElement = element.ownerDocument.getElementById(ariaLabelledBy);
      if (labelElement && labelElement.textContent) {
        return labelElement.textContent.trim();
      }
    }

    // Try text content
    const textContent = element.textContent?.trim();
    if (textContent) return textContent;

    // Try title attribute
    const title = element.getAttribute('title');
    if (title && title.trim()) return title.trim();

    // For images, try alt
    if (element.tagName.toLowerCase() === 'img') {
      const alt = element.getAttribute('alt');
      if (alt && alt.trim()) return alt.trim();
    }

    return '';
  }

  /**
   * Generate robust, unique selector for element within the page
   */
  generateSelector(element: Element, doc?: Document): string {
    const document = doc || element.ownerDocument;
    if (!document) {
      return element.tagName.toLowerCase();
    }

    const isUnique = (sel: string): boolean => {
      try {
        return document.querySelectorAll(sel).length === 1;
      } catch {
        return false;
      }
    };

    // 1. Try id (must be unique in document and a valid CSS ident)
    if (element.id && /^[a-zA-Z][\w:.-]*$/.test(element.id)) {
      const idSel = `#${element.id}`;
      if (isUnique(idSel)) {
        return idSel;
      }
    }

    // 2. Try data-testid or data-id
    const testId = element.getAttribute('data-testid') || element.getAttribute('data-id');
    if (testId) {
      const testIdSel = `[data-testid="${testId}"]`;
      if (isUnique(testIdSel)) {
        return testIdSel;
      }
    }

    const tagName = element.tagName.toLowerCase();

    // 3. For links, try a[href="..."]
    if (tagName === 'a') {
      const href = element.getAttribute('href');
      if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
        const escapedHref = href.replace(/["\\]/g, '\\$&');
        const hrefSel = `a[href="${escapedHref}"]`;
        if (isUnique(hrefSel)) {
          return hrefSel;
        }
      }
    }

    // 4. Try tag with name or type attribute
    const name = element.getAttribute('name');
    if (name) {
      const nameSel = `${tagName}[name="${name}"]`;
      if (isUnique(nameSel)) {
        return nameSel;
      }
    }

    // 5. Try class names
    const classes = Array.from(element.classList).filter((c) => c.length > 0 && !/\s/.test(c));
    if (classes.length > 0) {
      const classSel = `${tagName}.${classes.join('.')}`;
      if (isUnique(classSel)) {
        return classSel;
      }
    }

    // 6. Build hierarchical path with ancestor context and :nth-of-type
    const path: string[] = [];
    let current: Element | null = element;

    while (current && current !== document.documentElement && current !== document.body) {
      const parent: Element | null = current.parentElement;
      if (!parent) {
        path.unshift(current.tagName.toLowerCase());
        break;
      }

      // If an ancestor has a unique ID, anchor to that ancestor
      if (current.id && /^[a-zA-Z][\w:.-]*$/.test(current.id) && isUnique(`#${current.id}`)) {
        path.unshift(`#${current.id}`);
        break;
      }

      const tag = current.tagName.toLowerCase();
      const currentClasses = Array.from(current.classList).filter((c) => c.length > 0 && !/\s/.test(c));
      const classSuffix = currentClasses.length > 0 ? `.${currentClasses[0]}` : '';

      const siblings = Array.from(parent.children).filter((c) => c.tagName === current!.tagName);
      const index = siblings.indexOf(current);
      const part = siblings.length > 1 ? `${tag}${classSuffix}:nth-of-type(${index + 1})` : `${tag}${classSuffix}`;
      path.unshift(part);

      const candidate = path.join(' > ');
      if (isUnique(candidate)) {
        return candidate;
      }

      current = parent;
    }

    const fullPath = path.join(' > ');
    if (isUnique(fullPath)) {
      return fullPath;
    }

    // 7. Safe fallback: element tag + nth-of-type relative to parent
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter((c) => c.tagName === element.tagName);
      const index = siblings.indexOf(element);
      if (index >= 0 && siblings.length > 1) {
        return `${tagName}:nth-of-type(${index + 1})`;
      }
    }

    return tagName;
  }

  /**
   * Infer action intent from element
   */
  private inferActionIntent(element: Element, accessibleName: string): string {
    const tagName = element.tagName.toLowerCase();
    const href = element.getAttribute('href');
    const type = element.getAttribute('type');
    const role = element.getAttribute('role');

    // Use accessible name if available
    if (accessibleName) {
      return accessibleName;
    }

    // Infer from attributes
    if (tagName === 'a' && href) {
      if (href.startsWith('mailto:')) return 'Send email';
      if (href.startsWith('tel:')) return 'Call phone number';
      if (href.startsWith('#')) return 'Navigate to section';
      return 'Open link';
    }

    if (tagName === 'button' || role === 'button') {
      if (type === 'submit') return 'Submit form';
      if (type === 'reset') return 'Reset form';
      return 'Activate button';
    }

    if (role === 'link') return 'Open link';

    return 'Activate control';
  }

  /**
   * Generate action description
   */
  private generateActionDescription(
    element: Element,
    accessibleName: string,
    intent: string
  ): string {
    if (accessibleName) {
      return `${intent}: ${accessibleName}`;
    }
    return intent;
  }

  /**
   * Process forms (Form Assist Plan)
   */
  private async processForms(
    document: Document,
    visionFindings: VisionFinding[],
    map: AssistiveMap,
    artifact: PageArtifact,
    scanId?: string
  ): Promise<void> {
    try {
      const extractor = new FormAssistExtractor(scanId);
      const forms = await extractor.extractForms(document, visionFindings, artifact);

      if (forms.length > 0) {
        map.forms = forms;
        this.logger.info('Form Assist Plan extracted', {
          formsCount: forms.length,
          totalFields: forms.reduce((sum, f) => sum + f.fields.length, 0),
          totalUploads: forms.reduce((sum, f) => sum + f.uploads.length, 0),
          totalActions: forms.reduce((sum, f) => sum + f.actions.length, 0),
        });
      }
    } catch (error) {
      this.logger.warn('Form extraction failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Compute confidence summary
   */
  private computeConfidenceSummary(map: AssistiveMap): ConfidenceSummary {
    const summary: ConfidenceSummary = {
      labelOverrides: { high: 0, medium: 0, low: 0 },
      imageDescriptions: { high: 0, medium: 0, low: 0 },
      actionIntents: { high: 0, medium: 0, low: 0 },
    };

    for (const override of Object.values(map.labelOverrides)) {
      summary.labelOverrides[override.confidence]++;
    }

    for (const desc of Object.values(map.imageDescriptions)) {
      summary.imageDescriptions[desc.confidence]++;
    }

    for (const intent of Object.values(map.actionIntents)) {
      summary.actionIntents[intent.confidence]++;
    }

    // Form summary
    if (map.forms && map.forms.length > 0) {
      summary.forms = {
        count: map.forms.length,
        fieldsCount: map.forms.reduce((sum, f) => sum + f.fields.length, 0),
        uploadsCount: map.forms.reduce((sum, f) => sum + f.uploads.length, 0),
        actionsCount: map.forms.reduce((sum, f) => sum + f.actions.length, 0),
      };
    }

    return summary;
  }

  /**
   * Compute fingerprint hash from page fingerprint
   */
  static computeFingerprintHash(fingerprint: { title?: string; firstHeading?: string; mainTextHash?: string }): string {
    const fingerprintStr = JSON.stringify({
      title: fingerprint.title,
      firstHeading: fingerprint.firstHeading,
      mainTextHash: fingerprint.mainTextHash,
    });
    return createHash('sha256').update(fingerprintStr).digest('hex');
  }
}

