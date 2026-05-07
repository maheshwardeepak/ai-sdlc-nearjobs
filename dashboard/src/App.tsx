import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

type Run = {
  runId: string;
  mode: string;
  requirement: string;
  status: string;
  createdAt: string;
  projectSlug: string;
};

function App() {
  const [requirement, setRequirement] = useState("");
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function loadRuns() {
    const res = await axios.get("http://localhost:4000/api/runs");
    setRuns(res.data.runs || []);
  }

  async function startRun() {
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:4000/api/run", { requirement });
      alert(JSON.stringify(res.data, null, 2));
      await loadRuns();
    } finally {
      setLoading(false);
    }
  }

  async function openRun(run: Run) {
  const res = await axios.get(
    `http://localhost:4000/api/runs/${run.projectSlug}/${run.runId}`
  );
  setSelectedRun(res.data);
}

  useEffect(() => {
    loadRuns();
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>NearJobs AI Agent Factory</h1>

      <section style={{ marginBottom: 24 }}>
        <h2>Start Pipeline</h2>
        <textarea
          rows={4}
          value={requirement}
          onChange={(e) => setRequirement(e.target.value)}
          placeholder="Example: Add OTP authentication with JWT sessions"
          style={{ width: "100%", padding: 12 }}
        />
        <br />
        <button onClick={startRun} disabled={loading || !requirement}>
          {loading ? "Running..." : "Start"}
        </button>
      </section>

      <section>
        <h2>Runs</h2>
        {runs.map((run) => (
          <div
            key={run.runId}
            style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 8 }}
          >
            <strong>{run.status}</strong> — {run.mode}
            <p>{run.requirement}</p>
            <small>{run.createdAt}</small>
            <br />
            <button onClick={() => openRun(run)}>View Details</button>
          </div>
        ))}
      </section>

      {selectedRun && (
        <section style={{ marginTop: 24 }}>
          <h2>Run Details: {selectedRun.runId}</h2>
          {selectedRun.files.map((f: any) => (
            <details key={f.file} style={{ marginBottom: 8 }}>
              <summary>{f.file}</summary>
              <pre style={{ whiteSpace: "pre-wrap", background: "#f5f5f5", padding: 12 }}>
                {f.content}
              </pre>
            </details>
          ))}
        </section>
      )}
    </div>
  );
}

export default App;
