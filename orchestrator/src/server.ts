import express from "express";
import cors from "cors";
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { getAllRuns } from "./server-runs-fix";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();
app.use(cors());
app.use(express.json());

const factoryRoot = path.resolve(__dirname, "../..");

app.post("/api/run", (req, res) => {
  const requirement = req.body.requirement;

  if (!requirement) {
    return res.status(400).json({ error: "requirement is required" });
  }

  const command = `npm run start -- "${requirement.replace(/"/g, '\\"')}"`;

  exec(command, { cwd: path.join(factoryRoot, "orchestrator") }, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({
        error: error.message,
        stderr
      });
    }

    try {
      const jsonStart = stdout.indexOf("{");
      const json = JSON.parse(stdout.slice(jsonStart));
      return res.json(json);
    } catch {
      return res.json({ raw: stdout });
    }
  });
});

app.get("/api/runs", (_req, res) => {
  const runs = getAllRuns(factoryRoot);
  res.json({ runs });
});

app.get("/api/runs/:projectSlug/:runId", (req, res) => {
  const runDir = path.join(
    factoryRoot,
    "artifacts",
    "runs",
    req.params.projectSlug,
    req.params.runId
  );

  if (!fs.existsSync(runDir)) {
    return res.status(404).json({ error: "run not found" });
  }

  const files = fs.readdirSync(runDir).map((file) => ({
    file,
    content: fs.readFileSync(path.join(runDir, file), "utf8")
  }));

  res.json({
    projectSlug: req.params.projectSlug,
    runId: req.params.runId,
    files
  });
});

app.get("/api/delivery-score", (_req, res) => {
  const reportPath = path.join(
    factoryRoot,
    "artifacts",
    "reports",
    "delivery-score-report.json"
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

app.listen(4000, () => {
  console.log("Orchestrator API running on http://localhost:4000");
});