import fs from "fs";
import path from "path";

export type FactoryPolicy = {
  allowedBackendFrameworks: string[];
  allowedFrontendFrameworks: string[];
  allowedDatabases: string[];

  requireHealthEndpoint: boolean;
  requireDockerSupport: boolean;
  requireTests: boolean;
  requireSecurityChecks: boolean;

  bannedPackages: string[];

  createdAt: string;
};

export function createDefaultPolicy(): FactoryPolicy {
  const policy: FactoryPolicy = {
    allowedBackendFrameworks: ["Express"],
    allowedFrontendFrameworks: ["React"],
    allowedDatabases: ["PostgreSQL"],

    requireHealthEndpoint: true,
    requireDockerSupport: true,
    requireTests: true,
    requireSecurityChecks: true,

    bannedPackages: [],

    createdAt: new Date().toISOString()
  };

  const reportsDir = path.resolve(process.cwd(), "artifacts/reports");

  fs.mkdirSync(reportsDir, { recursive: true });

  fs.writeFileSync(
    path.join(reportsDir, "factory-policy.json"),
    JSON.stringify(policy, null, 2)
  );

  return policy;
}

if (process.argv[1]?.includes("policyEngine")) {
  console.log(JSON.stringify(createDefaultPolicy(), null, 2));
}


export function validateFactoryPolicy() {
  const policyPath = path.resolve(
    process.cwd(),
    "artifacts/reports/factory-policy.json"
  );

  if (!fs.existsSync(policyPath)) {
    return {
      success: false,
      error: "factory-policy-not-found"
    };
  }

  const policy = JSON.parse(
    fs.readFileSync(policyPath, "utf8")
  ) as FactoryPolicy;

  const success =
    policy.allowedBackendFrameworks.includes("Express") &&
    policy.allowedFrontendFrameworks.includes("React") &&
    policy.allowedDatabases.includes("PostgreSQL") &&
    policy.requireHealthEndpoint === true &&
    policy.requireTests === true &&
    policy.requireSecurityChecks === true;

  return {
    success,
    policy,
    error: success ? null : "factory-policy-invalid"
  };
}
