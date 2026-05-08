import path from "path";
import { validateRuntime } from "./runtimeValidator.js";
import { collectRuntimeDiagnostics } from "./runtimeDiagnostics.js";
import { classifyRuntimeFailure } from "./repairClassifier.js";
import { applyKnownPatch } from "./knownPatchEngine.js";
import { runTask } from "./taskRuntime.js";

export async function runSelfHealingRuntimeLoop(projectName: string, maxAttempts = 3) {
  const history = [];
  const projectRoot = path.resolve(process.cwd(), "projects", projectName);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const validation = await validateRuntime();

    if (validation.every((check) => check.success)) {
      return {
        success: true,
        attempts: attempt - 1,
        history
      };
    }

    const diagnostics = await collectRuntimeDiagnostics();
    const logText = diagnostics.map((d) => `${d.stdout}\n${d.stderr}`).join("\n");

    const classification = classifyRuntimeFailure(logText);
    const patch = applyKnownPatch(projectName, classification.category);

    history.push({
      attempt,
      validation,
      classification,
      patch
    });

    await runTask({
      id: `self-heal-rebuild-${attempt}`,
      name: `Self Heal Rebuild Attempt ${attempt}`,
      command: "docker",
      args: ["compose", "-f", "infra/docker-compose.yml", "up", "--build", "-d"],
      cwd: projectRoot
    });
  }

  const finalValidation = await validateRuntime();

  return {
    success: finalValidation.every((check) => check.success),
    attempts: maxAttempts,
    finalValidation,
    history
  };
}
