import fs from "fs";
import path from "path";
import { execSync } from "child_process";

type RemediationReport = {
  success: boolean;
  failedChecks: string[];
  actions: {
    check: string;
    action: string;
    priority: string;
  }[];
};

type HealingExecution = {
  check: string;
  executed: boolean;
  success: boolean;
  command?: string;
  error?: string;
};

type SelfHealingReport = {
  success: boolean;
  executions: HealingExecution[];
  createdAt: string;
};

const HEALING_COMMANDS: Record<string, string> = {
  "typecheck":
    "pnpm install && pnpm exec tsc -p orchestrator/tsconfig.json --noEmit",

  "verify-secret-scan":
    "echo 'secret remediation placeholder'",

  "verify-sast":
    "echo 'sast remediation placeholder'",

  "verify-docker-compliance":
    "echo 'docker remediation placeholder'",

  "verify-test-execution":
    "echo 'test remediation placeholder'",

  "verify-sbom-policy":
    "echo 'sbom remediation placeholder'"
};

function readRemediationReport(): RemediationReport {
  return JSON.parse(
    fs.readFileSync(
      path.resolve(
        process.cwd(),
        "artifacts/reports/remediation-plan-report.json"
      ),
      "utf8"
    )
  );
}

export function executeSelfHealing(): SelfHealingReport {
  const remediation = readRemediationReport();

  const executions: HealingExecution[] = [];

  for (const action of remediation.actions || []) {
    const command = HEALING_COMMANDS[action.check];

    if (!command) {
      executions.push({
        check: action.check,
        executed: false,
        success: false,
        error: "no-healing-command-defined"
      });

      continue;
    }

    try {
      execSync(command, {
        stdio: "inherit",
        cwd: process.cwd()
      });

      executions.push({
        check: action.check,
        executed: true,
        success: true,
        command
      });
    } catch (error) {
      executions.push({
        check: action.check,
        executed: true,
        success: false,
        command,
        error: String(error)
      });
    }
  }

  const report: SelfHealingReport = {
    success: executions.every((e) => e.success),
    executions,
    createdAt: new Date().toISOString()
  };

  const reportsDir = path.resolve(
    process.cwd(),
    "artifacts/reports"
  );

  fs.mkdirSync(reportsDir, { recursive: true });

  fs.writeFileSync(
    path.join(
      reportsDir,
      "self-healing-report.json"
    ),
    JSON.stringify(report, null, 2)
  );

  return report;
}

if (process.argv[1]?.includes("selfHealingEngine")) {
  const result = executeSelfHealing();

  console.log(JSON.stringify(result, null, 2));

  if (!result.success) {
    process.exit(1);
  }
}
