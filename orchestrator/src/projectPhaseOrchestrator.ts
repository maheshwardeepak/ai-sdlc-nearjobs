
function isPlanningApproved(projectName: string): boolean {
  const approvalPath = path.resolve(
    process.cwd(),
    "artifacts/autonomous-runs",
    projectName.toLowerCase().replace(/[^a-z0-9]+/g, ""),
    "approval.json"
  );

  if (!fs.existsSync(approvalPath)) {
    return false;
  }

  const approval = JSON.parse(fs.readFileSync(approvalPath, "utf8"));
  return approval.approved === true;
}

import fs from "node:fs";
import path from "node:path";
import { loadProjectPhaseDag } from "./projectPhaseDag.js";
import { runProjectPhaseWithRetry } from "./projectPhaseRetryRunner.js";

export type ProjectPhaseOrchestrationResult = {
  success: boolean;
  project: string;
  results: Array<Awaited<ReturnType<typeof runProjectPhaseWithRetry>>>;
};

export async function runAllProjectPhases(
  projectName: string
): Promise<ProjectPhaseOrchestrationResult> {
  const dag = loadProjectPhaseDag(projectName);
  const results: Array<Awaited<ReturnType<typeof runProjectPhaseWithRetry>>> = [];

  for (const node of dag.nodes) {
    if (node.requiresHumanApproval) {
      continue;
    }

    if (node.status === "PASSED") {
      continue;
    }

    const result = await runProjectPhaseWithRetry(projectName, node.id);
    results.push(result);

    if (!result.success) {
      return {
        success: false,
        project: projectName,
        results
      };
    }
  }

  return {
    success: true,
    project: projectName,
    results
  };
}
