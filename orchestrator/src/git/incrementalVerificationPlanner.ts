import { generateBranchDiff } from "./branchDiff.js";
import { analyzeDependencyImpact } from "./dependencyImpactGraph.js";

export type VerificationPlan = {
  success: boolean;
  baseBranch: string;
  changedFiles: string[];
  changedProjects: string[];
  impactedProjects: string[];
  checks: string[];
};

function planChecks(changedProjects: string[], changedFiles: string[]): string[] {
  const checks = new Set<string>();

  checks.add("typecheck");
  checks.add("autonomous-health-gate");

  if (changedProjects.includes("orchestrator")) {
    checks.add("orchestrator-tsc");
    checks.add("infra-preflight");
  }

  if (changedProjects.includes("dashboard")) {
    checks.add("dashboard-build");
  }

  if (changedProjects.includes("nearjobs")) {
    checks.add("nearjobs-backend-test");
    checks.add("nearjobs-frontend-build");
    checks.add("nearjobs-docker-config");
    checks.add("nearjobs-api-smoke");
    checks.add("nearjobs-playwright");
  }

  if (changedFiles.some((file) => file.includes(".github/workflows"))) {
    checks.add("ci-workflow-validation");
  }

  if (changedFiles.some((file) => file.includes("package.json") || file.includes("pnpm-lock.yaml"))) {
    checks.add("dependency-audit");
  }

  return [...checks];
}

export async function createIncrementalVerificationPlan(
  baseBranch = "main"
): Promise<VerificationPlan> {
  const diff = await generateBranchDiff(baseBranch);
  const impact = analyzeDependencyImpact(diff.changedProjects);

  return {
    success: true,
    baseBranch,
    changedFiles: diff.changedFiles,
    changedProjects: diff.changedProjects,
    impactedProjects: impact.impactedProjects,
    checks: planChecks(impact.impactedProjects, diff.changedFiles)
  };
}

if (process.argv[1]?.includes("incrementalVerificationPlanner")) {
  createIncrementalVerificationPlan()
    .then((plan) => console.log(JSON.stringify(plan, null, 2)))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
