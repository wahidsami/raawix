import type { PageArtifact, VisionFinding } from '@raawi-x/core';
import { type FormAssistPlan } from './form-assist-extractor.js';
export interface AssistiveMap {
    labelOverrides: Record<string, LabelOverride>;
    imageDescriptions: Record<string, ImageDescription>;
    actionIntents: Record<string, ActionIntent>;
    forms?: FormAssistPlan[];
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
    imageArtifactPath?: string;
    imageVisualHash?: string;
}
export interface ActionIntent {
    selector: string;
    intent: string;
    description: string;
    confidence: 'high' | 'medium' | 'low';
    source: 'vision' | 'gemini' | 'dom';
}
export interface ConfidenceSummary {
    labelOverrides: {
        high: number;
        medium: number;
        low: number;
    };
    imageDescriptions: {
        high: number;
        medium: number;
        low: number;
    };
    actionIntents: {
        high: number;
        medium: number;
        low: number;
    };
    forms?: {
        count: number;
        fieldsCount: number;
        uploadsCount: number;
        actionsCount: number;
    };
}
/**
 * Generate Third Layer Assistive Map from Layer 1 (DOM) + Layer 2 (Vision + optional Gemini)
 */
export declare class AssistiveMapGenerator {
    private logger;
    private geminiProvider?;
    private scanId?;
    private geminiImageCount;
    constructor(scanId?: string);
    /**
     * Generate assistive map for a page
     */
    generateAssistiveMap(artifact: PageArtifact, visionFindings: VisionFinding[], scanId?: string): Promise<{
        map: AssistiveMap;
        confidenceSummary: ConfidenceSummary;
    }>;
    /**
     * Process vision findings to generate label overrides for unlabeled controls
     */
    private processVisionFindings;
    /**
     * Process images missing alt text with hardened candidate selection and caching
     */
    private processImages;
    /**
     * Find cropped image in vision/images/ folder if it exists
     * Images are cropped during page capture/vision analysis phase
     *
     * IMPORTANT: Uses src attribute hash for matching since Layer 2 and Layer 3
     * might generate different selectors (async vs sync, live DOM vs JSDOM)
     */
    private findImageCrop;
    /**
     * Process action intents (buttons, links)
     */
    private processActions;
    /**
     * Check if element has accessible name
     */
    private hasAccessibleName;
    /**
     * Get accessible name from element
     */
    private getAccessibleName;
    /**
     * Generate stable selector for element
     */
    private generateSelector;
    /**
     * Infer action intent from element
     */
    private inferActionIntent;
    /**
     * Generate action description
     */
    private generateActionDescription;
    /**
     * Process forms (Form Assist Plan)
     */
    private processForms;
    /**
     * Compute confidence summary
     */
    private computeConfidenceSummary;
    /**
     * Compute fingerprint hash from page fingerprint
     */
    static computeFingerprintHash(fingerprint: {
        title?: string;
        firstHeading?: string;
        mainTextHash?: string;
    }): string;
}
//# sourceMappingURL=assistive-map-generator.d.ts.map