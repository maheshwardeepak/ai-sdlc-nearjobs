import express from "express";
import fs from "fs";
import path from "path";
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

  app.get("/delivery-score", async (_req, res) => {
  const reportPath = path.resolve(
    process.cwd(),
    "artifacts/reports/delivery-score-report.json"
  );

  if (!fs.existsSync(reportPath)) {
    return res.status(404).json({
      success: false,
      error: "delivery-score-report-not-found"
    });
  }

  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  res.json(report);
});

app.get("/delivery-score/history", async (_req, res) => {
  const historyPath = path.resolve(
    process.cwd(),
    "artifacts/reports/delivery-score-history.json"
  );

  if (!fs.existsSync(historyPath)) {
    return res.json({
      success: true,
      history: []
    });
  }

  const history = JSON.parse(fs.readFileSync(historyPath, "utf8"));
  res.json({
    success: true,
    history
  });
});

app.get("/agent-performance", async (_req, res) => {
  const reportPath = path.resolve(
    process.cwd(),
    "artifacts/reports/agent-performance-report.json"
  );

  if (!fs.existsSync(reportPath)) {
    return res.status(404).json({
      success: false,
      error: "agent-performance-report-not-found"
    });
  }

  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  res.json(report);
});

app.get("/regression-analysis", async (_req, res) => {
  const reportPath = path.resolve(
    process.cwd(),
    "artifacts/reports/regression-analysis-report.json"
  );

  if (!fs.existsSync(reportPath)) {
    return res.status(404).json({
      success: false,
      error: "regression-analysis-report-not-found"
    });
  }

  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  res.json(report);
});

app.get("/technology-stack", async (_req, res) => {
  const reportPath = path.resolve(
    process.cwd(),
    "artifacts/reports/technology-stack-contract.json"
  );

  if (!fs.existsSync(reportPath)) {
    return res.status(404).json({
      success: false,
      error: "technology-stack-contract-not-found"
    });
  }

  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  res.json({
    success: true,
    contract: report
  });
});

function readReport(reportFile: string) {
  const reportPath = path.resolve(
    process.cwd(),
    "artifacts/reports",
    reportFile
  );

  if (!fs.existsSync(reportPath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(reportPath, "utf8"));
}

app.get("/policy-compliance", async (_req, res) => {
  const report = readReport("policy-compliance-report.json");

  if (!report) {
    return res.status(404).json({ success: false, error: "policy-compliance-report-not-found" });
  }

  res.json(report);
});

app.get("/security-audit", async (_req, res) => {
  const report = readReport("security-audit-report.json");

  if (!report) {
    return res.status(404).json({ success: false, error: "security-audit-report-not-found" });
  }

  res.json(report);
});

app.get("/secret-scan", async (_req, res) => {
  const report = readReport("secret-scan-report.json");

  if (!report) {
    return res.status(404).json({ success: false, error: "secret-scan-report-not-found" });
  }

  res.json(report);
});

app.get("/docker-compliance", async (_req, res) => {
  const report = readReport("docker-compliance-report.json");

  if (!report) {
    return res.status(404).json({ success: false, error: "docker-compliance-report-not-found" });
  }

  res.json(report);
});

app.get("/test-coverage", async (_req, res) => {
  const report = readReport("test-coverage-report.json");

  if (!report) {
    return res.status(404).json({ success: false, error: "test-coverage-report-not-found" });
  }

  res.json(report);
});

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
