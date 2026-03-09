import { useState } from 'react';
import type { ScanRun, PageRuleResults } from '@raawi-x/core';
import SummaryCards from './SummaryCards';
import PageTable from './PageTable';
import FindingsDetail from './FindingsDetail';

interface ReportViewerProps {
  report: ScanRun;
  apiUrl: string;
  apiKey: string;
  scanId: string;
}

export default function ReportViewer({ report, apiUrl, apiKey, scanId }: ReportViewerProps) {
  const [selectedPage, setSelectedPage] = useState<PageRuleResults | null>(null);

  return (
    <div>
      <SummaryCards summary={report.summary} />

      <div
        style={{
          background: 'white',
          padding: '30px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '20px',
        }}
      >
        <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>Pages ({report.pages.length})</h2>
        <PageTable results={report.results} onPageSelect={setSelectedPage} />
      </div>

      {selectedPage && (
        <FindingsDetail
          pageResults={selectedPage}
          pageArtifact={report.pages.find((p) => p.pageNumber === selectedPage.pageNumber)}
          apiUrl={apiUrl}
          apiKey={apiKey}
          scanId={scanId}
          onClose={() => setSelectedPage(null)}
        />
      )}
    </div>
  );
}

