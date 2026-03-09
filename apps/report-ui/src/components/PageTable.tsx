import type { PageRuleResults } from '@raawi-x/core';

interface PageTableProps {
  results: PageRuleResults[];
  onPageSelect: (page: PageRuleResults) => void;
}

export default function PageTable({ results, onPageSelect }: PageTableProps) {
  const getStatusCounts = (ruleResults: PageRuleResults['ruleResults']) => {
    return {
      pass: ruleResults.filter((r) => r.status === 'pass').length,
      fail: ruleResults.filter((r) => r.status === 'fail').length,
      needsReview: ruleResults.filter((r) => r.status === 'needs_review').length,
      na: ruleResults.filter((r) => r.status === 'na').length,
    };
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Page #</th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>URL</th>
            <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Pass</th>
            <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Fail</th>
            <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Review</th>
            <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>N/A</th>
            <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {results.map((page, index) => {
            const counts = getStatusCounts(page.ruleResults);
            return (
              <tr
                key={page.pageNumber}
                style={{
                  borderBottom: '1px solid #dee2e6',
                  background: index % 2 === 0 ? 'white' : '#f8f9fa',
                }}
              >
                <td style={{ padding: '12px' }}>{page.pageNumber}</td>
                <td style={{ padding: '12px', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <a href={page.url} target="_blank" rel="noopener noreferrer" style={{ color: '#3498db' }}>
                    {page.url}
                  </a>
                </td>
                <td style={{ padding: '12px', textAlign: 'center', color: '#27ae60', fontWeight: 'bold' }}>
                  {counts.pass}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', color: '#e74c3c', fontWeight: 'bold' }}>
                  {counts.fail}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', color: '#3498db', fontWeight: 'bold' }}>
                  {counts.needsReview}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', color: '#95a5a6' }}>{counts.na}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <button
                    onClick={() => onPageSelect(page)}
                    style={{
                      padding: '6px 12px',
                      background: '#3498db',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.9em',
                    }}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

