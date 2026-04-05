/**
 * PDF Template Renderer
 * 
 * Renders HTML template to PDF using Playwright
 * Falls back to pdf-lib if Playwright fails
 */

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';
import { Browser, chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import { StructuredLogger } from '../utils/logger.js';
import { buildEmbeddedPdfFontFaces } from '../utils/pdf-embedded-fonts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface TemplateData {
  // Logos
  logoDataUrl: string;
  entityLogoDataUrl?: string;
  entityLogoDisplay?: string;
  poweredByLogoDataUrl: string;
  
  // Cover page
  reportTitle: string;
  subtitle: string;
  entityName: string;
  propertyName: string;
  scanDate: string;
  entityCode: string;
  
  // Labels (i18n)
  entityLabel: string;
  propertyLabel: string;
  scanDateLabel: string;
  entityCodeLabel: string;
  
  // Introduction
  introductionTitle: string;
  introductionContent: string;
  reportGeneratedOn: string;
  generationDate: string;
  
  // Executive Summary
  executiveSummaryTitle: string;
  wcagALabel: string;
  wcagAALabel: string;
  needsReviewLabel: string;
  scoreA: string;
  scoreAA: string;
  needsReviewRate: string;
  scoreADetail: string;
  scoreAADetail: string;
  needsReviewDetail: string;
  
  // Statistics
  scanStatisticsTitle: string;
  totalPagesLabel: string;
  totalFindingsLabel: string;
  failedRulesLabel: string;
  needsReviewRulesLabel: string;
  totalPages: string;
  totalFindings: string;
  failedRules: string;
  needsReviewRules: string;
  
  // Findings
  keyFindingsTitle: string;
  keyFindingsContent: string;
  topFindingsTitle: string;
  wcagIdHeader: string;
  levelHeader: string;
  statusHeader: string;
  descriptionHeader: string;
  pageHeader: string;
  findingsRows: string;

  /** Analysis AI agent (keyboard simulation + optional AI enrichment) */
  analysisAgentFindingsLabel: string;
  totalAnalysisAgentFindings: string;
  analysisAgentTitle: string;
  analysisAgentIntro: string;
  analysisAgentTableOrEmpty: string;
  
  // Footer
  footerText: string;
  reportGeneratedBy: string;
  disclaimerText: string;
  
  // Layout
  locale: 'en' | 'ar';
  direction: 'ltr' | 'rtl';
}

export class PDFTemplateRenderer {
  private logger: StructuredLogger;
  private browser: Browser | null = null;

  constructor(scanId?: string) {
    this.logger = new StructuredLogger(scanId);
  }

  /**
   * Render HTML template to PDF using Playwright
   */
  async renderToPDF(data: TemplateData): Promise<Buffer> {
    try {
      // Try Playwright first (better quality)
      return await this.renderWithPlaywright(data);
    } catch (error) {
      this.logger.warn('Playwright PDF rendering failed, using fallback', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Fallback to pdf-lib
      return await this.renderWithPdfLib(data);
    }
  }

  /**
   * Render using Playwright (high quality, supports CSS)
   */
  private async renderWithPlaywright(data: TemplateData): Promise<Buffer> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });
    }

    const page = await this.browser.newPage();
    page.setDefaultTimeout(90_000);
    
    try {
      // Load template
      const templatePath = join(__dirname, '../templates/report-template.html');
      let template = await readFile(templatePath, 'utf-8');

      const embeddedFonts = await buildEmbeddedPdfFontFaces();
      template = template.replace('</title>', `</title>\n${embeddedFonts}`);
      
      // Replace all template variables
      Object.entries(data).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        template = template.replace(regex, String(value || ''));
      });
      
      // Set content
      // Avoid networkidle: Google Fonts / external assets can prevent idle and hang PDF export.
      await page.setContent(template, { waitUntil: 'domcontentloaded', timeout: 90_000 });
      await page
        .evaluate(async () => {
          try {
            await document.fonts?.ready;
          } catch {
            /* ignore */
          }
        })
        .catch(() => undefined);
      
      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0mm',
          right: '0mm',
          bottom: '0mm',
          left: '0mm',
        },
      });
      
      return Buffer.from(pdfBuffer);
    } finally {
      await page.close();
    }
  }

  /**
   * Fallback: Render using pdf-lib (basic, no CSS)
   * This is a minimal fallback - the main endpoint handles full fallback
   */
  private async renderWithPdfLib(data: TemplateData): Promise<Buffer> {
    // Re-throw to let main endpoint handle fallback
    throw new Error('Playwright rendering failed, fallback handled by main endpoint');
  }

  /**
   * Cleanup browser instance
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

