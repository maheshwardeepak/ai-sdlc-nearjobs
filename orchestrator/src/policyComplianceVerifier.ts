import fs from "fs";
import path from "path";
import { validateFactoryPolicy } from "./policyEngine.js";

export type PolicyComplianceResult = {
  success: boolean;
  checks: {
    policyValid: boolean;
    healthEndpointPresent: boolean;
    testsPresent: boolean;
    bannedPackagesAbsent: boolean;
  };
  violations: string[];
  createdAt: string;
};

function findBackendApps(rootDir: string): string[] {
  const apps: string[] = [];

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && entry.name !== "node_modules") {
        walk(fullPath);
      }

      if (
        entry.isFile() &&
        entry.name === "package.json" &&
        fullPath.endsWith(`${path.sep}backend${path.sep}package.json`)
      ) {
        apps.push(path.dirname(fullPath));
      }
    }
  }

  walk(rootDir);
  return apps;
}

export function verifyPolicyCompliance(rootDir = "runtime/workspaces") {
  const policyValidation = validateFactoryPolicy();
  const violations: string[] = [];

  if (!policyValidation.success || !policyValidation.policy) {
    violations.push(policyValidation.error || "factory-policy-invalid");
  }

  const policy = policyValidation.policy;
  const apps = findBackendApps(path.resolve(process.cwd(), rootDir));

  let healthEndpointPresent = true;
  let testsPresent = true;
  let bannedPackagesAbsent = true;

  for (const appPath of apps) {
    const serverFile = path.join(appPath, "src/server.ts");
    const testsDir = path.join(appPath, "tests");
    const packageFile = path.join(appPath, "package.json");

    const serverContent = fs.existsSync(serverFile)
      ? fs.readFileSync(serverFile, "utf8")
      : "";

    if (policy?.requireHealthEndpoint && !serverContent.includes('"/health"')) {
      healthEndpointPresent = false;
      violations.push(`missing-health-endpoint:${appPath}`);
    }

    if (policy?.requireTests && !fs.existsSync(testsDir)) {
      testsPresent = false;
      violations.push(`missing-tests:${appPath}`);
    }

    if (fs.existsSync(packageFile)) {
      const pkg = JSON.parse(fs.readFileSync(packageFile, "utf8"));
      const deps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {})
      };

      for (const bannedPackage of policy?.bannedPackages || []) {
        if (deps[bannedPackage]) {
          bannedPackagesAbsent = false;
          violations.push(`banned-package:${bannedPackage}:${appPath}`);
        }
      }
    }
  }

  const report: PolicyComplianceResult = {
    success:
      violations.length === 0 &&
      Boolean(policyValidation.success) &&
      healthEndpointPresent &&
      testsPresent &&
      bannedPackagesAbsent,
    checks: {
      policyValid: Boolean(policyValidation.success),
      healthEndpointPresent,
      testsPresent,
      bannedPackagesAbsent
    },
    violations,
    createdAt: new Date().toISOString()
  };

  const reportsDir = path.resolve(process.cwd(), "artifacts/reports");
  fs.mkdirSync(reportsDir, { recursive: true });

  fs.writeFileSync(
    path.join(reportsDir, "policy-compliance-report.json"),
    JSON.stringify(report, null, 2)
  );

  return report;
}

if (process.argv[1]?.includes("policyComplianceVerifier")) {
  try {
    console.log(JSON.stringify(verifyPolicyCompliance(process.argv[2]), null, 2));
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
