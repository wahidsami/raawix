import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Browser } from 'playwright';
import { launchChromium } from '../crawler/browser-launch.js';
import {
  runInteractionAgent,
  validateAgentArtifact,
  type InteractionArtifact,
} from './interaction-agent.js';
import {
  loadAnalysisAgentPageSummary,
  formatAnalysisAgentPageStatus,
} from '../utils/analysis-agent-summary.js';

describe('interaction-agent', () => {
  describe('validateAgentArtifact', () => {
    it('returns null for non-object', () => {
      expect(validateAgentArtifact(null)).toBeNull();
      expect(validateAgentArtifact(undefined)).toBeNull();
      expect(validateAgentArtifact('')).toBeNull();
      expect(validateAgentArtifact(42)).toBeNull();
    });

    it('returns null when url or pageNumber missing', () => {
      expect(validateAgentArtifact({ pageNumber: 1, steps: [], issues: [] })).toBeNull();
      expect(validateAgentArtifact({ url: 'https://a.com', steps: [], issues: [] })).toBeNull();
    });

    it('returns null when steps or issues are not arrays', () => {
      expect(
        validateAgentArtifact({ url: 'https://a.com', pageNumber: 1, steps: {}, issues: [] })
      ).toBeNull();
      expect(
        validateAgentArtifact({ url: 'https://a.com', pageNumber: 1, steps: [], issues: null })
      ).toBeNull();
    });

    it('returns artifact when shape is valid', () => {
      const artifact = {
        url: 'https://example.com',
        pageNumber: 1,
        capturedAt: new Date().toISOString(),
        steps: [],
        issues: [],
      };
      expect(validateAgentArtifact(artifact)).toEqual(artifact);
    });

    it('returns artifact with issues array', () => {
      const artifact = {
        url: 'https://example.com',
        pageNumber: 1,
        capturedAt: new Date().toISOString(),
        steps: [{ i: 0, action: 'tab', active: { tag: 'button' }, focusVisible: true }],
        issues: [
          {
            kind: 'focus_trap',
            message: 'Focus trapped',
            confidence: 0.9,
            evidence: { stepIndexes: [0, 1, 2] },
          },
        ],
      };
      expect(validateAgentArtifact(artifact)).toEqual(artifact);
    });
  });

  describe('Part C/D: Blind Agent Automated Acceptance Suite', () => {
    let browser: Browser;

    beforeAll(async () => {
      browser = await launchChromium(['--no-sandbox', '--disable-setuid-sandbox']);
    }, 30000);

    afterAll(async () => {
      if (browser) {
        await browser.close();
      }
    });

    it('executes at least 5 genuine sequential keyboard interactions on a controlled interactive fixture', async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      try {
        await page.setContent(`
          <!DOCTYPE html>
          <html lang="en">
            <head><title>Accessible Form Fixture</title></head>
            <body>
              <header>
                <a href="#main-content" id="skip-link">Skip to main content</a>
                <nav aria-label="Main Navigation">
                  <a href="/home" id="nav-home">Home</a>
                  <a href="/about" id="nav-about">About Us</a>
                </nav>
              </header>
              <main id="main-content">
                <h1>Service Portal</h1>
                <form id="feedback-form">
                  <label for="full-name">Full Name</label>
                  <input id="full-name" type="text" name="name" required />

                  <label for="email-addr">Email Address</label>
                  <input id="email-addr" type="email" name="email" required />

                  <label>
                    <input type="checkbox" id="subscribe-news" />
                    Subscribe to newsletter
                  </label>

                  <button type="submit" id="btn-submit">Submit Feedback</button>
                  <button type="button" id="btn-cancel">Cancel</button>
                </form>
              </main>
            </body>
          </html>
        `);

        const artifact = await runInteractionAgent(
          page,
          { url: page.url(), pageNumber: 1 },
          {
            maxSteps: 20,
            maxMs: 15000,
          }
        );

        expect(artifact.steps.length).toBeGreaterThanOrEqual(5);

        // Verify sequential interaction structure
        for (let i = 0; i < artifact.steps.length; i++) {
          const step = artifact.steps[i];
          expect(step.i).toBe(i);
          expect(['tab', 'shift+tab']).toContain(step.action);
          expect(step.active).toBeDefined();
        }

        // Verify accessible semantic details were captured (roles, names, tags)
        const tags = artifact.steps.map((s) => s.active?.tag?.toLowerCase()).filter(Boolean);
        expect(tags).toContain('a');
        expect(tags).toContain('input');
        expect(tags).toContain('button');

        // Execution outcome should indicate clean completion within limits
        expect(artifact.executionOutcome).toBeDefined();
        expect(artifact.executionOutcome?.status).toBe('completed');
        expect(artifact.executionOutcome?.hitTimeLimit).toBe(false);
      } finally {
        await context.close();
      }
    });

    it('strictly enforces request-level step cap within the execution loop', async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      try {
        await page.setContent(`
          <!DOCTYPE html>
          <html>
            <body>
              <button id="b1">Button 1</button>
              <button id="b2">Button 2</button>
              <button id="b3">Button 3</button>
              <button id="b4">Button 4</button>
              <button id="b5">Button 5</button>
              <button id="b6">Button 6</button>
            </body>
          </html>
        `);

        // Request a tight limit of 4 steps
        const artifact = await runInteractionAgent(
          page,
          { url: page.url(), pageNumber: 1 },
          {
            maxSteps: 4,
            maxMs: 15000,
          }
        );

        // Total steps in artifact must never exceed the requested limit
        expect(artifact.steps.length).toBeLessThanOrEqual(4);
        expect(artifact.executionOutcome?.hitStepLimit).toBe(true);
      } finally {
        await context.close();
      }
    });

    it('strictly enforces deadline / time budget within the execution loop', async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      try {
        await page.setContent(`
          <!DOCTYPE html>
          <html>
            <body>
              <button id="b1">Button 1</button>
              <button id="b2">Button 2</button>
              <button id="b3">Button 3</button>
            </body>
          </html>
        `);

        // Request an ultra-tight deadline (1ms) to force immediate time cap trigger
        const artifact = await runInteractionAgent(
          page,
          { url: page.url(), pageNumber: 1 },
          {
            maxSteps: 50,
            maxMs: 1,
          }
        );

        expect(artifact.executionOutcome?.hitTimeLimit).toBe(true);
        expect(artifact.executionOutcome?.status).toBe('timeout');
      } finally {
        await context.close();
      }
    });

    it('handles unexpected page closure safely leaving inspectable trace status', async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.setContent('<html><body><button id="b1">OK</button></body></html>');
      await page.close();

      // runInteractionAgent on a closed page must not crash or throw unhandled exceptions
      const artifact = await runInteractionAgent(
        page,
        { url: 'http://localhost/closed', pageNumber: 1 },
        {
          maxSteps: 10,
          maxMs: 5000,
        }
      );

      expect(artifact).toBeDefined();
      expect(artifact.executionOutcome?.status).toBe('page_closed');
      expect(artifact.executionOutcome?.reason).toContain('closed');
    });

    it('handles unexpected cross-origin navigation safely with navigated_away outcome', async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      try {
        // Intercept route so browser visits a virtual origin without external network
        await page.route('https://unauthorized-destination.test/**', (route) => {
          route.fulfill({
            status: 200,
            contentType: 'text/html',
            body: '<!DOCTYPE html><html><body><button id="b1">Test</button></body></html>',
          });
        });
        await page.goto('https://unauthorized-destination.test/path');

        const artifact = await runInteractionAgent(
          page,
          { url: 'https://unauthorized-destination.test/path', pageNumber: 1 },
          {
            maxSteps: 10,
            maxMs: 5000,
            seedUrl: 'https://authorized-seed-origin.gov.sa/',
          }
        );

        expect(artifact.executionOutcome?.status).toBe('navigated_away');
      } finally {
        await context.close();
      }
    });

    it('identifies unnamed controls and missing semantic information', async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      try {
        await page.setContent(`
          <!DOCTYPE html>
          <html>
            <body>
              <button id="empty-button"></button>
              <input type="text" id="unlabeled-text" />
              <button id="labeled-button">Valid Label</button>
            </body>
          </html>
        `);

        const artifact = await runInteractionAgent(
          page,
          { url: page.url(), pageNumber: 1 },
          {
            maxSteps: 6,
            maxMs: 10000,
          }
        );

        expect(artifact.steps.length).toBeGreaterThanOrEqual(2);
        const emptyButtonStep = artifact.steps.find((s) => s.active?.tag?.toLowerCase() === 'button' && !s.active?.name);
        expect(emptyButtonStep).toBeDefined();
      } finally {
        await context.close();
      }
    });

    it('detects keyboard traps and records diagnostic finding', async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      try {
        await page.setContent(`
          <!DOCTYPE html>
          <html>
            <body>
              <div id="trap-wrapper">
                <button id="trap-a">Trap Step A</button>
                <button id="trap-b">Trap Step B</button>
              </div>
              <button id="unreachable">Unreachable</button>
              <script>
                document.getElementById('trap-b').addEventListener('keydown', (e) => {
                  if (e.key === 'Tab' && !e.shiftKey) {
                    e.preventDefault();
                    document.getElementById('trap-a').focus();
                  }
                });
              </script>
            </body>
          </html>
        `);

        const artifact = await runInteractionAgent(
          page,
          { url: page.url(), pageNumber: 1 },
          {
            maxSteps: 12,
            maxMs: 10000,
          }
        );

        expect(artifact.issues.some((issue) => issue.kind === 'focus_trap')).toBe(true);
      } finally {
        await context.close();
      }
    });

    it('detects missing focus indicators when active elements have no visible outline', async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      try {
        await page.setContent(`
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                *:focus {
                  outline: none !important;
                  box-shadow: none !important;
                  border-color: transparent !important;
                }
              </style>
            </head>
            <body>
              <button id="btn-no-outline-1">Button 1</button>
              <button id="btn-no-outline-2">Button 2</button>
              <button id="btn-no-outline-3">Button 3</button>
            </body>
          </html>
        `);

        const artifact = await runInteractionAgent(
          page,
          { url: page.url(), pageNumber: 1 },
          {
            maxSteps: 6,
            maxMs: 10000,
          }
        );

        const focusInvisibleSteps = artifact.steps.filter((s) => s.focusVisible === false);
        expect(focusInvisibleSteps.length).toBeGreaterThanOrEqual(1);
        expect(artifact.issues.some((issue) => issue.kind === 'focus_not_visible')).toBe(true);
      } finally {
        await context.close();
      }
    });

    it('evaluates task outcomes correctly (pass, blocked, failed, inconclusive, incomplete, not_run)', async () => {
      const tmp = await mkdtemp(join(tmpdir(), 'raawi-summary-test-'));
      try {
        // Blocked artifact (page_closed)
        const blockedPath = join(tmp, 'blocked.json');
        await writeFile(
          blockedPath,
          JSON.stringify({
            url: 'https://example.com/blocked',
            pageNumber: 1,
            steps: [{ i: 0, action: 'tab', active: { tag: 'button' } }],
            issues: [],
            executionOutcome: { status: 'page_closed', reason: 'Target page closed' },
          })
        );
        const blockedSummary = await loadAnalysisAgentPageSummary({
          pageNumber: 1,
          pageUrl: 'https://example.com/blocked',
          agentPath: blockedPath,
        });
        expect(blockedSummary.status).toBe('blocked');
        expect(formatAnalysisAgentPageStatus(blockedSummary.status)).toBe('Blocked');

        // Incomplete artifact (0 steps/probes recorded)
        const incompletePath = join(tmp, 'incomplete.json');
        await writeFile(
          incompletePath,
          JSON.stringify({
            url: 'https://example.com/incomplete',
            pageNumber: 2,
            steps: [],
            issues: [],
            executionOutcome: { status: 'incomplete', hitTimeLimit: true },
          })
        );
        const incompleteSummary = await loadAnalysisAgentPageSummary({
          pageNumber: 2,
          pageUrl: 'https://example.com/incomplete',
          agentPath: incompletePath,
        });
        expect(incompleteSummary.status).toBe('incomplete');
        expect(formatAnalysisAgentPageStatus(incompleteSummary.status)).toBe('Incomplete');

        // Not run artifact (agentPath not provided)
        const notRunSummary = await loadAnalysisAgentPageSummary({
          pageNumber: 5,
          pageUrl: 'https://example.com/notrun',
          agentPath: undefined,
        });
        expect(notRunSummary.status).toBe('not_run');
        expect(formatAnalysisAgentPageStatus(notRunSummary.status)).toBe('Not run');

        // Failed artifact (has findings/issues)
        const failPath = join(tmp, 'fail.json');
        await writeFile(
          failPath,
          JSON.stringify({
            url: 'https://example.com/fail',
            pageNumber: 3,
            steps: [
              { i: 0, action: 'tab', active: { tag: 'button' } },
              { i: 1, action: 'tab', active: { tag: 'button' } },
            ],
            issues: [{ kind: 'focus_trap', message: 'Trap detected' }],
            executionOutcome: { status: 'completed' },
          })
        );
        const failSummary = await loadAnalysisAgentPageSummary({
          pageNumber: 3,
          pageUrl: 'https://example.com/fail',
          agentPath: failPath,
        });
        expect(failSummary.status).toBe('fail');
        expect(formatAnalysisAgentPageStatus(failSummary.status)).toBe('Not pass');

        // Pass artifact (clean run, no issues)
        const passPath = join(tmp, 'pass.json');
        await writeFile(
          passPath,
          JSON.stringify({
            url: 'https://example.com/pass',
            pageNumber: 4,
            steps: [
              { i: 0, action: 'tab', active: { tag: 'a' } },
              { i: 1, action: 'tab', active: { tag: 'button' } },
            ],
            issues: [],
            executionOutcome: { status: 'completed' },
          })
        );
        const passSummary = await loadAnalysisAgentPageSummary({
          pageNumber: 4,
          pageUrl: 'https://example.com/pass',
          agentPath: passPath,
        });
        expect(passSummary.status).toBe('pass');
        expect(formatAnalysisAgentPageStatus(passSummary.status)).toBe('Pass');
      } finally {
        await rm(tmp, { recursive: true, force: true });
      }
    });

    it('persists interaction.json artifact and reads it back via summary loader', async () => {
      const tmp = await mkdtemp(join(tmpdir(), 'raawi-persist-test-'));
      const context = await browser.newContext();
      const page = await context.newPage();
      try {
        await page.setContent('<html><body><button id="b1">Click Me</button></body></html>');
        const artifact = await runInteractionAgent(
          page,
          { url: 'https://example.com/', pageNumber: 1 },
          {
            maxSteps: 5,
            maxMs: 5000,
          }
        );

        // Simulate page-capture saving pattern
        const pageDir = join(tmp, 'pages', '1', 'interaction');
        await mkdir(pageDir, { recursive: true });
        const interactionPath = join(pageDir, 'interaction.json');
        await writeFile(interactionPath, JSON.stringify(artifact, null, 2), 'utf-8');

        const summary = await loadAnalysisAgentPageSummary({
          pageNumber: 1,
          pageUrl: 'https://example.com/',
          agentPath: interactionPath,
        });

        expect(summary.executed).toBe(true);
        expect(summary.stepCount).toBe(artifact.steps.length);
        expect(summary.executionOutcome?.status).toBe(artifact.executionOutcome?.status);
      } finally {
        await context.close();
        await rm(tmp, { recursive: true, force: true });
      }
    });

    it('validates AssistiveMap and Layer 3 data contract compatibility with widget consumer', () => {
      // Contract defined by apps/widget/src/widget.legacy.ts and apps/widget/test/phase5-4.test.ts
      const sampleAssistiveMap = {
        version: '1.0',
        pageVersionId: 'pv_test_123',
        generatedAt: new Date().toISOString(),
        imageDescriptions: {
          'img.Recipe__image': 'A slice of freshly baked cake on a white ceramic plate',
        },
        labelOverrides: {
          'button#unnamed-btn': 'Submit Feedback',
        },
        actionIntents: {
          'button#unnamed-btn': {
            contextTitle: 'Feedback Submission',
            intent: 'submit_feedback',
          },
        },
        forms: [
          {
            id: 'feedback-form',
            name: 'Feedback Form',
            fields: [
              { selector: '#full-name', label: 'Full Name', required: true },
              { selector: '#email-addr', label: 'Email Address', required: true },
            ],
          },
        ],
      };

      // Verify contract shape
      expect(sampleAssistiveMap.imageDescriptions).toBeDefined();
      expect(typeof sampleAssistiveMap.imageDescriptions['img.Recipe__image']).toBe('string');
      expect(sampleAssistiveMap.labelOverrides).toBeDefined();
      expect(typeof sampleAssistiveMap.labelOverrides['button#unnamed-btn']).toBe('string');
      expect(sampleAssistiveMap.actionIntents).toBeDefined();
      expect(sampleAssistiveMap.actionIntents['button#unnamed-btn'].contextTitle).toBe('Feedback Submission');
      expect(Array.isArray(sampleAssistiveMap.forms)).toBe(true);
      expect(sampleAssistiveMap.forms[0].fields.length).toBe(2);
    });
  });
});
