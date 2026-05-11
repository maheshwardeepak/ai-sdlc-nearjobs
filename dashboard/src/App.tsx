import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API_BASE = import.meta.env.VITE_RUNTIME_API_URL || "http://localhost:4100";

type Execution = {
  id: number;
  project_name: string | null;
  status: string;
  plan_version: number | null;
  created_at: string;
};

type AgentRun = {
  id: number;
  agent: string;
  role: string | null;
  worker_id: string | null;
  status: string;
  output_file: string | null;
  started_at: string;
};


type DeliveryScore = {
  success: boolean;
  score: number;
  grade: string;
  checks: Record<string, number>;
  createdAt: string;
};


type VerificationRun = {
  id: number;
  check_name: string;
  success: boolean;
  log_file: string | null;
  created_at: string;
};

export default function App() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [agents, setAgents] = useState<AgentRun[]>([]);
  const [verifications, setVerifications] = useState<VerificationRun[]>([]);
  const [apiHealthy, setApiHealthy] = useState(false);
  const [deliveryScore, setDeliveryScore] = useState<DeliveryScore | null>(null);

  async function loadDashboard() {
    const [
      healthRes,
      executionsRes,
      agentsRes,
      verificationsRes,
      deliveryScoreRes
    ] = await Promise.all([
      axios.get(`${API_BASE}/health`),
      axios.get(`${API_BASE}/executions`),
      axios.get(`${API_BASE}/agents`),
      axios.get(`${API_BASE}/verifications`),
      axios.get("http://localhost:4000/api/delivery-score")
    ]);

    setApiHealthy(Boolean(healthRes.data.success));
    setExecutions(executionsRes.data.executions || []);
    setAgents(agentsRes.data.agentRuns || []);
    setVerifications(verificationsRes.data.verificationRuns || []);
    setDeliveryScore(deliveryScoreRes.data);
  }

  useEffect(() => {
    loadDashboard().catch(() => setApiHealthy(false));
  }, []);

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">AI SDLC Factory</p>
          <h1>Runtime Observability Dashboard</h1>
          <p className="subtitle">
            Live PostgreSQL-backed view of executions, agent runs, and verification history.
          </p>
        </div>

        <button onClick={loadDashboard}>Refresh</button>
      </section>

      <section className="cards">
        <div className="card">
          <span>Runtime API</span>
          <strong>{apiHealthy ? "Healthy" : "Unavailable"}</strong>
        </div>
        <div className="card">
          <span>Executions</span>
          <strong>{executions.length}</strong>
        </div>
        <div className="card">
          <span>Agent Runs</span>
          <strong>{agents.length}</strong>
        </div>
        <div className="card">
          <span>Verification Runs</span>
          <strong>{verifications.length}</strong>
        </div>

        <div className="card score-card">
          <span>Delivery Score</span>
          <strong>
            {deliveryScore
              ? `${deliveryScore.score} (${deliveryScore.grade})`
              : "--"}
          </strong>

          <small>
            {deliveryScore?.createdAt
              ? new Date(deliveryScore.createdAt).toLocaleString()
              : ""}
          </small>
        </div>
      </section>

      <section className="panel">
        <h2>Recent Executions</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Project</th>
              <th>Status</th>
              <th>Plan</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {executions.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.project_name || "-"}</td>
                <td>{item.status}</td>
                <td>{item.plan_version ?? "-"}</td>
                <td>{new Date(item.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>Recent Agent Runs</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Agent</th>
              <th>Role</th>
              <th>Status</th>
              <th>Worker</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.agent}</td>
                <td>{item.role || "-"}</td>
                <td>{item.status}</td>
                <td className="mono">{item.worker_id || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>Verification Runs</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Check</th>
              <th>Success</th>
              <th>Log</th>
            </tr>
          </thead>
          <tbody>
            {verifications.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.check_name}</td>
                <td>{item.success ? "Yes" : "No"}</td>
                <td className="mono">{item.log_file || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
