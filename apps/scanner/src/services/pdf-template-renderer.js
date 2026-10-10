/**
 * PDF Template Renderer
 *
 * Renders HTML template to PDF using Playwright
 * Falls back to pdf-lib if Playwright fails
 */
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';
import { launchChromium } from '../crawler/browser-launch.js';
import { StructuredLogger } from '../utils/logger.js';
import { buildEmbeddedPdfFontFaces } from '../utils/pdf-embedded-fonts.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export class PDFTemplateRenderer {
    logger;
    browser = null;
    constructor(scanId) {
        this.logger = new StructuredLogger(scanId);
    }
    /**
     * Render HTML template to PDF using Playwright
     */
    async renderToPDF(data) {
        try {
            // Try Playwright first (better quality)
            return await this.renderWithPlaywright(data);
        }
        catch (error) {
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
    async renderWithPlaywright(data) {
        if (!this.browser) {
            this.browser = await launchChromium();
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
                }
                catch {
                    /* ignore */
                }
            })
                .catch(() => undefined);
            // Generate PDF
            const pdfBuffer = await page.pdf({
                format: 'A4',
                landscape: data.landscape === 'true',
                printBackground: true,
                margin: {
                    top: '0mm',
                    right: '0mm',
                    bottom: '0mm',
                    left: '0mm',
                },
            });
            return Buffer.from(pdfBuffer);
        }
        finally {
            await page.close();
        }
    }
    /**
     * Fallback: Render using pdf-lib (basic, no CSS)
     * This is a minimal fallback - the main endpoint handles full fallback
     */
    async renderWithPdfLib(data) {
        // Re-throw to let main endpoint handle fallback
        throw new Error('Playwright rendering failed, fallback handled by main endpoint');
    }
    /**
     * Cleanup browser instance
     */
    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}
//# sourceMappingURL=pdf-template-renderer.js.map