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