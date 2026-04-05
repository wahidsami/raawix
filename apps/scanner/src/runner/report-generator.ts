import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type {
  ScanRun,
  PageArtifact,
  PageRuleResults,
  ScanRunSummary,
  LevelSummary,
  VisionFinding,
  RuleResult,
  EvidenceItem,
} from '@raawi-x/core';
import { RuleEngine } from '@raawi-x/rules';
import { allWcagRules } from '@raawi-x/rules';
import { AssistiveMapGenerator, AssistiveMapGenerator as AMG } from '../assistive/assistive-map-generator.js';
import { assistiveMapRepository } from '../db/assistive-map-repository.js';
import { getHostname } from '../crawler/url-utils.js';
import { scanEventEmitter } from '../events/scan-events.js';

export class ReportGenerator {
  private outputDir: string;

  constructor(outputDir: string) {
    this.outputDir = resolve(outputDir);
  }

  /**
   * Load all page artifacts from output/{scanId}/pages/
   */
  async loadPageArtifacts(scanId: string): Promise<PageArtifact[]> {
    const scanDir = join(this.outputDir, scanId);
    const pagesDir = join(scanDir, 'pages');

    try {
      // Check if pages directory exists
      await stat(pagesDir);
    } catch {
      // No pages directory, return empty array
      return [];
    }

    const pageDirs = await readdir(pagesDir, { withFileTypes: true });
    const artifacts: PageArtifact[] = [];

    for (const pageDir of pageDirs) {
      if (!pageDir.isDirectory()) continue;

      const pageNumber = parseInt(pageDir.name, 10);
      if (isNaN(pageNumber)) continue;

      const pagePath = join(pagesDir, pageDir.name);
      const artifact = await this.loadPageArtifact(pagePath, pageNumber);
      if (artifact) {
        artifacts.push(artifact);
      }
    }

    // Sort by page number
    artifacts.sort((a, b) => a.pageNumber - b.pageNumber);

    return artifacts;
  }

  /**
   * Load a single page artifact from a page directory
   */
  private async loadPageArtifact(
    pageDir: string,
    pageNumber: number
  ): Promise<PageArtifact | null> {
    try {
      // Load metadata
      const metadataPath = join(pageDir, 'page.json');
      const metadata = JSON.parse(await readFile(metadataPath, 'utf-8'));

      const artifact: PageArtifact = {
        pageNumber,
        url: metadata.url || '',
        title: metadata.title,
        finalUrl: metadata.finalUrl || metadata.url,
        // metadata.accessibilityBarriers is handled dynamically if needed
        canonicalUrl: metadata.canonicalUrl,
        pageFingerprint: metadata.pageFingerprint,
        htmlPath: metadata.htmlPath || join(pageDir, 'page.html'),
        screenshotPath: metadata.screenshotPath || join(pageDir, 'screenshot.png'),
        a11yPath: metadata.a11yPath || join(pageDir, 'a11y.json'),
        metadataPath,
        error: metadata.error,
      };

      // Load HTML if available
      if (artifact.htmlPath) {
        try {
          artifact.html = await readFile(artifact.htmlPath, 'utf-8');
        } catch {
          // HTML file not found or unreadable
        }
      }

      // Load a11y snapshot if available
      if (artifact.a11yPath) {
        try {
          const a11yContent = await readFile(artifact.a11yPath, 'utf-8');
          artifact.a11y = JSON.parse(a11yContent);
        } catch {
          // a11y file not found or unreadable
        }
      }

      // Load vision findings if available
      if (artifact.visionPath) {
        try {
          // visionPath is already set in artifact from metadata
        } catch {
          // vision file not found or unreadable
        }
      }

      // Set visionPath from metadata if available
      if (metadata.visionPath) {
        artifact.visionPath = metadata.visionPath;
      }

      if (metadata.agentPath) {
        artifact.agentPath = metadata.agentPath;
      }

      return artifact;
    } catch (error) {
      console.warn(`Failed to load page artifact from ${pageDir}:`, error);
      return null;
    }
  }

  /**
   * Generate report by running all rules on all pages
   */
  async generateReport(
    scanId: string,
    seedUrl: string,
    startedAt: string,
    completedAt?: string,
    options?: { generateAssistiveMap?: boolean }
  ): Promise<ScanRun> {
    const generateAssistiveMap = options?.generateAssistiveMap !== false;
    // Load all page artifacts
    const pages = await this.loadPageArtifacts(scanId);

    // Initialize rule engine and register all rules
    const ruleEngine = new RuleEngine();
    ruleEngine.registerRules(allWcagRules);

    // Run rules on each page
    const results: PageRuleResults[] = [];

    for (const page of pages) {
      const ruleResults = await ruleEngine.evaluatePage(page);

      // Load and convert vision findings to rule results
      const visionRuleResults = await this.loadVisionFindings(page, scanId);

      const findingsCount = ruleResults.filter((r) => r.status === 'fail').length;
      const visionCount = visionRuleResults.length;

      results.push({
        pageNumber: page.pageNumber,
        url: page.url,
        ruleResults: [...ruleResults, ...visionRuleResults],
      });

      // Generate assistive map for this page (Third Layer) — optional per scan
      let assistiveCounts = { images: 0, labels: 0, actions: 0 };
      if (
        generateAssistiveMap &&
        !page.error &&
        page.canonicalUrl &&
        page.pageFingerprint
      ) {
        try {
          await this.generateAssistiveMapForPage(page, visionRuleResults, scanId, seedUrl);
          const scanDir = join(this.outputDir, scanId);
          const pageDir = join(scanDir, 'pages', String(page.pageNumber));
          const assistiveMapPath = join(pageDir, 'assistive-model.json');
          try {
            const assistiveData = JSON.parse(await readFile(assistiveMapPath, 'utf-8'));
            const map = assistiveData.map || assistiveData;
            assistiveCounts = {
              images: map.data?.imageDescriptions?.length || Object.keys(map.imageDescriptions || {}).length || 0,
              labels: map.data?.labelOverrides?.length || Object.keys(map.labelOverrides || {}).length || 0,
              actions: map.data?.actionIntents?.length || Object.keys(map.actionIntents || {}).length || 0,
            };
          } catch {
            // Assistive map not available, use defaults
          }
        } catch (error) {
          console.warn(`Failed to generate assistive map for page ${page.pageNumber}:`, error);
        }
      } else if (!generateAssistiveMap) {
        // Layer 3 disabled for this scan (faster pipeline)
      } else {
        if (!page.canonicalUrl) {
          console.warn(`[L3] Skipped: page ${page.pageNumber} missing canonicalUrl`);
        }
        if (!page.pageFingerprint) {
          console.warn(`[L3] Skipped: page ${page.pageNumber} missing pageFingerprint`);
        }
        if (page.error) {
          console.warn(`[L3] Skipped: page ${page.pageNumber} has error: ${page.error}`);
        }
      }

      // Emit page_done event
      scanEventEmitter.emitEvent(scanId, {
        type: 'page_done',
        scanId,
        url: page.url,
        pageNumber: page.pageNumber,
        summary: {
          findingsCount,
          visionCount,
          assistive: assistiveCounts,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Generate summary
    const summary = this.generateSummary(results, ruleEngine.getAllRules().length);

    const scanRun: ScanRun = {
      scanId,
      seedUrl,
      startedAt,
      completedAt,
      pages,
      results,
      summary,
    };

    return scanRun;
  }

  /**
   * Generate summary counts by WCAG level (A/AA) and status
   */
  private generateSummary(
    pageResults: PageRuleResults[],
    totalRules: number
  ): ScanRunSummary {
    const byLevel: { A: LevelSummary; AA: LevelSummary } = {
      A: { pass: 0, fail: 0, needs_review: 0, na: 0, total: 0 },
      AA: { pass: 0, fail: 0, needs_review: 0, na: 0, total: 0 },
    };

    const byStatus = {
      pass: 0,
      fail: 0,
      needs_review: 0,
      na: 0,
    };

    // Count results by level and status
    for (const pageResult of pageResults) {
      for (const ruleResult of pageResult.ruleResults) {
        // Count by status
        byStatus[ruleResult.status]++;

        // Count by level if WCAG level is specified
        if (ruleResult.wcagId) {
          // Determine level from WCAG ID (simplified - assumes format like "1.1.1" for A, "2.4.2" for AA)
          // This is a heuristic - in production, you'd want to maintain a mapping
          const level = this.inferLevel(ruleResult.wcagId);
          if (level === 'A' || level === 'AA') {
            byLevel[level][ruleResult.status]++;
            byLevel[level].total++;
          }
        }
      }
    }

    return {
      totalPages: pageResults.length,
      totalRules,
      byLevel,
      byStatus,
    };
  }

  /**
   * Load vision findings and convert to rule results
   */
  private async loadVisionFindings(page: PageArtifact, scanId: string): Promise<RuleResult[]> {
    if (!page.visionPath) {
      return [];
    }

    try {
      const visionContent = await readFile(page.visionPath, 'utf-8');
      const findings: VisionFinding[] = JSON.parse(visionContent);

      return findings.map((finding) => this.convertVisionFindingToRuleResult(finding, scanId));
    } catch (error) {
      console.warn(`Failed to load vision findings for page ${page.pageNumber}:`, error);
      return [];
    }
  }

  /**
   * Convert vision finding to rule result
   */
  private convertVisionFindingToRuleResult(finding: VisionFinding, scanId: string): RuleResult {
    // Determine primary WCAG ID (first in suggestedWcagIds)
    const primaryWcagId = finding.suggestedWcagIds[0] || '4.1.2';

    // CRITICAL: If Gemini was used (evidenceJson present), always mark as needs_review
    // Gemini outputs are NEVER used for pass/fail determination
    const hasGeminiData = !!finding.evidenceJson && (
      finding.evidenceJson.geminiTextExtraction ||
      finding.evidenceJson.geminiDescription
    );

    // Determine status: needs_review by default, fail if high confidence and correlatedSelector exists
    // BUT: If Gemini was used, always needs_review
    let status: 'pass' | 'fail' | 'needs_review' | 'na' = hasGeminiData
      ? 'needs_review' // Gemini outputs always need review
      : 'needs_review';

    if (!hasGeminiData && finding.confidence === 'high' && finding.correlatedSelector) {
      // If we have high confidence and a selector, we can mark as fail
      // But only for certain kinds where DOM correlation is strong
      if (finding.kind === 'clickable_unlabeled' || finding.kind === 'icon_button_unlabeled') {
        status = 'fail';
      }
    }

    // Adjust confidence: Gemini outputs are always low/medium
    const confidence = hasGeminiData
      ? (finding.confidence === 'high' ? 'medium' : finding.confidence)
      : finding.confidence;

    // Build evidence with screenshot crop path
    const evidence = finding.evidence.map((item: EvidenceItem) => {
      // If evidence is a screenshot crop, update path to be relative to scan
      if (item.type === 'screenshot' && item.value) {
        return {
          ...item,
          value: item.value, // Already relative path like "pages/1/vision/finding-id.png"
        };
      }
      return item;
    });

    // Add screenshot crop if available
    const cropPath = `pages/${finding.pageNumber}/vision/${finding.id}.png`;
    const hasCropEvidence = evidence.some((e: EvidenceItem) => e.type === 'screenshot');
    if (!hasCropEvidence) {
      evidence.push({
        type: 'screenshot',
        value: cropPath,
        selector: finding.correlatedSelector,
        description: 'Screenshot crop of detected element',
      });
    }

    // Build howToVerify message
    let howToVerify = this.buildHowToVerify(finding);

    // Add Gemini raw output to evidence if present
    if (hasGeminiData && finding.evidenceJson) {
      evidence.push({
        type: 'text',
        value: JSON.stringify(finding.evidenceJson, null, 2),
        description: 'Raw Gemini Vision API output (for auditability only, not used for WCAG compliance determination)',
      });
      howToVerify += ' Note: This finding was enhanced with Gemini Vision API and requires manual verification.';
    }

    // Build description with Gemini-enhanced text if available
    let message = this.buildFindingMessage(finding);
    if (hasGeminiData) {
      message += ' (Enhanced with Gemini Vision API - requires manual review)';
    }

    // CRITICAL: If Gemini was used, always mark as needs_review
    const finalStatus = hasGeminiData ? 'needs_review' : status;

    return {
      ruleId: `vision-${finding.kind}`,
      wcagId: primaryWcagId,
      level: this.inferLevel(primaryWcagId),
      status: finalStatus, // Always needs_review if Gemini was used
      confidence, // Always low/medium if Gemini was used
      evidence,
      howToVerify,
      message,
    };
  }

  /**
   * Build howToVerify message for vision finding
   */
  private buildHowToVerify(finding: VisionFinding): string {
    const baseMessage = `Verify with screen reader and keyboard navigation. `;

    switch (finding.kind) {
      case 'clickable_unlabeled':
        return baseMessage + `Navigate to the element using Tab key and check if screen reader announces a name. If no name is announced, this is an accessibility barrier.`;
      case 'icon_button_unlabeled':
        return baseMessage + `Icon-only buttons must have an accessible name (aria-label or aria-labelledby). Test with screen reader to confirm name is announced.`;
      case 'looks_like_button_not_button':
        return baseMessage + `Element styled like a button should be a semantic button element or have role="button" and proper keyboard support.`;
      case 'text_contrast_risk':
        return baseMessage + `Check text contrast ratio using a contrast checker. Ensure it meets WCAG 1.4.3 (4.5:1 for normal text).`;
      case 'focus_indicator_missing_visual':
        return baseMessage + `Navigate using Tab key and verify focus indicator is visible. If not visible, this violates WCAG 2.4.7.`;
      default:
        return baseMessage + `Manually verify the detected issue with assistive technologies.`;
    }
  }

  /**
   * Build finding message
   */
  private buildFindingMessage(finding: VisionFinding): string {
    switch (finding.kind) {
      case 'clickable_unlabeled':
        return `Clickable element detected without accessible name or visible text${finding.correlatedSelector ? ` at ${finding.correlatedSelector}` : ''}`;
      case 'icon_button_unlabeled':
        return `Icon-only button detected without accessible name${finding.correlatedSelector ? ` at ${finding.correlatedSelector}` : ''}`;
      case 'looks_like_button_not_button':
        return `Element styled like a button but not semantically a button${finding.correlatedSelector ? ` at ${finding.correlatedSelector}` : ''}`;
      case 'text_contrast_risk':
        return `Text with potential contrast issues detected${finding.correlatedSelector ? ` at ${finding.correlatedSelector}` : ''}`;
      case 'focus_indicator_missing_visual':
        return `Focusable element without visible focus indicator${finding.correlatedSelector ? ` at ${finding.correlatedSelector}` : ''}`;
      default:
        return `Potential accessibility issue detected${finding.correlatedSelector ? ` at ${finding.correlatedSelector}` : ''}`;
    }
  }

  /**
   * Infer WCAG level from WCAG ID (heuristic)
   * In production, maintain a proper mapping
   */
  private inferLevel(wcagId: string): 'A' | 'AA' | 'AAA' | undefined {
    // Common WCAG 2.1 mappings (simplified)
    // Level A criteria typically start with 1.1, 1.3, 1.4.1, 2.1, 2.4.2, 3.1.1, 4.1.1, 4.1.2
    // Level AA criteria typically start with 1.4.3, 1.4.4, 1.4.5, 2.4.4, 2.4.5, 2.4.6, 2.4.7, 3.2.3, 3.2.4, 4.1.3
    const levelAMappings = ['1.1.1', '1.3.1', '1.4.1', '2.1.1', '2.1.2', '2.4.2', '3.1.1', '4.1.1', '4.1.2'];
    const levelAAMappings = ['1.4.3', '1.4.4', '1.4.5', '2.4.4', '2.4.5', '2.4.6', '2.4.7', '3.2.3', '3.2.4', '4.1.3'];

    if (levelAMappings.includes(wcagId)) {
      return 'A';
    }
    if (levelAAMappings.includes(wcagId)) {
      return 'AA';
    }

    // Try to infer from rule ID format
    if (wcagId.startsWith('1.1') || wcagId.startsWith('1.3') || wcagId.startsWith('2.1') || wcagId.startsWith('2.4.2') || wcagId.startsWith('3.1.1') || wcagId.startsWith('4.1.1') || wcagId.startsWith('4.1.2')) {
      return 'A';
    }
    if (wcagId.startsWith('1.4.3') || wcagId.startsWith('1.4.4') || wcagId.startsWith('1.4.5') || wcagId.startsWith('2.4.4') || wcagId.startsWith('2.4.5') || wcagId.startsWith('2.4.6') || wcagId.startsWith('2.4.7') || wcagId.startsWith('3.2.3') || wcagId.startsWith('3.2.4') || wcagId.startsWith('4.1.3')) {
      return 'AA';
    }

    return undefined;
  }

  /**
   * Generate assistive map for a page and persist it
   */
  private async generateAssistiveMapForPage(
    page: PageArtifact,
    visionRuleResults: RuleResult[],
    scanId: string,
    seedUrl: string
  ): Promise<void> {
    // Load vision findings from file if available
    let visionFindings: VisionFinding[] = [];
    if (page.visionPath) {
      try {
        const visionData = await readFile(page.visionPath, 'utf-8');
        visionFindings = JSON.parse(visionData);
      } catch (error) {
        // Vision findings not available, continue with empty array
      }
    }

    // Generate assistive map
    const generator = new AssistiveMapGenerator(scanId);
    const { map, confidenceSummary } = await generator.generateAssistiveMap(page, visionFindings, scanId);

    // [L3] Log assistive map generation
    const mapData = map as any;
    const imageCount = mapData.data?.imageDescriptions?.length || Object.keys(mapData.imageDescriptions || {}).length;
    const labelCount = mapData.data?.labelOverrides?.length || Object.keys(mapData.labelOverrides || {}).length;
    const actionCount = mapData.data?.actionIntents?.length || Object.keys(mapData.actionIntents || {}).length;
    console.log(`[L3] Assistive map generated for page ${page.pageNumber}: ${imageCount} images, ${labelCount} labels, ${actionCount} actions`);

    // B1) Emit L3 done status
    scanEventEmitter.emitEvent(scanId, {
      type: 'layer_status',
      scanId,
      url: page.url,
      pageNumber: page.pageNumber,
      layer: 'L3',
      status: 'done',
      meta: {
        assistiveCounts: {
          images: imageCount,
          labels: labelCount,
          actions: actionCount,
        },
      },
      timestamp: new Date().toISOString(),
    });

    // Save to disk (artifact)
    const scanDir = join(this.outputDir, scanId);
    const pageDir = join(scanDir, 'pages', String(page.pageNumber));
    const assistiveMapPath = join(pageDir, 'assistive-model.json');
    await writeFile(assistiveMapPath, JSON.stringify({ map, confidenceSummary }, null, 2), 'utf-8');

    // Persist to database
    if (page.canonicalUrl && page.pageFingerprint) {
      const domain = getHostname(seedUrl);
      const fingerprintHash = AMG.computeFingerprintHash(page.pageFingerprint);

      // Get or create site
      const siteId = await assistiveMapRepository.getOrCreateSite(domain);
      if (!siteId) {
        console.warn(`Failed to get/create site for domain: ${domain}`);
        return;
      }

      // Get or create page version
      const pageVersionId = await assistiveMapRepository.getOrCreatePageVersion(
        siteId,
        page.canonicalUrl,
        page.finalUrl,
        fingerprintHash,
        scanId
      );

      if (pageVersionId) {
        const saved = await assistiveMapRepository.upsertAssistiveMap(pageVersionId, map, confidenceSummary);
        console.log(`[L3] Assistive map saved: DB pageVersionId ${pageVersionId}, artifact: ${assistiveMapPath}`);
      } else {
        console.log(`[L3] Assistive map saved to artifact only: ${assistiveMapPath}`);
      }
    }
  }

  /**
   * Save report to output/{scanId}/report.json
   */
  async saveReport(scanId: string, report: ScanRun): Promise<string> {
    const reportPath = join(this.outputDir, scanId, 'report.json');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    return reportPath;
  }
}

