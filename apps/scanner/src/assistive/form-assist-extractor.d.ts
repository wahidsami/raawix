import type { VisionFinding } from '@raawi-x/core';
import type { PageArtifact } from '@raawi-x/core';
/**
 * Form Assist Plan - Structured form metadata for widget guidance
 */
export interface FormAssistPlan {
    formId: string;
    stepIndex?: number;
    stepTitle?: {
        en?: string;
        ar?: string;
    };
    scopeSelector?: string;
    fields: FormField[];
    uploads: FormUpload[];
    actions: FormAction[];
}
export interface FormField {
    key: string;
    selector: string;
    tag: 'input' | 'select' | 'textarea' | 'button';
    inputType?: string;
    role?: string;
    required: boolean;
    disabled?: boolean;
    label: {
        en?: string;
        ar?: string;
    };
    labelSource: 'dom' | 'aria' | 'vision' | 'gemini' | 'override';
    hint?: {
        en?: string;
        ar?: string;
    };
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
    selector: string;
    required?: boolean;
    label: {
        en?: string;
        ar?: string;
    };
    acceptedTypes?: string;
    hint?: {
        en?: string;
        ar?: string;
    };
}
export interface FormAction {
    key: string;
    selector: string;
    type: 'next' | 'back' | 'save' | 'submit' | 'login' | 'verify';
    label: {
        en?: string;
        ar?: string;
    };
    intent?: {
        en?: string;
        ar?: string;
    };
}
/**
 * Extract form assist plans from DOM (Layer 1)
 * Optionally enriched with Vision (Layer 2) and Gemini (Layer 3)
 */
export declare class FormAssistExtractor {
    private logger;
    private geminiProvider?;
    private scanId?;
    constructor(scanId?: string);
    /**
     * Extract form assist plans from page
     */
    extractForms(document: Document, visionFindings: VisionFinding[], artifact: PageArtifact): Promise<FormAssistPlan[]>;
    /**
     * Extract form plan from <form> element
     */
    private extractFormPlan;
    /**
     * Extract form plan from form-like container
     */
    private extractFormPlanFromContainer;
    /**
     * Find form-like containers (>=3 inputs within semantic container)
     */
    private findFormLikeContainers;
    /**
     * Detect stepper UI (multi-step forms)
     */
    private detectStepper;
    /**
     * Extract fields from form/container
     */
    private extractFields;
    /**
     * Extract uploads from form/container
     */
    private extractUploads;
    /**
     * Extract actions (buttons) from form/container
     */
    private extractActions;
    /**
     * Find nearest label-like element
     */
    private findNearestLabel;
    /**
     * Find vision label for field
     */
    private findVisionLabel;
    /**
     * Enrich field label with Gemini (for unlabeled/ambiguous fields)
     */
    private enrichFieldLabelWithGemini;
    /**
     * Get field context (nearby text, container heading)
     */
    private getFieldContext;
    /**
     * Find upload hint (nearby text)
     */
    private findUploadHint;
    /**
     * Find nearby action buttons
     */
    private findNearbyActionButtons;
    /**
     * Check if field is required
     */
    private isRequired;
    /**
     * Get accessible name
     */
    private getAccessibleName;
    /**
     * Infer action intent
     */
    private inferActionIntent;
    /**
     * Generate stable selector
     */
    private generateSelector;
    /**
     * Generate form ID
     */
    private generateFormId;
    /**
     * Generate stable field key
     */
    private generateFieldKey;
}
//# sourceMappingURL=form-assist-extractor.d.ts.map