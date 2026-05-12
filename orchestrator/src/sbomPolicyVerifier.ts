import fs from "fs";
import path from "path";
import { validateFactoryPolicy } from "./policyEngine.js";

type SbomReport = {
  success: boolean;
  entries: {
    appPath: string;
    packages: {
      name: string;
      version: string;
      type: string;
    }[];
  }[];
};

type SbomPolicyReport = {
  success: boolean;
  packagesChecked: number;
  violations: {
    appPath: string;
    packageName: string;
    reason: string;
  }[];
  createdAt: string;
};

function readJson(file: string) {
  return JSON.parse(
    fs.readFileSync(
      path.resolve(process.cwd(), "artifacts/reports", file),
      "utf8"
    )
  );
}

export function verifySbomPolicy(): SbomPolicyReport {
  const policyValidation = validateFactoryPolicy();

  if (!policyValidation.success || !policyValidation.policy) {
    throw new Error(policyValidation.error || "factory-policy-invalid");
  }

  const sbom = readJson("sbom-report.json") as SbomReport;
  const bannedPackages = new Set(policyValidation.policy.bannedPackages || []);

  const violations: SbomPolicyReport["violations"] = [];
  let packagesChecked = 0;

  for (const entry of sbom.entries || []) {
    for (const pkg of entry.packages || []) {
      packagesChecked += 1;

      if (bannedPackages.has(pkg.name)) {
        violations.push({
          appPath: entry.appPath,
          packageName: pkg.name,
          reason: "banned-package"
        });
      }
    }
  }

  const report: SbomPolicyReport = {
    success: violations.length === 0,
    packagesChecked,
    violations,
    createdAt: new Date().toISOString()
  };

  const reportsDir = path.resolve(process.cwd(), "artifacts/reports");
  fs.mkdirSync(reportsDir, { recursive: true });

  fs.writeFileSync(
    path.join(reportsDir, "sbom-policy-report.json"),
    JSON.stringify(report, null, 2)
  );

  return report;
}

if (process.argv[1]?.includes("sbomPolicyVerifier")) {
  try {
    const result = verifySbomPolicy();
    console.log(JSON.stringify(result, null, 2));

    if (!result.success) {
      process.exit(1);
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
