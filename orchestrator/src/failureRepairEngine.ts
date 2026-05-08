import fs from "fs";
import path from "path";
import { runProjectVerificationGate } from "./projectVerificationGate.js";
import { collectRuntimeDiagnostics } from "./runtimeDiagnostics.js";
import { classifyRuntimeFailure } from "./repairClassifier.js";
import { applyKnownPatch } from "./knownPatchEngine.js";
import { runCleanRebuildGate } from "./cleanRebuildGate.js";
import { saveRepairMemory, findSuccessfulRepair } from "./repairMemory.js";

export async function runAutonomousFailureRepair(projectName: string, maxAttempts = 3) {
  const history = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const cleanRebuild = await runCleanRebuildGate(projectName);

    if (cleanRebuild.success) {
      const verification = await runProjectVerificationGate(projectName);

      if (verification.success) {
        return {
          success: true,
          projectName,
          repaired: attempt > 1,
          attempts: attempt - 1,
          history
        };
      }
    }

    const verification = {
      success: false,
      cleanRebuild
    };

    const diagnostics = await collectRuntimeDiagnostics();

    const taskLogs = fs.existsSync(path.resolve(process.cwd(), "runtime/tasks"))
      ? fs
          .readdirSync(path.resolve(process.cwd(), "runtime/tasks"))
          .filter((f) => f.endsWith(".log"))
          .map((f) => {
            const full = path.resolve(process.cwd(), "runtime/tasks", f);
            return `\n===== ${f} =====\n${fs.readFileSync(full, "utf8")}`;
          })
          .join("\n")
      : "";

    const logText = [
      JSON.stringify(verification, null, 2),
      ...diagnostics.map((d) => `${d.stdout}\n${d.stderr}`),
      taskLogs
    ].join("\n");

    const classification = classifyRuntimeFailure(logText);

    const learnedRepair = findSuccessfulRepair(
      classification.category
    );


    const patch = applyKnownPatch(projectName, classification.category);

    history.push({
      attempt,
      classification,
      patch,
      verificationSuccess: verification.success
    });

    saveRepairMemory({
      category: classification.category,
      repair: classification.recommendedAction,
      success: patch.patched,
      timestamp: new Date().toISOString()
    });
  }

  const finalVerification = await runProjectVerificationGate(projectName);

  return {
    success: finalVerification.success,
    projectName,
    repaired: finalVerification.success,
    attempts: maxAttempts,
    finalVerification,
    history
  };
}
