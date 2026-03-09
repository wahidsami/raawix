import { useState, useEffect } from 'react';
import ScanForm from './ScanForm';
import ScanStatus from './ScanStatus';
import ReportViewer from './ReportViewer';
import type { ScanRun } from '@raawi-x/core';

interface ScanDashboardProps {
  apiUrl: string;
  apiKey: string;
  scanId: string | null;
  onScanStart: (scanId: string) => void;
  onNewScan: () => void;
}

export default function ScanDashboard({ apiUrl, apiKey, scanId, onScanStart, onNewScan }: ScanDashboardProps) {
  const [currentScanId, setCurrentScanId] = useState<string | null>(scanId);
  const [scanStatus, setScanStatus] = useState<any>(null);
  const [report, setReport] = useState<ScanRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentScanId(scanId);
  }, [scanId]);

  useEffect(() => {
    if (currentScanId) {
      pollScanStatus();
    }
  }, [currentScanId]);

  const pollScanStatus = async () => {
    if (!currentScanId) return;

    const maxAttempts = 300; // 10 minutes max
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/scan/${currentScanId}`, {
          headers: {
            'X-API-Key': apiKey,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch scan status');
        }

        const status = await response.json();
        setScanStatus(status);

        if (status.status === 'completed') {
          // Fetch report.json
          await fetchReport();
          setLoading(false);
        } else if (status.status === 'failed') {
          setError(status.error || 'Scan failed');
          setLoading(false);
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 2000);
        } else {
          setError('Scan timed out');
          setLoading(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch status');
        setLoading(false);
      }
    };

    poll();
  };

  const fetchReport = async () => {
    if (!currentScanId) return;

    try {
      const response = await fetch(`${apiUrl}/api/scan/${currentScanId}/report`, {
        headers: {
          'X-API-Key': apiKey,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch report');
      }

      const reportData: ScanRun = await response.json();
      setReport(reportData);
    } catch (err) {
      console.error('Error fetching report:', err);
      setError('Failed to load report');
    }
  };

  const handleStartScan = async (seedUrl: string, maxPages: number, maxDepth: number) => {
    setLoading(true);
    setError(null);
    setReport(null);
    setScanStatus(null);

    try {
      const response = await fetch(`${apiUrl}/api/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          seedUrl,
          maxPages,
          maxDepth,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start scan');
      }

      const data = await response.json();
      setCurrentScanId(data.scanId);
      onScanStart(data.scanId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '20px', background: '#f5f5f5' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2em', color: '#2c3e50', marginBottom: '5px' }}>Raawi X Dashboard</h1>
            <p style={{ color: '#7f8c8d' }}>Compliance Audit Scanner</p>
          </div>
          <div>
            <button
              onClick={onNewScan}
              style={{
                padding: '10px 20px',
                background: '#95a5a6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '10px',
              }}
            >
              New Scan
            </button>
            <span style={{ color: '#7f8c8d', fontSize: '0.9em' }}>API: {apiUrl}</span>
          </div>
        </header>

        {error && (
          <div
            style={{
              marginBottom: '20px',
              padding: '15px',
              background: '#fee',
              border: '1px solid #e74c3c',
              borderRadius: '4px',
              color: '#c0392b',
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {!currentScanId && <ScanForm onSubmit={handleStartScan} loading={loading} />}

        {currentScanId && scanStatus && scanStatus.status !== 'completed' && (
          <ScanStatus status={scanStatus} />
        )}

        {report && <ReportViewer report={report} apiUrl={apiUrl} apiKey={apiKey} scanId={currentScanId!} />}
      </div>
    </div>
  );
}

