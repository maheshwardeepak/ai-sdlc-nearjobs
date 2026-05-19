import fs from "node:fs";
import path from "node:path";
import { executeOpenClawTask } from "./openclawAdapter.js";
import { extractPhaseArtifacts } from "./phaseArtifactExtractor.js";
import { writePhaseArtifacts } from "./phaseArtifactWriter.js";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

export async function repairPhaseFailure(input: {
  projectName: string;
  phaseId: string;
  phaseName: string;
  workspaceRoot: string;
  failureOutput: string;
}) {
  const runDir = path.resolve(
    process.cwd(),
    "artifacts/autonomous-runs",
    slugify(input.projectName)
  );

  const aiPlanPath = path.join(runDir, "ai-project-plan.json");
  const phaseMemoryPath = path.join(runDir, "phase-memory.json");
  const syncMemoryPath = path.join(runDir, "project-sync-memory.json");

  const result = await executeOpenClawTask({
    workerId: `phase-repair-${slugify(input.projectName)}-${input.phaseId}-${Date.now()}`,
    workspacePath: runDir,
    prompt: [
      "You are an autonomous QA and repair agent.",
      "",
      "Your job is to fix the failure without human intervention.",
      "",
      `Project: ${input.projectName}`,
      `Phase ID: ${input.phaseId}`,
      `Phase Name: ${input.phaseName}`,
      "",
      "Failure output:",
      input.failureOutput,
      "",
      "AI project plan:",
      fs.existsSync(aiPlanPath) ? fs.readFileSync(aiPlanPath, "utf8") : "",
      "",
      "Phase memory:",
      fs.existsSync(phaseMemoryPath) ? fs.readFileSync(phaseMemoryPath, "utf8") : "",
      "",
      "Project sync memory:",
      fs.existsSync(syncMemoryPath) ? fs.readFileSync(syncMemoryPath, "utf8") : "",
      "",
      "Return concrete file artifacts only using fenced blocks:",
      "```file:relative/path/to/file",
      "content",
      "```",
      "",
      "Rules:",
      "- Fix the root cause.",
      "- Do not describe only.",
      "- Do not ask for human help.",
      "- Keep generated code buildable.",
      "- Preserve existing working functionality.",
      "- If the issue is an orchestrator bug, return orchestrator/src/... files.",
      "- If the issue is app code, return runtime workspace files relative to the workspace root."
    ].join("\n")
  });

  if (!result.success || !result.stdout) {
    return {
      success: false,
      reason: "repair-agent-failed",
      outputFile: result.outputFile,
      stdout: result.stdout,
      stderr: result.stderr
    };
  }

  const artifacts = extractPhaseArtifacts(result.stdout);

  if (artifacts.length === 0) {
    return {
      success: false,
      reason: "repair-agent-produced-no-artifacts",
      outputFile: result.outputFile,
      stdout: result.stdout,
      stderr: result.stderr
    };
  }

  const normalizedArtifacts = artifacts.map((artifact) => {
    let normalizedPath = artifact.path
      .replace(/^\/Users\/[^/]+\/ai-sdlc-factory\//, "")
      .replace(/^backend\//, "backend/")
      .replace(/^frontend\//, "frontend/");

    return {
      ...artifact,
      path: normalizedPath
    };
  });

  const orchestratorArtifacts = normalizedArtifacts.filter((artifact) =>
    artifact.path.startsWith("orchestrator/")
  );

  const appArtifacts = normalizedArtifacts.filter((artifact) =>
    !artifact.path.startsWith("orchestrator/")
  );

  const orchestratorWrite = writePhaseArtifacts(
    process.cwd(),
    orchestratorArtifacts
  );

  const appWrite = writePhaseArtifacts(
    input.workspaceRoot,
    appArtifacts
  );

  return {
    success: orchestratorWrite.success && appWrite.success,
    outputFile: result.outputFile,
    writtenFiles: [
      ...orchestratorWrite.writtenFiles,
      ...appWrite.writtenFiles
    ],
    stdout: result.stdout,
    stderr: result.stderr
  };
}
