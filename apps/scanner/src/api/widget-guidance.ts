import type { PageArtifact, PageRuleResults, RuleResult, VisionFinding } from '@raawi-x/core';
import { JSDOM } from 'jsdom';
import { normalizeUrl } from '../crawler/url-utils.js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from '../config.js';

/**
 * Page guidance extracted from scan artifacts
 */
export interface PageGuidance {
  url: string;
  normalizedUrl: string;
  title?: string;
  summary: string;
  landmarks: Landmark[];
  formSteps: FormStep[];
  keyActions: KeyAction[];
  lastScanned?: string;
  // Match metadata
  matchedUrl?: string;
  matchConfidence?: 'high' | 'medium' | 'low';
  scanTimestamp?: {
    startedAt?: string;
    completedAt?: string;
  };
  pageFingerprint?: import('@raawi-x/core').PageFingerprint;
}

export interface Landmark {
  type: 'main' | 'navigation' | 'complementary' | 'contentinfo' | 'search' | 'form' | 'banner';
  label?: string;
  selector?: string;
  description?: string;
}

export interface FormStep {
  stepNumber: number;
  label: string;
  fields: FormField[];
  description?: string;
}

export interface FormField {
  label?: string;
  type?: string;
  required?: boolean;
  selector?: string;
  description?: string;
}

export interface KeyAction {
  label: string;
  type: 'link' | 'button' | 'form-submit';
  selector?: string;
  description?: string;
  href?: string;
}

/**
 * Known issues for a page (user-friendly explanations)
 */
export interface PageIssues {
  url: string;
  normalizedUrl: string;
  issues: Issue[];
  lastScanned?: string;
  // Match metadata
  matchedUrl?: string;
  matchConfidence?: 'high' | 'medium' | 'low';
  scanTimestamp?: {
    startedAt?: string;
    completedAt?: string;
  };
  pageFingerprint?: import('@raawi-x/core').PageFingerprint;
}

export interface Issue {
  id: string;
  wcagId?: string;
  severity: 'critical' | 'important' | 'minor';
  title: string;
  description: string;
  userImpact: string;
  howToFix?: string;
  elementCount?: number;
}

/**
 * Extract page guidance from artifacts (enriched with vision findings)
 * 
 * IMPORTANT: This guidance is used for STRUCTURE and METADATA only.
 * The widget ALWAYS reads live DOM for actual content.
 * This guidance provides:
 * - Page structure and ordering
 * - Landmarks and navigation hints
 * - Key actions descriptions
 * - Known accessibility issues
 * 
 * Never use this to replace live page content.
 */
export async function extractPageGuidance(
  artifact: PageArtifact,
  ruleResults?: PageRuleResults,
  scanId?: string
): Promise<PageGuidance | null> {
  if (!artifact.html) {
    return null;
  }

  try {
    const dom = new JSDOM(artifact.html);
    const document = dom.window.document;
    const normalizedUrl = normalizeUrl(artifact.finalUrl || artifact.url);

    // Extract landmarks
    const landmarks = extractLandmarks(document);

    // Extract form steps
    const formSteps = extractFormSteps(document);

    // Extract key actions
    let keyActions = extractKeyActions(document);

    // Enrich key actions with vision findings
    if (artifact.visionPath && scanId) {
      const visionFindings = await loadVisionFindings(artifact.visionPath);
      keyActions = enrichKeyActionsWithVision(keyActions, visionFindings);
    }

    // Generate summary
    const summary = generateSummary(artifact, landmarks, formSteps, keyActions);

    return {
      url: artifact.finalUrl || artifact.url,
      normalizedUrl,
      title: artifact.title,
      summary,
      landmarks,
      formSteps,
      keyActions,
      lastScanned: artifact.metadataPath ? new Date().toISOString() : undefined,
    };
  } catch (error) {
    console.error('Failed to extract page guidance:', error);
    return null;
  }
}

/**
 * Extract known issues from rule results (user-friendly format, enriched with vision findings)
 */
export async function extractPageIssues(
  artifact: PageArtifact,
  ruleResults?: PageRuleResults,
  scanId?: string
): Promise<PageIssues | null> {
  if (!ruleResults || ruleResults.ruleResults.length === 0) {
    return null;
  }

  const normalizedUrl = normalizeUrl(artifact.finalUrl || artifact.url);
  const issues: Issue[] = [];

  for (const ruleResult of ruleResults.ruleResults) {
    // Only include failures and needs_review (not passes or N/A)
    if (ruleResult.status === 'pass' || ruleResult.status === 'na') {
      continue;
    }

    const issue = convertRuleResultToIssue(ruleResult);
    if (issue) {
      issues.push(issue);
    }
  }

  // Load and add vision findings as issues
  if (artifact.visionPath && scanId) {
    try {
      const visionFindings = await loadVisionFindings(artifact.visionPath);
      const visionIssues = convertVisionFindingsToIssues(visionFindings);
      issues.push(...visionIssues);
    } catch (error) {
      console.warn('Failed to load vision findings for issues:', error);
    }
  }

  // Sort by severity
  issues.sort((a, b) => {
    const severityOrder = { critical: 0, important: 1, minor: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return {
    url: artifact.finalUrl || artifact.url,
    normalizedUrl,
    issues,
    lastScanned: artifact.metadataPath ? new Date().toISOString() : undefined,
  };
}

/**
 * Load vision findings from file
 */
async function loadVisionFindings(visionPath: string): Promise<VisionFinding[]> {
  try {
    const content = await readFile(visionPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

/**
 * Enrich key actions with vision findings
 */
function enrichKeyActionsWithVision(
  keyActions: KeyAction[],
  visionFindings: VisionFinding[]
): KeyAction[] {
  // Find vision findings that might be key actions (clickable elements)
  const visionActions = visionFindings
    .filter((f) => f.kind === 'clickable_unlabeled' || f.kind === 'icon_button_unlabeled')
    .map((f) => {
      // Use Gemini description if available (from evidenceJson or evidence)
      let description = `Detected visually (${f.kind}) - may need accessible name`;
      if (f.evidenceJson?.geminiDescription) {
        // Extract description from Gemini response
        try {
          const geminiDesc = f.evidenceJson.geminiDescription;
          if (geminiDesc.candidates?.[0]?.content?.parts?.[0]?.text) {
            description = geminiDesc.candidates[0].content.parts[0].text;
          }
        } catch {
          // Fallback to default description
        }
      } else {
        // Check evidence for Gemini description
        const geminiDescEvidence = f.evidence.find(
          (e) => e.description?.includes('Gemini Vision API') && e.type === 'text'
        );
        if (geminiDescEvidence) {
          description = geminiDescEvidence.value;
        }
      }

      return {
        label: f.detectedText || 'Unlabeled action',
        type: 'button' as const,
        selector: f.correlatedSelector,
        description,
      };
    });

  // Merge and deduplicate
  const allActions = [...keyActions, ...visionActions];
  const uniqueActions = new Map<string, KeyAction>();
  
  for (const action of allActions) {
    const key = action.selector || action.label;
    if (!uniqueActions.has(key)) {
      uniqueActions.set(key, action);
    }
  }

  return Array.from(uniqueActions.values());
}

/**
 * Convert vision findings to user-friendly issues
 */
function convertVisionFindingsToIssues(visionFindings: VisionFinding[]): Issue[] {
  return visionFindings.map((finding) => {
    const severityMap: Record<VisionFinding['kind'], 'critical' | 'important' | 'minor'> = {
      clickable_unlabeled: 'critical',
      icon_button_unlabeled: 'critical',
      looks_like_button_not_button: 'important',
      text_contrast_risk: 'important',
      focus_indicator_missing_visual: 'important',
    };

    return {
      id: finding.id,
      wcagId: finding.suggestedWcagIds[0],
      severity: severityMap[finding.kind] || 'minor',
      title: buildVisionIssueTitle(finding),
      description: buildVisionIssueDescription(finding),
      userImpact: buildVisionUserImpact(finding),
      howToFix: buildVisionHowToFix(finding),
      elementCount: 1,
    };
  });
}

/**
 * Build vision issue title
 */
function buildVisionIssueTitle(finding: VisionFinding): string {
  switch (finding.kind) {
    case 'clickable_unlabeled':
      return 'Unlabeled clickable element detected';
    case 'icon_button_unlabeled':
      return 'Icon-only button without accessible name';
    case 'looks_like_button_not_button':
      return 'Element styled like button but not semantic button';
    case 'text_contrast_risk':
      return 'Potential text contrast issue';
    case 'focus_indicator_missing_visual':
      return 'Focus indicator may not be visible';
    default:
      return 'Potential accessibility issue detected visually';
  }
}

/**
 * Build vision issue description
 */
function buildVisionIssueDescription(finding: VisionFinding): string {
  switch (finding.kind) {
    case 'clickable_unlabeled':
      return `A clickable element was detected that lacks an accessible name. Screen reader users may not understand its purpose.`;
    case 'icon_button_unlabeled':
      return `An icon-only button was detected without an accessible name. Add aria-label or aria-labelledby to make it accessible.`;
    case 'looks_like_button_not_button':
      return `An element is styled like a button but is not a semantic button element. Consider using a <button> element or adding role="button" with proper keyboard support.`;
    case 'text_contrast_risk':
      return `Text with potential contrast issues was detected. Verify contrast ratio meets WCAG 1.4.3 requirements.`;
    case 'focus_indicator_missing_visual':
      return `A focusable element may not have a visible focus indicator. Keyboard users need clear visual feedback.`;
    default:
      return `A potential accessibility issue was detected through visual analysis.`;
  }
}

/**
 * Build vision user impact
 */
function buildVisionUserImpact(finding: VisionFinding): string {
  switch (finding.kind) {
    case 'clickable_unlabeled':
    case 'icon_button_unlabeled':
      return 'Screen reader users may not understand the purpose of this element. Keyboard users may be unable to identify interactive elements.';
    case 'looks_like_button_not_button':
      return 'Element may not be keyboard accessible or may not be announced correctly by screen readers.';
    case 'text_contrast_risk':
      return 'Users with low vision may have difficulty reading the text.';
    case 'focus_indicator_missing_visual':
      return 'Keyboard users may lose track of their position on the page.';
    default:
      return 'This may affect how some users interact with the page.';
  }
}

/**
 * Build vision how to fix
 */
function buildVisionHowToFix(finding: VisionFinding): string {
  switch (finding.kind) {
    case 'clickable_unlabeled':
    case 'icon_button_unlabeled':
      return 'Add an accessible name using aria-label, aria-labelledby, or an associated <label> element.';
    case 'looks_like_button_not_button':
      return 'Convert to a semantic <button> element or add role="button" with proper keyboard event handlers.';
    case 'text_contrast_risk':
      return 'Increase text contrast ratio to meet WCAG 1.4.3 (4.5:1 for normal text, 3:1 for large text).';
    case 'focus_indicator_missing_visual':
      return 'Add visible focus styles using :focus-visible pseudo-class or explicit focus indicators.';
    default:
      return 'Review the element and ensure it meets accessibility requirements.';
  }
}

/**
 * Extract ARIA landmarks and semantic HTML landmarks
 */
function extractLandmarks(document: Document): Landmark[] {
  const landmarks: Landmark[] = [];

  // ARIA landmarks
  const ariaLandmarks = document.querySelectorAll('[role="main"], [role="navigation"], [role="complementary"], [role="contentinfo"], [role="search"], [role="form"], [role="banner"]');
  ariaLandmarks.forEach((el) => {
    const role = el.getAttribute('role');
    if (role) {
      landmarks.push({
        type: role as Landmark['type'],
        label: el.getAttribute('aria-label') || undefined,
        selector: getSelector(el),
        description: extractTextContent(el).substring(0, 100),
      });
    }
  });

  // Semantic HTML landmarks
  const semanticLandmarks = document.querySelectorAll('main, nav, aside, footer, header, form, [role="search"]');
  semanticLandmarks.forEach((el) => {
    const tagName = el.tagName.toLowerCase();
    let type: Landmark['type'] = 'main';
    
    if (tagName === 'nav' || el.getAttribute('role') === 'navigation') {
      type = 'navigation';
    } else if (tagName === 'aside' || el.getAttribute('role') === 'complementary') {
      type = 'complementary';
    } else if (tagName === 'footer' || el.getAttribute('role') === 'contentinfo') {
      type = 'contentinfo';
    } else if (tagName === 'header' || el.getAttribute('role') === 'banner') {
      type = 'banner';
    } else if (tagName === 'form' || el.getAttribute('role') === 'form') {
      type = 'form';
    } else if (el.getAttribute('role') === 'search') {
      type = 'search';
    }

    // Avoid duplicates
    if (!landmarks.some((l) => l.selector === getSelector(el))) {
      landmarks.push({
        type,
        label: el.getAttribute('aria-label') || el.querySelector('h1, h2, h3')?.textContent?.trim() || undefined,
        selector: getSelector(el),
        description: extractTextContent(el).substring(0, 100),
      });
    }
  });

  return landmarks;
}

/**
 * Extract form steps and fields
 */
function extractFormSteps(document: Document): FormStep[] {
  const forms = document.querySelectorAll('form');
  const formSteps: FormStep[] = [];

  forms.forEach((form, index) => {
    const fields: FormField[] = [];
    const inputs = form.querySelectorAll('input, textarea, select');

    inputs.forEach((input) => {
      const label = getFormLabel(input as HTMLElement);
      fields.push({
        label,
        type: (input as HTMLInputElement).type || input.tagName.toLowerCase(),
        required: input.hasAttribute('required') || input.getAttribute('aria-required') === 'true',
        selector: getSelector(input),
        description: input.getAttribute('aria-describedby') ? 
          document.getElementById(input.getAttribute('aria-describedby')!)?.textContent?.trim() : undefined,
      });
    });

    if (fields.length > 0) {
      formSteps.push({
        stepNumber: index + 1,
        label: form.getAttribute('aria-label') || form.id || `Form ${index + 1}`,
        fields,
        description: form.getAttribute('aria-describedby') ?
          document.getElementById(form.getAttribute('aria-describedby')!)?.textContent?.trim() : undefined,
      });
    }
  });

  return formSteps;
}

/**
 * Extract key actions (links, buttons, form submits)
 */
function extractKeyActions(document: Document): KeyAction[] {
  const actions: KeyAction[] = [];

  // Primary navigation links
  const navLinks = document.querySelectorAll('nav a, header a[href^="#"], a[role="button"]');
  navLinks.forEach((link) => {
    const text = link.textContent?.trim();
    if (text && text.length > 0 && text.length < 50) {
      actions.push({
        label: text,
        type: 'link',
        selector: getSelector(link),
        href: (link as HTMLAnchorElement).href,
        description: link.getAttribute('aria-label') || undefined,
      });
    }
  });

  // Buttons
  const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"], [role="button"]');
  buttons.forEach((button) => {
    const text = button.textContent?.trim() || (button as HTMLInputElement).value || button.getAttribute('aria-label');
    if (text && text.length > 0 && text.length < 50) {
      actions.push({
        label: text,
        type: 'button',
        selector: getSelector(button),
        description: button.getAttribute('aria-label') || undefined,
      });
    }
  });

  // Form submit buttons
  const submitButtons = document.querySelectorAll('form input[type="submit"], form button[type="submit"]');
  submitButtons.forEach((button) => {
    const text = button.textContent?.trim() || (button as HTMLInputElement).value || button.getAttribute('aria-label');
    if (text && text.length > 0 && text.length < 50) {
      actions.push({
        label: text,
        type: 'form-submit',
        selector: getSelector(button),
        description: button.getAttribute('aria-label') || undefined,
      });
    }
  });

  // Limit to top 10 most important actions
  return actions.slice(0, 10);
}

/**
 * Generate page summary
 */
function generateSummary(
  artifact: PageArtifact,
  landmarks: Landmark[],
  formSteps: FormStep[],
  keyActions: KeyAction[]
): string {
  const parts: string[] = [];

  if (artifact.title) {
    parts.push(`Page: ${artifact.title}`);
  }

  if (landmarks.length > 0) {
    parts.push(`${landmarks.length} landmark${landmarks.length > 1 ? 's' : ''} found`);
  }

  if (formSteps.length > 0) {
    parts.push(`${formSteps.length} form${formSteps.length > 1 ? 's' : ''} with ${formSteps.reduce((sum, step) => sum + step.fields.length, 0)} field${formSteps.reduce((sum, step) => sum + step.fields.length, 0) !== 1 ? 's' : ''}`);
  }

  if (keyActions.length > 0) {
    parts.push(`${keyActions.length} key action${keyActions.length > 1 ? 's' : ''} available`);
  }

  return parts.join('. ') || 'Page content available';
}

/**
 * Convert rule result to user-friendly issue
 */
function convertRuleResultToIssue(ruleResult: RuleResult): Issue | null {
  // Map WCAG IDs to severity
  const severityMap: Record<string, 'critical' | 'important' | 'minor'> = {
    '1.1.1': 'critical', // Missing alt text
    '2.4.2': 'important', // Missing page title
    '3.1.1': 'important', // Missing language
    '4.1.2': 'critical', // Form control issues
    '2.4.4': 'important', // Link purpose
    '2.4.7': 'important', // Focus visible
    '2.1.1': 'critical', // Keyboard reachable
    '2.1.2': 'critical', // Keyboard trap
    '1.4.3': 'important', // Contrast
    '1.4.10': 'important', // Reflow
  };

  const severity = ruleResult.wcagId ? (severityMap[ruleResult.wcagId] || 'minor') : 
    (ruleResult.status === 'fail' ? 'important' : 'minor');

  // Generate user-friendly title and description
  const title = ruleResult.message || `Accessibility issue: ${ruleResult.ruleId}`;
  const description = ruleResult.howToVerify || 'This page may have accessibility barriers.';
  
  // Count affected elements
  const elementCount = ruleResult.evidence?.filter((e) => e.type === 'element').length || 0;

  return {
    id: ruleResult.ruleId,
    wcagId: ruleResult.wcagId,
    severity,
    title,
    description,
    userImpact: generateUserImpact(ruleResult),
    howToFix: ruleResult.howToVerify,
    elementCount: elementCount > 0 ? elementCount : undefined,
  };
}

/**
 * Generate user impact description
 */
function generateUserImpact(ruleResult: RuleResult): string {
  const impactMap: Record<string, string> = {
    '1.1.1': 'Images without alt text cannot be understood by screen readers.',
    '2.4.2': 'Missing page title makes navigation difficult.',
    '3.1.1': 'Missing language declaration affects screen reader pronunciation.',
    '4.1.2': 'Form controls may not be properly labeled for assistive technologies.',
    '2.4.4': 'Link purpose may be unclear from link text alone.',
    '2.4.7': 'Focus indicators may not be visible, making keyboard navigation difficult.',
    '2.1.1': 'Some interactive elements may not be keyboard accessible.',
    '2.1.2': 'Keyboard users may get trapped in certain areas of the page.',
    '1.4.3': 'Text contrast may be too low for some users to read.',
    '1.4.10': 'Page may not reflow properly on smaller screens.',
  };

  return impactMap[ruleResult.wcagId || ''] || 
    'This may affect how some users interact with the page.';
}

/**
 * Helper: Get form label
 */
function getFormLabel(input: HTMLElement): string | undefined {
  // Check for associated label
  const id = input.getAttribute('id');
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) {
      return label.textContent?.trim() || undefined;
    }
  }

  // Check for wrapped label
  const parentLabel = input.closest('label');
  if (parentLabel) {
    return parentLabel.textContent?.trim() || undefined;
  }

  // Check for aria-label
  const ariaLabel = input.getAttribute('aria-label');
  if (ariaLabel) {
    return ariaLabel;
  }

  // Check for aria-labelledby
  const ariaLabelledBy = input.getAttribute('aria-labelledby');
  if (ariaLabelledBy) {
    const labelEl = document.getElementById(ariaLabelledBy);
    if (labelEl) {
      return labelEl.textContent?.trim() || undefined;
    }
  }

  return undefined;
}

/**
 * Helper: Get CSS selector (simplified)
 */
function getSelector(element: Element): string {
  if (element.id) {
    return `#${element.id}`;
  }
  if (element.className) {
    const classes = element.className.split(' ').filter((c) => c.length > 0);
    if (classes.length > 0) {
      return `${element.tagName.toLowerCase()}.${classes[0]}`;
    }
  }
  return element.tagName.toLowerCase();
}

/**
 * Helper: Extract text content (simplified)
 */
function extractTextContent(element: Element): string {
  return element.textContent?.trim() || '';
}

