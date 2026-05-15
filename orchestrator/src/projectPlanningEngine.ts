import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { loadTechnologyStackContract } from "./technologyStackContract.js";
import { runAiProjectPlanner } from "./aiProjectPlanner.js";
import { generatePlanDiff } from "./planDiffEngine.js";

export type ProjectPlanningResult = {
  success: boolean;
  project: string;
  projectSlug: string;
  requirementsPath: string;
  outputDir: string;
  files: string[];
  summary: string;
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}


function collectRequirementFiles(root: string): string[] {
  const files: string[] = [];

  function walk(current: string): void {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);

      if (entry.isDirectory()) {
        walk(full);
        continue;
      }

      if (
        entry.name.endsWith(".md") ||
        entry.name.endsWith(".txt") ||
        entry.name.endsWith(".json")
      ) {
        files.push(full);
      }
    }
  }

  walk(root);

  return files.sort();
}


function readRequirementInputs(inputPath: string): string {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Requirements path not found: ${inputPath}`);
  }

  const stat = fs.statSync(inputPath);

  if (stat.isFile()) {
    return [
      `# Source: ${inputPath}`,
      fs.readFileSync(inputPath, "utf8")
    ].join("\n\n");
  }

  const chunks: string[] = [];
  const discovered = collectRequirementFiles(inputPath);

  for (const full of discovered) {
    const relative = path.relative(inputPath, full);

    chunks.push([
      `# Source: ${relative}`,
      fs.readFileSync(full, "utf8")
    ].join("\n\n"));
  }

  return [
    "DISCOVERED REQUIREMENT FILES:",
    ...discovered.map((f) => `- ${path.relative(inputPath, f)}`),
    "",
    chunks.join("\n\n---\n\n")
  ].join("\n");
}


function deriveProjectPhases(requirements: string): Array<{
  id: string;
  name: string;
  goal: string;
  autonomous: boolean;
  requiresHumanApproval: boolean;
}> {
  const text = requirements.toLowerCase();
  const phases: Array<{
    id: string;
    name: string;
    goal: string;
    autonomous: boolean;
    requiresHumanApproval: boolean;
  }> = [];

  phases.push({
    id: "phase-1-project-foundation",
    name: "Project Foundation",
    goal: "Create the project structure, stack-specific backend/frontend foundations, runtime contracts, health endpoint, and baseline Docker readiness.",
    autonomous: true,
    requiresHumanApproval: false
  });

  if (
    text.includes("task") ||
    text.includes("crud") ||
    text.includes("create") ||
    text.includes("edit") ||
    text.includes("delete")
  ) {
    phases.push({
      id: "phase-2-core-crud-workflows",
      name: "Core CRUD Workflows",
      goal: "Implement create, read, update, and delete workflows for the core domain entities described in requirements.",
      autonomous: true,
      requiresHumanApproval: false
    });
  }

  if (
    text.includes("status") ||
    text.includes("workflow") ||
    text.includes("todo") ||
    text.includes("in_progress") ||
    text.includes("done")
  ) {
    phases.push({
      id: "phase-3-workflow-status-engine",
      name: "Workflow Status Engine",
      goal: "Implement status transitions, workflow state handling, and persistence for the required lifecycle states.",
      autonomous: true,
      requiresHumanApproval: false
    });
  }

  if (
    text.includes("dashboard") ||
    text.includes("count") ||
    text.includes("analytics") ||
    text.includes("report")
  ) {
    phases.push({
      id: "phase-4-dashboard-and-insights",
      name: "Dashboard and Insights",
      goal: "Implement dashboard views and aggregate insights required by the product requirements.",
      autonomous: true,
      requiresHumanApproval: false
    });
  }

  if (
    text.includes("ui") ||
    text.includes("screen") ||
    text.includes("responsive") ||
    text.includes("frontend")
  ) {
    phases.push({
      id: "phase-5-user-interface",
      name: "User Interface",
      goal: "Implement responsive frontend screens, forms, navigation, and API integration for the planned workflows.",
      autonomous: true,
      requiresHumanApproval: false
    });
  }

  if (
    text.includes("postgres") ||
    text.includes("database") ||
    text.includes("persist")
  ) {
    phases.push({
      id: "phase-6-persistence-and-data-integrity",
      name: "Persistence and Data Integrity",
      goal: "Implement database schema, persistence integration, validation, and data integrity checks.",
      autonomous: true,
      requiresHumanApproval: false
    });
  }

  phases.push({
    id: "phase-final-runtime-convergence",
    name: "Runtime Convergence Proof",
    goal: "Run stabilization, dependency reconciliation, self-healing build, Docker runtime convergence, health verification, and final proof.",
    autonomous: true,
    requiresHumanApproval: false
  });

  return phases;
}


function write(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function hashPlan(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function nextPlanVersion(outputDir: string): number {
  const versionPath = path.join(outputDir, "plan-version.json");

  if (!fs.existsSync(versionPath)) {
    return 1;
  }

  const existing = JSON.parse(fs.readFileSync(versionPath, "utf8"));
  return Number(existing.version || 0) + 1;
}

export async function createProjectPlan(
  projectName: string,
  requirementsPath: string
): Promise<ProjectPlanningResult> {
  const stack = loadTechnologyStackContract();
  const projectSlug = slugify(projectName);
  const outputDir = path.resolve(
    process.cwd(),
    "artifacts/autonomous-runs",
    projectSlug
  );

  const requirements = readRequirementInputs(requirementsPath);


  const aiPlanPath = path.join(outputDir, "ai-project-plan.json");
  const previousAiPlanPath = path.join(outputDir, "ai-project-plan.previous.json");

  if (fs.existsSync(aiPlanPath)) {
    fs.copyFileSync(aiPlanPath, previousAiPlanPath);
  }

  const aiPlan = await runAiProjectPlanner({
    projectName,
    projectSlug,
    requirements,
    stack,
    outputDir
  });

  const planDiff = generatePlanDiff(outputDir, aiPlan);

  const phasePlan = aiPlan.phases;

  const productPlan = [
    `# Product Plan: ${projectName}`,
    "",
    "## Source Requirements",
    requirements,
    "",
    "## Confirmed Stack",
    `- Backend: ${stack.backend.language} / ${stack.backend.framework}`,
    `- Frontend: ${stack.frontend.language} / ${stack.frontend.framework}`,
    `- Database: ${stack.database.engine}`,
    "",
    "## Product Summary",
    aiPlan.productSummary,
    "",
    "## Domain Modules",
    ...aiPlan.domainModules.map((module) => `- ${module}`),
    "",
    "## Product Scope",
    "- Generate a production-ready full-stack application from the supplied requirements.",
    "- Preserve the requested domain behavior and business rules.",
    "- Use autonomous stabilization, dependency reconciliation, Docker runtime verification, and health validation.",
    ""
  ].join("\n");

  const architecture = [
    `# Architecture Plan: ${projectName}`,
    "",
    "## Layers",
    "- Frontend UI",
    "- Backend API",
    "- Database persistence",
    "- Runtime health endpoints",
    "- Docker compose runtime",
    "",
    "## Runtime Contract",
    "- Backend binds to port 3000",
    "- Frontend binds through generated Docker runtime",
    "- Backend exposes /health",
    "- Database and Redis are reachable inside Docker network",
    ""
  ].join("\n");

  const apiContracts = [
    `# API Contracts: ${projectName}`,
    "",
    ...aiPlan.apiContracts.map(
      (api) => `- ${api.method} ${api.path}: ${api.purpose}`
    ),
    ""
  ].join("\n");

  const acceptanceCriteria = [
    `# Acceptance Criteria: ${projectName}`,
    "",
    ...aiPlan.acceptanceCriteria.map((item) => `- ${item}`),
    "- Application builds without manual edits.",
    "- Self-healing build succeeds.",
    "- Docker runtime starts successfully.",
    "- Backend health probe succeeds.",
    "- Frontend responds with HTTP 200.",
    "- Database health succeeds.",
    "- Redis health succeeds.",
    "- Final factory proof passes.",
    "- No manual code, dependency, Docker, or runtime fixes after approval.",
    ""
  ].join("\n");



  const executionPlan = [
    `# Execution Plan: ${projectName}`,
    "",
    "## Approval Model",
    "- Human approval is required once before autonomous execution.",
    "- After approval, all phases run automatically.",
    "- Failed build/test/runtime checks are repaired by the factory and retried automatically.",
    "- No additional approval is required between phases unless the project plan changes.",
    "",
    "## Autonomous Phases",
    ...phasePlan.flatMap((phase, index) => [
      `${index + 1}. ${phase.name}`,
      `   - ID: ${phase.id}`,
      `   - Goal: ${phase.goal}`,
      `   - Autonomous: ${phase.autonomous}`,
      `   - Requires human approval: ${phase.requiresHumanApproval}`,
      ""
    ]),
    "## Runtime Gates Per Phase",
    "- Stabilize generated app.",
    "- Reconcile dependencies.",
    "- Build.",
    "- Test.",
    "- Repair failures.",
    "- Retry until pass or max retry limit.",
    "",
    "## Final Gates",
    "- Docker runtime convergence.",
    "- Backend health success.",
    "- Frontend HTTP success.",
    "- Database health success.",
    "- Redis health success.",
    "- Final proof success.",
    ""
  ].join("\n");

  const planContentForHash = [
    productPlan,
    architecture,
    apiContracts,
    acceptanceCriteria,
    executionPlan,
    JSON.stringify(phasePlan, null, 2),
    JSON.stringify(aiPlan, null, 2)
  ].join("\n---\n");

  const planHash = hashPlan(planContentForHash);
  const version = nextPlanVersion(outputDir);

  const previousApprovalPath = path.join(outputDir, "approval.json");
  const previousApproval = fs.existsSync(previousApprovalPath)
    ? JSON.parse(fs.readFileSync(previousApprovalPath, "utf8"))
    : null;

  const planChanged = previousApproval?.planHash
    ? previousApproval.planHash !== planHash
    : true;

  const approval = {
    project: projectName,
    projectSlug,
    approved: previousApproval?.approved && !planChanged ? true : false,
    approvedAt: previousApproval?.approved && !planChanged ? previousApproval.approvedAt : null,
    planVersion: version,
    planHash,
    planChanged,
    createdAt: new Date().toISOString()
  };

  const files: Array<[string, string]> = [
    ["product-plan.md", productPlan],
    ["architecture.md", architecture],
    ["api-contracts.md", apiContracts],
    ["acceptance-criteria.md", acceptanceCriteria],
    ["execution-plan.md", executionPlan],
    ["phases.json", JSON.stringify(phasePlan, null, 2)],
    ["approval.json", JSON.stringify(approval, null, 2)],
    ["plan-version.json", JSON.stringify({ version, planHash, planChanged, createdAt: new Date().toISOString() }, null, 2)],
    ["plan-diff.md", planDiff.summary],
    ["plan-diff.json", JSON.stringify(planDiff, null, 2)]
  ];

  for (const [name, content] of files) {
    write(path.join(outputDir, name), content);
  }

  return {
    success: true,
    project: projectName,
    projectSlug,
    requirementsPath,
    outputDir,
    files: files.map(([name]) => path.join(outputDir, name)),
    summary: [
      productPlan,
      architecture,
      apiContracts,
      acceptanceCriteria,
      executionPlan
    ].join("\n\n---\n\n")
  };
}

export function approveProjectPlan(projectName: string): unknown {
  const projectSlug = slugify(projectName);
  const approvalPath = path.resolve(
    process.cwd(),
    "artifacts/autonomous-runs",
    projectSlug,
    "approval.json"
  );

  if (!fs.existsSync(approvalPath)) {
    throw new Error(`Project plan not found for ${projectName}`);
  }

  const runDir = path.dirname(approvalPath);
  const requiredArtifacts = [
    "ai-project-plan.json",
    "product-plan.md",
    "architecture.md",
    "api-contracts.md",
    "acceptance-criteria.md",
    "execution-plan.md",
    "phases.json",
    "plan-version.json",
    "plan-diff.md"
  ];

  const missingArtifacts = requiredArtifacts.filter(
    (file) => !fs.existsSync(path.join(runDir, file))
  );

  if (missingArtifacts.length > 0) {
    throw new Error(
      `Project plan is incomplete for ${projectName}. Missing: ${missingArtifacts.join(", ")}. Run create-project-plan first.`
    );
  }

  const approval = JSON.parse(fs.readFileSync(approvalPath, "utf8"));
  approval.approved = true;
  approval.approvedAt = new Date().toISOString();
  approval.planChanged = false;

  const versionPath = path.join(path.dirname(approvalPath), "plan-version.json");
  if (fs.existsSync(versionPath)) {
    const version = JSON.parse(fs.readFileSync(versionPath, "utf8"));
    version.planChanged = false;
    version.approvedAt = approval.approvedAt;
    fs.writeFileSync(versionPath, JSON.stringify(version, null, 2));
  }

  fs.writeFileSync(approvalPath, JSON.stringify(approval, null, 2));

  return approval;
}

export function assertProjectPlanApproved(projectName: string): void {
  const projectSlug = slugify(projectName);
  const approvalPath = path.resolve(
    process.cwd(),
    "artifacts/autonomous-runs",
    projectSlug,
    "approval.json"
  );

  if (!fs.existsSync(approvalPath)) {
    throw new Error(
      `Project plan approval required. Run create-project-plan ${projectName} <requirementsPath> first.`
    );
  }

  const approval = JSON.parse(fs.readFileSync(approvalPath, "utf8"));

  if (!approval.approved) {
    throw new Error(
      `Project plan is not approved. Run approve-project-plan ${projectName} after reviewing planning artifacts.`
    );
  }
}
