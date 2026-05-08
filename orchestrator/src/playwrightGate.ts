import path from "path";
import { runTask } from "./taskRuntime.js";

export async function runPlaywrightGate(projectName: string) {
  const root = path.resolve(process.cwd(), "projects", projectName, "frontend");

  const result = await runTask({
    id: "playwright-e2e-gate",
    name: "Playwright E2E Gate",
    command: "npm",
    args: ["run", "e2e"],
    cwd: root
  });

  return {
    success: result.success,
    result
  };
}
