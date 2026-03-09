import type { ScanRunSummary } from '@raawi-x/core';

interface SummaryCardsProps {
  summary: ScanRunSummary;
}

export default function SummaryCards({ summary }: SummaryCardsProps) {
  const aFailCount = summary.byLevel.A.fail;
  const aaFailCount = summary.byLevel.AA.fail;
  const needsReviewCount = summary.byStatus.needs_review;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '20px',
      }}
    >
      <div
        style={{
          background: 'white',
          padding: '25px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          borderLeft: '4px solid #e74c3c',
        }}
      >
        <div style={{ color: '#7f8c8d', fontSize: '0.9em', marginBottom: '10px' }}>WCAG A Failures</div>
        <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#e74c3c' }}>{aFailCount}</div>
        <div style={{ color: '#7f8c8d', fontSize: '0.9em', marginTop: '5px' }}>
          out of {summary.byLevel.A.total} checks
        </div>
      </div>

      <div
        style={{
          background: 'white',
          padding: '25px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          borderLeft: '4px solid #f39c12',
        }}
      >
        <div style={{ color: '#7f8c8d', fontSize: '0.9em', marginBottom: '10px' }}>WCAG AA Failures</div>
        <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#f39c12' }}>{aaFailCount}</div>
        <div style={{ color: '#7f8c8d', fontSize: '0.9em', marginTop: '5px' }}>
          out of {summary.byLevel.AA.total} checks
        </div>
      </div>

      <div
        style={{
          background: 'white',
          padding: '25px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          borderLeft: '4px solid #3498db',
        }}
      >
        <div style={{ color: '#7f8c8d', fontSize: '0.9em', marginBottom: '10px' }}>Needs Review</div>
        <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#3498db' }}>{needsReviewCount}</div>
        <div style={{ color: '#7f8c8d', fontSize: '0.9em', marginTop: '5px' }}>items requiring manual review</div>
      </div>

      <div
        style={{
          background: 'white',
          padding: '25px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          borderLeft: '4px solid #27ae60',
        }}
      >
        <div style={{ color: '#7f8c8d', fontSize: '0.9em', marginBottom: '10px' }}>Total Pages</div>
        <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#27ae60' }}>{summary.totalPages}</div>
        <div style={{ color: '#7f8c8d', fontSize: '0.9em', marginTop: '5px' }}>pages scanned</div>
      </div>
    </div>
  );
}

