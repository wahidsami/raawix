import ExcelJS from 'exceljs';
import { scanRepository } from '../db/scan-repository.js';

import { formatAgentConfidenceScore, agentSourceLabel, formatSuggestedWcagIds } from '../utils/agent-report-format.js';

/**
 * Excel Report Generator
 * Generates WCAG findings plus a dedicated Analysis AI agent sheet (keyboard + enrichment).
 * Does not include Layer 2 (vision) or Layer 3 (assistive map) tables.
 */
export class ExcelReportGenerator {
  /**
   * Generate Excel report for a scan
   */
  async generateExcelReport(scanId: string, locale: 'en' | 'ar' = 'en'): Promise<ExcelJS.Workbook> {
    // Fetch scan data with all related data
    const scanData = await scanRepository.getScan(scanId);
    if (!scanData) {
      throw new Error(`Scan ${scanId} not found`);
    }

    // Extract scan, findings, and pages
    const scan = scanData;
    const pages = scanData.pages || [];

    // Filter to WCAG findings only (exclude vision findings)
    const allFindings = scanData.findings || [];
    const wcagFindings = allFindings.filter((f: any) => f.level !== 'vision'); // Exclude vision findings (level = 'vision')

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Raawi X';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Add Summary Sheet
    await this.addSummarySheet(workbook, scan, wcagFindings, pages, locale);

    // Add WCAG Findings Sheet
    await this.addFindingsSheet(workbook, wcagFindings, pages, locale);

    const agentFindings = (scanData.agentFindings || []) as any[];
    await this.addAnalysisAgentSheet(workbook, agentFindings, pages, locale);

    return workbook;
  }

  /**
   * Add Summary Sheet (Sheet 1)
   */
  private async addSummarySheet(
    workbook: ExcelJS.Workbook,
    scan: any,
    findings: any[],
    pages: any[],
    locale: 'en' | 'ar'
  ) {
    const sheet = workbook.addWorksheet(locale === 'ar' ? 'الملخص' : 'Summary');

    // Set RTL for Arabic
    if (locale === 'ar') {
      sheet.views = [{ rightToLeft: true }];
    }

    const t = this.getTranslations(locale);

    // Title
    const titleRow = sheet.addRow([t.reportTitle]);
    titleRow.font = { size: 18, bold: true, color: { argb: 'FF2563EB' } };
    titleRow.alignment = { horizontal: 'center' };
    sheet.mergeCells('A1:B1');
    titleRow.height = 30;

    // Subtitle
    const subtitleRow = sheet.addRow([t.reportSubtitle]);
    subtitleRow.font = { size: 12, italic: true };
    subtitleRow.alignment = { horizontal: 'center' };
    sheet.mergeCells('A2:B2');

    // Empty row
    sheet.addRow([]);

    // Entity Information
    const entity = scan.entity || {};
    this.addInfoRow(sheet, t.entity, entity.name || 'N/A');
    this.addInfoRow(sheet, t.website, scan.seedUrl);
    this.addInfoRow(sheet, t.auditDate, new Date(scan.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US'));
    this.addInfoRow(sheet, t.pagesAudited, pages.length.toString());

    // Empty row
    sheet.addRow([]);

    // Compliance Scores Section
    const complianceRow = sheet.addRow([t.complianceScores]);
    complianceRow.font = { size: 14, bold: true, color: { argb: 'FF1F2937' } };
    sheet.mergeCells(`A${complianceRow.number}:B${complianceRow.number}`);

    const scoreA = scan.scoreA != null ? `${scan.scoreA.toFixed(1)}%` : 'N/A';
    const scoreAA = scan.scoreAA != null ? `${scan.scoreAA.toFixed(1)}%` : 'N/A';
    const scoreAAA = scan.scoreAAA != null ? `${scan.scoreAAA.toFixed(1)}%` : 'N/A';

    this.addInfoRow(sheet, t.levelA, scoreA);
    this.addInfoRow(sheet, t.levelAA, scoreAA);
    this.addInfoRow(sheet, t.levelAAA, scoreAAA);

    // Empty row
    sheet.addRow([]);

    // Findings Summary
    const findingsSummaryRow = sheet.addRow([t.findingsSummary]);
    findingsSummaryRow.font = { size: 14, bold: true, color: { argb: 'FF1F2937' } };
    sheet.mergeCells(`A${findingsSummaryRow.number}:B${findingsSummaryRow.number}`);

    const criticalCount = findings.filter(f => this.mapSeverity(f) === 'critical' && f.status === 'fail').length;
    const importantCount = findings.filter(f => this.mapSeverity(f) === 'important' && f.status === 'fail').length;
    const minorCount = findings.filter(f => this.mapSeverity(f) === 'minor' && f.status === 'fail').length;
    const needsReviewCount = findings.filter(f => f.status === 'needs_review').length;

    this.addInfoRow(sheet, t.critical, criticalCount.toString(), 'FFEF4444');
    this.addInfoRow(sheet, t.important, importantCount.toString(), 'FFF97316');
    this.addInfoRow(sheet, t.minor, minorCount.toString(), 'FFEAB308');
    this.addInfoRow(sheet, t.needsReview, needsReviewCount.toString(), 'FF3B82F6');

    sheet.addRow([]);
    const agentSection = sheet.addRow([t.analysisAgentSection]);
    agentSection.font = { size: 14, bold: true, color: { argb: 'FF1F2937' } };
    sheet.mergeCells(`A${agentSection.number}:B${agentSection.number}`);
    const agentCount = (scan.agentFindings || []).length;
    const pagesWithAgentArtifact = pages.filter((p: any) => p?.agentPath).length;
    this.addInfoRow(sheet, t.analysisAgentCount, agentCount.toString());
    if (agentCount === 0) {
      const note =
        pagesWithAgentArtifact > 0
          ? locale === 'ar'
            ? `شغّل وكيل التحليل؛ لا توجد نتائج محفوظة. أثر تفاعل على ${pagesWithAgentArtifact} صفحة.`
            : `Analysis AI agent ran; 0 findings stored. Interaction trace on ${pagesWithAgentArtifact} page(s).`
          : locale === 'ar'
            ? 'لم يُدرَج وكيل التحليل في هذا المسح.'
            : 'Analysis AI agent was not included in this scan.';
      const noteRow = sheet.addRow([note]);
      sheet.mergeCells(`A${noteRow.number}:B${noteRow.number}`);
      noteRow.getCell(1).font = { italic: true, color: { argb: 'FF6B7280' } };
      noteRow.getCell(1).alignment = { wrapText: true, vertical: 'top' };
    }

    // Column widths
    sheet.getColumn(1).width = 25;
    sheet.getColumn(2).width = 40;
  }

  /**
   * Add WCAG Findings Sheet (Sheet 2)
   */
  private async addFindingsSheet(
    workbook: ExcelJS.Workbook,
    findings: any[],
    pages: any[],
    locale: 'en' | 'ar'
  ) {
    const sheet = workbook.addWorksheet(locale === 'ar' ? 'نتائج WCAG' : 'WCAG Findings');

    // Set RTL for Arabic
    if (locale === 'ar') {
      sheet.views = [{ rightToLeft: true }];
    }

    const t = this.getTranslations(locale);

    // Headers
    const headerRow = sheet.addRow([
      t.wcagId,
      t.level,
      t.status,
      t.severity,
      t.description,
      t.pageUrl,
      t.element,
      t.recommendation,
    ]);

    // Style headers
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' },
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 25;

    // Add findings data
    for (const finding of findings) {
      const page = pages.find(p => p.id === finding.pageId);
      const pageUrl = page?.url || 'N/A';

      // Transform finding data to match expected format
      const severity = this.mapSeverity(finding);
      const description = (finding as any).message || 'N/A';
      const selector = this.extractSelector(finding);
      const recommendation = (finding as any).howToVerify || 'N/A';

      const row = sheet.addRow([
        finding.wcagId || 'N/A',
        finding.level || 'N/A',
        this.translateStatus(finding.status, locale),
        this.translateSeverity(severity, locale),
        description,
        pageUrl,
        selector,
        recommendation,
      ]);

      // Style based on severity
      if (severity === 'critical' && finding.status === 'fail') {
        row.font = { bold: true };
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEF2F2' }, // Light red background
        };
      }

      // Wrap text
      row.alignment = { wrapText: true, vertical: 'top' };
    }

    // Auto-filter
    sheet.autoFilter = {
      from: 'A1',
      to: `H${findings.length + 1}`,
    };

    // Column widths
    sheet.getColumn(1).width = 12; // WCAG ID
    sheet.getColumn(2).width = 8;  // Level
    sheet.getColumn(3).width = 12; // Status
    sheet.getColumn(4).width = 12; // Severity
    sheet.getColumn(5).width = 40; // Description
    sheet.getColumn(6).width = 35; // Page URL
    sheet.getColumn(7).width = 25; // Element
    sheet.getColumn(8).width = 40; // Recommendation

    // Freeze header row
    sheet.views = [
      { state: 'frozen', ySplit: 1, rightToLeft: locale === 'ar' },
    ];
  }

  /**
   * Analysis AI agent findings (interaction + OpenAI enrichment)
   */
  private async addAnalysisAgentSheet(
    workbook: ExcelJS.Workbook,
    agentFindings: any[],
    pages: any[],
    locale: 'en' | 'ar'
  ) {
    const sheet = workbook.addWorksheet(locale === 'ar' ? 'وكيل التحليل' : 'Analysis AI agent');

    const t = this.getTranslations(locale);

    const headerRow = sheet.addRow([
      t.agentPageUrl,
      t.agentKind,
      t.agentSource,
      t.agentConfidence,
      t.agentMessage,
      t.agentHowToVerify,
      t.agentSuggestedWcag,
    ]);

    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF059669' },
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 24;

    const pagesWithArtifact = pages.filter((p: any) => p?.agentPath).length;
    if (agentFindings.length === 0) {
      const note =
        pagesWithArtifact > 0
          ? locale === 'ar'
            ? `شغّل الوكيل على ${pagesWithArtifact} صفحة؛ لا توجد نتائج مسجّلة في قاعدة البيانات.`
            : `Agent ran on ${pagesWithArtifact} page(s); no findings were recorded in the database.`
          : locale === 'ar'
            ? 'وكيل التحليل لم يُدرَج في هذا المسح.'
            : 'Analysis AI agent was not included in this scan.';
      const noteRow = sheet.addRow([note, '', '', '', '', '', '']);
      sheet.mergeCells(`A${noteRow.number}:G${noteRow.number}`);
      noteRow.getCell(1).font = { italic: true, color: { argb: 'FF6B7280' } };
      noteRow.getCell(1).alignment = { wrapText: true, vertical: 'top' };
    }

    for (const af of agentFindings) {
      const page = pages.find((p) => p.id === af.pageId);
      const pageUrl = page?.url || 'N/A';
      const suggested = formatSuggestedWcagIds(
        typeof af.suggestedWcagIdsJson === 'string'
          ? (() => {
              try {
                return JSON.parse(af.suggestedWcagIdsJson);
              } catch {
                return af.suggestedWcagIdsJson;
              }
            })()
          : af.suggestedWcagIdsJson
      );

      const row = sheet.addRow([
        pageUrl,
        af.kind || 'N/A',
        agentSourceLabel(af.source, locale),
        formatAgentConfidenceScore(af.confidence),
        af.message || 'N/A',
        af.howToVerify || 'N/A',
        suggested,
      ]);
      row.alignment = { wrapText: true, vertical: 'top' };
    }

    if (agentFindings.length > 0) {
      sheet.autoFilter = {
        from: 'A1',
        to: `G${agentFindings.length + 1}`,
      };
    }

    sheet.getColumn(1).width = 40;
    sheet.getColumn(2).width = 22;
    sheet.getColumn(3).width = 22;
    sheet.getColumn(4).width = 12;
    sheet.getColumn(5).width = 45;
    sheet.getColumn(6).width = 40;
    sheet.getColumn(7).width = 28;

    sheet.views = [{ state: 'frozen', ySplit: 1, rightToLeft: locale === 'ar' }];
  }

  /**
   * Add info row helper
   */
  private addInfoRow(sheet: ExcelJS.Worksheet, label: string, value: string, highlightColor?: string) {
    const row = sheet.addRow([label, value]);
    row.getCell(1).font = { bold: true };

    if (highlightColor) {
      row.getCell(2).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      row.getCell(2).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: highlightColor },
      };
    }
  }

  /**
   * Map finding confidence/level to severity
   * Since Finding model doesn't have severity, derive it from confidence and level
   */
  private mapSeverity(finding: any): string {
    // Level A violations are critical, AA are important, AAA are minor
    if (finding.level === 'A' || finding.level === 'a') {
      return 'critical';
    }
    if (finding.level === 'AA' || finding.level === 'aa') {
      return 'important';
    }
    if (finding.level === 'AAA' || finding.level === 'aaa') {
      return 'minor';
    }

    // Fallback to confidence
    if (finding.confidence === 'high') {
      return 'critical';
    }
    if (finding.confidence === 'medium') {
      return 'important';
    }
    return 'minor';
  }

  /**
   * Extract selector from evidenceJson
   */
  private extractSelector(finding: any): string {
    try {
      if (!finding.evidenceJson) {
        return 'N/A';
      }

      // evidenceJson is an array of evidence items
      const evidence = Array.isArray(finding.evidenceJson)
        ? finding.evidenceJson
        : JSON.parse(finding.evidenceJson);

      if (evidence && evidence.length > 0 && evidence[0].selector) {
        return evidence[0].selector;
      }

      return 'N/A';
    } catch (error) {
      return 'N/A';
    }
  }

  /**
   * Translate status
   */
  private translateStatus(status: string, locale: 'en' | 'ar'): string {
    if (locale === 'ar') {
      const map: Record<string, string> = {
        pass: 'نجح',
        fail: 'فشل',
        needs_review: 'يحتاج مراجعة',
      };
      return map[status] || status;
    }
    return status === 'needs_review' ? 'Needs Review' : status.charAt(0).toUpperCase() + status.slice(1);
  }

  /**
   * Translate severity
   */
  private translateSeverity(severity: string, locale: 'en' | 'ar'): string {
    if (locale === 'ar') {
      const map: Record<string, string> = {
        critical: 'حرج',
        important: 'مهم',
        minor: 'بسيط',
      };
      return map[severity] || severity;
    }
    return severity ? severity.charAt(0).toUpperCase() + severity.slice(1) : 'N/A';
  }

  /**
   * Get translations
   */
  private getTranslations(locale: 'en' | 'ar') {
    if (locale === 'ar') {
      return {
        reportTitle: 'تقرير تدقيق إمكانية الوصول',
        reportSubtitle: 'بناءً على إرشادات WCAG 2.1',
        entity: 'الجهة',
        website: 'الموقع الإلكتروني',
        auditDate: 'تاريخ التدقيق',
        pagesAudited: 'الصفحات المدققة',
        complianceScores: 'درجات الامتثال WCAG 2.1',
        levelA: 'المستوى A',
        levelAA: 'المستوى AA',
        levelAAA: 'المستوى AAA',
        findingsSummary: 'ملخص النتائج',
        critical: 'حرجة',
        important: 'مهمة',
        minor: 'بسيطة',
        needsReview: 'تحتاج مراجعة',
        wcagId: 'معرف WCAG',
        level: 'المستوى',
        status: 'الحالة',
        severity: 'الخطورة',
        description: 'الوصف',
        pageUrl: 'رابط الصفحة',
        element: 'العنصر',
        recommendation: 'التوصية',
        analysisAgentSection: 'وكيل التحليل بالذكاء الاصطناعي',
        analysisAgentCount: 'عدد نتائج الوكيل',
        agentPageUrl: 'رابط الصفحة',
        agentKind: 'النوع',
        agentSource: 'المصدر',
        agentConfidence: 'الثقة',
        agentMessage: 'الرسالة',
        agentHowToVerify: 'كيفية التحقق',
        agentSuggestedWcag: 'WCAG مقترحة',
      };
    }

    return {
      reportTitle: 'ACCESSIBILITY AUDIT REPORT',
      reportSubtitle: 'Based on WCAG 2.1 Guidelines',
      entity: 'Entity',
      website: 'Website',
      auditDate: 'Audit Date',
      pagesAudited: 'Pages Audited',
      complianceScores: 'WCAG 2.1 Compliance Scores',
      levelA: 'Level A',
      levelAA: 'Level AA',
      levelAAA: 'Level AAA',
      findingsSummary: 'Findings Summary',
      critical: 'Critical',
      important: 'Important',
      minor: 'Minor',
      needsReview: 'Needs Review',
      wcagId: 'WCAG ID',
      level: 'Level',
      status: 'Status',
      severity: 'Severity',
      description: 'Description',
      pageUrl: 'Page URL',
      element: 'Element',
      recommendation: 'Recommendation',
      analysisAgentSection: 'Analysis AI agent',
      analysisAgentCount: 'Agent findings count',
      agentPageUrl: 'Page URL',
      agentKind: 'Kind',
      agentSource: 'Source',
      agentConfidence: 'Confidence',
      agentMessage: 'Message',
      agentHowToVerify: 'How to verify',
      agentSuggestedWcag: 'Suggested WCAG',
    };
  }
}
