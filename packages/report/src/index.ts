import type { ScanResult, Finding, ScanSummary } from '@raawi-x/core';

export interface ReportModel {
  scanId: string;
  url: string;
  timestamp: string;
  summary: ScanSummary;
  findings: Finding[];
}

export function createReportModel(result: ScanResult): ReportModel {
  if (!result.findings || !result.summary) {
    throw new Error('Scan result must have findings and summary');
  }

  return {
    scanId: result.scanId,
    url: result.seedUrl || result.url || 'unknown',
    timestamp: result.completedAt || result.startedAt,
    summary: result.summary,
    findings: result.findings,
  };
}

export function generateHTMLReport(report: ReportModel): string {
  const findingsBySeverity = {
    error: report.findings.filter((f) => f.severity === 'error'),
    warning: report.findings.filter((f) => f.severity === 'warning'),
    info: report.findings.filter((f) => f.severity === 'info'),
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accessibility Scan Report - ${report.scanId}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      padding: 30px;
    }
    h1 { color: #2c3e50; margin-bottom: 10px; }
    .meta { color: #7f8c8d; margin-bottom: 30px; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .summary-card {
      padding: 20px;
      border-radius: 6px;
      text-align: center;
    }
    .summary-card.total { background: #ecf0f1; }
    .summary-card.error { background: #fee; border-left: 4px solid #e74c3c; }
    .summary-card.warning { background: #fff8e1; border-left: 4px solid #f39c12; }
    .summary-card.info { background: #e3f2fd; border-left: 4px solid #3498db; }
    .summary-card h3 { margin-bottom: 10px; font-size: 2em; }
    .findings-section { margin-top: 30px; }
    .finding {
      padding: 15px;
      margin-bottom: 15px;
      border-radius: 4px;
      border-left: 4px solid;
    }
    .finding.error { background: #fee; border-color: #e74c3c; }
    .finding.warning { background: #fff8e1; border-color: #f39c12; }
    .finding.info { background: #e3f2fd; border-color: #3498db; }
    .finding-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .finding-severity {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: bold;
      text-transform: uppercase;
    }
    .finding-severity.error { background: #e74c3c; color: white; }
    .finding-severity.warning { background: #f39c12; color: white; }
    .finding-severity.info { background: #3498db; color: white; }
    .finding-message { margin-bottom: 8px; }
    .finding-details {
      font-size: 0.9em;
      color: #7f8c8d;
      margin-top: 8px;
    }
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Accessibility Scan Report</h1>
    <div class="meta">
      <p><strong>Scan ID:</strong> ${report.scanId}</p>
      <p><strong>URL:</strong> <a href="${report.url}" target="_blank">${report.url}</a></p>
      <p><strong>Timestamp:</strong> ${new Date(report.timestamp).toLocaleString()}</p>
    </div>

    <div class="summary">
      <div class="summary-card total">
        <h3>${report.summary.total}</h3>
        <p>Total Findings</p>
      </div>
      <div class="summary-card error">
        <h3>${report.summary.errors}</h3>
        <p>Errors</p>
      </div>
      <div class="summary-card warning">
        <h3>${report.summary.warnings}</h3>
        <p>Warnings</p>
      </div>
      <div class="summary-card info">
        <h3>${report.summary.info}</h3>
        <p>Info</p>
      </div>
    </div>

    <div class="findings-section">
      <h2>Findings</h2>
      ${generateFindingsHTML(findingsBySeverity.error, 'error')}
      ${generateFindingsHTML(findingsBySeverity.warning, 'warning')}
      ${generateFindingsHTML(findingsBySeverity.info, 'info')}
    </div>
  </div>
</body>
</html>`;
}

function generateFindingsHTML(findings: Finding[], severity: string): string {
  if (findings.length === 0) {
    return '';
  }

  return `
      <h3 style="margin-top: 20px; margin-bottom: 10px; text-transform: capitalize;">${severity}s (${findings.length})</h3>
      ${findings
        .map(
          (finding) => `
        <div class="finding ${severity}">
          <div class="finding-header">
            <span class="finding-severity ${severity}">${severity}</span>
            <span><strong>Rule:</strong> ${finding.ruleId}</span>
          </div>
          <div class="finding-message">${escapeHtml(finding.message)}</div>
          ${finding.selector ? `<div class="finding-details"><strong>Selector:</strong> <code>${escapeHtml(finding.selector)}</code></div>` : ''}
          ${finding.element ? `<div class="finding-details"><strong>Element:</strong> <code>${escapeHtml(finding.element.substring(0, 200))}</code></div>` : ''}
        </div>
      `
        )
        .join('')}
    `;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

