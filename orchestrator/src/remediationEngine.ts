import fs from "fs";
import path from "path";

type VerificationReport = {
  success: boolean;
  checks: string[];
  results: {
    check: string;
    success: boolean;
    logFile?: string;
  }[];
};

type RemediationAction = {
  check: string;
  action: string;
  priority: "high" | "medium" | "low";
};

type RemediationReport = {
  success: boolean;
  failedChecks: string[];
  actions: RemediationAction[];
  createdAt: string;
};

const REMEDIATION_MAP: Record<string, RemediationAction> = {
  "typecheck": {
    check: "typecheck",
    action: "Run TypeScript repair and dependency reinstall",
    priority: "high"
  },
  "verify-secret-scan": {
    check: "verify-secret-scan",
    action: "Remove hardcoded secrets and rotate credentials",
    priority: "high"
  },
  "verify-sast": {
    check: "verify-sast",
    action: "Refactor insecure code patterns",
    priority: "high"
  },
  "verify-docker-compliance": {
    check: "verify-docker-compliance",
    action: "Generate Dockerfile/docker-compose/healthcheck",
    priority: "medium"
  },
  "verify-test-execution": {
    check: "verify-test-execution",
    action: "Repair failing tests and regenerate coverage",
    priority: "high"
  },
  "verify-sbom-policy": {
    check: "verify-sbom-policy",
    action: "Remove banned or non-compliant packages",
    priority: "high"
  },
  "release-gate": {
    check: "release-gate",
    action: "Resolve all blocking governance failures",
    priority: "high"
  }
};

function readVerificationReport(): VerificationReport {
  return JSON.parse(
    fs.readFileSync(
      path.resolve(
        process.cwd(),
        "artifacts/reports/factory-full-verification-report.json"
      ),
      "utf8"
    )
  );
}

export function generateRemediationPlan(): RemediationReport {
  const verification = readVerificationReport();

  const failedChecks = verification.results
    .filter((r) => !r.success)
    .map((r) => r.check);

  const actions = failedChecks.map(
    (check) =>
      REMEDIATION_MAP[check] || {
        check,
        action: "Manual investigation required",
        priority: "medium" as const
      }
  );

  const report: RemediationReport = {
    success: actions.length === 0,
    failedChecks,
    actions,
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
      "remediation-plan-report.json"
    ),
    JSON.stringify(report, null, 2)
  );

  return report;
}

if (process.argv[1]?.includes("remediationEngine")) {
  const result = generateRemediationPlan();

  console.log(JSON.stringify(result, null, 2));
}
