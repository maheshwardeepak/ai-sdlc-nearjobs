import fs from "fs";
import path from "path";

export type TestCoverageResult = {
  success: boolean;
  appsChecked: number;
  results: {
    appPath: string;
    testsPresent: boolean;
    testFiles: string[];
    violations: string[];
  }[];
  createdAt: string;
};

function findApps(rootDir: string): string[] {
  const apps: string[] = [];

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && entry.name !== "node_modules") {
        walk(fullPath);
      }

      if (entry.isFile() && entry.name === "package.json") {
        apps.push(path.dirname(fullPath));
      }
    }
  }

  walk(rootDir);
  return apps;
}

function collectTestFiles(appPath: string): string[] {
  const testFiles: string[] = [];

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && entry.name !== "node_modules") {
        walk(fullPath);
        continue;
      }

      if (
        entry.isFile() &&
        (
          entry.name.endsWith(".test.ts") ||
          entry.name.endsWith(".spec.ts") ||
          entry.name.includes("generated.ts")
        )
      ) {
        testFiles.push(fullPath);
      }
    }
  }

  walk(appPath);
  return testFiles;
}

export function verifyTestCoverage(rootDir = "runtime/workspaces") {
  const apps = findApps(path.resolve(process.cwd(), rootDir));

  const results: TestCoverageResult["results"] = apps.map((appPath) => {
    const testFiles = collectTestFiles(appPath);
    const violations: string[] = [];

    if (testFiles.length === 0) {
      violations.push("missing-tests");
    }

    return {
      appPath,
      testsPresent: testFiles.length > 0,
      testFiles,
      violations
    };
  });

  const report: TestCoverageResult = {
    success: results.every((item) => item.violations.length === 0),
    appsChecked: results.length,
    results,
    createdAt: new Date().toISOString()
  };

  const reportsDir = path.resolve(process.cwd(), "artifacts/reports");
  fs.mkdirSync(reportsDir, { recursive: true });

  fs.writeFileSync(
    path.join(reportsDir, "test-coverage-report.json"),
    JSON.stringify(report, null, 2)
  );

  return report;
}

if (process.argv[1]?.includes("testCoverageVerifier")) {
  const result = verifyTestCoverage(process.argv[2]);

  console.log(JSON.stringify(result, null, 2));

  if (!result.success) {
    process.exit(1);
  }
}
