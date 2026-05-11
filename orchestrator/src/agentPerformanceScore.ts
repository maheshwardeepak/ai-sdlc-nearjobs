import fs from "fs";
import path from "path";
import { runtimeDb } from "./db/runtimeDb.js";

type AgentPerformance = {
  agent: string;
  runs: number;
  successes: number;
  failures: number;
  score: number;
};

export async function createAgentPerformanceReport() {
  const result = await runtimeDb.query<{
    agent: string;
    runs: string;
    successes: string;
  }>(`
    SELECT
      agent,
      COUNT(*)::text AS runs,
      COUNT(*) FILTER (WHERE status = 'SUCCESS')::text AS successes
    FROM agent_runs
    GROUP BY agent
    ORDER BY agent ASC
  `);

  const agents: Record<string, AgentPerformance> = {};

  for (const row of result.rows) {
    const runs = Number(row.runs);
    const successes = Number(row.successes);
    const failures = runs - successes;

    agents[row.agent] = {
      agent: row.agent,
      runs,
      successes,
      failures,
      score: runs === 0 ? 0 : Math.round((successes / runs) * 100)
    };
  }

  const report = {
    success: true,
    agents,
    createdAt: new Date().toISOString()
  };

  const reportsDir = path.resolve(process.cwd(), "artifacts/reports");
  fs.mkdirSync(reportsDir, { recursive: true });

  fs.writeFileSync(
    path.join(reportsDir, "agent-performance-report.json"),
    JSON.stringify(report, null, 2)
  );

  return report;
}

if (process.argv[1]?.includes("agentPerformanceScore")) {
  createAgentPerformanceReport()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
