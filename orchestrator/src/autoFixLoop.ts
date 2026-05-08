import { validateRuntime } from "./runtimeValidator.js";
import { regenerateInvalidArtifacts } from "./regenerationEngine.js";

export async function runAutoFixLoop(projectName: string, maxAttempts = 3) {
  const history = [];

  for (let i = 0; i < maxAttempts; i++) {
    const runtime = await validateRuntime();
    const failed = runtime.filter((r) => !r.success);

    history.push({
      iteration: i + 1,
      runtime
    });

    if (failed.length === 0) {
      return { success: true, history };
    }

    await regenerateInvalidArtifacts(projectName);
  }

  return { success: false, history };
}
