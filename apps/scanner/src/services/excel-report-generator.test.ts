import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExcelReportGenerator } from './excel-report-generator.js';

// Mock dependencies
vi.mock('../db/scan-repository.js', () => ({
  scanRepository: {
    getScan: vi.fn(),
  },
}));

vi.mock('../utils/manual-checkpoint-history.js', () => ({
  loadManualCheckpointHistory: vi.fn().mockResolvedValue([]),
}));

vi.mock('../utils/auth-scan-context.js', () => ({
  loadAuthScanContext: vi.fn().mockResolvedValue(null),
}));

vi.mock('../utils/analysis-agent-summary.js', () => ({
  loadAnalysisAgentPageSummaries: vi.fn().mockResolvedValue([]),
}));

vi.mock('../utils/raawi-export-data.js', () => ({
  buildRaawiExportData: vi.fn().mockResolvedValue({
    summary: { totalPages: 1, passCount: 0, failCount: 0, needsReviewCount: 0, visionIssueCount: 0, agentIssueCount: 0 },
    pages: [],
    agentFindings: [],
    technicalEvidence: [],
    auditorFindings: [],
    traceRows: [],
    findingRows: [],
    supportingEvidenceRows: [],
    pagesRows: []
  }),
}));

import { scanRepository } from '../db/scan-repository.js';
import ExcelJS from 'exceljs';

describe('ExcelReportGenerator Localization', () => {
  let generator: ExcelReportGenerator;
  
  beforeEach(() => {
    vi.clearAllMocks();
    generator = new ExcelReportGenerator();
    
    // Setup default mock scan data
    (scanRepository.getScan as any).mockResolvedValue({
      id: 'scan_123',
      scanId: 'scan_123',
      auditMode: 'raawi-agent',
      pages: [],
      findings: [],
      agentFindings: [],
      visionFindings: [],
      status: 'completed',
      summary: {
        totalPages: 1,
        totalFindings: 0,
        scores: { passedRules: 0, failedRules: 0, needsReviewRules: 0, scoreA: 100, scoreAA: 100 }
      },
      entity: { nameEn: 'Test Entity', nameAr: 'جهة اختبار' },
      property: { domain: 'test.com' },
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });
  });

  it('should generate English workbook by default or with locale: "en"', async () => {
    const workbook = await generator.generateExcelReport('scan_123', 'en');
    
    expect(workbook).toBeInstanceOf(ExcelJS.Workbook);
    
    const summarySheet = workbook.getWorksheet('Raawi Summary');
    expect(summarySheet).toBeDefined();
    
    // Verify LTR is applied (rightToLeft should be false or undefined)
    const views = summarySheet?.views || [];
    const hasRTL = views.some(v => v.rightToLeft === true);
    expect(hasRTL).toBe(false);
    
    const overviewTitleRow = summarySheet?.getRow(1);
    expect(overviewTitleRow?.getCell(1).value).toContain('Raawi Agent Report');
    
    const detailsSheet = workbook.getWorksheet('Raawi auditor findings');
    expect(detailsSheet).toBeDefined();
  });

  it('should generate Arabic workbook with RTL and translated titles with locale: "ar"', async () => {
    const workbook = await generator.generateExcelReport('scan_123', 'ar');
    
    expect(workbook).toBeInstanceOf(ExcelJS.Workbook);
    
    // Check Arabic worksheet names
    const summarySheet = workbook.getWorksheet('ملخص راوي');
    expect(summarySheet).toBeDefined();
    
    // Verify RTL is applied
    const views = summarySheet?.views || [];
    const hasRTL = views.some(v => v.rightToLeft === true);
    expect(hasRTL).toBe(true);
    
    // Check Arabic translated title
    const overviewTitleRow = summarySheet?.getRow(1);
    expect(overviewTitleRow?.getCell(1).value).toContain('تقرير وكيل راوي');
    
    const detailsSheet = workbook.getWorksheet('نتائج مدقق راوي');
    expect(detailsSheet).toBeDefined();
    
    // Verify RTL on details sheet
    const detailsViews = detailsSheet?.views || [];
    expect(detailsViews.some(v => v.rightToLeft === true)).toBe(true);
  });
});
