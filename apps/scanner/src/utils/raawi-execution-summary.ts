import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export interface RaawiExecutionPageSummary {
  pageNumber: number;
  pageUrl: string;
  hasPlan: boolean;
  hasExecution: boolean;
  dryRun: boolean;
  success: boolean | null;
  totalSteps: number;
  completedSteps: number;
  error?: string;
}

export async function loadRaawiExecutionPageSummary(input: {
  outputDir: string;
  scanId: string;
  pageNumber: number;
  pageUrl: string;
}): Promise<RaawiExecutionPageSummary> {
  const pageDir = join(resolve(input.outputDir), input.scanId, 'pages', String(input.pageNumber), 'raawi-agent');
  const planPath = join(pageDir, 'plan.json');
  const executionPath = join(pageDir, 'execution.json');

  const hasPlan = existsSync(planPath);
  const hasExecution = existsSync(executionPath);

  if (!hasExecution) {
    return {
      pageNumber: input.pageNumber,
      pageUrl: input.pageUrl,
      hasPlan,
      hasExecution,
      dryRun: false,
      success: null,
      totalSteps: 0,
      completedSteps: 0,
    };
  }

  try {
    const raw = await readFile(executionPath, 'utf-8');
    const parsed = JSON.parse(raw) as {
      success?: boolean;
      totalSteps?: number;
      completedSteps?: number;
      error?: string;
    };

    const planRaw = hasPlan ? await readFile(planPath, 'utf-8') : null;
    const planParsed = planRaw ? (JSON.parse(planRaw) as { steps?: unknown[] }) : null;
    const dryRun = parsed.completedSteps === 0 && (parsed.success === true) && (parsed.totalSteps ?? 0) > 0;

    return {
      pageNumber: input.pageNumber,
      pageUrl: input.pageUrl,
      hasPlan,
      hasExecution,
      dryRun,
      success: typeof parsed.success === 'boolean' ? parsed.success : null,
      totalSteps:
        typeof parsed.totalSteps === 'number'
          ? parsed.totalSteps
          : Array.isArray(planParsed?.steps)
            ? planParsed!.steps!.length
            : 0,
      completedSteps: typeof parsed.completedSteps === 'number' ? parsed.completedSteps : 0,
      ...(typeof parsed.error === 'string' && parsed.error.trim().length > 0 ? { error: parsed.error } : {}),
    };
  } catch {
    return {
      pageNumber: input.pageNumber,
      pageUrl: input.pageUrl,
      hasPlan,
      hasExecution,
      dryRun: false,
      success: null,
      totalSteps: 0,
      completedSteps: 0,
      error: 'Failed to parse raawi execution artifacts.',
    };
  }
}

export async function loadRaawiExecutionPageSummaries(input: {
  outputDir: string;
  scanId: string;
  pages: Array<{ pageNumber: number; pageUrl: string }>;
}): Promise<RaawiExecutionPageSummary[]> {
  return Promise.all(
    input.pages.map((page) =>
      loadRaawiExecutionPageSummary({
        outputDir: input.outputDir,
        scanId: input.scanId,
        pageNumber: page.pageNumber,
        pageUrl: page.pageUrl,
      })
    )
  );
}
