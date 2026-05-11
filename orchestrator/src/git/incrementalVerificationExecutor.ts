import fs from "fs";
import path from "path";
import { runTask } from "../taskRuntime.js";
import { createIncrementalVerificationPlan } from "./incrementalVerificationPlanner.js";

export type VerificationExecutionResult = {
  success: boolean;
  plan: Awaited<ReturnType<typeof createIncrementalVerificationPlan>>;
  results: {
    check: string;
    success: boolean;
    logFile: string;
  }[];
};

function commandForCheck(check: string): { command: string; args: string[] } | null {
  switch (check) {
    case "typecheck":
    case "orchestrator-tsc":
      return {
        command: "pnpm",
        args: ["exec", "tsc", "-p", "orchestrator/tsconfig.json", "--noEmit"]
      };

    case "infra-preflight":
      return {
        command: "pnpm",
        args: ["exec", "tsx", "orchestrator/src/factoryCli.ts", "infra-preflight"]
      };

    case "autonomous-health-gate":
      return {
        command: "pnpm",
        args: ["exec", "tsx", "orchestrator/src/factoryCli.ts", "autonomous-health-gate"]
      };

    case "dashboard-build":
      return {
        command: "pnpm",
        args: ["--dir", "dashboard", "build"]
      };

    case "dependency-audit":
      return {
        command: "pnpm",
        args: ["audit", "--audit-level", "high"]
      };

    case "generated-crud-verification":
      return {
        command: "pnpm",
        args: [
          "exec",
          "tsx",
          "orchestrator/src/factoryCli.ts",
          "verify-generated-crud",
          "runtime/workspaces/crudbackendgenerationtest"
        ]
      };

    case "ci-workflow-validation":
      return {
        command: "pnpm",
        args: ["exec", "tsx", "orchestrator/src/factoryCli.ts", "verification-plan"]
      };

    default:
      return null;
  }
}

export async function executeIncrementalVerification(
  baseBranch = "main"
): Promise<VerificationExecutionResult> {
  const plan = await createIncrementalVerificationPlan(baseBranch);

  const results: VerificationExecutionResult["results"] = [];

  for (const check of plan.checks) {
    const command = commandForCheck(check);

    if (!command) {
      results.push({
        check,
        success: true,
        logFile: "skipped-no-command"
      });
      continue;
    }

    const result = await runTask({
      id: `verification-${check}`,
      name: `Verification ${check}`,
      cwd: process.cwd(),
      command: command.command,
      args: command.args
    });

    results.push({
      check,
      success: result.success,
      logFile: result.logFile
    });
  }

  const output = {
    success: results.every((result) => result.success),
    plan,
    results
  };

  const reportsDir = path.resolve(process.cwd(), "artifacts/reports");
  fs.mkdirSync(reportsDir, { recursive: true });

  fs.writeFileSync(
    path.join(reportsDir, "verification-plan.json"),
    JSON.stringify(plan, null, 2)
  );

  fs.writeFileSync(
    path.join(reportsDir, "verification-result.json"),
    JSON.stringify(output, null, 2)
  );

  return output;
}

if (process.argv[1]?.includes("incrementalVerificationExecutor")) {
  executeIncrementalVerification()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      if (!result.success) process.exit(1);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
