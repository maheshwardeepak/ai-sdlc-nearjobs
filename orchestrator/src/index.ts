import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { detectMode } from "./modeDetector";
import { getPipeline, getStepInstruction } from "./pipelines";
import { runAgent } from "./agentRunner";
import { bootstrapProject } from "./projectBootstrap";
import { buildDefaultNewProjectGraph } from "./taskGraph";
import { runQualityGate } from "./qualityRunner";
import { runProductionChecks } from "./productionChecks";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const args = process.argv.slice(2);
const force = args.includes("--force");
const requirement = args.filter((a) => a !== "--force").join(" ");

if (!requirement) {
  console.error('Usage: npm run start -- "your requirement here"');
  process.exit(1);
}

function readJsonSafe(filePath: string, fallback: any) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function extractJson(text: string): any | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function qaPassed(output: string): boolean {
  const json = extractJson(output);
  const lower = output.toLowerCase();

  if (
    lower.includes("placeholder only") ||
    lower.includes("only .gitkeep") ||
    lower.includes("only package-info") ||
    lower.includes("not implemented") ||
    lower.includes("no actual implementation") ||
    lower.includes("human_review_required")
  ) {
    return false;
  }

  if (json?.status) {
    return String(json.status).toLowerCase() === "passed";
  }

  return (
    lower.includes("build success") ||
    lower.includes("tests run") ||
    lower.includes("1 passed") ||
    lower.includes('"status": "passed"') ||
    lower.includes('"status":"passed"')
  );
}

function appendRunIndex(memoryPath: string, entry: any) {
  const indexPath = path.join(memoryPath, "RUN_INDEX.json");
  const data = readJsonSafe(indexPath, { runs: [] });

  data.runs.unshift(entry);

  fs.writeFileSync(indexPath, JSON.stringify(data, null, 2), "utf8");
}

function findDuplicate(memoryPath: string, requirement: string) {
  const indexPath = path.join(memoryPath, "RUN_INDEX.json");
  const data = readJsonSafe(indexPath, { runs: [] });

  return data.runs.find(
    (r: any) =>
      r.requirement === requirement &&
      ["completed", "completed_after_fix", "production_ready"].includes(r.status)
  );
}

async function main() {
  const mode = detectMode(requirement);
  const factoryRoot = path.resolve(__dirname, "../..");

  const project = bootstrapProject(requirement, factoryRoot);

  const duplicate = findDuplicate(project.memoryPath, requirement);

  if (duplicate && !force) {
    console.log(
      JSON.stringify(
        {
          status: "duplicate_detected",
          message: "This requirement already completed. Use --force to rerun.",
          duplicateRun: duplicate
        },
        null,
        2
      )
    );
    return;
  }

  const runId = randomUUID();
  const runDir = path.join(project.runRoot, runId);

  fs.mkdirSync(runDir, { recursive: true });

  const pipeline = getPipeline(mode, project.workerAgentName);
  const taskGraph = mode === "new_project"
    ? buildDefaultNewProjectGraph(project.workerAgentName)
    : [];

  fs.writeFileSync(path.join(runDir, "00_user_requirement.txt"), requirement, "utf8");
  fs.writeFileSync(path.join(runDir, "00_bootstrap.json"), JSON.stringify(project, null, 2), "utf8");
  fs.writeFileSync(path.join(runDir, "task_graph.json"), JSON.stringify(taskGraph, null, 2), "utf8");

  fs.writeFileSync(
    path.join(runDir, "mode.json"),
    JSON.stringify({ mode, pipeline, project }, null, 2),
    "utf8"
  );

  let currentInput = [
    `PROJECT NAME: ${project.projectName}`,
    `PROJECT SLUG: ${project.projectSlug}`,
    `PROJECT PATH: ${project.projectPath}`,
    `MEMORY PATH: ${project.memoryPath}`,
    `WORKER AGENT: ${project.workerAgentName}`,
    "",
    requirement
  ].join("\n");

  let finalStatus = "completed";

  for (let i = 0; i < pipeline.length; i++) {
    const agentName = pipeline[i];

    if (!agentName) {
      throw new Error(`Missing agent for pipeline step ${i + 1}`);
    }

    const step = i + 1;
    const stepInstruction = getStepInstruction(mode, agentName, step);

    const output = await runAgent({
      agentName,
      input: [
        stepInstruction ? `STEP INSTRUCTION:\n${stepInstruction}` : "",
        "",
        currentInput
      ].join("\n"),
      runDir,
      step
    });

    currentInput = output;

    if (agentName === "qa-agent") {
      const agentQaPassed = qaPassed(output);
      const realQa = runQualityGate(project.projectPath, runDir);

      const passed = agentQaPassed && realQa.passed;

      fs.writeFileSync(
        path.join(runDir, `qa_gate_${step}.json`),
        JSON.stringify(
          {
            agent: agentName,
            agentQaPassed,
            realQaPassed: realQa.passed,
            passed,
            action: passed ? "continue" : "fix_required"
          },
          null,
          2
        ),
        "utf8"
      );

      if (!passed && step >= pipeline.length - 3) {
        finalStatus = "human_review_required";
      }
    }
  }

  const finalQaPath = path.join(runDir, "real_quality_gate.json");
  const finalQa = readJsonSafe(finalQaPath, { passed: false });
  const productionChecks = runProductionChecks(project.projectPath, runDir);

  if (finalQa.passed && productionChecks.passed) {
    finalStatus = "production_ready";
  } else if (finalStatus === "completed") {
    finalStatus = "qa_failed";
  }

  const runEntry = {
    runId,
    mode,
    requirement,
    runDir,
    status: finalStatus,
    createdAt: new Date().toISOString(),
    projectSlug: project.projectSlug,
    projectPath: project.projectPath
  };

  appendRunIndex(project.memoryPath, runEntry);

  console.log(
    JSON.stringify(
      {
        runId,
        mode,
        project,
        runDir,
        status: finalStatus,
        qualityGate: finalQa,
        productionChecks
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});