import { JSDOM } from 'jsdom';
import { createHash } from 'node:crypto';
import type { VisionFinding } from '@raawi-x/core';
import { StructuredLogger } from '../utils/logger.js';
import { GeminiVisionProvider } from '../vision/gemini-provider.js';
import type { PageArtifact } from '@raawi-x/core';

/**
 * Form Assist Plan - Structured form metadata for widget guidance
 */
export interface FormAssistPlan {
  formId: string;
  stepIndex?: number;
  stepTitle?: { en?: string; ar?: string };
  scopeSelector?: string; // container for the step/form
  fields: FormField[];
  uploads: FormUpload[];
  actions: FormAction[];
}

export interface FormField {
  key: string; // stable id (hash of selector + label)
  selector: string; // CSS selector to focus/fill
  tag: 'input' | 'select' | 'textarea' | 'button';
  inputType?: string; // text/email/tel/number/password/date/...
  role?: string;
  required: boolean;
  disabled?: boolean;
  label: { en?: string; ar?: string }; // best label
  labelSource: 'dom' | 'aria' | 'vision' | 'gemini' | 'override';
  hint?: { en?: string; ar?: string }; // placeholder/help text summarized
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

export interface FormUpload {
  key: string;
  selector: string; // input[type=file]
  required?: boolean;
  label: { en?: string; ar?: string };
  acceptedTypes?: string; // accept attr
  hint?: { en?: string; ar?: string }; // e.g., "Upload ID copy"
}

export interface FormAction {
  key: string;
  selector: string;
  type: 'next' | 'back' | 'save' | 'submit' | 'login' | 'verify';
  label: { en?: string; ar?: string };
  intent?: { en?: string; ar?: string }; // e.g., "Proceed to next step"
}

/**
 * Extract form assist plans from DOM (Layer 1)
 * Optionally enriched with Vision (Layer 2) and Gemini (Layer 3)
 */
export class FormAssistExtractor {
  private logger: StructuredLogger;
  private geminiProvider?: GeminiVisionProvider;
  private scanId?: string;

  constructor(scanId?: string) {
    this.logger = new StructuredLogger(scanId);
    this.scanId = scanId;

    if (GeminiVisionProvider.isEnabled()) {
      this.geminiProvider = new GeminiVisionProvider();
    }
  }

  /**
   * Extract form assist plans from page
   */
  async extractForms(
    document: Document,
    visionFindings: VisionFinding[],
    artifact: PageArtifact
  ): Promise<FormAssistPlan[]> {
    const forms: FormAssistPlan[] = [];

    // 1. Detect <form> elements
    const formElements = document.querySelectorAll('form');
    for (const form of Array.from(formElements)) {
      const formPlan = await this.extractFormPlan(form, document, visionFindings, artifact);
      if (formPlan) {
        forms.push(formPlan);
      }
    }

    // 2. Detect form-like containers (>=3 inputs within semantic container)
    const formLikeContainers = this.findFormLikeContainers(document);
    for (const container of formLikeContainers) {
      // Skip if already inside a form
      if (container.closest('form')) continue;

      const formPlan = await this.extractFormPlanFromContainer(
        container,
        document,
        visionFindings,
        artifact
      );
      if (formPlan) {
        forms.push(formPlan);
      }
    }

    return forms;
  }

  /**
   * Extract form plan from <form> element
   */
  private async extractFormPlan(
    form: HTMLFormElement,
    document: Document,
    visionFindings: VisionFinding[],
    artifact: PageArtifact
  ): Promise<FormAssistPlan | null> {
    const formId = this.generateFormId(form);
    const scopeSelector = this.generateSelector(form);

    // Detect stepper UI
    const stepInfo = this.detectStepper(form);

    // Extract fields
    const fields = await this.extractFields(form, document, visionFindings, artifact);

    // Extract uploads
    const uploads = this.extractUploads(form, document);

    // Extract actions
    const actions = this.extractActions(form, document);

    if (fields.length === 0 && uploads.length === 0) {
      return null; // Skip empty forms
    }

    return {
      formId,
      stepIndex: stepInfo?.stepIndex,
      stepTitle: stepInfo?.stepTitle,
      scopeSelector,
      fields,
      uploads,
      actions,
    };
  }

  /**
   * Extract form plan from form-like container
   */
  private async extractFormPlanFromContainer(
    container: HTMLElement,
    document: Document,
    visionFindings: VisionFinding[],
    artifact: PageArtifact
  ): Promise<FormAssistPlan | null> {
    const formId = this.generateFormId(container);
    const scopeSelector = this.generateSelector(container);

    // Detect stepper UI
    const stepInfo = this.detectStepper(container);

    // Extract fields
    const fields = await this.extractFields(container, document, visionFindings, artifact);

    // Extract uploads
    const uploads = this.extractUploads(container, document);

    // Extract actions (including nearby buttons)
    const actions = this.extractActions(container, document);

    if (fields.length === 0 && uploads.length === 0) {
      return null; // Skip empty containers
    }

    return {
      formId,
      stepIndex: stepInfo?.stepIndex,
      stepTitle: stepInfo?.stepTitle,
      scopeSelector,
      fields,
      uploads,
      actions,
    };
  }

  /**
   * Find form-like containers (>=3 inputs within semantic container)
   */
  private findFormLikeContainers(document: Document): HTMLElement[] {
    const containers: HTMLElement[] = [];
    const semanticContainers = document.querySelectorAll(
      'div, section, article, main, [role="form"], [role="application"]'
    );

    for (const container of Array.from(semanticContainers)) {
      const inputs = container.querySelectorAll('input, textarea, select');
      if (inputs.length >= 3 && !container.closest('form')) {
        containers.push(container as HTMLElement);
      }
    }

    return containers;
  }

  /**
   * Detect stepper UI (multi-step forms)
   */
  private detectStepper(element: Element): { stepIndex?: number; stepTitle?: { en?: string; ar?: string } } | null {
    // Check for aria-current="step"
    const currentStep = element.querySelector('[aria-current="step"]');
    if (currentStep) {
      const stepText = currentStep.textContent?.trim() || '';
      const stepMatch = stepText.match(/(\d+)/);
      const stepIndex = stepMatch ? parseInt(stepMatch[1], 10) : undefined;

      return {
        stepIndex,
        stepTitle: stepText ? { en: stepText } : undefined,
      };
    }

    // Check for step/progress/wizard classes
    const stepClasses = ['step', 'progress', 'wizard', 'stepper'];
    for (const className of stepClasses) {
      const stepElement = element.querySelector(`[class*="${className}"]`);
      if (stepElement) {
        const stepText = stepElement.textContent?.trim() || '';
        const stepMatch = stepText.match(/(\d+)/);
        const stepIndex = stepMatch ? parseInt(stepMatch[1], 10) : undefined;

        return {
          stepIndex,
          stepTitle: stepText ? { en: stepText } : undefined,
        };
      }
    }

    return null;
  }

  /**
   * Extract fields from form/container
   */
  private async extractFields(
    container: Element,
    document: Document,
    visionFindings: VisionFinding[],
    artifact: PageArtifact
  ): Promise<FormField[]> {
    const fields: FormField[] = [];
    const inputs = container.querySelectorAll('input, select, textarea');

    for (const input of Array.from(inputs)) {
      const tag = input.tagName.toLowerCase() as 'input' | 'select' | 'textarea' | 'button';
      const type = (input as HTMLInputElement).type || '';

      // Skip submit, button, hidden, reset
      if (type === 'submit' || type === 'button' || type === 'hidden' || type === 'reset') {
        continue;
      }

      const selector = this.generateSelector(input);

      // Determine required
      const required = this.isRequired(input);

      // Determine disabled
      const disabled = input.hasAttribute('disabled') ||
        input.getAttribute('aria-disabled') === 'true';

      // Extract label (priority: label[for] > aria-label > aria-labelledby > nearest label > placeholder)
      let label: { en?: string; ar?: string } | undefined;
      let labelSource: 'dom' | 'aria' | 'vision' | 'gemini' | 'override' = 'dom';

      // Priority 1: <label for=...>
      if (input.id) {
        const labelElement = document.querySelector(`label[for="${input.id}"]`);
        if (labelElement && labelElement.textContent) {
          label = { en: labelElement.textContent.trim() };
          labelSource = 'dom';
        }
      }

      // Priority 2: aria-label
      if (!label) {
        const ariaLabel = input.getAttribute('aria-label');
        if (ariaLabel && ariaLabel.trim()) {
          label = { en: ariaLabel.trim() };
          labelSource = 'aria';
        }
      }

      // Priority 3: aria-labelledby
      if (!label) {
        const ariaLabelledBy = input.getAttribute('aria-labelledby');
        if (ariaLabelledBy) {
          const labelElement = document.getElementById(ariaLabelledBy);
          if (labelElement && labelElement.textContent) {
            label = { en: labelElement.textContent.trim() };
            labelSource = 'aria';
          }
        }
      }

      // Priority 4: Nearest label-like element
      if (!label) {
        const nearestLabel = this.findNearestLabel(input);
        if (nearestLabel) {
          label = { en: nearestLabel };
          labelSource = 'dom';
        }
      }

      // Priority 5: Placeholder (weak label)
      if (!label && (input as HTMLInputElement).placeholder) {
        label = { en: (input as HTMLInputElement).placeholder };
        labelSource = 'dom';
      }

      // Vision enrichment (if label missing or garbage)
      if ((!label || !label.en || label.en.length < 2) && visionFindings.length > 0) {
        const visionLabel = this.findVisionLabel(input, visionFindings);
        if (visionLabel) {
          label = { en: visionLabel };
          labelSource = 'vision';
        }
      }

      // Gemini enrichment (if still missing and Gemini enabled)
      if ((!label || !label.en || label.en.length < 2) && this.geminiProvider && artifact.screenshotPath) {
        try {
          const geminiLabel = await this.enrichFieldLabelWithGemini(input, artifact);
          if (geminiLabel) {
            label = geminiLabel;
            labelSource = 'gemini';
          }
        } catch (error) {
          this.logger.warn('Gemini field label enrichment failed', {
            selector,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Extract hint (placeholder or help text)
      let hint: { en?: string; ar?: string } | undefined;
      const placeholder = (input as HTMLInputElement).placeholder;
      if (placeholder && placeholder !== label?.en) {
        hint = { en: placeholder };
      }

      // Extract validation
      const validation: FormField['validation'] = {};
      const pattern = input.getAttribute('pattern');
      if (pattern) validation.pattern = pattern;

      const min = input.getAttribute('min');
      if (min) validation.min = parseFloat(min);

      const max = input.getAttribute('max');
      if (max) validation.max = parseFloat(max);

      const minLength = input.getAttribute('minlength');
      if (minLength) validation.minLength = parseInt(minLength, 10);

      const maxLength = input.getAttribute('maxlength');
      if (maxLength) validation.maxLength = parseInt(maxLength, 10);

      // Generate stable key
      const key = this.generateFieldKey(selector, label?.en || '');

      fields.push({
        key,
        selector,
        tag,
        inputType: type || undefined,
        role: input.getAttribute('role') || undefined,
        required,
        disabled,
        label: label || { en: 'Unlabeled field' },
        labelSource,
        hint,
        validation: Object.keys(validation).length > 0 ? validation : undefined,
      });
    }

    return fields;
  }

  /**
   * Extract uploads from form/container
   */
  private extractUploads(container: Element, document: Document): FormUpload[] {
    const uploads: FormUpload[] = [];
    const fileInputs = container.querySelectorAll('input[type="file"]');

    for (const input of Array.from(fileInputs)) {
      const selector = this.generateSelector(input);
      const required = this.isRequired(input);
      const acceptedTypes = input.getAttribute('accept') || undefined;

      // Extract label
      let label: { en?: string; ar?: string } | undefined;

      if (input.id) {
        const labelElement = document.querySelector(`label[for="${input.id}"]`);
        if (labelElement && labelElement.textContent) {
          label = { en: labelElement.textContent.trim() };
        }
      }

      if (!label) {
        const ariaLabel = input.getAttribute('aria-label');
        if (ariaLabel && ariaLabel.trim()) {
          label = { en: ariaLabel.trim() };
        }
      }

      if (!label) {
        const nearestLabel = this.findNearestLabel(input);
        if (nearestLabel) {
          label = { en: nearestLabel };
        }
      }

      // Extract hint (nearby text)
      const hint = this.findUploadHint(input);

      const key = this.generateFieldKey(selector, label?.en || '');

      uploads.push({
        key,
        selector,
        required,
        label: label || { en: 'File upload' },
        acceptedTypes,
        hint,
      });
    }

    return uploads;
  }

  /**
   * Extract actions (buttons) from form/container
   */
  private extractActions(container: Element, document: Document): FormAction[] {
    const actions: FormAction[] = [];

    // Find submit buttons in form
    const submitButtons = container.querySelectorAll('button[type="submit"], input[type="submit"]');

    // Also find nearby primary CTA buttons
    const nearbyButtons = this.findNearbyActionButtons(container);

    const allButtons = new Set([...Array.from(submitButtons), ...nearbyButtons]);

    for (const button of allButtons) {
      const selector = this.generateSelector(button);
      const tag = button.tagName.toLowerCase();
      const type = (button as HTMLInputElement).type || '';
      const role = button.getAttribute('role');

      // Determine action type
      let actionType: FormAction['type'] = 'submit';
      if (type === 'submit' || tag === 'button' && button.textContent?.toLowerCase().includes('submit')) {
        actionType = 'submit';
      } else if (button.textContent?.toLowerCase().includes('next') ||
        button.getAttribute('aria-label')?.toLowerCase().includes('next')) {
        actionType = 'next';
      } else if (button.textContent?.toLowerCase().includes('back') ||
        button.getAttribute('aria-label')?.toLowerCase().includes('back')) {
        actionType = 'back';
      } else if (button.textContent?.toLowerCase().includes('save')) {
        actionType = 'save';
      } else if (button.textContent?.toLowerCase().includes('login') ||
        button.textContent?.toLowerCase().includes('sign in')) {
        actionType = 'login';
      } else if (button.textContent?.toLowerCase().includes('verify')) {
        actionType = 'verify';
      }

      // Extract label
      const label = this.getAccessibleName(button);
      const intent = this.inferActionIntent(button, label);

      const key = this.generateFieldKey(selector, label);

      actions.push({
        key,
        selector,
        type: actionType,
        label: { en: label },
        intent: intent ? { en: intent } : undefined,
      });
    }

    return actions;
  }

  /**
   * Find nearest label-like element
   */
  private findNearestLabel(element: Element): string | null {
    // Check parent label
    const parentLabel = element.closest('label');
    if (parentLabel && parentLabel.textContent) {
      return parentLabel.textContent.trim();
    }

    // Check preceding sibling
    let sibling = element.previousElementSibling;
    while (sibling) {
      if (sibling.tagName.toLowerCase() === 'label' && sibling.textContent) {
        return sibling.textContent.trim();
      }
      sibling = sibling.previousElementSibling;
    }

    // Check parent's previous sibling
    const parent = element.parentElement;
    if (parent) {
      let parentSibling = parent.previousElementSibling;
      while (parentSibling) {
        const label = parentSibling.querySelector('label');
        if (label && label.textContent) {
          return label.textContent.trim();
        }
        parentSibling = parentSibling.previousElementSibling;
      }
    }

    return null;
  }

  /**
   * Find vision label for field
   */
  private findVisionLabel(element: Element, visionFindings: VisionFinding[]): string | null {
    const selector = this.generateSelector(element);

    for (const finding of visionFindings) {
      if (finding.correlatedSelector === selector && finding.detectedText) {
        return finding.detectedText;
      }
    }

    return null;
  }

  /**
   * Enrich field label with Gemini (for unlabeled/ambiguous fields)
   */
  private async enrichFieldLabelWithGemini(
    element: Element,
    artifact: PageArtifact
  ): Promise<{ en?: string; ar?: string } | null> {
    if (!this.geminiProvider || !artifact.screenshotPath) {
      return null;
    }

    try {
      // Get nearby context
      const context = this.getFieldContext(element);
      const inputType = (element as HTMLInputElement).type || element.tagName.toLowerCase();

      // Call Gemini with minimal context
      const prompt = `Analyze this form field and provide a clear, neutral label in English and Arabic.
Field type: ${inputType}
Nearby context: ${context}
Provide only the label text, no explanations. Format: "English label | Arabic label"`;

      // For MVP, use full screenshot (in production, crop to field region)
      const result = await this.geminiProvider.describeElement(
        artifact.screenshotPath,
        'form_field',
        context
      );

      if (result.description) {
        // Parse "English | Arabic" format
        const parts = result.description.split('|').map(s => s.trim());
        return {
          en: parts[0] || result.description,
          ar: parts[1],
        };
      }
    } catch (error) {
      // Non-fatal - return null
    }

    return null;
  }

  /**
   * Get field context (nearby text, container heading)
   */
  private getFieldContext(element: Element): string {
    const contextParts: string[] = [];

    // Find nearest heading
    let current: Element | null = element.parentElement;
    while (current && current !== element.ownerDocument.body) {
      const heading = current.querySelector('h1, h2, h3, h4, h5, h6');
      if (heading && heading.textContent) {
        contextParts.push(heading.textContent.trim());
        break;
      }
      current = current.parentElement;
    }

    // Find container label
    const container = element.closest('[role="group"], .form-group, .field-group');
    if (container) {
      const label = container.querySelector('label, .label, [class*="label"]');
      if (label && label.textContent) {
        contextParts.push(label.textContent.trim());
      }
    }

    return contextParts.join(' - ');
  }

  /**
   * Find upload hint (nearby text)
   */
  private findUploadHint(element: Element): { en?: string; ar?: string } | undefined {
    // Check for aria-describedby
    const describedBy = element.getAttribute('aria-describedby');
    if (describedBy) {
      const descElement = element.ownerDocument.getElementById(describedBy);
      if (descElement && descElement.textContent) {
        return { en: descElement.textContent.trim() };
      }
    }

    // Check for nearby help text
    const helpText = element.parentElement?.querySelector('.help-text, .hint, [class*="help"]');
    if (helpText && helpText.textContent) {
      return { en: helpText.textContent.trim() };
    }

    return undefined;
  }

  /**
   * Find nearby action buttons
   */
  private findNearbyActionButtons(container: Element): Element[] {
    const buttons: Element[] = [];

    // Check next sibling
    let sibling = container.nextElementSibling;
    if (sibling) {
      const submitBtn = sibling.querySelector('button[type="submit"], button.primary, button[class*="submit"]');
      if (submitBtn) {
        buttons.push(submitBtn);
      }
    }

    // Check parent's next sibling
    const parent = container.parentElement;
    if (parent) {
      let parentSibling = parent.nextElementSibling;
      if (parentSibling) {
        const submitBtn = parentSibling.querySelector('button[type="submit"], button.primary, button[class*="submit"]');
        if (submitBtn) {
          buttons.push(submitBtn);
        }
      }
    }

    return buttons;
  }

  /**
   * Check if field is required
   */
  private isRequired(element: Element): boolean {
    // required attribute
    if (element.hasAttribute('required')) return true;

    // aria-required
    if (element.getAttribute('aria-required') === 'true') return true;

    // Label contains * (best effort)
    const label = element.closest('label') ||
      element.ownerDocument.querySelector(`label[for="${element.id}"]`);
    if (label && label.textContent?.includes('*')) {
      return true;
    }

    return false;
  }

  /**
   * Get accessible name
   */
  private getAccessibleName(element: Element): string {
    // aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

    // aria-labelledby
    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const labelElement = element.ownerDocument.getElementById(ariaLabelledBy);
      if (labelElement && labelElement.textContent) {
        return labelElement.textContent.trim();
      }
    }

    // text content
    const textContent = element.textContent?.trim();
    if (textContent) return textContent;

    // title attribute
    const title = element.getAttribute('title');
    if (title && title.trim()) return title.trim();

    return 'Unlabeled';
  }

  /**
   * Infer action intent
   */
  private inferActionIntent(element: Element, accessibleName: string): string | null {
    const text = accessibleName.toLowerCase();

    if (text.includes('next') || text.includes('continue')) {
      return 'Proceed to next step';
    }
    if (text.includes('back') || text.includes('previous')) {
      return 'Go back to previous step';
    }
    if (text.includes('save')) {
      return 'Save current progress';
    }
    if (text.includes('submit') || text.includes('send')) {
      return 'Submit form';
    }
    if (text.includes('login') || text.includes('sign in')) {
      return 'Sign in to account';
    }
    if (text.includes('verify')) {
      return 'Verify information';
    }

    return null;
  }

  /**
   * Generate stable selector
   */
  private generateSelector(element: Element): string {
    // Try id first
    if (element.id) {
      return `#${element.id}`;
    }

    // Try data-testid
    const testId = element.getAttribute('data-testid');
    if (testId) {
      return `[data-testid="${testId}"]`;
    }

    // Try class names
    const classes = Array.from(element.classList).filter(c => c.length > 0);
    if (classes.length > 0) {
      return `.${classes.join('.')}`;
    }

    // Fallback to tag + position
    const tagName = element.tagName.toLowerCase();
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(c => c.tagName === element.tagName);
      const index = siblings.indexOf(element);
      if (index >= 0 && siblings.length > 1) {
        return `${tagName}:nth-of-type(${index + 1})`;
      }
    }

    return tagName;
  }

  /**
   * Generate form ID
   */
  private generateFormId(element: Element): string {
    if (element.id) {
      return `form_${element.id}`;
    }

    const selector = this.generateSelector(element);
    const hash = createHash('sha256').update(selector).digest('hex').substring(0, 8);
    return `form_${hash}`;
  }

  /**
   * Generate stable field key
   */
  private generateFieldKey(selector: string, label: string): string {
    const keyStr = `${selector}:${label}`;
    return createHash('sha256').update(keyStr).digest('hex').substring(0, 16);
  }
}

