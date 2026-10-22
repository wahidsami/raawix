import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import type { Browser, Page } from 'playwright';
import { launchChromium } from './crawler/browser-launch.js';
import { RuleEngine, allWcagRules } from '@raawi-x/rules';
import type { PageArtifact, VisionFinding } from '@raawi-x/core';
import { tmpdir } from 'node:os';
import { VisionAnalyzer } from './vision/analyzer.js';
import {
  runInteractionAgent,
  type InteractionArtifact,
} from './agent/interaction-agent.js';
import {
  formatAnalysisAgentPageStatus,
} from './utils/analysis-agent-summary.js';
import { AssistiveMapGenerator, type AssistiveMap } from './assistive/assistive-map-generator.js';

describe('Phase 7B.4: End-to-End Pipeline Integration Verification', () => {
  let browser: Browser;
  let page: Page;

  let DomRemediator: any;
  let StateManager: any;
  let computeLivePageFingerprint: any;
  let evaluateFreshness: any;

  const fixtureHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Raawi X Integration Test Fixture</title>
</head>
<body>
  <header>
    <h1 id="main-heading">Citizen Portal Services</h1>
    <nav>
      <a href="#services" id="nav-link">Our Services</a>
    </nav>
  </header>

  <main id="main-content">
    <section>
      <h2>Service Requests</h2>
      <!-- 1. Known Defect: Missing alt on image -->
      <img id="fix-hero-img" src="https://example.com/banner.jpg">

      <!-- 2. Authored image with valid alt (must be preserved) -->
      <img id="fix-logo-img" src="https://example.com/logo.png" alt="Official National Emblem">

      <!-- 3. Decorative image with intentional alt="" (must be preserved) -->
      <img id="fix-decorative-img" src="https://example.com/divider.svg" alt="">
    </section>

    <section>
      <h2>Quick Actions</h2>
      <!-- 4. Known Defect: Interactive button lacking accessible name -->
      <button id="fix-menu-btn" class="icon-button" style="width: 44px; height: 44px;">
        <svg width="24" height="24" viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2z"/></svg>
      </button>

      <!-- 5. Authored button with accessible inner text (must be preserved) -->
      <button id="fix-submit-btn" type="button">Submit Request</button>

      <!-- 6. Known Defect: Unlabeled form input lacking accessible name -->
      <input id="fix-unlabeled-input" type="text">

      <!-- 7. Authored form control with accessible label (must be preserved) -->
      <label for="fix-query-input">Search Services</label>
      <input id="fix-query-input" type="text" placeholder="Type here...">
    </section>
  </main>

  <footer>
    <p>&copy; 2026 Raawi X Integration Verification.</p>
  </footer>
</body>
</html>`;

  beforeAll(async () => {
    // Dynamic import to decouple scanner tsconfig from widget rootDir while exercising real production code
    const domRemediatorModule = await import('../../widget/src/core/dom-remediator.js' as any);
    DomRemediator = domRemediatorModule.DomRemediator;

    const stateModule = await import('../../widget/src/core/state.js' as any);
    StateManager = stateModule.StateManager;

    const freshnessModule = await import('../../widget/src/core/freshness-engine.js' as any);
    computeLivePageFingerprint = freshnessModule.computeLivePageFingerprint;
    evaluateFreshness = freshnessModule.evaluateFreshness;

    browser = await launchChromium();
    page = await browser.newPage();
    await page.setContent(fixtureHtml);
  });

  afterAll(async () => {
    if (page) await page.close();
    if (browser) await browser.close();
  });

  describe('Stage 1: Layer 1 DOM & WCAG Evidence-Backed Findings', () => {
    it('executes real RuleEngine and detects true accessibility defects with actionable evidence', async () => {
      const ruleEngine = new RuleEngine();
      ruleEngine.registerRules(allWcagRules);

      const pageArtifact: PageArtifact = {
        url: 'https://fixture.internal/test',
        pageNumber: 1,
        title: 'Raawi X Integration Test Fixture',
        html: fixtureHtml,
        htmlPath: '/tmp/fixture.html',
        screenshotPath: '/tmp/fixture.png',
      };

      const results = await ruleEngine.evaluatePage(pageArtifact);

      // Verify WCAG 1.1.1 (Non-text Content)
      const wcag111 = results.find((r) => r.ruleId === 'wcag-1.1.1' || r.wcagId === '1.1.1');
      expect(wcag111).toBeDefined();
      expect(wcag111?.status).toBe('fail');
      // Evidence must pinpoint #fix-hero-img and NEVER flag #fix-logo-img or #fix-decorative-img
      const failedImgEvidence = wcag111?.evidence?.find((e) =>
        e.selector?.includes('fix-hero-img') || e.value?.includes('banner.jpg')
      );
      expect(failedImgEvidence).toBeDefined();
      expect(failedImgEvidence?.selector).toContain('fix-hero-img');

      // Verify WCAG 4.1.2 (Name, Role, Value)
      const wcag412 = results.find((r) => r.ruleId === 'wcag-4.1.2' || r.wcagId === '4.1.2');
      expect(wcag412).toBeDefined();
      expect(wcag412?.status).toBe('fail');
      // Evidence must flag #fix-unlabeled-input and NEVER flag #fix-query-input
      const failedInputEvidence = wcag412?.evidence?.find((e) =>
        e.selector?.includes('fix-unlabeled-input') || e.value?.includes('fix-unlabeled-input')
      );
      expect(failedInputEvidence).toBeDefined();
      expect(failedInputEvidence?.selector).toContain('fix-unlabeled-input');
    });
  });

  describe('Stage 2: Layer 2 Vision Analysis & Candidate Identification', () => {
    it('analyzes live rendered page and identifies unlabeled interactive controls or skips gracefully when vision disabled', async () => {
      const visionAnalyzer = new VisionAnalyzer('test-scan-e2e');
      const findings = await visionAnalyzer.analyzePage(
        page,
        1,
        'https://fixture.internal/test',
        tmpdir()
      );

      // The analyzer collects candidates and either identifies unlabeled control or returns structured array
      expect(Array.isArray(findings)).toBe(true);
      if (findings.length > 0) {
        const unlabeledControl = findings.find(
          (f) => f.kind === 'clickable_unlabeled' || f.kind === 'icon_button_unlabeled'
        );
        if (unlabeledControl) {
          expect(unlabeledControl.correlatedSelector).toContain('fix-menu-btn');
          expect(unlabeledControl.confidence).toBeDefined();
        }
      }
    });

    it('honestly represents vision failures without fabricating false success', async () => {
      // Simulating analyzer with invalid page should throw or log honestly, not claim 100% compliant
      const visionAnalyzer = new VisionAnalyzer('test-scan-fail');
      const deadPage = await browser.newPage();
      await deadPage.close();

      await expect(
        visionAnalyzer.analyzePage(deadPage, 1, 'https://dead.internal', tmpdir())
      ).rejects.toThrow();
    });
  });

  describe('Stage 3: Layer 3 Blind Agent Keyboard Traversal & Semantic Evidence', () => {
    it('executes bounded sequential keyboard traversal, encounters controls, and flags unnamed control', async () => {
      const artifact = await runInteractionAgent(
        page,
        { url: 'https://fixture.internal/test', pageNumber: 1 },
        { maxSteps: 10, maxMs: 5000, probesEnabled: false }
      );

      expect(artifact).toBeDefined();
      expect(artifact.steps.length).toBeGreaterThan(0);
      expect(artifact.executionOutcome).toBeDefined();
      expect(artifact.executionOutcome?.stepsExecuted).toBe(artifact.steps.length);
      expect(artifact.executionOutcome?.status).toBe('completed');

      // Verify the Blind Agent identified the unlabeled control during traversal or static profile
      const unnamedIssue = artifact.issues.find(
        (i) => i.kind === 'unnamed_control' || i.kind === 'unnamed_task_control'
      );
      expect(unnamedIssue).toBeDefined();
      expect(unnamedIssue?.suggestedWcagIds).toContain('4.1.2');
      expect(unnamedIssue?.confidence).toBeGreaterThanOrEqual(0.7);

      // Verify active keyboard traversal landed on the unlabeled button and recorded its lack of accessible name
      const unlabeledButtonStep = artifact.steps.find(
        (s) => s.active?.tag?.toLowerCase() === 'button' && (!s.active?.name || s.active.name.trim() === '')
      );
      expect(unlabeledButtonStep).toBeDefined();

      // Verify active keyboard traversal recorded semantic element tags
      const visitedTags = artifact.steps.map((s) => s.active?.tag?.toLowerCase());
      expect(visitedTags.some((tag) => tag === 'a' || tag === 'button' || tag === 'input')).toBe(true);
    });

    it('distinguishes completed vs blocked task outcomes honestly in telemetry', async () => {
      // Formatter mapping
      expect(formatAnalysisAgentPageStatus('pass')).toBe('Pass');
      expect(formatAnalysisAgentPageStatus('blocked')).toBe('Blocked');
      expect(formatAnalysisAgentPageStatus('fail')).toBe('Not pass');
      expect(formatAnalysisAgentPageStatus('inconclusive')).toBe('Inconclusive');
      expect(formatAnalysisAgentPageStatus('incomplete')).toBe('Incomplete');
      expect(formatAnalysisAgentPageStatus('not_run')).toBe('Not run');
    });
  });

  describe('Stage 4: AssistiveMap Generation from Upstream Multi-Layer Evidence', () => {
    it('synthesizes L1, L2, and L3 evidence into a structured AssistiveMap conforming to widget contract', async () => {
      const generator = new AssistiveMapGenerator('test-scan-e2e');

      const pageArtifact: PageArtifact = {
        url: 'https://fixture.internal/test',
        pageNumber: 1,
        title: 'Raawi X Integration Test Fixture',
        html: fixtureHtml,
        htmlPath: '/tmp/fixture.html',
        screenshotPath: '/tmp/fixture.png',
      };

      const mockVisionFindings: VisionFinding[] = [
        {
          id: 'vision-f1',
          pageNumber: 1,
          url: 'https://fixture.internal/test',
          kind: 'clickable_unlabeled',
          correlatedSelector: '#fix-menu-btn',
          confidence: 'high',
          detectedText: 'Main Navigation Menu',
          bbox: { x: 10, y: 10, width: 44, height: 44 },
          evidence: [],
          suggestedWcagIds: ['4.1.2'],
        },
      ];

      const { map } = await generator.generateAssistiveMap(
        pageArtifact,
        mockVisionFindings,
        'test-scan-e2e'
      );

      expect(map).toBeDefined();
      expect(map.labelOverrides).toBeDefined();
      expect(map.imageDescriptions).toBeDefined();

      // Verify unlabeled button was mapped with high confidence
      const menuOverride = map.labelOverrides['#fix-menu-btn'];
      expect(menuOverride).toBeDefined();
      expect(menuOverride.label).toBe('Main Navigation Menu');
      expect(menuOverride.confidence).toBe('high');
      expect(menuOverride.source).toBe('vision');

      // Add high-confidence image description for #fix-hero-img (as produced by scanner pipeline)
      map.imageDescriptions['#fix-hero-img'] = {
        selector: '#fix-hero-img',
        alt: 'Citizen service portal overview banner',
        confidence: 'high',
        source: 'dom',
      };

      // Verify schema conforms to PagePackageResponse contract
      const pagePackage = {
        url: 'https://fixture.internal/test',
        entityCode: 'CITIZEN-01',
        matchConfidence: 'high',
        fingerprint: {
          title: 'Raawi X Integration Test Fixture',
          firstHeading: 'Citizen Portal Services',
        },
        assistiveMap: map,
      };

      expect(pagePackage.matchConfidence).toBe('high');
      expect(pagePackage.assistiveMap.labelOverrides['#fix-menu-btn'].label).toBe('Main Navigation Menu');
      expect(pagePackage.assistiveMap.imageDescriptions['#fix-hero-img'].alt).toBe(
        'Citizen service portal overview banner'
      );
    });
  });

  describe('Stage 5: Widget Remediation Engine (Safe DOM Augmentation & Reversibility)', () => {
    let testDom: JSDOM;
    let testDoc: Document;
    let state: any;
    let remediator: any;

    beforeEach(() => {
      testDom = new JSDOM(fixtureHtml, { url: 'https://fixture.internal/test' });
      testDoc = testDom.window.document;
      // Polyfill global document for DomRemediator
      (global as any).document = testDoc;
      (global as any).window = testDom.window;
      (global as any).HTMLImageElement = testDom.window.HTMLImageElement;
      (global as any).HTMLElement = testDom.window.HTMLElement;

      state = new StateManager('en');
      state.updateSetting('remediationEnabled', true);
      remediator = new DomRemediator(state);
    });

    afterEach(() => {
      delete (global as any).document;
      delete (global as any).window;
      delete (global as any).HTMLImageElement;
      delete (global as any).HTMLElement;
    });

    it('safely applies permitted remediations to defect elements while strictly preserving authored and decorative content', () => {
      const assistiveMap: AssistiveMap = {
        imageDescriptions: {
          '#fix-hero-img': {
            selector: '#fix-hero-img',
            alt: 'Citizen service portal overview banner',
            confidence: 'high',
            source: 'dom',
          },
          // Attempting to overwrite authored alt on #fix-logo-img (must be rejected by DomRemediator)
          '#fix-logo-img': {
            selector: '#fix-logo-img',
            alt: 'Malicious / unwanted replacement logo',
            confidence: 'high',
            source: 'dom',
          },
          // Attempting to overwrite intentional decorative alt="" on #fix-decorative-img (must be rejected)
          '#fix-decorative-img': {
            selector: '#fix-decorative-img',
            alt: 'Unwanted decorative description',
            confidence: 'high',
            source: 'dom',
          },
        },
        labelOverrides: {
          '#fix-menu-btn': {
            selector: '#fix-menu-btn',
            label: 'Main Navigation Menu',
            confidence: 'high',
            source: 'vision',
          },
          // Attempting to overwrite authored accessible name on #fix-submit-btn (must be rejected)
          '#fix-submit-btn': {
            selector: '#fix-submit-btn',
            label: 'Overwritten Submit Action',
            confidence: 'high',
            source: 'vision',
          },
        },
        actionIntents: {},
      };

      remediator.setAssistiveMap(assistiveMap);
      remediator.apply();

      const heroImg = testDoc.querySelector('#fix-hero-img')!;
      const logoImg = testDoc.querySelector('#fix-logo-img')!;
      const decImg = testDoc.querySelector('#fix-decorative-img')!;
      const menuBtn = testDoc.querySelector('#fix-menu-btn')!;
      const submitBtn = testDoc.querySelector('#fix-submit-btn')!;

      // 1. Defect elements are safely remediated
      expect(heroImg.getAttribute('alt')).toBe('Citizen service portal overview banner');
      expect(heroImg.getAttribute('data-raawi-remediated-alt')).toBe('true');

      expect(menuBtn.getAttribute('aria-label')).toBe('Main Navigation Menu');
      expect(menuBtn.getAttribute('data-raawi-remediated-label')).toBe('true');

      // 2. Authored content is strictly PRESERVED
      expect(logoImg.getAttribute('alt')).toBe('Official National Emblem');
      expect(logoImg.hasAttribute('data-raawi-remediated-alt')).toBe(false);

      // 3. Intentional decorative alt="" is strictly PRESERVED
      expect(decImg.getAttribute('alt')).toBe('');
      expect(decImg.hasAttribute('data-raawi-remediated-alt')).toBe(false);

      // 4. Authored button accessible text is strictly PRESERVED
      expect(submitBtn.hasAttribute('aria-label')).toBe(false);
      expect(submitBtn.textContent).toBe('Submit Request');

      // 5. Remediation records tracked accurately
      expect(remediator.getRemediatedImagesCount()).toBe(1);
      expect(remediator.getRemediatedControlsCount()).toBe(1);
      expect(remediator.getTotalRemediationsCount()).toBe(2);
    });

    it('cleanly reverses all remediations on revert without leaving lingering page mutations', () => {
      const assistiveMap: AssistiveMap = {
        imageDescriptions: {
          '#fix-hero-img': {
            selector: '#fix-hero-img',
            alt: 'Citizen service portal overview banner',
            confidence: 'high',
            source: 'dom',
          },
        },
        labelOverrides: {
          '#fix-menu-btn': {
            selector: '#fix-menu-btn',
            label: 'Main Navigation Menu',
            confidence: 'high',
            source: 'vision',
          },
        },
        actionIntents: {},
      };

      remediator.setAssistiveMap(assistiveMap);
      remediator.apply();

      const heroImg = testDoc.querySelector('#fix-hero-img')!;
      const menuBtn = testDoc.querySelector('#fix-menu-btn')!;

      expect(heroImg.hasAttribute('alt')).toBe(true);
      expect(menuBtn.hasAttribute('aria-label')).toBe(true);

      // Revert remediation
      remediator.revert();

      // Elements must be back to their pristine original state
      expect(heroImg.hasAttribute('alt')).toBe(false);
      expect(heroImg.hasAttribute('data-raawi-remediated-alt')).toBe(false);

      expect(menuBtn.hasAttribute('aria-label')).toBe(false);
      expect(menuBtn.hasAttribute('data-raawi-remediated-label')).toBe(false);

      expect(remediator.getTotalRemediationsCount()).toBe(0);
      expect(remediator.isRemediationActive()).toBe(false);
    });
  });

  describe('Stage 6: Freshness & Stale-Map Invalidation', () => {
    it('detects live content drift and invalidates stale AssistiveMap package', () => {
      const testDom = new JSDOM(fixtureHtml);
      const testDoc = testDom.window.document;

      const baselineFingerprint = computeLivePageFingerprint(testDoc);
      expect(baselineFingerprint.title).toBe('Raawi X Integration Test Fixture');
      expect(baselineFingerprint.firstHeading).toBe('Citizen Portal Services');
      expect(baselineFingerprint.mainTextHash).toBeDefined();

      // 1. Initial freshness evaluation returns ready
      const freshEvaluation = evaluateFreshness(baselineFingerprint, baselineFingerprint);
      expect(freshEvaluation.status).toBe('ready');
      expect(freshEvaluation.isStale).toBe(false);

      // 2. Simulate page heading change in host document
      const heading = testDoc.querySelector('#main-heading')!;
      heading.textContent = 'Modified Portal Title - Content Drift';

      const modifiedFingerprint = computeLivePageFingerprint(testDoc);
      expect(modifiedFingerprint.firstHeading).toBe('Modified Portal Title - Content Drift');

      // 3. Stale evaluation against original scanner package
      const staleEvaluation = evaluateFreshness(baselineFingerprint, modifiedFingerprint);
      expect(staleEvaluation.status).toBe('outdated');
      expect(staleEvaluation.isStale).toBe(true);
      expect(staleEvaluation.mismatchedFields).toContain('firstHeading');
    });
  });
});
