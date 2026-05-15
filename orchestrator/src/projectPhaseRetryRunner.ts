import { runProjectPhase } from "./projectPhaseRunner.js";
import { appendProjectPhaseRunHistory } from "./projectPhaseRunHistory.js";
import { repairPhaseFailure } from "./phaseFailureRepairAgent.js";
import { validateFactoryAfterSelfRepair } from "./factorySelfRepairValidator.js";
import { appendSelfRepairHistory } from "./selfRepairHistory.js";

export type ProjectPhaseRetryResult = {
  success: boolean;
  project: string;
  phaseId: string;
  attempts: Array<Awaited<ReturnType<typeof runProjectPhase>>>;
};

export async function runProjectPhaseWithRetry(
  projectName: string,
  phaseId: string,
  maxAttempts = 3
): Promise<ProjectPhaseRetryResult> {
  const attempts: Array<Awaited<ReturnType<typeof runProjectPhase>>> = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await runProjectPhase(projectName, phaseId);
    attempts.push(result);

    if (result.success) {
      appendProjectPhaseRunHistory({
        project: projectName,
        phaseId,
        success: true,
        attempts: attempts.length,
        createdAt: new Date().toISOString()
      });

      return {
        success: true,
        project: projectName,
        phaseId,
        attempts
      };
    }

    const repair = await repairPhaseFailure({
      projectName,
      phaseId,
      phaseName: result.phaseName,
      workspaceRoot: `runtime/workspaces/${projectName.toLowerCase().replace(/[^a-z0-9]+/g, "")}`,
      failureOutput: result.output
    });

    appendSelfRepairHistory({
      project: projectName,
      phaseId,
      success: repair.success,
      writtenFiles: repair.writtenFiles || [],
      outputFile: repair.outputFile || null,
      createdAt: new Date().toISOString()
    });

    if (repair.success) {
      const validation = validateFactoryAfterSelfRepair();

      if (!validation.success) {
        throw new Error(
          `Factory self-repair validation failed: ${validation.output}`
        );
      }
    }
  }

  appendProjectPhaseRunHistory({
    project: projectName,
    phaseId,
    success: false,
    attempts: attempts.length,
    createdAt: new Date().toISOString()
  });

  return {
    success: false,
    project: projectName,
    phaseId,
    attempts
  };
}
