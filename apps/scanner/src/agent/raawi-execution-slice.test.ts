import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RaawiAgent } from '@raawi-x/agent-runtime';
import type { ActionBindings } from '@raawi-x/agent-runtime';
import { loadRaawiExecutionPageSummary } from '../utils/raawi-execution-summary.js';

describe('Raawi execution login slice', () => {
  it('plans login, executes with bindings, and reads execution artifacts', async () => {
    const semanticModel = {
      modelVersion: 1,
      pageUrl: 'https://example.com/login',
      title: 'Login',
      generatedAt: new Date().toISOString(),
      confidence: 'high',
      structure: [
        { id: 'page-root', type: 'page', label: 'Login page' },
        { id: 'login-form', type: 'form', label: 'Login form' },
      ],
      actions: [
        { id: 'submit-login', type: 'submit', label: 'Sign in', selector: 'button[type="submit"]' },
      ],
      relationships: [],
    } as any;

    const calls: Array<{ method: string; payload: unknown }> = [];
    const bindings: ActionBindings = {
      async fill(target, value) {
        calls.push({ method: 'fill', payload: { target, value } });
        return { ok: true };
      },
      async click(target) {
        calls.push({ method: 'click', payload: target });
        return { ok: true };
      },
      async select(target, value) {
        calls.push({ method: 'select', payload: { target, value } });
        return { ok: true };
      },
      async navigate(url) {
        calls.push({ method: 'navigate', payload: url });
        return { ok: true };
      },
      async submit(target) {
        calls.push({ method: 'submit', payload: target });
        return { ok: true };
      },
      async read(target) {
        calls.push({ method: 'read', payload: target });
        return { text: 'ok' };
      },
      async wait(durationMs) {
        calls.push({ method: 'wait', payload: durationMs });
        return { ok: true };
      },
    };

    const agent = new RaawiAgent();
    const task = {
      goal: 'login' as const,
      description: 'Login with test credentials',
      context: {
        username: 'test@example.com',
        password: 'secret-password',
      },
    };

    const plan = await agent.getPlan({
      model: semanticModel,
      task,
    });

    expect(plan.goal).toBe('login');
    expect(plan.steps.length).toBeGreaterThanOrEqual(3);
    expect(plan.steps.some((s) => s.type === 'fill' && s.target?.fieldKey === 'username')).toBe(true);
    expect(plan.steps.some((s) => s.type === 'fill' && s.target?.fieldKey === 'password')).toBe(true);
    expect(plan.steps.some((s) => s.type === 'click' && s.target?.selector === 'button[type="submit"]')).toBe(true);

    const result = await agent.execute({
      model: semanticModel,
      task,
      bindings,
      dryRun: false,
    });

    expect(result.success).toBe(true);
    expect(result.completedSteps).toBe(result.totalSteps);
    expect(calls.filter((c) => c.method === 'fill').length).toBeGreaterThanOrEqual(2);

    const root = await mkdtemp(join(tmpdir(), 'raawi-exec-'));
    try {
      const pageDir = join(root, 'scan_test', 'pages', '1', 'raawi-agent');
      await mkdir(pageDir, { recursive: true });
      await writeFile(join(pageDir, 'plan.json'), JSON.stringify(plan, null, 2), 'utf-8');
      await writeFile(join(pageDir, 'execution.json'), JSON.stringify(result, null, 2), 'utf-8');

      const summary = await loadRaawiExecutionPageSummary({
        outputDir: root,
        scanId: 'scan_test',
        pageNumber: 1,
        pageUrl: 'https://example.com/login',
      });

      expect(summary.hasPlan).toBe(true);
      expect(summary.hasExecution).toBe(true);
      expect(summary.success).toBe(true);
      expect(summary.totalSteps).toBeGreaterThanOrEqual(3);
      expect(summary.completedSteps).toBe(summary.totalSteps);

      const executionRaw = JSON.parse(await readFile(join(pageDir, 'execution.json'), 'utf-8'));
      expect(executionRaw.success).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
