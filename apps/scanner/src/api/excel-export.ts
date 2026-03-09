import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ExcelReportGenerator } from '../services/excel-report-generator.js';
import { requireAuth } from '../middleware/auth.js';

const router: Router = Router();

const exportSchema = z.object({
  locale: z.enum(['en', 'ar']).default('en'),
});

/**
 * POST /api/scans/:id/export/excel
 * Generate Excel report for a scan
 */
router.post('/:id/export/excel', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id: scanId } = req.params;
    const { locale } = exportSchema.parse(req.query);

    console.log(`[EXCEL] Generating Excel report for scan ${scanId}, locale: ${locale}`);

    // Generate Excel workbook
    const generator = new ExcelReportGenerator();
    const workbook = await generator.generateExcelReport(scanId, locale);

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `accessibility-audit-${scanId.slice(-8)}-${timestamp}-${locale.toUpperCase()}.xlsx`;

    // Set headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write to response
    await workbook.xlsx.write(res);

    console.log(`[EXCEL] Excel report generated successfully: ${filename}`);
    res.end();
  } catch (error) {
    console.error('[EXCEL] Failed to generate Excel report:', error);

    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid parameters', details: error.errors });
      return;
    }

    res.status(500).json({
      error: 'Failed to generate Excel report',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
