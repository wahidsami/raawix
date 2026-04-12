/**
 * Full-structure PDF when Playwright/HTML template rendering is unavailable.
 * Embeds Noto Naskh Arabic (OFL) for Unicode labels and finding text.
 */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont } from 'pdf-lib';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Noto Naskh Arabic covers Latin + Arabic for a single pdf-lib font. */
function notoFontPath(): string {
  return join(__dirname, '..', '..', 'assets', 'fonts', 'NotoNaskhArabic-Regular.ttf');
}

export function stripHtmlToPlainText(html: string): string {
  if (!html?.trim()) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function wrapToWidth(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [''];
  const paragraphs = normalized.split(/\n/);
  const out: string[] = [];
  for (const para of paragraphs) {
    const words = para.replace(/\s+/g, ' ').trim().split(' ');
    if (words.length === 1 && words[0] === '') continue;
    let line = '';
    for (const word of words) {
      const trial = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(trial, fontSize) <= maxWidth) {
        line = trial;
      } else {
        if (line) out.push(line);
        if (font.widthOfTextAtSize(word, fontSize) <= maxWidth) {
          line = word;
        } else {
          let remaining = word;
          while (remaining.length > 0) {
            let lo = 1;
            let hi = remaining.length;
            let fit = 1;
            while (lo <= hi) {
              const mid = Math.floor((lo + hi) / 2);
              const sub = remaining.slice(0, mid);
              if (font.widthOfTextAtSize(sub, fontSize) <= maxWidth) {
                fit = mid;
                lo = mid + 1;
              } else {
                hi = mid - 1;
              }
            }
            out.push(remaining.slice(0, fit));
            remaining = remaining.slice(fit);
          }
          line = '';
        }
      }
    }
    if (line) out.push(line);
    out.push('');
  }
  while (out.length && out[out.length - 1] === '') out.pop();
  return out.length ? out : [''];
}

export interface FallbackFindingRow {
  wcagId: string;
  level: string;
  statusText: string;
  message: string;
  pageUrl: string;
}

export interface FallbackAgentRow {
  kind: string;
  source: string;
  confidence: string;
  message: string;
  howToVerify: string;
  suggestedWcag: string;
  pageUrl: string;
}

export interface FallbackScanPdfParams {
  logoDataUrl?: string;
  poweredByLogoDataUrl?: string;
  reportTitle: string;
  subtitleLine?: string;
  entityName: string;
  propertyLabel: string;
  propertyName: string;
  scanDateLabel: string;
  scanDate: string;
  entityCodeLabel: string;
  entityCode: string;
  reportGeneratedOn: string;
  generationDate: string;
  introductionTitle: string;
  introductionHtml: string;
  executiveSummaryTitle: string;
  wcagALabel: string;
  scoreA: string;
  wcagAALabel: string;
  scoreAA: string;
  needsReviewLabel: string;
  needsReviewRate: string;
  scanStatisticsTitle: string;
  totalPagesLabel: string;
  totalPages: number;
  totalFindingsLabel: string;
  totalFindings: number;
  failedRulesLabel: string;
  failedRules: number;
  needsReviewRulesLabel: string;
  needsReviewRules: number;
  analysisAgentFindingsLabel: string;
  agentFindingsCount: number;
  disclaimerText: string;
  keyFindingsTitle: string;
  keyFindingsHtml: string;
  topFindingsTitle: string;
  findings: FallbackFindingRow[];
  analysisAgentTitle: string;
  analysisAgentIntro: string;
  analysisAgentEmpty: string;
  agentRows: FallbackAgentRow[];
  footerText: string;
  reportGeneratedBy: string;
}

export async function renderFallbackScanPdf(params: FallbackScanPdfParams): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const fontBytes = await readFile(notoFontPath());
  /* subset:true has caused missing Latin glyphs in some viewers; full embed is safer for short reports */
  const font = await pdfDoc.embedFont(fontBytes, { subset: false });

  const W = 595;
  const H = 842;
  const M = 50;
  const maxW = W - 2 * M;
  const bodySize = 10;
  const headSize = 13;
  const titleSize = 22;
  const sectionSize = 15;

  let page = pdfDoc.addPage([W, H]);
  let y = H - M;

  const ensureSpace = (needed: number) => {
    if (y - needed < M) {
      page = pdfDoc.addPage([W, H]);
      y = H - M;
    }
  };

  const drawLines = (text: string, size: number, gap = 4) => {
    const lines = wrapToWidth(text, font, size, maxW);
    for (const line of lines) {
      ensureSpace(size + gap);
      page.drawText(line, { x: M, y, size, font, color: rgb(0.15, 0.15, 0.15) });
      y -= size + gap;
    }
  };

  const drawCenteredLine = (text: string, size: number, color = rgb(0.03, 0.6, 0.41)) => {
    const width = font.widthOfTextAtSize(text, size);
    ensureSpace(size + 8);
    page.drawText(text, {
      x: Math.max(M, (W - width) / 2),
      y,
      size,
      font,
      color,
    });
    y -= size + 8;
  };

  const drawHeading = (text: string) => {
    y -= 6;
    drawLines(text, sectionSize, 6);
    y -= 4;
  };

  // —— Cover
  drawCenteredLine('Raawi X', 28);

  drawLines(params.reportTitle, titleSize, 8);
  if (params.subtitleLine?.trim()) {
    drawLines(params.subtitleLine, bodySize, 4);
  }
  y -= 12;
  drawLines(params.entityName, headSize, 6);
  drawLines(`${params.propertyLabel}: ${params.propertyName}`, bodySize, 4);
  drawLines(`${params.scanDateLabel}: ${params.scanDate}`, bodySize, 4);
  drawLines(`${params.entityCodeLabel}: ${params.entityCode}`, bodySize, 4);

  // —— Introduction & executive summary
  page = pdfDoc.addPage([W, H]);
  y = H - M;

  drawHeading(params.introductionTitle);
  drawLines(`${params.reportGeneratedOn} ${params.generationDate}`, bodySize - 1, 3);
  y -= 6;
  const introPlain = stripHtmlToPlainText(params.introductionHtml);
  if (introPlain) drawLines(introPlain, bodySize, 4);

  drawHeading(params.executiveSummaryTitle);
  drawLines(`${params.wcagALabel}: ${params.scoreA}`, bodySize, 3);
  drawLines(`${params.wcagAALabel}: ${params.scoreAA}`, bodySize, 3);
  drawLines(`${params.needsReviewLabel}: ${params.needsReviewRate}`, bodySize, 3);
  y -= 8;

  drawHeading(params.scanStatisticsTitle);
  drawLines(`${params.totalPagesLabel}: ${params.totalPages}`, bodySize, 3);
  drawLines(`${params.totalFindingsLabel}: ${params.totalFindings}`, bodySize, 3);
  drawLines(`${params.failedRulesLabel}: ${params.failedRules}`, bodySize, 3);
  drawLines(`${params.needsReviewRulesLabel}: ${params.needsReviewRules}`, bodySize, 3);
  drawLines(`${params.analysisAgentFindingsLabel}: ${params.agentFindingsCount}`, bodySize, 3);
  y -= 10;
  drawLines(params.disclaimerText, bodySize - 1, 3);

  // —— Key findings narrative
  page = pdfDoc.addPage([W, H]);
  y = H - M;
  drawHeading(params.keyFindingsTitle);
  const keyPlain = stripHtmlToPlainText(params.keyFindingsHtml);
  if (keyPlain) drawLines(keyPlain, bodySize, 4);

  // —— WCAG findings
  drawHeading(params.topFindingsTitle);
  if (params.findings.length === 0) {
    drawLines('—', bodySize, 3);
  } else {
    for (const f of params.findings) {
      const block = `${f.wcagId}  [${f.level}]  ${f.statusText}\n${f.message}\n${f.pageUrl}`;
      drawLines(block, bodySize - 0.5, 3);
      y -= 6;
      ensureSpace(bodySize);
    }
  }

  // —— Analysis AI agent
  drawHeading(params.analysisAgentTitle);
  drawLines(params.analysisAgentIntro, bodySize - 0.5, 3);
  y -= 4;
  if (params.agentRows.length === 0) {
    drawLines(params.analysisAgentEmpty, bodySize, 3);
  } else {
    for (const r of params.agentRows) {
      const block = `${r.kind} | ${r.source} | ${r.confidence}\n${r.message}\n${r.howToVerify}\nWCAG: ${r.suggestedWcag}\n${r.pageUrl}`;
      drawLines(block, bodySize - 0.5, 3);
      y -= 6;
    }
  }

  // —— Footer
  y -= 10;
  ensureSpace(bodySize * 3);
  drawLines(params.footerText, 9, 2);
  drawLines(`${params.reportGeneratedBy} Raawi X Accessibility Platform`, 9, 2);

  return pdfDoc.save();
}
