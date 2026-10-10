import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { validateAgentArtifact, } from '../agent/interaction-agent.js';
function summarizeArtifact(artifact, input) {
    const issueCount = artifact?.issues?.length ?? input.findingsCount ?? 0;
    const executed = !!artifact || issueCount > 0 || !!input.agentPath;
    const status = !executed
        ? 'not_run'
        : issueCount > 0
            ? 'fail'
            : 'pass';
    const probeAttemptCount = artifact?.probes?.filter((p) => p.attempted).length ?? 0;
    const probeSuccessCount = artifact?.probes?.filter((p) => p.success).length ?? 0;
    const probeMessages = artifact?.probes?.map((probe) => probe.message).filter(Boolean) ?? [];
    const issueKinds = artifact?.issues?.map((issue) => issue.kind).filter(Boolean) ?? [];
    const issueMessages = artifact?.issues?.map((issue) => issue.message).filter(Boolean) ?? [];
    const stepCount = artifact?.steps?.length ?? 0;
    const traceSummary = executed
        ? `${stepCount} step${stepCount === 1 ? '' : 's'}, ${probeAttemptCount} probe${probeAttemptCount === 1 ? '' : 's'} attempted, ${issueCount} issue${issueCount === 1 ? '' : 's'}`
        : 'No keyboard trace recorded';
    return {
        pageNumber: input.pageNumber,
        pageUrl: input.pageUrl,
        executed,
        status,
        stepCount,
        probeAttemptCount,
        probeSuccessCount,
        probeMessages: [...new Set(probeMessages)],
        issueCount,
        issueKinds: [...new Set(issueKinds)],
        issueMessages: [...new Set(issueMessages)],
        traceSummary,
        ...(artifact?.journeyRuns?.length ? { journeyRuns: artifact.journeyRuns } : {}),
        ...(artifact?.taskAssessments?.length ? { taskAssessments: artifact.taskAssessments } : {}),
        ...(artifact?.pageProfile
            ? {
                pageProfile: {
                    pageType: artifact.pageProfile.pageType,
                    mainHeading: artifact.pageProfile.mainHeading,
                    taskIntents: artifact.pageProfile.taskIntents,
                    counts: {
                        links: artifact.pageProfile.counts.links,
                        skipLinks: artifact.pageProfile.counts.skipLinks,
                        buttons: artifact.pageProfile.counts.buttons,
                        forms: artifact.pageProfile.counts.forms,
                        fields: artifact.pageProfile.counts.fields,
                        fieldsWithoutName: artifact.pageProfile.counts.fieldsWithoutName,
                        fieldsWithoutInstructions: artifact.pageProfile.counts.fieldsWithoutInstructions,
                        requiredFields: artifact.pageProfile.counts.requiredFields,
                        requiredFieldsWithoutIndicator: artifact.pageProfile.counts.requiredFieldsWithoutIndicator,
                        passwordFields: artifact.pageProfile.counts.passwordFields,
                        otpLikeFields: artifact.pageProfile.counts.otpLikeFields,
                        images: artifact.pageProfile.counts.images,
                        media: artifact.pageProfile.counts.media,
                        liveRegions: artifact.pageProfile.counts.liveRegions,
                        alertRegions: artifact.pageProfile.counts.alertRegions,
                        accountControls: artifact.pageProfile.counts.accountControls,
                        logoutControls: artifact.pageProfile.counts.logoutControls,
                    },
                    signals: {
                        hasPrimaryNavigation: artifact.pageProfile.signals.hasPrimaryNavigation,
                        hasSearch: artifact.pageProfile.signals.hasSearch,
                        hasSkipLink: artifact.pageProfile.signals.hasSkipLink,
                        hasLogin: artifact.pageProfile.signals.hasLogin,
                        hasOtp: artifact.pageProfile.signals.hasOtp,
                        hasForgotPassword: artifact.pageProfile.signals.hasForgotPassword,
                        hasResendCode: artifact.pageProfile.signals.hasResendCode,
                        hasContact: artifact.pageProfile.signals.hasContact,
                        hasAccountArea: artifact.pageProfile.signals.hasAccountArea,
                        hasLogout: artifact.pageProfile.signals.hasLogout,
                        hasAuthenticatedWorkspace: artifact.pageProfile.signals.hasAuthenticatedWorkspace,
                        hasDynamicUpdateRisk: artifact.pageProfile.signals.hasDynamicUpdateRisk,
                        hasModalTrigger: artifact.pageProfile.signals.hasModalTrigger,
                        hasMenuToggle: artifact.pageProfile.signals.hasMenuToggle,
                    },
                    forms: artifact.pageProfile.forms,
                },
            }
            : {}),
    };
}
export async function loadAnalysisAgentPageSummary(input) {
    if (!input.agentPath || !String(input.agentPath).trim()) {
        return summarizeArtifact(null, input);
    }
    const agentPath = String(input.agentPath);
    if (!existsSync(agentPath)) {
        return summarizeArtifact(null, input);
    }
    try {
        const raw = await readFile(agentPath, 'utf-8');
        const parsed = JSON.parse(raw);
        const artifact = validateAgentArtifact(parsed);
        return summarizeArtifact(artifact, input);
    }
    catch {
        return summarizeArtifact(null, input);
    }
}
export async function loadAnalysisAgentPageSummaries(pages) {
    return Promise.all(pages.map((page) => loadAnalysisAgentPageSummary(page)));
}
export function formatAnalysisAgentPageStatus(status) {
    switch (status) {
        case 'pass':
            return 'Pass';
        case 'fail':
            return 'Not pass';
        default:
            return 'Not run';
    }
}
//# sourceMappingURL=analysis-agent-summary.js.map