import { useState, useEffect } from 'react';
import type { PageRuleResults, RuleResult, PageArtifact } from '@raawi-x/core';

interface FindingsDetailProps {
  pageResults: PageRuleResults;
  pageArtifact: PageArtifact | undefined;
  apiUrl: string;
  apiKey: string;
  scanId: string;
  onClose: () => void;
}

export default function FindingsDetail({
  pageResults,
  pageArtifact,
  apiUrl,
  apiKey,
  scanId,
  onClose,
}: FindingsDetailProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return '#27ae60';
      case 'fail':
        return '#e74c3c';
      case 'needs_review':
        return '#3498db';
      case 'na':
        return '#95a5a6';
      default:
        return '#7f8c8d';
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return '#27ae60';
      case 'medium':
        return '#f39c12';
      case 'low':
        return '#e74c3c';
      default:
        return '#7f8c8d';
    }
  };

  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);

  useEffect(() => {
    // Fetch screenshot as blob with authentication, then create object URL
    if (pageArtifact?.screenshotPath) {
      const artifactPath = `pages/${pageArtifact.pageNumber}/screenshot.png`;
      fetch(`${apiUrl}/api/scan/${scanId}/artifact/${artifactPath}`, {
        headers: {
          'X-API-Key': apiKey,
        },
      })
        .then((res) => {
          if (res.ok) {
            return res.blob();
          }
          return null;
        })
        .then((blob) => {
          if (blob) {
            setScreenshotUrl(URL.createObjectURL(blob));
          }
        })
        .catch(() => {
          // Screenshot not available or failed to load
        });
    }

    return () => {
      // Cleanup object URL
      if (screenshotUrl) {
        URL.revokeObjectURL(screenshotUrl);
      }
    };
  }, [pageArtifact, apiUrl, apiKey, scanId]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        overflow: 'auto',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          background: 'white',
          borderRadius: '8px',
          padding: '30px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#2c3e50' }}>Page {pageResults.pageNumber} - Findings</h2>
            <p style={{ margin: '5px 0 0 0', color: '#7f8c8d' }}>
              <a href={pageResults.url} target="_blank" rel="noopener noreferrer" style={{ color: '#3498db' }}>
                {pageResults.url}
              </a>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: '#95a5a6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1em',
            }}
          >
            Close
          </button>
        </div>

        {screenshotUrl && (
          <div style={{ marginBottom: '30px', textAlign: 'center' }}>
            <img
              src={screenshotUrl}
              alt={`Screenshot of ${pageResults.url}`}
              style={{
                maxWidth: '100%',
                maxHeight: '400px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#2c3e50', marginBottom: '15px' }}>Rule Results ({pageResults.ruleResults.length})</h3>
          <div style={{ display: 'grid', gap: '15px' }}>
            {pageResults.ruleResults.map((result: RuleResult, index: number) => (
              <div
                key={index}
                style={{
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  padding: '15px',
                  background: result.status === 'fail' ? '#fee' : result.status === 'pass' ? '#efe' : '#f0f8ff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '5px' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.85em',
                          fontWeight: 'bold',
                          background: getStatusColor(result.status),
                          color: 'white',
                        }}
                      >
                        {result.status.toUpperCase()}
                      </span>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.85em',
                          background: getConfidenceColor(result.confidence),
                          color: 'white',
                        }}
                      >
                        {result.confidence} confidence
                      </span>
                      {result.wcagId && (
                        <span style={{ fontWeight: 'bold', color: '#2c3e50' }}>WCAG {result.wcagId}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.9em', color: '#7f8c8d', marginTop: '5px' }}>
                      Rule ID: {result.ruleId}
                    </div>
                  </div>
                </div>

                {result.message && (
                  <div style={{ marginBottom: '10px', color: '#2c3e50' }}>{result.message}</div>
                )}

                {result.evidence && result.evidence.length > 0 && (
                  <div style={{ marginTop: '15px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#2c3e50' }}>
                      Evidence ({result.evidence.length}):
                    </div>
                    {result.evidence.map((evidence, evIndex) => (
                      <div
                        key={evIndex}
                        style={{
                          marginBottom: '10px',
                          padding: '10px',
                          background: '#f8f9fa',
                          borderRadius: '4px',
                          fontSize: '0.9em',
                        }}
                      >
                        {evidence.selector && (
                          <div style={{ marginBottom: '5px' }}>
                            <strong>Selector:</strong>{' '}
                            <code style={{ background: '#e9ecef', padding: '2px 6px', borderRadius: '3px' }}>
                              {evidence.selector}
                            </code>
                          </div>
                        )}
                        {evidence.description && (
                          <div style={{ marginBottom: '5px', color: '#495057' }}>{evidence.description}</div>
                        )}
                        {evidence.value && (
                          <details style={{ marginTop: '5px' }}>
                            <summary style={{ cursor: 'pointer', color: '#3498db' }}>View snippet</summary>
                            <pre
                              style={{
                                marginTop: '5px',
                                padding: '10px',
                                background: '#f8f9fa',
                                border: '1px solid #dee2e6',
                                borderRadius: '4px',
                                overflow: 'auto',
                                maxHeight: '200px',
                                fontSize: '0.85em',
                              }}
                            >
                              {evidence.value}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {result.howToVerify && (
                  <div style={{ marginTop: '15px', padding: '10px', background: '#fff3cd', borderRadius: '4px', fontSize: '0.9em' }}>
                    <strong>How to verify:</strong> {result.howToVerify}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

