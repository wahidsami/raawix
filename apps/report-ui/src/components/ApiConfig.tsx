import { useState, FormEvent } from 'react';

interface ApiConfigProps {
  onSubmit: (config: { apiUrl: string; apiKey: string }) => void;
}

export default function ApiConfig({ onSubmit }: ApiConfigProps) {
  const [apiUrl, setApiUrl] = useState(import.meta.env.VITE_API_URL || 'http://localhost:3001');
  const [apiKey, setApiKey] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (apiUrl.trim() && apiKey.trim()) {
      onSubmit({ apiUrl: apiUrl.trim(), apiKey: apiKey.trim() });
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '20px', background: '#f5f5f5' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <header style={{ marginBottom: '30px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.5em', color: '#2c3e50', marginBottom: '10px' }}>Raawi X</h1>
          <p style={{ color: '#7f8c8d', fontSize: '1.1em' }}>Compliance Audit Scanner</p>
        </header>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="apiUrl" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#2c3e50' }}>
              API URL
            </label>
            <input
              id="apiUrl"
              type="url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:3001"
              required
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

          <div style={{ marginBottom: '30px' }}>
            <label htmlFor="apiKey" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#2c3e50' }}>
              API Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              required
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box',
              }}
            />
            <p style={{ marginTop: '8px', fontSize: '0.9em', color: '#7f8c8d' }}>
              API key is stored in memory only and will be cleared when you refresh the page.
            </p>
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              background: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Connect
          </button>
        </form>
      </div>
    </div>
  );
}

