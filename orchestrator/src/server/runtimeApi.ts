import express from "express";
import {
  initRuntimeDb,
  listFactoryExecutions,
  listAgentRuns,
  listVerificationRuns
} from "../db/runtimeDb.js";

const app = express();
const port = Number(process.env.RUNTIME_API_PORT || 4100);

app.use(express.json());

app.get("/health", async (_req, res) => {
  res.json({
    success: true,
    service: "ai-sdlc-runtime-api"
  });
});

app.get("/executions", async (_req, res) => {
  const rows = await listFactoryExecutions(50);
  res.json({ success: true, executions: rows });
});

app.get("/agents", async (_req, res) => {
  const rows = await listAgentRuns(100);
  res.json({ success: true, agentRuns: rows });
});

app.get("/verifications", async (_req, res) => {
  const rows = await listVerificationRuns(100);
  res.json({ success: true, verificationRuns: rows });
});

export async function startRuntimeApi() {
  await initRuntimeDb();

  app.listen(port, () => {
    console.log(JSON.stringify({
      success: true,
      service: "ai-sdlc-runtime-api",
      port
    }, null, 2));
  });
}

if (process.argv[1]?.includes("runtimeApi")) {
  startRuntimeApi().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
