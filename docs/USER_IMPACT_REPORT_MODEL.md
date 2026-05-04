# User Impact Report Model

## Purpose

This model shifts reporting from "how many WCAG findings exist" to "can a user complete key tasks independently".

It is designed to coexist with current technical findings and Raawi traces, not replace them immediately.

## Core Principles

- Semantic/agent task outcomes are primary.
- Technical findings (DOM/WCAG/vision) are supporting evidence.
- Every score should be explainable from stored artifacts.
- Unknown/untested task states must be explicit (no silent pass/fail assumptions).

## Data Model (v1)

```ts
export interface UserImpactReportV1 {
  modelVersion: '1.0';
  generatedAt: string; // ISO timestamp
  scanId: string;
  seedUrl: string;
  auditMode: 'classic' | 'raawi-agent';

  tasks: UserTaskOutcome[];
  summary: UserImpactSummary;
  evidence: UserImpactEvidence;
  notes?: string[];
}

export interface UserTaskOutcome {
  taskId: string; // e.g. "login", "search", "navigate-contact", "fill-contact-form"
  label: string;
  status: 'completed' | 'blocked' | 'partial' | 'not_run';
  independence: 'independent' | 'assisted' | 'blocked' | 'unknown';
  confidence: number; // 0..1 based on semantic + execution trace quality

  durationMs?: number;
  stepsTotal?: number;
  stepsCompleted?: number;
  error?: string;

  pagesInvolved: number[];
  primaryEvidence: string[]; // relative artifact paths, e.g. pages/3/raawi-agent/execution.json
}

export interface UserImpactSummary {
  taskCompletionRate: number; // completed / (completed+blocked+partial)
  independenceScore: number; // weighted independent outcomes
  blockedTaskCount: number;
  partialTaskCount: number;
  notRunTaskCount: number;
  averageTaskDurationMs?: number;
}

export interface UserImpactEvidence {
  raawiExecutionPages: number;
  pagesWithSemanticModel: number;
  pagesWithAssistiveMap: number;
  technicalFindingsCount: number; // supporting only
}
```

## Mapping Rules (Current System)

- `tasks[].status` from `raawi-agent/execution.json` runs:
  - `success=true` and all steps completed => `completed`
  - some steps completed but failed => `partial`
  - failed with zero progress or critical error => `blocked`
  - no run artifact => `not_run`
- `independence`:
  - execution with no manual checkpoint => `independent`
  - execution resumed via manual checkpoint => `assisted`
  - failed due to interaction barrier => `blocked`
  - no data => `unknown`
- `confidence`:
  - base from semantic model confidence/source mix
  - reduced when locator fallbacks or retries are high
  - reduced for stale/missing artifacts

## Recommended File Output

Per scan:

- `output/<scanId>/user-impact-report.json`

Optional API surfacing:

- include under `/api/scans/:scanId/detail`:
  - `userImpact.summary`
  - `userImpact.tasks`
  - `userImpact.generatedAt`

## KPI Alignment

The model directly supports long-term KPIs:

- task completion rate
- independence score
- time to complete task
- blocked-task rate

## Rollout Plan

1. Generate `user-impact-report.json` as a non-breaking side artifact.
2. Add read-only API exposure in scan detail.
3. Add UI card in report/dashboard.
4. Use this summary as the default top section in Raawi mode exports.
