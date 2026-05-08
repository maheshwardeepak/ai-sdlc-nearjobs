import { runBuildVerificationGate } from "./buildVerificationGate.js";
import { runCleanRebuildGate } from "./cleanRebuildGate.js";
import { validateRuntime } from "./runtimeValidator.js";
import { runApiSmokeGate } from "./apiSmokeTestGate.js";
import { runPlaywrightGate } from "./playwrightGate.js";
import { runSecurityGate } from "./securityGate.js";

export async function runProjectVerificationGate(projectName: string) {
  const cleanRebuild = await runCleanRebuildGate(projectName);

  if (!cleanRebuild.success) {
    return {
      projectName,
      success: false,
      gates: {
        cleanRebuild,
        build: { success: false, skipped: true },
        runtime: [],
        apiSmoke: { success: false, skipped: true },
        playwright: { success: false, skipped: true },
        security: { success: false, skipped: true }
      }
    };
  }

  const build = await runBuildVerificationGate(projectName);
  const runtime = await validateRuntime();
  const apiSmoke = await runApiSmokeGate();
  const playwright = await runPlaywrightGate(projectName);
  const security = await runSecurityGate(projectName);

  return {
    projectName,
    success:
      build.success &&
      runtime.every((r) => r.success) &&
      apiSmoke.success &&
      playwright.success &&
      security.success,
    gates: {
      cleanRebuild,
      build,
      runtime,
      apiSmoke,
      playwright,
      security
    }
  };
}
