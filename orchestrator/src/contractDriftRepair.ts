import fs from "node:fs";
import path from "node:path";
import { executeOpenClawTask } from "./openclawAdapter.js";
import type { ContractDriftResult } from "./contractDriftDetector.js";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

export async function repairContractDrift(input: {
  projectName: string;
  workspaceRoot: string;
  drift: ContractDriftResult;
}) {
  if (input.drift.success) {
    return { success: true, skipped: true, outputFile: null };
  }

  const runDir = path.resolve(
    process.cwd(),
    "artifacts/autonomous-runs",
    slugify(input.projectName)
  );

  const aiPlan = fs.readFileSync(
    path.join(runDir, "ai-project-plan.json"),
    "utf8"
  );

  const result = await executeOpenClawTask({
    workerId: `contract-repair-${slugify(input.projectName)}-${Date.now()}`,
    workspacePath: runDir,
    prompt: [
      "You are an autonomous contract drift repair agent.",
      "",
      `Project: ${input.projectName}`,
      "",
      "AI Project Plan:",
      aiPlan,
      "",
      "Detected Contract Drift:",
      JSON.stringify(input.drift, null, 2),
      "",
      "Generate concrete backend/controller artifacts to implement missing planned APIs.",
      "Return file artifacts using this exact fenced format:",
      "```file:relative/path/to/file",
      "content",
      "```",
      "",
      "Rules:",
      "- Do not remove existing APIs.",
      "- Implement missing APIs safely.",
      "- Use the confirmed project stack.",
      "- Keep code buildable."
    ].join("\n")
  });

  return {
    success: result.success,
    skipped: false,
    outputFile: result.outputFile,
    stdout: result.stdout,
    stderr: result.stderr
  };
}
