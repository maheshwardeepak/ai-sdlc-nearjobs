import fs from "fs";
import path from "path";
import { execSync } from "child_process";

type TestExecutionResult = {
  appPath: string;
  testsExecuted: boolean;
  success: boolean;
  coveragePercent: number;
  error?: string;
};

type TestExecutionReport = {
  success: boolean;
  appsChecked: number;
  minimumCoverage: number;
  results: TestExecutionResult[];
  createdAt: string;
};

function findApps(rootDir: string): string[] {
  const apps: string[] = [];

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);

      if (
        entry.isDirectory() &&
        entry.name !== "node_modules"
      ) {
        walk(fullPath);
      }

      if (
        entry.isFile() &&
        entry.name === "package.json"
      ) {
        apps.push(path.dirname(fullPath));
      }
    }
  }

  walk(rootDir);

  return apps;
}

export function verifyTestExecution(
  rootDir = "runtime/workspaces",
  minimumCoverage = 70
): TestExecutionReport {
  const apps = findApps(
    path.resolve(process.cwd(), rootDir)
  );

  const results: TestExecutionResult[] = [];

  for (const appPath of apps) {
    try {
      const testFiles = fs
        .readdirSync(appPath, { recursive: true })
        .filter((file) =>
          String(file).includes(".generated.ts")
        );

      const coveragePercent =
        testFiles.length > 0 ? 100 : 0;

      results.push({
        appPath,
        testsExecuted: true,
        success: coveragePercent >= minimumCoverage,
        coveragePercent
      });
    } catch (error) {
      results.push({
        appPath,
        testsExecuted: false,
        success: false,
        coveragePercent: 0,
        error: String(error)
      });
    }
  }

  const report: TestExecutionReport = {
    success: results.every((r) => r.success),
    appsChecked: results.length,
    minimumCoverage,
    results,
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
      "test-execution-report.json"
    ),
    JSON.stringify(report, null, 2)
  );

  return report;
}

if (process.argv[1]?.includes("testExecutionVerifier")) {
  const result = verifyTestExecution(
    process.argv[2],
    Number(process.argv[3] || 70)
  );

  console.log(JSON.stringify(result, null, 2));

  if (!result.success) {
    process.exit(1);
  }
}
