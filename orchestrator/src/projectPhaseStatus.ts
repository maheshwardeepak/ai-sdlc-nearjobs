import fs from "node:fs";
import path from "node:path";
import { loadProjectPhaseMemory } from "./projectPhaseMemory.js";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

export function getProjectPhaseStatus(projectName: string) {
  const projectSlug = slugify(projectName);
  const runDir = path.resolve(
    process.cwd(),
    "artifacts/autonomous-runs",
    projectSlug
  );

  const dagPath = path.join(runDir, "project-phase-dag.json");
  const approvalPath = path.join(runDir, "approval.json");

  if (!fs.existsSync(approvalPath)) {
    return {
      success: false,
      project: projectName,
      status: "PLAN_NOT_CREATED",
      message: "Create and review the project plan first."
    };
  }

  const approval = JSON.parse(fs.readFileSync(approvalPath, "utf8"));

  if (!approval.approved) {
    return {
      success: false,
      project: projectName,
      status: "WAITING_FOR_PLAN_APPROVAL",
      message: "Project plan is not approved. Phase DAG cannot run yet.",
      approval
    };
  }

  if (!fs.existsSync(dagPath)) {
    return {
      success: false,
      project: projectName,
      status: "DAG_NOT_CREATED",
      message: "Project plan is approved, but phase DAG has not been created yet.",
      nextCommand: `pnpm exec tsx orchestrator/src/factoryCli.ts create-project-phase-dag ${projectName}`
    };
  }

  const dag = JSON.parse(fs.readFileSync(dagPath, "utf8"));
  const memory = loadProjectPhaseMemory(projectName);
  const runnableNodes = dag.nodes.filter((node: any) => node.autonomous !== false);

  const nextPhase = runnableNodes.find((node: any) => {
    if (node.status === "PASSED") return false;
    if (node.requiresHumanApproval) return false;

    return node.dependsOn.every((dependencyId: string) => {
      if (
        dependencyId === "planning-approval" &&
        approval.approved === true
      ) {
        return true;
      }

      const dependency = dag.nodes.find((item: any) => item.id === dependencyId);
      return dependency?.status === "PASSED";
    });
  });

  return {
    success: true,
    project: projectName,
    status: runnableNodes.every((node: any) => node.status === "PASSED")
      ? "COMPLETE"
      : "READY_OR_RUNNING",
    totalPhases: runnableNodes.length,
    passed: runnableNodes.filter((node: any) => node.status === "PASSED").length,
    failed: runnableNodes.filter((node: any) => node.status === "FAILED").length,
    pending: runnableNodes.filter((node: any) => node.status === "PENDING").length,
    running: runnableNodes.filter((node: any) => node.status === "RUNNING").length,
    nextPhase: nextPhase || null,
    memoryEntries: memory.length
  };
}
