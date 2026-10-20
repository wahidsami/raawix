import { describe, it, expect } from 'vitest';
import {
  formatAnalysisAgentPageStatus,
  loadAnalysisAgentPageSummaries,
} from '../utils/analysis-agent-summary.js';
import type { InteractionArtifact } from './interaction-agent.js';

describe('Workstream 3: Trustworthy Interaction Telemetry', () => {
  it('correctly reports incomplete status for observed regression case: 1 static issue, 0 steps, 0 probes', async () => {
    // Mimics reference scan scan_1792479482089_scvi6r1 where static page understanding flagged an unnamed control
    // but keyboard interaction loop had 0 steps and 0 probes attempted.
    const artifact: InteractionArtifact = {
      url: 'https://www.w3.org/WAI/demos/bad/',
      pageNumber: 1,
      capturedAt: '2026-03-01T02:44:48.000Z',
      steps: [],
      issues: [
        {
          kind: 'unnamed_task_control',
          message: '1 form field(s) appear to lack an accessible name during the form task.',
          confidence: 0.86,
          evidence: { fields: 1, fieldsWithoutName: 1 },
          suggestedWcagIds: ['4.1.2', '3.3.2'],
          howToVerify: 'Navigate the form with a screen reader.',
          source: 'static_profile',
        },
      ],
      probes: [],
    };

    // Mock reading interaction artifact by injecting into loadAnalysisAgentPageSummary via input mock
    // We can test summarizeArtifact directly or test with dummy path/fs
    const { loadAnalysisAgentPageSummary } = await import('../utils/analysis-agent-summary.js');

    // Test formatAnalysisAgentPageStatus directly
    expect(formatAnalysisAgentPageStatus('incomplete')).toBe('Incomplete');
    expect(formatAnalysisAgentPageStatus('inconclusive')).toBe('Inconclusive');
    expect(formatAnalysisAgentPageStatus('pass')).toBe('Pass');
    expect(formatAnalysisAgentPageStatus('fail')).toBe('Not pass');
    expect(formatAnalysisAgentPageStatus('not_run')).toBe('Not run');

    // Test with mock file write and read
    const { writeFile, mkdir, rm } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');

    const testDir = join(tmpdir(), `raawi-test-telemetry-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    const interactionPath = join(testDir, 'interaction.json');
    await writeFile(interactionPath, JSON.stringify(artifact), 'utf-8');

    try {
      const summary = await loadAnalysisAgentPageSummary({
        pageNumber: 1,
        pageUrl: artifact.url,
        agentPath: interactionPath,
      });

      expect(summary.executed).toBe(true);
      expect(summary.status).toBe('incomplete');
      expect(summary.stepCount).toBe(0);
      expect(summary.probeAttemptCount).toBe(0);
      expect(summary.issueCount).toBe(1);
      expect(summary.staticIssueCount).toBe(1);
      expect(summary.dynamicIssueCount).toBe(0);
      expect(summary.traceSummary).toBe('0 steps, 0 probes attempted (static assessment: 1 issue)');
      expect(formatAnalysisAgentPageStatus(summary.status)).toBe('Incomplete');
    } finally {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  it('correctly reports completed interaction with recorded steps and dynamic probes', async () => {
    const artifact: InteractionArtifact = {
      url: 'https://example.com',
      pageNumber: 1,
      capturedAt: '2026-03-01T02:45:00.000Z',
      steps: [
        {
          i: 0,
          action: 'tab',
          active: { tag: 'BUTTON', name: 'Submit' },
          focusVisible: true,
        },
        {
          i: 1,
          action: 'tab',
          active: { tag: 'A', name: 'Home' },
          focusVisible: false,
        },
      ],
      issues: [
        {
          kind: 'focus_not_visible',
          message: 'Focus indicator not visible for 1 of 2 focus steps.',
          confidence: 0.85,
          evidence: {},
          source: 'keyboard_interaction',
        },
      ],
      probes: [
        {
          name: 'modal_probe',
          attempted: true,
          success: true,
          message: 'Dialog opened and focus restored.',
          evidence: {},
        },
      ],
    };

    const { loadAnalysisAgentPageSummary } = await import('../utils/analysis-agent-summary.js');
    const { writeFile, mkdir, rm } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');

    const testDir = join(tmpdir(), `raawi-test-telemetry-completed-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    const interactionPath = join(testDir, 'interaction.json');
    await writeFile(interactionPath, JSON.stringify(artifact), 'utf-8');

    try {
      const summary = await loadAnalysisAgentPageSummary({
        pageNumber: 1,
        pageUrl: artifact.url,
        agentPath: interactionPath,
      });

      expect(summary.executed).toBe(true);
      expect(summary.status).toBe('fail');
      expect(summary.stepCount).toBe(2);
      expect(summary.probeAttemptCount).toBe(1);
      expect(summary.probeSuccessCount).toBe(1);
      expect(summary.issueCount).toBe(1);
      expect(summary.dynamicIssueCount).toBe(1);
      expect(summary.traceSummary).toBe('2 steps, 1 probe attempted, 1 issue');
      expect(formatAnalysisAgentPageStatus(summary.status)).toBe('Not pass');
    } finally {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  it('correctly handles unexecuted, missing, or failed interaction runs', async () => {
    const { loadAnalysisAgentPageSummary } = await import('../utils/analysis-agent-summary.js');

    // Case A: not run at all
    const notRunSummary = await loadAnalysisAgentPageSummary({
      pageNumber: 1,
      pageUrl: 'https://example.com',
      agentPath: undefined,
    });
    expect(notRunSummary.executed).toBe(false);
    expect(notRunSummary.status).toBe('not_run');
    expect(notRunSummary.stepCount).toBe(0);
    expect(notRunSummary.probeAttemptCount).toBe(0);
    expect(notRunSummary.traceSummary).toBe('No keyboard trace recorded');
    expect(formatAnalysisAgentPageStatus(notRunSummary.status)).toBe('Not run');

    // Case B: failed execution (file missing or corrupt)
    const failedSummary = await loadAnalysisAgentPageSummary({
      pageNumber: 1,
      pageUrl: 'https://example.com',
      agentPath: 'non_existent_file_path.json',
    });
    expect(failedSummary.status).toBe('incomplete');
    expect(failedSummary.traceSummary).toBe('0 steps, 0 probes attempted (incomplete)');
    expect(formatAnalysisAgentPageStatus(failedSummary.status)).toBe('Incomplete');
  });
});
