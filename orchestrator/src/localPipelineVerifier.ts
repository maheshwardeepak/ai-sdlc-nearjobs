import fs from "fs";
import path from "path";
import { execSync } from "child_process";

type LocalPipelineStep = {
  step: string;
  success: boolean;
  error?: string;
};

type LocalPipelineReport = {
  success: boolean;
  steps: LocalPipelineStep[];
  createdAt: string;
};

const STEPS = [
  "pnpm exec tsc -p orchestrator/tsconfig.json --noEmit",
  "pnpm exec tsx orchestrator/src/factoryCli.ts verify-factory-full",
  "pnpm exec tsx orchestrator/src/factoryCli.ts delivery-score",
  "pnpm exec tsx orchestrator/src/factoryCli.ts regression-analysis",
  "pnpm exec tsx orchestrator/src/factoryCli.ts release-gate"
];

export function verifyLocalPipeline(): LocalPipelineReport {
  const steps: LocalPipelineStep[] = [];

  for (const command of STEPS) {
    try {
      execSync(command, {
        cwd: process.cwd(),
        stdio: "inherit"
      });

      steps.push({
        step: command,
        success: true
      });
    } catch (error) {
      steps.push({
        step: command,
        success: false,
        error: String(error)
      });

      break;
    }
  }

  const report: LocalPipelineReport = {
    success: steps.every((s) => s.success) && steps.length === STEPS.length,
    steps,
    createdAt: new Date().toISOString()
  };

  const reportsDir = path.resolve(process.cwd(), "artifacts/reports");
  fs.mkdirSync(reportsDir, { recursive: true });

  fs.writeFileSync(
    path.join(reportsDir, "local-pipeline-report.json"),
    JSON.stringify(report, null, 2)
  );

  return report;
}

if (process.argv[1]?.includes("localPipelineVerifier")) {
  const result = verifyLocalPipeline();

  console.log(JSON.stringify(result, null, 2));

  if (!result.success) {
    process.exit(1);
  }
}
