import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import {
  validateAgentArtifact,
  type InteractionArtifact,
  type InteractionExecutionOutcome,
  type RaawiJourneyRun,
} from '../agent/interaction-agent.js';
import type { RaawiTaskAssessment, RaawiTaskIntent } from '../agent/page-understanding.js';

export type AnalysisAgentPageStatus = 'pass' | 'fail' | 'not_run' | 'incomplete' | 'inconclusive' | 'blocked';

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
  executionOutcome?: InteractionExecutionOutcome;
  stepCount: number;
  probeAttemptCount: number;
  probeSuccessCount: number;
  probeMessages: string[];
  issueCount: number;
  staticIssueCount?: number;
  dynamicIssueCount?: number;
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

function summarizeArtifact(
  artifact: InteractionArtifact | null,
  input: AnalysisAgentPageInput
): AnalysisAgentPageSummary {
  const issueCount = artifact?.issues?.length ?? input.findingsCount ?? 0;
  const executed = !!artifact || issueCount > 0 || !!input.agentPath;
  const probeAttemptCount = artifact?.probes?.filter((p) => p.attempted).length ?? 0;
  const probeSuccessCount = artifact?.probes?.filter((p) => p.success).length ?? 0;
  const probeMessages = artifact?.probes?.map((probe) => probe.message).filter(Boolean) ?? [];
  const issueKinds = artifact?.issues?.map((issue) => issue.kind).filter(Boolean) ?? [];
  const issueMessages = artifact?.issues?.map((issue) => issue.message).filter(Boolean) ?? [];
  const stepCount = artifact?.steps?.length ?? 0;

  const staticIssues = artifact?.issues?.filter((i: any) => i.source === 'static_profile') ?? [];
  const dynamicIssues = artifact?.issues?.filter((i: any) => i.source !== 'static_profile') ?? [];
  const staticIssueCount = staticIssues.length;
  const dynamicIssueCount = dynamicIssues.length;

  let status: AnalysisAgentPageStatus;
  let traceSummary: string;

  if (!executed) {
    status = 'not_run';
    traceSummary = 'No keyboard trace recorded';
  } else if (artifact?.executionOutcome?.status === 'page_closed' || artifact?.executionOutcome?.status === 'navigated_away') {
    status = 'blocked';
    traceSummary = `Interaction blocked: ${artifact.executionOutcome.reason || artifact.executionOutcome.status} (${stepCount} step${stepCount === 1 ? '' : 's'})`;
  } else if (stepCount === 0 && probeAttemptCount === 0) {
    status = artifact?.executionOutcome?.status === 'timeout' ? 'inconclusive' : 'incomplete';
    if (staticIssueCount > 0 || issueCount > 0) {
      const count = staticIssueCount > 0 ? staticIssueCount : issueCount;
      traceSummary = `0 steps, 0 probes attempted (static assessment: ${count} issue${count === 1 ? '' : 's'})`;
    } else {
      traceSummary = `0 steps, 0 probes attempted (${status})`;
    }
  } else if (artifact?.executionOutcome?.status === 'error' && stepCount < 5) {
    status = 'inconclusive';
    traceSummary = `Interaction inconclusive: ${artifact.executionOutcome.reason || 'error'} (${stepCount} step${stepCount === 1 ? '' : 's'})`;
  } else {
    status = issueCount > 0 ? 'fail' : 'pass';
    traceSummary = `${stepCount} step${stepCount === 1 ? '' : 's'}, ${probeAttemptCount} probe${probeAttemptCount === 1 ? '' : 's'} attempted, ${issueCount} issue${issueCount === 1 ? '' : 's'}`;
  }

  return {
    pageNumber: input.pageNumber,
    pageUrl: input.pageUrl,
    executed,
    status,
    ...(artifact?.executionOutcome ? { executionOutcome: artifact.executionOutcome } : {}),
    stepCount,
    probeAttemptCount,
    probeSuccessCount,
    probeMessages: [...new Set(probeMessages)],
    issueCount,
    staticIssueCount,
    dynamicIssueCount,
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

export async function loadAnalysisAgentPageSummary(
  input: AnalysisAgentPageInput
): Promise<AnalysisAgentPageSummary> {
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
  } catch {
    return summarizeArtifact(null, input);
  }
}

export async function loadAnalysisAgentPageSummaries(
  pages: AnalysisAgentPageInput[]
): Promise<AnalysisAgentPageSummary[]> {
  return Promise.all(pages.map((page) => loadAnalysisAgentPageSummary(page)));
}

export function formatAnalysisAgentPageStatus(status: AnalysisAgentPageStatus): string {
  switch (status) {
    case 'pass':
      return 'Pass';
    case 'fail':
      return 'Not pass';
    case 'incomplete':
      return 'Incomplete';
    case 'inconclusive':
      return 'Inconclusive';
    case 'blocked':
      return 'Blocked';
    default:
      return 'Not run';
  }
}
