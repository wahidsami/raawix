interface ScanStatusProps {
  status: {
    scanId: string;
    seedUrl: string;
    status: string;
    startedAt: string;
    pagesScanned?: number;
  };
}

export default function ScanStatus({ status }: ScanStatusProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued':
        return '#f39c12';
      case 'discovering':
        return '#9b59b6';
      case 'running':
        return '#3498db';
      case 'completed':
        return '#27ae60';
      case 'failed':
        return '#e74c3c';
      case 'canceled':
        return '#7f8c8d';
      default:
        return '#95a5a6';
    }
  };

  return (
    <div
      style={{
        background: 'white',
        padding: '30px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px',
      }}
    >
      <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>Scan Status</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div>
          <div style={{ color: '#7f8c8d', fontSize: '0.9em', marginBottom: '5px' }}>Status</div>
          <div
            style={{
              fontSize: '1.2em',
              fontWeight: 'bold',
              color: getStatusColor(status.status),
              textTransform: 'capitalize',
            }}
          >
            {status.status}
          </div>
        </div>
        <div>
          <div style={{ color: '#7f8c8d', fontSize: '0.9em', marginBottom: '5px' }}>Scan ID</div>
          <div style={{ fontSize: '1em', fontFamily: 'monospace' }}>{status.scanId}</div>
        </div>
        <div>
          <div style={{ color: '#7f8c8d', fontSize: '0.9em', marginBottom: '5px' }}>Seed URL</div>
          <div style={{ fontSize: '1em', wordBreak: 'break-all' }}>{status.seedUrl}</div>
        </div>
        {status.pagesScanned !== undefined && (
          <div>
            <div style={{ color: '#7f8c8d', fontSize: '0.9em', marginBottom: '5px' }}>Pages Scanned</div>
            <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{status.pagesScanned}</div>
          </div>
        )}
      </div>
      {status.status === 'running' && (
        <div style={{ marginTop: '20px', padding: '15px', background: '#e3f2fd', borderRadius: '4px', color: '#1976d2' }}>
          Scan in progress... This may take a few minutes.
        </div>
      )}
    </div>
  );
}

