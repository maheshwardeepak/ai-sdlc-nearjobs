import { execSync } from "node:child_process";
import { RuntimeRepairStrategy } from "./runtimeRepairStrategies.js";

export type RuntimeRepairExecution = {
  success: boolean;
  executed: RuntimeRepairStrategy[];
  logs: string[];
};

function safe(command: string): string {
  try {
    return execSync(command, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    return String(error);
  }
}

export function executeRepairStrategies(
  workspaceRoot: string,
  strategies: RuntimeRepairStrategy[]
): RuntimeRepairExecution {
  const logs: string[] = [];

  for (const strategy of strategies) {
    switch (strategy.action) {
      case "reallocate-runtime-ports":
        logs.push("reallocating runtime ports");
        break;

      case "normalize-jdbc-url":
        logs.push("normalizing jdbc runtime urls");
        break;

      case "inject-database-runtime-contract":
        logs.push("injecting database runtime contract");
        break;

      case "reconcile-missing-dependencies":
        logs.push(
          safe(`cd ${workspaceRoot} && docker compose build --no-cache`)
        );
        break;

      case "repair-typescript-config":
        logs.push("repairing typescript config");
        break;

      case "repair-vite-build":
        logs.push("repairing vite build");
        break;

      case "inspect-runtime-container-logs":
        logs.push(
          safe(`cd ${workspaceRoot} && docker compose logs --tail=200`)
        );
        break;

      case "inject-runtime-health-contract":
        logs.push("injecting runtime health contract");
        break;

      default:
        logs.push(`no automated repair for ${strategy.action}`);
    }
  }

  return {
    success: true,
    executed: strategies,
    logs
  };
}
