'use client';

import { useState } from 'react';

const severities = [
  { label: 'Mild', value: 'Mild' },
  { label: 'Spicy', value: 'Spicy' },
  { label: 'Nuclear', value: 'Nuclear' },
];

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [severity, setSeverity] = useState('Spicy');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setResult('');

    if (!file) {
      setError('Please upload a PDF resume.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('resume', file);
    formData.append('severity', severity);

    try {
      const response = await fetch('/api/roast', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || 'Roast request failed');
      }

      const data = await response.json();
      setResult(data.roast.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const copyShare = async () => {
    if (!navigator.clipboard || !result) return;
    await navigator.clipboard.writeText(result);
    alert('Roast copied to clipboard!');
  };

  return (
    <main className="page-shell">
      <div className="content-card">
        <h1>Roast My Resume</h1>
        <p className="subtitle">Upload a PDF → get a savage-but-helpful AI roast + bullet-point fixes.</p>

        <form onSubmit={handleSubmit} className="form-grid">
          <label className="field">
            <span>Resume PDF</span>
            <input
              type="file"
              accept="application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>

          <div className="field">
            <span>Severity dial</span>
            <div className="radio-group">
              {severities.map((item) => (
                <label key={item.value} className="radio-label">
                  <input
                    type="radio"
                    name="severity"
                    value={item.value}
                    checked={severity === item.value}
                    onChange={() => setSeverity(item.value)}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Roasting...' : 'Generate Roast'}
          </button>
        </form>

        {error ? <div className="toast error">{error}</div> : null}

        {result ? (
          <section className="result-card">
            <h2>Your Roast</h2>
            <pre>{result}</pre>
            <button className="share-button" type="button" onClick={copyShare}>
              Copy Roast
            </button>
          </section>
        ) : null}
      </div>
    </main>
  );
}
