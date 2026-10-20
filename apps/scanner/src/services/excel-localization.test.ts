import { describe, it, expect, vi } from 'vitest';
import ExcelJS from 'exceljs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rm } from 'node:fs/promises';
import { ExcelReportGenerator } from './excel-report-generator.js';
import { scanRepository } from '../db/scan-repository.js';
import {
  getLocalizedFindingMessage,
  getLocalizedRecommendation,
  getLocalizedAgentKind,
  getLocalizedTraceSummary,
} from '@raawi-x/core';

describe('Workstream 4: Shared Localization and Excel Exporter', () => {
  describe('Shared Localization Module Unit Tests', () => {
    it('localizes recognized WCAG and agent finding messages in Arabic with interpolation', () => {
      // 1. Form control missing name
      expect(
        getLocalizedFindingMessage('Found 1 form control(s) without accessible names', 'ar')
      ).toBe('تم العثور على 1 عنصر (عناصر) تحكم نموذج بدون أسماء يمكن الوصول إليها');

      // 2. Focus indicator
      expect(
        getLocalizedFindingMessage('No visible focus indicator detected. Checked for: outline, border, box-shadow', 'ar')
      ).toBe('لم يتم اكتشاف مؤشر تركيز مرئي. تم فحص: outline و border و box-shadow');

      // 3. Contrast violations
      expect(
        getLocalizedFindingMessage('Found 3 text element(s) with insufficient contrast', 'ar')
      ).toBe('تم العثور على 3 عنصر (عناصر) نصية ذات تباين غير كافٍ');

      // 4. Contrast detail with ratio and colors preserved
      expect(
        getLocalizedFindingMessage(
          'Contrast ratio 2.80:1 (below 4.5:1). Text: rgb(150, 150, 150), BG: rgb(255, 255, 255)',
          'ar'
        )
      ).toBe(
        'نسبة التباين 2.80:1 (أقل من 4.5:1). النص: rgb(150, 150, 150)، الخلفية: rgb(255, 255, 255)'
      );

      // 5. Agent unnamed task control
      expect(
        getLocalizedFindingMessage('1 form field(s) appear to lack an accessible name during the form task.', 'ar')
      ).toBe('يبدو أن 1 حقل (حقول) نموذج يفتقر إلى اسم يمكن الوصول إليه أثناء مهمة النموذج.');
    });

    it('preserves unknown free-form messages, code snippets, selectors, and URLs without corruption', () => {
      const unknownMsg = 'Custom error code [ERR_9921]: selector div.main-wrapper > span.highlighted failed custom check.';
      expect(getLocalizedFindingMessage(unknownMsg, 'ar')).toBe(unknownMsg);
      expect(getLocalizedFindingMessage(unknownMsg, 'en')).toBe(unknownMsg);

      const unknownRec = 'Consult internal design system guidelines at https://internal.example.org/design-tokens';
      expect(getLocalizedRecommendation(unknownRec, 'ar')).toBe(unknownRec);
    });

    it('localizes trace summaries accurately in Arabic', () => {
      expect(getLocalizedTraceSummary('No keyboard trace recorded', 'ar')).toBe(
        'لم يتم تسجيل أي تتبّع للوحة المفاتيح'
      );
      expect(getLocalizedTraceSummary('0 steps, 0 probes attempted (incomplete)', 'ar')).toBe(
        '0 خطوات، 0 اختبارات مطلوبة (غير مكتمل)'
      );
      expect(
        getLocalizedTraceSummary('0 steps, 0 probes attempted (static assessment: 1 issue)', 'ar')
      ).toBe('0 خطوات، 0 اختبارات مطلوبة (تقييم ثابت: 1 مشكلة)');
      expect(getLocalizedTraceSummary('12 steps, 2 probes attempted, 1 issue', 'ar')).toBe(
        '12 خطوة، 2 اختبار مطلوب، 1 مشكلة'
      );
    });

    it('keeps English output stable and untouched', () => {
      const msg = 'Found 2 form control(s) without accessible names';
      expect(getLocalizedFindingMessage(msg, 'en')).toBe(msg);

      const rec = 'Add accessible names to all form controls using label, aria-label, or aria-labelledby';
      expect(getLocalizedRecommendation(rec, 'en')).toBe(rec);
    });
  });

  describe('Real XLSX Workbook Generation and Cell Inspection', () => {
    const testDir = join(tmpdir(), `raawi-excel-test-${Date.now()}`);

    const mockScanData: any = {
      id: 'scan_test_123',
      url: 'https://example.com',
      hostname: 'example.com',
      auditMode: 'classic',
      status: 'completed',
      score: 85,
      createdAt: new Date('2026-03-01T00:00:00Z'),
      pages: [
        {
          id: 'page_1',
          url: 'https://example.com',
          pageNumber: 1,
          agentPath: null,
        },
      ],
      findings: [
        {
          id: 'f_1',
          pageId: 'page_1',
          ruleId: 'wcag-4.1.2',
          wcagId: '4.1.2',
          level: 'A',
          status: 'fail',
          severity: 'critical',
          message: 'Found 1 form control(s) without accessible names',
          selector: 'input#test-input',
          howToVerify: 'Add accessible names to all form controls using label, aria-label, or aria-labelledby',
        },
        {
          id: 'f_2',
          pageId: 'page_1',
          ruleId: 'custom-rule',
          wcagId: '1.4.3',
          level: 'AA',
          status: 'needs_review',
          severity: 'moderate',
          message: 'Contrast ratio 3.20:1 (below 4.5:1). Text: #888, BG: #fff',
          selector: '.text-muted',
          howToVerify: 'Verify text contrast using browser DevTools or contrast checker tools',
        },
        {
          id: 'f_3',
          pageId: 'page_1',
          ruleId: 'unknown-rule',
          wcagId: '9.9.9',
          level: 'AAA',
          status: 'pass',
          severity: 'minor',
          message: 'Custom enterprise check with technical token <custom-token-xyz>',
          selector: '#enterprise-widget',
          howToVerify: 'Verify via proprietary internal script: runInternalAudit()',
        },
      ],
      agentFindings: [
        {
          id: 'af_1',
          pageId: 'page_1',
          kind: 'unnamed_task_control',
          source: 'static_profile',
          confidence: 0.86,
          message: '1 form field(s) appear to lack an accessible name during the form task.',
          howToVerify: 'Navigate the form with a screen reader and confirm every field announces a clear label and instruction.',
          suggestedWcagIdsJson: JSON.stringify(['4.1.2']),
        },
      ],
    };

    it('generates real Arabic XLSX workbook with RTL views, localized messages, and intact technical evidence', async () => {
      vi.spyOn(scanRepository, 'getScan').mockResolvedValue(mockScanData);

      const generator = new ExcelReportGenerator();
      const workbook = await generator.generateExcelReport('scan_test_123', 'ar');

      const arabicFilePath = join(testDir, 'arabic_report.xlsx');
      const { mkdir } = await import('node:fs/promises');
      await mkdir(testDir, { recursive: true });

      // Write real XLSX file locally
      await workbook.xlsx.writeFile(arabicFilePath);

      // Read back real XLSX file and inspect actual cell values and properties
      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.readFile(arabicFilePath);

      // 1. Verify Sheet names and RTL direction
      const wcagSheet = readWorkbook.getWorksheet('نتائج WCAG');
      expect(wcagSheet).toBeDefined();
      expect(wcagSheet!.views?.[0]?.rightToLeft).toBe(true);

      const agentSheet = readWorkbook.getWorksheet('وكيل التحليل');
      expect(agentSheet).toBeDefined();
      expect(agentSheet!.views?.[0]?.rightToLeft).toBe(true);

      // 2. Inspect WCAG sheet cells
      // Header row is row 1
      expect(wcagSheet!.getRow(1).getCell(1).value).toBe('القاعدة');
      expect(wcagSheet!.getRow(1).getCell(3).value).toBe('الحالة');
      expect(wcagSheet!.getRow(1).getCell(4).value).toBe('الخطورة');

      // Finding 1 row (row 2)
      const f1Row = wcagSheet!.getRow(2);
      expect(f1Row.getCell(3).value).toBe('فشل'); // Status translated to Arabic
      expect(f1Row.getCell(4).value).toBe('حرج'); // Severity translated to Arabic
      const f1Desc = String(f1Row.getCell(5).value);
      // Description must contain translated message
      expect(f1Desc).toContain('تم العثور على 1 عنصر (عناصر) تحكم نموذج بدون أسماء يمكن الوصول إليها');
      // Selector and recommendation
      expect(f1Row.getCell(7).value).toBe('input#test-input'); // Selector preserved
      expect(f1Row.getCell(8).value).toBe('أضف أسماء يمكن الوصول إليها لجميع عناصر التحكم في النماذج باستخدام label أو aria-label أو aria-labelledby');

      // Finding 2 row (row 3) - contrast detail
      const f2Row = wcagSheet!.getRow(3);
      expect(f2Row.getCell(3).value).toBe('يحتاج مراجعة');
      expect(f2Row.getCell(4).value).toBe('مهم');
      const f2Desc = String(f2Row.getCell(5).value);
      expect(f2Desc).toContain('نسبة التباين 3.20:1 (أقل من 4.5:1). النص: #888، الخلفية: #fff');
      expect(f2Row.getCell(8).value).toBe('تحقق من تباين النص باستخدام أدوات المطورين في المتصفح أو أدوات فحص التباين');

      // Finding 3 row (row 4) - unknown message preserved
      const f3Row = wcagSheet!.getRow(4);
      const f3Desc = String(f3Row.getCell(5).value);
      expect(f3Desc).toContain('Custom enterprise check with technical token <custom-token-xyz>');
      expect(f3Row.getCell(8).value).toBe('Verify via proprietary internal script: runInternalAudit()');

      // 3. Inspect Agent Sheet cells
      expect(agentSheet!.getRow(1).getCell(2).value).toBe('النوع');
      const afRow = agentSheet!.getRow(2);
      expect(afRow.getCell(2).value).toBe('عنصر تحكم للمهمة بدون اسم'); // Localized kind
      expect(afRow.getCell(5).value).toBe('يبدو أن 1 حقل (حقول) نموذج يفتقر إلى اسم يمكن الوصول إليه أثناء مهمة النموذج.'); // Localized message
      expect(afRow.getCell(6).value).toBe('تنقل في النموذج باستخدام قارئ الشاشة وتأكد من أن كل حقل يعلن عن تسمية وتعليمات واضحة.'); // Localized recommendation

      await rm(testDir, { recursive: true, force: true });
    });

    it('generates real English XLSX workbook with LTR views and standard English wording', async () => {
      vi.spyOn(scanRepository, 'getScan').mockResolvedValue(mockScanData);

      const generator = new ExcelReportGenerator();
      const workbook = await generator.generateExcelReport('scan_test_123', 'en');

      const englishFilePath = join(testDir, 'english_report.xlsx');
      const { mkdir } = await import('node:fs/promises');
      await mkdir(testDir, { recursive: true });

      await workbook.xlsx.writeFile(englishFilePath);

      const readWorkbook = new ExcelJS.Workbook();
      await readWorkbook.xlsx.readFile(englishFilePath);

      const wcagSheet = readWorkbook.getWorksheet('WCAG Findings');
      expect(wcagSheet).toBeDefined();
      expect(wcagSheet!.views?.[0]?.rightToLeft).toBeFalsy();

      const f1Row = wcagSheet!.getRow(2);
      expect(f1Row.getCell(3).value).toBe('Fail');
      expect(f1Row.getCell(4).value).toBe('Critical');
      const f1Desc = String(f1Row.getCell(5).value);
      expect(f1Desc).toContain('Found 1 form control(s) without accessible names');
      expect(f1Row.getCell(8).value).toBe('Add accessible names to all form controls using label, aria-label, or aria-labelledby');

      await rm(testDir, { recursive: true, force: true });
    });
  });
});
