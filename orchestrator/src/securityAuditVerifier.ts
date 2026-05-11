import fs from "fs";
import path from "path";
import { execa } from "execa";

export type SecurityAuditResult = {
  success: boolean;
  appsChecked: number;
  results: {
    appPath: string;
    auditSuccess: boolean;
    error?: string;
  }[];
  createdAt: string;
};

function findNodeApps(rootDir: string): string[] {
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

export async function verifySecurityAudit(rootDir = "runtime/workspaces") {
  const apps = findNodeApps(path.resolve(process.cwd(), rootDir));

  const results: SecurityAuditResult["results"] = [];

  for (const appPath of apps) {
    const result = {
      appPath,
      auditSuccess: false,
      error: undefined as string | undefined
    };

    try {
      await execa("npm", ["audit", "--audit-level", "high"], {
        cwd: appPath,
        stdio: "pipe"
      });

      result.auditSuccess = true;
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
    }

    results.push(result);
  }

  const report: SecurityAuditResult = {
    success: results.every((item) => item.auditSuccess),
    appsChecked: results.length,
    results,
    createdAt: new Date().toISOString()
  };

  const reportsDir = path.resolve(process.cwd(), "artifacts/reports");
  fs.mkdirSync(reportsDir, { recursive: true });

  fs.writeFileSync(
    path.join(reportsDir, "security-audit-report.json"),
    JSON.stringify(report, null, 2)
  );

  return report;
}

if (process.argv[1]?.includes("securityAuditVerifier")) {
  verifySecurityAudit(process.argv[2])
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      if (!result.success) process.exit(1);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
