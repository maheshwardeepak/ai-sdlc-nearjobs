import { runBuildVerificationGate } from "./buildVerificationGate.js";
import { validateRuntime } from "./runtimeValidator.js";
import { runApiSmokeGate } from "./apiSmokeTestGate.js";
import { runPlaywrightGate } from "./playwrightGate.js";
import { runSecurityGate } from "./securityGate.js";

export async function runProjectVerificationGate(projectName: string) {
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
      build,
      runtime,
      apiSmoke,
      playwright,
      security
    }
  };
}
