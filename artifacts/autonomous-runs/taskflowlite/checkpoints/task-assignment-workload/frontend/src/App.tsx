import { useEffect, useState } from "react";
import { fetchHealth } from "./api/health";

export default function App() {
  const [status, setStatus] = useState<string>("checking...");

  useEffect(() => {
    fetchHealth()
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("DOWN"));
  }, []);

  return (
    <main className="app-shell">
      <h1>TaskFlowLite</h1>
      <p>Lightweight task workflow for small teams.</p>
      <p data-testid="health-status">
        Backend health: <strong>{status}</strong>
      </p>
    </main>
  );
}

// ===== AI MERGE APPEND =====

import { useEffect, useState } from 'react';
import { api } from './lib/api';

export default function App() {
  const [status, setStatus] = useState<string>('checking...');

  useEffect(() => {
    api
      .get('/api/health')
      .then((r) => setStatus(r.data.status ?? 'unknown'))
      .catch(() => setStatus('unreachable'));
  }, []);

  return (
    <main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
      <h1>TaskFlowLite</h1>
      <p>Backend health: {status}</p>
    </main>
  );
}