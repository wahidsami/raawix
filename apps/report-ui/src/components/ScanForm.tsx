import { useState, FormEvent } from 'react';

interface ScanFormProps {
  onSubmit: (seedUrl: string, maxPages: number, maxDepth: number) => void;
  loading: boolean;
}

export default function ScanForm({ onSubmit, loading }: ScanFormProps) {
  const [seedUrl, setSeedUrl] = useState('');
  const [maxPages, setMaxPages] = useState(25);
  const [maxDepth, setMaxDepth] = useState(2);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (seedUrl.trim()) {
      onSubmit(seedUrl.trim(), maxPages, maxDepth);
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
      <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>Start New Scan</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="seedUrl" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Seed URL
          </label>
          <input
            id="seedUrl"
            type="url"
            value={seedUrl}
            onChange={(e) => setSeedUrl(e.target.value)}
            placeholder="https://example.com"
            required
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label htmlFor="maxPages" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Max Pages
            </label>
            <input
              id="maxPages"
              type="number"
              min="1"
              max="100"
              value={maxPages}
              onChange={(e) => setMaxPages(parseInt(e.target.value, 10) || 25)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label htmlFor="maxDepth" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Max Depth
            </label>
            <input
              id="maxDepth"
              type="number"
              min="0"
              max="5"
              value={maxDepth}
              onChange={(e) => setMaxDepth(parseInt(e.target.value, 10) || 2)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !seedUrl.trim()}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            background: loading ? '#95a5a6' : '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          {loading ? 'Starting Scan...' : 'Start Scan'}
        </button>
      </form>
    </div>
  );
}

