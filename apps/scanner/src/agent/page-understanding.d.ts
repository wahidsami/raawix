import type { Page } from 'playwright';
import type { ReportCategory } from '../utils/report-taxonomy.js';
export type RaawiPageType = 'home' | 'login' | 'register' | 'contact' | 'service' | 'policy' | 'sitemap' | 'search' | 'content' | 'dashboard' | 'unknown';
export interface RaawiTaskIntent {
    id: string;
    label: string;
    category: ReportCategory;
    reason: string;
    confidence: number;
}
export type RaawiTaskAssessmentResult = 'working' | 'not_working' | 'needs_review' | 'not_applicable' | 'manual_checkpoint';
export interface RaawiTaskAssessment {
    taskId: string;
    label: string;
    category: ReportCategory;
    result: RaawiTaskAssessmentResult;
    confidence: number;
    summary: string;
    evidence: Record<string, unknown>;
    issue?: {
        kind: 'missing_page_structure' | 'missing_skip_link' | 'authenticated_workspace_navigation_unclear' | 'dynamic_updates_not_announced' | 'unnamed_task_control' | 'missing_form_instructions' | 'image_alt_task_issue' | 'verification_checkpoint_requires_manual_input';
        message: string;
        confidence: number;
        evidence: Record<string, unknown>;
        suggestedWcagIds?: string[];
        howToVerify?: string;
    };
}
export interface RaawiPageProfile {
    pageType: RaawiPageType;
    title: string;
    lang: string | null;
    direction: string | null;
    mainHeading: string | null;
    headings: string[];
    landmarks: string[];
    counts: {
        headings: number;
        links: number;
        skipLinks: number;
        buttons: number;
        forms: number;
        fields: number;
        fieldsWithoutName: number;
        fieldsWithoutInstructions: number;
        requiredFields: number;
        requiredFieldsWithoutIndicator: number;
        passwordFields: number;
        otpLikeFields: number;
        images: number;
        imagesWithoutAlt: number;
        media: number;
        liveRegions: number;
        alertRegions: number;
        nonEmptyAnnouncementRegions: number;
        meaningfulAnnouncementRegions: number;
        accountControls: number;
        logoutControls: number;
        buttonsWithoutName: number;
        linksWithoutName: number;
    };
    signals: {
        hasPrimaryNavigation: boolean;
        hasSkipLink: boolean;
        hasSearch: boolean;
        hasLogin: boolean;
        hasRegister: boolean;
        hasOtp: boolean;
        hasPassword: boolean;
        hasForgotPassword: boolean;
        hasResendCode: boolean;
        hasContact: boolean;
        hasAccountArea: boolean;
        hasLogout: boolean;
        hasAuthenticatedWorkspace: boolean;
        hasDynamicUpdateRisk: boolean;
        hasModalTrigger: boolean;
        hasMenuToggle: boolean;
    };
    sampleControls: Array<{
        kind: 'link' | 'button' | 'field';
        name: string;
        type?: string | null;
    }>;
    forms: Array<{
        index: number;
        purpose: 'login' | 'register' | 'contact' | 'search' | 'generic';
        fieldCount: number;
        requiredCount: number;
        unlabeledCount: number;
        fieldsWithoutInstructions: number;
        passwordCount: number;
        otpLikeCount: number;
        hasSubmit: boolean;
        fieldSamples: Array<{
            type: string | null;
            name: string;
            required: boolean;
            hasInstruction: boolean;
            otpLike: boolean;
        }>;
    }>;
    taskIntents: RaawiTaskIntent[];
}
export declare function captureRaawiPageProfile(page: Page, url: string): Promise<RaawiPageProfile>;
export declare function assessRaawiTaskIntents(profile: RaawiPageProfile): RaawiTaskAssessment[];
//# sourceMappingURL=page-understanding.d.ts.map