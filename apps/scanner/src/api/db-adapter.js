import { scanRunToApiResponse } from './response-adapter.js';
/**
 * Convert database scan to API response format
 */
export async function dbScanToApiResponse(dbScan, baseUrl) {
    // Convert pages
    const pages = dbScan.pages.map((page) => ({
        pageNumber: page.pageNumber,
        url: page.url,
        title: page.title || undefined,
        finalUrl: page.finalUrl || page.url,
        htmlPath: page.htmlPath || undefined,
        screenshotPath: page.screenshotPath || undefined,
        a11yPath: page.a11yPath || undefined,
        semanticPath: page.semanticPath || undefined,
        visionPath: page.visionPath || undefined,
    }));
    // Group findings by page
    const pageFindingsMap = new Map();
    // Add regular findings
    for (const finding of dbScan.findings) {
        const pageNumber = finding.pageId
            ? dbScan.pages.find((p) => p.id === finding.pageId)?.pageNumber || 0
            : 0;
        if (!pageFindingsMap.has(pageNumber)) {
            pageFindingsMap.set(pageNumber, []);
        }
        pageFindingsMap.get(pageNumber).push({
            ruleId: finding.ruleId,
            wcagId: finding.wcagId || undefined,
            level: finding.level || undefined,
            status: finding.status,
            confidence: finding.confidence,
            message: finding.message || undefined,
            evidence: finding.evidenceJson || [],
            howToVerify: finding.howToVerify,
        });
    }
    // Add vision findings
    for (const visionFinding of dbScan.visionFindings) {
        const pageNumber = visionFinding.pageId
            ? dbScan.pages.find((p) => p.id === visionFinding.pageId)?.pageNumber || 0
            : 0;
        if (!pageFindingsMap.has(pageNumber)) {
            pageFindingsMap.set(pageNumber, []);
        }
        // Convert vision finding to rule result
        const primaryWcagId = visionFinding.suggestedWcagIdsJson?.[0] || '4.1.2';
        // Parse evidenceJson to check for Gemini data
        let evidenceJsonData = {};
        try {
            if (visionFinding.evidenceJson) {
                evidenceJsonData = typeof visionFinding.evidenceJson === 'string'
                    ? JSON.parse(visionFinding.evidenceJson)
                    : visionFinding.evidenceJson;
            }
        }
        catch {
            // Ignore parse errors
        }
        // CRITICAL: If Gemini was used, always mark as needs_review with low/medium confidence
        const hasGeminiData = !!(evidenceJsonData.geminiTextExtraction ||
            evidenceJsonData.geminiDescription);
        const status = hasGeminiData
            ? 'needs_review' // Gemini outputs always need review
            : (visionFinding.confidence === 'high' && visionFinding.correlatedSelector
                ? 'fail'
                : 'needs_review');
        const confidence = hasGeminiData
            ? (visionFinding.confidence === 'high' ? 'medium' : visionFinding.confidence)
            : visionFinding.confidence;
        // Build evidence array from evidenceJson
        const evidence = evidenceJsonData.evidence || [];
        // Add Gemini raw output to evidence if present
        if (hasGeminiData) {
            evidence.push({
                type: 'text',
                value: JSON.stringify(evidenceJsonData, null, 2),
                description: 'Raw Gemini Vision API output (for auditability only, not used for WCAG compliance determination)',
            });
        }
        let message = `Vision finding: ${visionFinding.kind}`;
        if (visionFinding.detectedText) {
            message += `. Detected text: ${visionFinding.detectedText}`;
        }
        if (hasGeminiData) {
            message += ' (Enhanced with Gemini Vision API - requires manual review)';
        }
        pageFindingsMap.get(pageNumber).push({
            ruleId: `vision-${visionFinding.kind}`,
            wcagId: primaryWcagId,
            level: 'A', // Vision findings are typically A level
            status, // Always needs_review if Gemini was used
            confidence, // Always low/medium if Gemini was used
            message,
            evidence,
            howToVerify: `Verify with screen reader and keyboard navigation. Element at ${visionFinding.correlatedSelector || 'unknown selector'}.${hasGeminiData ? ' Note: This finding was enhanced with Gemini Vision API and requires manual verification.' : ''}`,
        });
    }
    // Build ScanRun structure
    const scanRun = {
        scanId: dbScan.scanId,
        seedUrl: dbScan.seedUrl,
        startedAt: dbScan.startedAt.toISOString(),
        completedAt: dbScan.completedAt?.toISOString(),
        pages,
        results: pages.map((page) => ({
            pageNumber: page.pageNumber,
            url: page.url,
            ruleResults: pageFindingsMap.get(page.pageNumber) || [],
        })),
        summary: dbScan.summaryJson || {
            totalPages: pages.length,
            totalRules: 0,
            byLevel: {
                A: { pass: 0, fail: 0, needs_review: 0, na: 0, total: 0 },
                AA: { pass: 0, fail: 0, needs_review: 0, na: 0, total: 0 },
            },
            byStatus: { pass: 0, fail: 0, needs_review: 0, na: 0 },
        },
    };
    // Use existing adapter
    return scanRunToApiResponse(scanRun, baseUrl);
}
//# sourceMappingURL=db-adapter.js.map