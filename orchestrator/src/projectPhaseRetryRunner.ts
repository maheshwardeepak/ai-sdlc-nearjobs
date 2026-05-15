import { runProjectPhase } from "./projectPhaseRunner.js";
import { appendProjectPhaseRunHistory } from "./projectPhaseRunHistory.js";

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
