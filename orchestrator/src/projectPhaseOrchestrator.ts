
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
import { logPhaseEvent } from "./projectPhaseLogger.js";

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

  logPhaseEvent({
    type: "AUTONOMOUS_PHASE_RUN_START",
    project: projectName,
    message: `Starting autonomous phase run with ${dag.nodes.length} phases`
  });

  for (const node of dag.nodes) {
    if (node.requiresHumanApproval) {
      continue;
    }

    if (node.status === "PASSED") {
      continue;
    }

    logPhaseEvent({
      type: "PHASE_START",
      project: projectName,
      phaseId: node.id,
      phaseName: node.name,
      message: `Running phase ${node.id}`
    });

    const result = await runProjectPhaseWithRetry(projectName, node.id);
    results.push(result);

    logPhaseEvent({
      type: result.success ? "PHASE_PASSED" : "PHASE_FAILED",
      project: projectName,
      phaseId: node.id,
      phaseName: node.name,
      message: result.success
        ? `Phase ${node.id} passed`
        : `Phase ${node.id} failed`,
      data: result
    });

    if (!result.success) {
      return {
        success: false,
        project: projectName,
        results
      };
    }
  }

  logPhaseEvent({
    type: "AUTONOMOUS_PHASE_RUN_COMPLETE",
    project: projectName,
    message: "All runnable phases completed successfully"
  });

  return {
    success: true,
    project: projectName,
    results
  };
}
