import type { Page, ElementHandle } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import type { VisionFinding, EvidenceItem } from '@raawi-x/core';
import { config } from '../config.js';
import { StructuredLogger } from '../utils/logger.js';
import { GeminiVisionProvider } from './gemini-provider.js';
import { ImageCandidateSelector } from '../assistive/image-candidate-selector.js';

/**
 * Vision analyzer: Detects potentially inaccessible UI elements using visual analysis
 */
export class VisionAnalyzer {
  private logger: StructuredLogger;
  private scanId?: string;
  private geminiProvider?: GeminiVisionProvider;

  constructor(scanId?: string) {
    this.scanId = scanId;
    this.logger = new StructuredLogger(scanId);

    // Initialize Gemini provider if enabled
    if (GeminiVisionProvider.isEnabled()) {
      this.geminiProvider = new GeminiVisionProvider();
      this.logger.info('Gemini Vision provider enabled');
    }
  }

  /**
   * Analyze page for vision findings
   */
  async analyzePage(
    page: Page,
    pageNumber: number,
    pageUrl: string,
    outputDir: string
  ): Promise<VisionFinding[]> {
    if (!config.vision.enabled) {
      return [];
    }

    try {
      this.logger.info('Starting vision analysis', { pageNumber, url: pageUrl });

      // Collect candidate interactive elements
      const candidates = await this.collectInteractiveElements(page);

      this.logger.info('Collected interactive candidates', {
        pageNumber,
        count: candidates.length,
      });

      const findings: VisionFinding[] = [];

      // Analyze each candidate
      for (const candidate of candidates) {
        try {
          const finding = await this.analyzeCandidate(
            candidate,
            page,
            pageNumber,
            pageUrl,
            outputDir
          );
          if (finding) {
            findings.push(finding);
          }
        } catch (error) {
          this.logger.warn('Failed to analyze candidate', {
            pageNumber,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          // Continue with other candidates
        }
      }

      // Process images for assistive map generation (crop images for Gemini)
      await this.processImagesForAssistiveMap(page, pageNumber, outputDir);

      this.logger.info('Vision analysis complete', {
        pageNumber,
        findingsCount: findings.length,
      });

      return findings;
    } catch (error) {
      this.logger.error('Vision analysis failed', {
        pageNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Collect candidate interactive elements
   */
  private async collectInteractiveElements(page: Page): Promise<ElementHandle[]> {
    // Query for interactive elements
    const selectors = [
      'button',
      'a[href]',
      'input',
      'select',
      'textarea',
      '[role="button"]',
      '[tabindex]',
      '[onclick]', // Elements with click handlers
    ];

    const candidates: ElementHandle[] = [];

    for (const selector of selectors) {
      const elements = await page.$$(selector);
      candidates.push(...elements);
    }

    // Remove duplicates (element might match multiple selectors)
    const uniqueCandidates = new Set<ElementHandle>();
    for (const candidate of candidates) {
      uniqueCandidates.add(candidate);
    }

    return Array.from(uniqueCandidates);
  }

  /**
   * Analyze a single candidate element
   */
  private async analyzeCandidate(
    element: ElementHandle,
    page: Page,
    pageNumber: number,
    pageUrl: string,
    outputDir: string
  ): Promise<VisionFinding | null> {
    // Get element properties
    const tagName = await element.evaluate((el) => (el as Element).tagName.toLowerCase());
    const boundingBox = await element.boundingBox();
    if (!boundingBox) {
      return null; // Element not visible
    }

    // Compute accessible name
    const accessibleName = await this.computeAccessibleName(element, page);

    // Get inner text
    const innerText = await element.evaluate((el) => ((el as HTMLElement).innerText?.trim() || ''));

    // Check if icon-only
    const isIconOnly = await this.isIconOnly(element);

    // Generate stable selector
    const selector = await this.generateStableSelector(element);

    // Get outerHTML snippet
    const outerHTML = await element.evaluate((el) => (el as Element).outerHTML);
    const htmlSnippet = outerHTML.substring(0, 500);

    // Analyze for findings
    const findings: VisionFinding[] = [];

    // 1. Clickable unlabeled
    if (
      (tagName === 'button' || tagName === 'a' || await this.isClickable(element)) &&
      !accessibleName &&
      !innerText
    ) {
      findings.push({
        id: `vision-${pageNumber}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        pageNumber,
        url: pageUrl,
        kind: 'clickable_unlabeled',
        bbox: {
          x: boundingBox.x,
          y: boundingBox.y,
          width: boundingBox.width,
          height: boundingBox.height,
        },
        confidence: accessibleName ? 'low' : 'high',
        correlatedSelector: selector,
        evidence: [
          {
            type: 'element',
            value: htmlSnippet,
            selector,
            description: 'Clickable element without accessible name or text',
          },
        ],
        suggestedWcagIds: ['4.1.2'],
      });
    }

    // 2. Icon button unlabeled
    if (isIconOnly && !accessibleName && (tagName === 'button' || await this.isClickable(element))) {
      findings.push({
        id: `vision-${pageNumber}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        pageNumber,
        url: pageUrl,
        kind: 'icon_button_unlabeled',
        bbox: {
          x: boundingBox.x,
          y: boundingBox.y,
          width: boundingBox.width,
          height: boundingBox.height,
        },
        confidence: 'high',
        correlatedSelector: selector,
        evidence: [
          {
            type: 'element',
            value: htmlSnippet,
            selector,
            description: 'Icon-only button without accessible name',
          },
        ],
        suggestedWcagIds: ['4.1.2'],
      });
    }

    // 3. Looks like button but not button
    if (
      (tagName === 'div' || tagName === 'span') &&
      !(await this.hasRoleOrTabIndex(element)) &&
      (await this.looksLikeButton(element))
    ) {
      findings.push({
        id: `vision-${pageNumber}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        pageNumber,
        url: pageUrl,
        kind: 'looks_like_button_not_button',
        bbox: {
          x: boundingBox.x,
          y: boundingBox.y,
          width: boundingBox.width,
          height: boundingBox.height,
        },
        confidence: 'medium',
        correlatedSelector: selector,
        evidence: [
          {
            type: 'element',
            value: htmlSnippet,
            selector,
            description: 'Element styled like a button but not semantically a button',
          },
        ],
        suggestedWcagIds: ['4.1.2'],
      });
    }

    // Save screenshot crops and add to evidence
    if (findings.length > 0) {
      const visionDir = join(outputDir, 'pages', pageNumber.toString(), 'vision');
      await mkdir(visionDir, { recursive: true });

      for (const finding of findings) {
        try {
          const cropPath = join(visionDir, `${finding.id}.png`);
          await element.screenshot({ path: cropPath });

          // Add crop to evidence
          finding.evidence.push({
            type: 'screenshot',
            value: `pages/${pageNumber}/vision/${finding.id}.png`,
            selector,
            description: 'Screenshot crop of detected element',
          });

          // Optional OCR (tesseract.js fallback)
          if (config.vision.ocrEnabled && !innerText && !accessibleName) {
            const ocrText = await this.runOCR(cropPath);
            if (ocrText && ocrText.trim().length > 0) {
              finding.detectedText = ocrText.trim();
              finding.confidence = 'medium'; // OCR found text, but may not be accessible
              finding.evidence.push({
                type: 'text',
                value: ocrText.trim(),
                description: 'Text detected via OCR (may not be accessible to screen readers)',
              });
            }
          }

          // Gemini Vision enhancement (OCR + description)
          if (this.geminiProvider) {
            try {
              // Extract text via Gemini (more accurate OCR)
              if (!finding.detectedText || finding.detectedText.trim().length === 0) {
                const geminiTextResult = await this.geminiProvider.extractText(cropPath);
                if (geminiTextResult.text && geminiTextResult.text.trim().length > 0) {
                  finding.detectedText = geminiTextResult.text.trim();
                  // Gemini outputs are always low/medium confidence, needs_review
                  finding.confidence = 'medium';

                  // Store raw Gemini response in evidence
                  finding.evidence.push({
                    type: 'text',
                    value: geminiTextResult.text.trim(),
                    description: 'Text detected via Gemini Vision API (may not be accessible to screen readers)',
                  });

                  // Store raw provider output for auditability
                  if (!finding.evidenceJson) {
                    finding.evidenceJson = {};
                  }
                  finding.evidenceJson.geminiTextExtraction = geminiTextResult.rawResponse;
                }
              }

              // Get element description for user guidance
              const geminiDescResult = await this.geminiProvider.describeElement(cropPath, finding.kind);
              if (geminiDescResult.description && geminiDescResult.description.trim().length > 0) {
                // Add description to evidence (for widget guidance)
                finding.evidence.push({
                  type: 'text',
                  value: geminiDescResult.description.trim(),
                  description: 'UI element description from Gemini Vision API (for user guidance only)',
                });

                // Store raw provider output for auditability
                if (!finding.evidenceJson) {
                  finding.evidenceJson = {};
                }
                finding.evidenceJson.geminiDescription = geminiDescResult.rawResponse;
              }
            } catch (error) {
              this.logger.warn('Gemini enhancement failed', {
                findingId: finding.id,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
              // Continue - Gemini failure should not break vision analysis
            }
          }
        } catch (error) {
          this.logger.warn('Failed to save screenshot crop', {
            findingId: finding.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    // Return first finding (or null if none)
    return findings.length > 0 ? findings[0] : null;
  }

  /**
   * Compute accessible name (best effort)
   */
  private async computeAccessibleName(element: ElementHandle, page: Page): Promise<string> {
    // Check aria-label
    const ariaLabel = await element.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) {
      return ariaLabel.trim();
    }

    // Check aria-labelledby
    const ariaLabelledBy = await element.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      try {
        const labelElement = await page.$(`#${ariaLabelledBy}`);
        if (labelElement) {
          const labelText = await labelElement.evaluate((el) => el.textContent?.trim() || '');
          if (labelText) {
            return labelText;
          }
        }
      } catch {
        // Ignore errors
      }
    }

    // Check associated label
    const id = await element.getAttribute('id');
    if (id) {
      try {
        const label = await page.$(`label[for="${id}"]`);
        if (label) {
          const labelText = await label.evaluate((el) => el.textContent?.trim() || '');
          if (labelText) {
            return labelText;
          }
        }
      } catch {
        // Ignore errors
      }
    }

    // Check wrapped label
    try {
      const parentLabel = await element.evaluateHandle((el) => {
        let parent = el.parentElement;
        while (parent && parent.tagName.toLowerCase() !== 'label') {
          parent = parent.parentElement;
        }
        return parent;
      });
      const labelElement = await parentLabel.asElement();
      if (labelElement) {
        const labelText = await labelElement.evaluate((el) => {
          if (!el) return '';
          return (el as Element).textContent?.trim() || '';
        });
        if (labelText) {
          return labelText;
        }
      }
    } catch {
      // Ignore errors
    }

    return '';
  }

  /**
   * Check if element is icon-only
   */
  private async isIconOnly(element: ElementHandle): Promise<boolean> {
    const innerText = await element.evaluate((el: Element) => (el as HTMLElement).innerText?.trim() || '');
    if (innerText) {
      return false;
    }

    // Check for SVG or IMG
    const hasSvg = await element.$('svg');
    const hasImg = await element.$('img');
    const hasIconClass = await element.evaluate((el: Element) => {
      const classList = Array.from((el as HTMLElement).classList);
      return classList.some((cls: string) => cls.includes('icon') || cls.includes('Icon'));
    });

    return !!(hasSvg || hasImg || hasIconClass);
  }

  /**
   * Check if element is clickable
   */
  private async isClickable(element: ElementHandle): Promise<boolean> {
    const tagName = await element.evaluate((el: Element) => el.tagName.toLowerCase());
    if (tagName === 'button' || tagName === 'a') {
      return true;
    }

    const role = await element.getAttribute('role');
    if (role === 'button') {
      return true;
    }

    const tabIndex = await element.getAttribute('tabindex');
    if (tabIndex !== null) {
      return true;
    }

    const hasOnClick = await element.getAttribute('onclick');
    if (hasOnClick) {
      return true;
    }

    return false;
  }

  /**
   * Check if element has role or tabindex
   */
  private async hasRoleOrTabIndex(element: ElementHandle): Promise<boolean> {
    const role = await element.getAttribute('role');
    const tabIndex = await element.getAttribute('tabindex');
    return role !== null || tabIndex !== null;
  }

  /**
   * Check if element looks like a button (CSS heuristics)
   */
  private async looksLikeButton(element: ElementHandle): Promise<boolean> {
    const styles = await element.evaluate((el) => {
      const computed = window.getComputedStyle(el as Element);
      return {
        cursor: computed.cursor,
        border: computed.border,
        borderWidth: computed.borderWidth,
        backgroundColor: computed.backgroundColor,
        padding: computed.padding,
        borderRadius: computed.borderRadius,
      };
    });

    // Heuristic: button-like styling
    const hasButtonCursor = styles.cursor === 'pointer';
    const hasBorder = styles.borderWidth !== '0px' && styles.border !== 'none';
    const hasBackground = styles.backgroundColor !== 'transparent' && styles.backgroundColor !== 'rgba(0, 0, 0, 0)';
    const hasPadding = styles.padding !== '0px';
    const hasBorderRadius = styles.borderRadius !== '0px';

    // If it has pointer cursor and at least 2 other button-like properties
    const buttonLikeProperties = [hasBorder, hasBackground, hasPadding, hasBorderRadius].filter(Boolean).length;
    return hasButtonCursor && buttonLikeProperties >= 2;
  }

  /**
   * Generate stable selector for element
   */
  private async generateStableSelector(element: ElementHandle): Promise<string> {
    try {
      const selector = await element.evaluate((el: Element) => {
        const htmlEl = el as HTMLElement;
        // Try ID first
        if (htmlEl.id) {
          return `#${htmlEl.id}`;
        }

        // Try data-testid or data-id
        const testId = htmlEl.getAttribute('data-testid') || htmlEl.getAttribute('data-id');
        if (testId) {
          return `[data-testid="${testId}"]`;
        }

        // Try class combination
        if (htmlEl.className && typeof htmlEl.className === 'string') {
          const classes = htmlEl.className.split(' ').filter((c: string) => c.length > 0);
          if (classes.length > 0) {
            return `${el.tagName.toLowerCase()}.${classes[0]}`;
          }
        }

        // Fallback to tag name
        return el.tagName.toLowerCase();
      });

      return selector;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Run OCR on image (optional, requires tesseract.js)
   */
  private async runOCR(imagePath: string): Promise<string | null> {
    if (!config.vision.ocrEnabled) {
      return null;
    }

    try {
      // Dynamic import to avoid requiring tesseract.js if OCR is disabled
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const { data } = await worker.recognize(imagePath);
      await worker.terminate();
      return data.text?.trim() || null;
    } catch (error) {
      this.logger.warn('OCR failed', {
        imagePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Save vision findings to JSON file
   */
  async saveFindings(
    findings: VisionFinding[],
    pageNumber: number,
    outputDir: string
  ): Promise<string> {
    const visionDir = join(outputDir, 'pages', pageNumber.toString(), 'vision');
    await mkdir(visionDir, { recursive: true });

    const visionPath = join(visionDir, 'vision.json');
    await writeFile(visionPath, JSON.stringify(findings, null, 2), 'utf-8');

    return visionPath;
  }

  /**
   * Process images for assistive map generation
   * Crops images that need alt text descriptions and stores them for Gemini processing
   */
  private async processImagesForAssistiveMap(
    page: Page,
    pageNumber: number,
    outputDir: string
  ): Promise<void> {
    if (!GeminiVisionProvider.isEnabled()) {
      return; // Skip if Gemini not enabled
    }

    try {
      // Create images directory
      const imagesDir = join(outputDir, 'pages', pageNumber.toString(), 'vision', 'images');
      await mkdir(imagesDir, { recursive: true });

      // Get all img elements
      const imgElements = await page.$$('img');

      for (const imgElement of imgElements) {
        try {
          // Get element properties for candidate selection
          const elementInfo = await imgElement.evaluate((el) => {
            const img = el as HTMLImageElement;
            return {
              alt: img.getAttribute('alt'),
              src: img.getAttribute('src') || '',
              ariaHidden: img.getAttribute('aria-hidden'),
              role: img.getAttribute('role'),
              width: img.naturalWidth || img.width || 0,
              height: img.naturalHeight || img.height || 0,
            };
          });

          // Check if visible and size > 24x24
          if (elementInfo.width < 24 || elementInfo.height < 24) {
            continue; // Too small
          }

          // Check bounding box (for visibility)
          const boundingBox = await imgElement.boundingBox();
          if (!boundingBox || boundingBox.width < 24 || boundingBox.height < 24) {
            continue; // Not visible or too small
          }

          // Apply candidate selection rules (simplified check here)
          // Skip if aria-hidden="true" or role="presentation"
          if (elementInfo.ariaHidden === 'true' || elementInfo.role === 'presentation') {
            continue;
          }

          // Skip if has meaningful alt (not empty, not low-quality)
          if (elementInfo.alt && elementInfo.alt.trim().length > 0) {
            // Check if low-quality pattern
            const isLowQuality = /^(image|photo|picture|img|banner|spacer|divider|placeholder|\d+)$/i.test(
              elementInfo.alt.trim()
            );
            if (!isLowQuality) {
              continue; // Has meaningful alt
            }
          }

          // Check if decorative filename
          const isDecorative = ImageCandidateSelector.isDecorativeFilename(elementInfo.src);
          if (elementInfo.alt === '' && isDecorative) {
            continue; // Empty alt with decorative filename - likely decorative
          }

          // Generate stable selector for filename
          const selector = await this.generateStableSelector(imgElement);
          // Use src attribute for more reliable matching (Layer 3 can match by src)
          const src = elementInfo.src || '';
          const srcHash = src ? createHash('sha256').update(src).digest('hex').substring(0, 16) : '';
          const selectorHash = createHash('sha256').update(selector).digest('hex').substring(0, 16);

          // Use src-based filename if available, else fallback to selector-based
          const filename = srcHash ? `img-src-${srcHash}.png` : `img-${selectorHash}.png`;
          const cropPath = join(imagesDir, filename);
          await imgElement.screenshot({ path: cropPath });

          this.logger.info('Image cropped for assistive map', {
            pageNumber,
            selector,
            cropPath,
          });
        } catch (error) {
          this.logger.warn('Failed to crop image for assistive map', {
            pageNumber,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          // Continue with other images
        }
      }
    } catch (error) {
      this.logger.warn('Image processing for assistive map failed', {
        pageNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Non-fatal - continue
    }
  }


}

