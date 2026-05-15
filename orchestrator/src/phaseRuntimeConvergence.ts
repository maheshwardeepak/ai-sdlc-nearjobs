import { generateStackInfraForWorkspace } from "./stackInfraGenerator.js";
import { runSelfHealingRuntimeLoop } from "./selfHealingRuntimeLoop.js";

export async function runPhaseRuntimeConvergence(input: {
  projectName: string;
  phaseId: string;
  workspaceRoot: string;
}) {
  const isRuntimePhase =
    input.phaseId.includes("runtime") ||
    input.phaseId.includes("deployment") ||
    input.phaseId.includes("packaging");

  if (!isRuntimePhase) {
    return {
      success: true,
      skipped: true,
      reason: "Not a runtime/deployment phase."
    };
  }

  const infra = await generateStackInfraForWorkspace(input.workspaceRoot);
  const runtime = await runSelfHealingRuntimeLoop(
    input.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "")
  );

  return {
    success: infra.success && runtime.success,
    skipped: false,
    infra,
    runtime
  };
}
