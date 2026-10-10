import { type RaawiJourneyRun } from '../agent/interaction-agent.js';
import type { RaawiTaskAssessment, RaawiTaskIntent } from '../agent/page-understanding.js';
export type AnalysisAgentPageStatus = 'pass' | 'fail' | 'not_run';
export interface AnalysisAgentPageInput {
    pageNumber: number;
    pageUrl: string;
    agentPath?: string | null;
    findingsCount?: number;
}
export interface AnalysisAgentPageSummary {
    pageNumber: number;
    pageUrl: string;
    executed: boolean;
    status: AnalysisAgentPageStatus;
    stepCount: number;
    probeAttemptCount: number;
    probeSuccessCount: number;
    probeMessages: string[];
    issueCount: number;
    issueKinds: string[];
    issueMessages: string[];
    traceSummary: string;
    journeyRuns?: RaawiJourneyRun[];
    taskAssessments?: RaawiTaskAssessment[];
    pageProfile?: {
        pageType: string;
        mainHeading: string | null;
        taskIntents: RaawiTaskIntent[];
        counts: {
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
            media: number;
            liveRegions: number;
            alertRegions: number;
            accountControls: number;
            logoutControls: number;
        };
        signals: {
            hasPrimaryNavigation: boolean;
            hasSearch: boolean;
            hasSkipLink: boolean;
            hasLogin: boolean;
            hasOtp: boolean;
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
        forms: {
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
        }[];
    };
}
export declare function loadAnalysisAgentPageSummary(input: AnalysisAgentPageInput): Promise<AnalysisAgentPageSummary>;
export declare function loadAnalysisAgentPageSummaries(pages: AnalysisAgentPageInput[]): Promise<AnalysisAgentPageSummary[]>;
export declare function formatAnalysisAgentPageStatus(status: AnalysisAgentPageStatus): string;
//# sourceMappingURL=analysis-agent-summary.d.ts.map