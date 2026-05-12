import fs from "fs";
import path from "path";
import { loadTechnologyStackContract } from "./technologyStackContract.js";

export type ArchitecturePlan = {
  generatedAt: string;
  stack: unknown;
  workspaceStructure: string[];
  executionPhases: string[];
  buildCommands: string[];
  dockerStrategy: string[];
  validationGates: string[];
  deploymentStrategy: string[];
};

const PLAN_PATH = path.resolve(
  process.cwd(),
  "artifacts/plans/architecture-plan.json"
);

export function generateArchitecturePlan(): ArchitecturePlan {
  const stack = loadTechnologyStackContract();

  if (!stack) {
    throw new Error(
      "Cannot generate architecture plan without confirmed technology stack."
    );
  }

  const plan: ArchitecturePlan = {
    generatedAt: new Date().toISOString(),
    stack,

    workspaceStructure: [
      "frontend/",
      "backend/",
      "database/",
      "tests/",
      "docker/",
      "artifacts/"
    ],

    executionPhases: [
      "planning",
      "architecture",
      "engineering",
      "validation",
      "security",
      "deployment"
    ],

    buildCommands: [
      "pnpm install",
      "pnpm run build",
      "pnpm run test"
    ],

    dockerStrategy: [
      "multi-stage builds",
      "container runtime verification",
      "healthcheck enforcement"
    ],

    validationGates: [
      "typescript compilation",
      "unit tests",
      "integration tests",
      "docker verification",
      "security validation"
    ],

    deploymentStrategy: [
      "containerized deployment",
      "rollback support",
      "runtime observability"
    ]
  };

  fs.mkdirSync(path.dirname(PLAN_PATH), { recursive: true });

  fs.writeFileSync(
    PLAN_PATH,
    JSON.stringify(plan, null, 2)
  );

  return plan;
}

export function architecturePlanExists(): boolean {
  return fs.existsSync(PLAN_PATH);
}

export function loadArchitecturePlan(): ArchitecturePlan {
  return JSON.parse(
    fs.readFileSync(PLAN_PATH, "utf8")
  ) as ArchitecturePlan;
}
