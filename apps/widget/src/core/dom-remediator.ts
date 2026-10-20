/**
 * DomRemediator for Raawi X Widget (Phase 5.4)
 * 
 * Safely applies non-destructive, opt-in DOM accessibility enhancements
 * derived from scanner AssistiveMap data.
 * 
 * Principles:
 * 1. Opt-in only: Never mutates host DOM unless the user explicitly enables remediation.
 * 2. Non-destructive: Never overwrites existing meaningful alt text or accessible names.
 * 3. Preserves decorative semantics: Never overwrites intentional empty alt attributes (alt="").
 * 4. Unambiguous targeting: Rejects ambiguous (multiple matches) or invalid CSS selectors.
 * 5. Ownership-aware restoration: Tracks exact applied changes and restores original state
 *    on disable, reset, or teardown without overwriting host runtime modifications.
 */

import type { AssistiveMap, PagePackageResponse } from './types';
import type { StateManager } from './state';

export interface RemediationRecord {
  element: HTMLElement;
  attribute: 'alt' | 'aria-label';
  originalValue: string | null;
  appliedValue: string;
}

function isSufficientConfidence(confidence: any): boolean {
  if (confidence === undefined || confidence === null) return true;
  if (typeof confidence === 'number') return confidence >= 0.65;
  if (typeof confidence === 'string') {
    const lower = confidence.toLowerCase();
    return lower === 'high' || lower === 'medium';
  }
  return true;
}

export class DomRemediator {
  private state: StateManager;
  private currentMap: AssistiveMap | null = null;
  private records: RemediationRecord[] = [];
  private isActive: boolean = false;

  constructor(state: StateManager) {
    this.state = state;
  }

  public setAssistiveMap(map: AssistiveMap | null): void {
    const wasActive = this.isActive;
    if (wasActive) {
      this.revert();
    }
    this.currentMap = map;
    if (wasActive && this.state.getSettings().remediationEnabled) {
      this.apply();
    }
  }

  public isRemediationActive(): boolean {
    return this.isActive;
  }

  public getAppliedRecords(): readonly RemediationRecord[] {
    return this.records;
  }

  public getRemediatedImagesCount(): number {
    return this.records.filter((r) => r.attribute === 'alt').length;
  }

  public getRemediatedControlsCount(): number {
    return this.records.filter((r) => r.attribute === 'aria-label').length;
  }

  public getTotalRemediationsCount(): number {
    return this.records.length;
  }

  public getActiveChangesCount(): number {
    return this.records.length;
  }

  /**
   * Applies validated, safe remediations from the current AssistiveMap
   */
  public apply(): void {
    if (typeof document === 'undefined') return;
    if (this.isActive) {
      this.revert(); // Prevent duplicate applications
    }

    this.isActive = true;

    if (!this.currentMap) {
      return;
    }

    // 1. Remediate missing image descriptions
    if (this.currentMap.imageDescriptions) {
      const items = Array.isArray(this.currentMap.imageDescriptions)
        ? this.currentMap.imageDescriptions
        : Object.values(this.currentMap.imageDescriptions);
      for (const desc of items) {
        this.remediateImage(desc);
      }
    }

    // 2. Remediate missing control labels
    if (this.currentMap.labelOverrides) {
      const items = Array.isArray(this.currentMap.labelOverrides)
        ? this.currentMap.labelOverrides
        : Object.values(this.currentMap.labelOverrides);
      for (const override of items) {
        this.remediateControlLabel(override);
      }
    }
  }

  /**
   * Safely adds alt text to an image that genuinely lacks authored alt text
   */
  private remediateImage(desc: any): void {
    if (!desc || !desc.selector) {
      return;
    }

    const altText = desc.alt || desc.description;
    if (!altText || typeof altText !== 'string') {
      return;
    }

    // Require high or medium confidence; reject low confidence (< 0.65)
    if (!isSufficientConfidence(desc.confidence)) {
      return;
    }

    const cleanAlt = altText.trim();
    if (!cleanAlt) {
      return;
    }

    let elements: NodeListOf<Element>;
    try {
      elements = document.querySelectorAll(desc.selector);
    } catch {
      // Invalid CSS selector in map data
      return;
    }

    // SAFETY RULE: Require unambiguous single target.
    if (elements.length !== 1) {
      return;
    }

    const img = elements[0];
    if (!(img instanceof HTMLImageElement || img.tagName.toLowerCase() === 'img')) {
      return;
    }

    // Do NOT remediate elements inside the widget itself
    if (img.closest('raawi-accessibility-widget')) {
      return;
    }

    // SEMANTIC PRESERVATION:
    // 1. If alt attribute is present and empty (alt=""), it is intentionally decorative. PRESERVE IT!
    // 2. If alt attribute is present and non-empty, the author provided text. PRESERVE IT!
    if (img.hasAttribute('alt')) {
      return;
    }

    // Image genuinely has no alt attribute: safe to remediate
    const originalValue = null;
    img.setAttribute('alt', cleanAlt);
    img.setAttribute('data-raawi-remediated-alt', 'true');

    this.records.push({
      element: img as HTMLElement,
      attribute: 'alt',
      originalValue,
      appliedValue: cleanAlt,
    });
  }

  /**
   * Safely adds aria-label to an interactive control that lacks an accessible name
   */
  private remediateControlLabel(override: any): void {
    if (!override || !override.selector) {
      return;
    }

    const labelText = override.ariaLabel || override.label || override.newLabel;
    if (!labelText || typeof labelText !== 'string') {
      return;
    }

    // Require high or medium confidence; reject low confidence (< 0.65)
    if (!isSufficientConfidence(override.confidence)) {
      return;
    }

    const cleanLabel = labelText.trim();
    if (!cleanLabel) {
      return;
    }

    let elements: NodeListOf<Element>;
    try {
      elements = document.querySelectorAll(override.selector);
    } catch {
      // Invalid CSS selector
      return;
    }

    // SAFETY RULE: Require unambiguous single target
    if (elements.length !== 1) {
      return;
    }

    const el = elements[0];
    if (!(el instanceof HTMLElement)) {
      return;
    }

    // Do NOT remediate elements inside the widget
    if (el.closest('raawi-accessibility-widget')) {
      return;
    }

    // ACCESSIBLE NAME VERIFICATION:
    // Only apply if the control genuinely lacks an accessible name
    if (this.hasAuthoredAccessibleName(el)) {
      return;
    }

    const originalValue = el.hasAttribute('aria-label') ? el.getAttribute('aria-label') : null;
    el.setAttribute('aria-label', cleanLabel);
    el.setAttribute('data-raawi-remediated-label', 'true');

    this.records.push({
      element: el,
      attribute: 'aria-label',
      originalValue,
      appliedValue: cleanLabel,
    });
  }

  /**
   * Checks whether an interactive element already has a meaningful authored accessible name
   */
  public hasAuthoredAccessibleName(el: HTMLElement): boolean {
    // 1. aria-label present and non-empty
    if (el.hasAttribute('aria-label') && el.getAttribute('aria-label')?.trim()) {
      return true;
    }

    // 2. aria-labelledby referencing existing element(s) with text
    if (el.hasAttribute('aria-labelledby')) {
      const ids = el.getAttribute('aria-labelledby')!.split(/\s+/);
      const hasReferencedText = ids.some((id) => {
        const refEl = document.getElementById(id);
        return refEl && refEl.textContent && refEl.textContent.trim().length > 0;
      });
      if (hasReferencedText) return true;
    }

    // 3. Native title attribute present and non-empty
    if (el.hasAttribute('title') && el.getAttribute('title')?.trim()) {
      return true;
    }

    // 4. Buttons and links with visible text content
    const tag = el.tagName.toLowerCase();
    if (tag === 'button' || tag === 'a' || el.getAttribute('role') === 'button' || el.getAttribute('role') === 'link') {
      if (el.textContent && el.textContent.trim().length > 0) {
        return true;
      }
    }

    // 5. Form inputs with associated <label>
    if (tag === 'input' || tag === 'select' || tag === 'textarea') {
      // Check explicit label[for="id"]
      if (el.id) {
        const escapedId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(el.id) : el.id.replace(/"/g, '\\"');
        const label = document.querySelector(`label[for="${escapedId}"]`);
        if (label && label.textContent && label.textContent.trim().length > 0) {
          return true;
        }
      }
      // Check enclosing <label>
      const parentLabel = el.closest('label');
      if (parentLabel && parentLabel.textContent && parentLabel.textContent.trim().length > 0) {
        return true;
      }
      // Check placeholder
      if (el.hasAttribute('placeholder') && el.getAttribute('placeholder')?.trim()) {
        return true;
      }
    }

    return false;
  }

  /**
   * Reverts all applied remediations using the ownership-aware restoration policy
   */
  public revert(): void {
    if (this.records.length === 0) {
      this.isActive = false;
      return;
    }

    for (const record of this.records) {
      const { element, attribute, originalValue, appliedValue } = record;

      // Check if element is still connected in DOM
      if (element && element.isConnected) {
        const currentVal = element.getAttribute(attribute);

        // OWNERSHIP CHECK: Only restore if current value matches what we applied
        if (currentVal === appliedValue) {
          if (originalValue !== null) {
            element.setAttribute(attribute, originalValue);
          } else {
            element.removeAttribute(attribute);
          }
        }
        // Always clean up our tracking flags
        element.removeAttribute('data-raawi-remediated-alt');
        element.removeAttribute('data-raawi-remediated-label');
      }
    }

    this.records = [];
    this.isActive = false;
  }

  /**
   * Full teardown on widget destruction or reset
   */
  public destroy(): void {
    this.revert();
    this.currentMap = null;
  }
}
