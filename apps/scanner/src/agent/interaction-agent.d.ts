/**
 * InteractionAgent v1: keyboard-only focus trace and basic detectors.
 * Deterministic, bounded, best-effort. No external APIs.
 */
import type { Page } from 'playwright';
import { type RaawiPageProfile, type RaawiTaskAssessment } from './page-understanding.js';
export type InteractionAgentOptions = {
    maxSteps: number;
    maxMs: number;
    probesEnabled: boolean;
};
export type InteractionArtifact = {
    url: string;
    pageNumber: number;
    capturedAt: string;
    pageProfile?: RaawiPageProfile;
    taskAssessments?: RaawiTaskAssessment[];
    journeyRuns?: RaawiJourneyRun[];
    steps: Array<{
        i: number;
        action: 'tab' | 'shift+tab';
        active: {
            tag?: string;
            role?: string | null;
            name?: string;
            id?: string | null;
            classes?: string | null;
            href?: string | null;
            type?: string | null;
            disabled?: boolean;
            readonly?: boolean;
            aria?: Record<string, string | null>;
            state?: {
                ariaExpanded?: string | null;
                ariaPressed?: string | null;
                ariaChecked?: string | null;
                ariaSelected?: string | null;
                ariaCurrent?: string | null;
                ariaInvalid?: string | null;
                ariaRequired?: string | null;
                disabled?: boolean;
                readonly?: boolean;
                type?: string | null;
                href?: string | null;
            };
            selectorHint?: string;
        };
        focusVisible?: boolean;
    }>;
    issues: Array<{
        kind: 'focus_trap' | 'unnamed_control' | 'duplicate_control_name' | 'focus_not_visible' | 'silent_update' | 'modal_focus_not_moved' | 'focus_not_restored' | 'expanded_state_not_updated' | 'validation_error_not_focused' | 'missing_page_structure' | 'missing_skip_link' | 'authenticated_workspace_navigation_unclear' | 'dynamic_updates_not_announced' | 'unnamed_task_control' | 'missing_form_instructions' | 'unclear_error_recovery' | 'image_alt_task_issue' | 'verification_checkpoint_requires_manual_input' | 'media_controls_not_exposed' | 'media_autoplay_without_control';
        message: string;
        confidence: number;
        evidence: unknown;
        suggestedWcagIds?: string[];
        howToVerify?: string;
    }>;
    probes?: Array<{
        name: 'modal_probe' | 'menu_probe' | 'form_validation_probe' | 'search_probe' | 'workspace_probe' | 'media_probe';
        attempted: boolean;
        success: boolean;
        message: string;
        evidence: unknown;
    }>;
};
export type RaawiJourneyRun = {
    taskId: string;
    label: string;
    category: RaawiTaskAssessment['category'];
    status: RaawiTaskAssessment['result'];
    confidence: number;
    summary: string;
    usedSignals: string[];
    relatedProbeNames: Array<NonNullable<InteractionArtifact['probes']>[number]['name']>;
    relatedIssueKinds: Array<InteractionArtifact['issues'][number]['kind']>;
    evidence: Record<string, unknown>;
};
/** DOM change fingerprint: text hash + structural counts for better change detection. */
export type DomChangeFingerprint = {
    textHash: string;
    textLen: number;
    ariaInvalidCount: number;
    alertCount: number;
    ariaLiveCount: number;
    focusableCount: number;
};
export declare function runInteractionAgent(page: Page, ctx: {
    url: string;
    pageNumber: number;
}, opts: InteractionAgentOptions & {
    onProgress?: (stepIndex: number, maxSteps: number) => void;
}): Promise<InteractionArtifact>;
/**
 * Validates parsed JSON as InteractionArtifact shape. Returns the object if valid, null otherwise.
 * Use when reading interaction.json to avoid throwing on malformed data.
 */
export declare function validateAgentArtifact(obj: unknown): InteractionArtifact | null;
//# sourceMappingURL=interaction-agent.d.ts.map