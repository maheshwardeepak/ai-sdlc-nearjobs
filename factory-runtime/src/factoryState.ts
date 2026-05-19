import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const FACTORY_STATUSES = [
  "REQUIREMENT_PENDING",
  "WAITING_FOR_PLAN_APPROVAL",
  "PLAN_APPROVED",
  "ARCHITECTURE_CREATED",
  "DAG_CREATED",
  "PHASE_RUNNING",
  "PHASE_FAILED_REPAIRING",
  "DAG_COMPLETE_RUNTIME_PENDING",
  "RUNTIME_FAILED",
  "COMPLETE"
] as const;

export type FactoryStatus = (typeof FACTORY_STATUSES)[number];

export interface FactoryState {
  schemaVersion: 1;
  project: string;
  projectSlug: string;
  status: FactoryStatus;
  createdAt: string;
  updatedAt: string;
  plan: {
    id: string;
    createdAt: string;
    approvedAt?: string;
    approvedBy?: "human";
  };
  policy: {
    humanGate: "planning";
    postPlanMode: "autonomous";
  };
}

export interface InitializeProjectResult {
  created: boolean;
  state: FactoryState;
  statePath: string;
}

export interface ApprovePlanResult {
  changed: boolean;
  previousStatus: FactoryStatus;
  state: FactoryState;
  statePath: string;
}

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));

export const FACTORY_RUNTIME_ROOT = path.resolve(moduleDirectory, "..");
export const STATE_DIRECTORY = path.join(FACTORY_RUNTIME_ROOT, "state");

const STATUS_INDEX = new Map<FactoryStatus, number>(
  FACTORY_STATUSES.map((status, index) => [status, index])
);

const ALLOWED_STATUS_TRANSITIONS: Record<FactoryStatus, FactoryStatus[]> = {
  REQUIREMENT_PENDING: ["WAITING_FOR_PLAN_APPROVAL"],
  WAITING_FOR_PLAN_APPROVAL: ["PLAN_APPROVED"],
  PLAN_APPROVED: ["ARCHITECTURE_CREATED", "DAG_CREATED"],
  ARCHITECTURE_CREATED: ["DAG_CREATED"],
  DAG_CREATED: ["PHASE_RUNNING"],
  PHASE_RUNNING: ["PHASE_FAILED_REPAIRING", "DAG_COMPLETE_RUNTIME_PENDING"],
  PHASE_FAILED_REPAIRING: ["PHASE_RUNNING", "RUNTIME_FAILED"],
  DAG_COMPLETE_RUNTIME_PENDING: ["RUNTIME_FAILED", "COMPLETE"],
  RUNTIME_FAILED: ["PHASE_FAILED_REPAIRING"],
  COMPLETE: []
};

const FORBIDDEN_POST_PLAN_APPROVAL_KEYS = new Set([
  "approvalGate",
  "approvalFlags",
  "architectureApproval",
  "phaseApproval",
  "validationApproval",
  "repairApproval",
  "codeQualityApproval",
  "playwrightApproval",
  "dockerApproval",
  "runtimeProofApproval"
]);

const FORBIDDEN_POST_PLAN_APPROVAL_PATTERNS = [
  /^requires.*approval$/i,
  /^approval.*required$/i,
  /^human.*approval.*required$/i,
  /^waiting.*approval$/i,
  /^manual.*approval$/i
];

function ensureDirectory(directoryPath: string): void {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireStatusIndex(status: FactoryStatus): number {
  const index = STATUS_INDEX.get(status);

  if (index === undefined) {
    throw new Error(`Unsupported factory status: ${status}`);
  }

  return index;
}

function isPlanApprovedOrLater(status: FactoryStatus): boolean {
  return requireStatusIndex(status) >= requireStatusIndex("PLAN_APPROVED");
}

function collectPostPlanApprovalFlagViolations(
  value: unknown,
  pathPrefix = "$",
  violations: string[] = []
): string[] {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      collectPostPlanApprovalFlagViolations(item, `${pathPrefix}[${index}]`, violations);
    });
    return violations;
  }

  if (!isRecord(value)) {
    return violations;
  }

  for (const [key, child] of Object.entries(value)) {
    const keyLooksForbidden =
      FORBIDDEN_POST_PLAN_APPROVAL_KEYS.has(key) ||
      FORBIDDEN_POST_PLAN_APPROVAL_PATTERNS.some((pattern) => pattern.test(key));

    if (keyLooksForbidden) {
      violations.push(`${pathPrefix}.${key}`);
    }

    collectPostPlanApprovalFlagViolations(child, `${pathPrefix}.${key}`, violations);
  }

  return violations;
}

export function slugifyProjectName(project: string): string {
  const slug = project
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    throw new Error("Project name must contain at least one letter or number.");
  }

  return slug;
}

export function statePathForProject(project: string): string {
  return path.join(STATE_DIRECTORY, `${slugifyProjectName(project)}.json`);
}

export function projectStateExists(project: string): boolean {
  return fs.existsSync(statePathForProject(project));
}

export function createInitialProjectState(project: string, now = new Date()): FactoryState {
  const timestamp = now.toISOString();
  const projectSlug = slugifyProjectName(project);

  return {
    schemaVersion: 1,
    project,
    projectSlug,
    status: "WAITING_FOR_PLAN_APPROVAL",
    createdAt: timestamp,
    updatedAt: timestamp,
    plan: {
      id: "initial-plan",
      createdAt: timestamp
    },
    policy: {
      humanGate: "planning",
      postPlanMode: "autonomous"
    }
  };
}

export function assertValidStatusTransition(
  previousStatus: FactoryStatus,
  nextStatus: FactoryStatus
): void {
  if (previousStatus === nextStatus) {
    return;
  }

  const allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS[previousStatus];

  if (!allowedNextStatuses.includes(nextStatus)) {
    throw new Error(
      `Invalid factory status transition: ${previousStatus} -> ${nextStatus}`
    );
  }
}

export function assertValidFactoryState(state: FactoryState): void {
  if (state.schemaVersion !== 1) {
    throw new Error(`Unsupported state schema version: ${String(state.schemaVersion)}`);
  }

  if (!FACTORY_STATUSES.includes(state.status)) {
    throw new Error(`Unsupported factory status: ${String(state.status)}`);
  }

  if (state.projectSlug !== slugifyProjectName(state.project)) {
    throw new Error(
      `Project slug mismatch: expected ${slugifyProjectName(state.project)}, got ${state.projectSlug}`
    );
  }

  if (state.status === "WAITING_FOR_PLAN_APPROVAL" && state.plan.approvedAt) {
    throw new Error("Plan cannot already be approved while waiting for plan approval.");
  }

  if (isPlanApprovedOrLater(state.status) && !state.plan.approvedAt) {
    throw new Error(`${state.status} requires plan.approvedAt to be recorded.`);
  }

  if (isPlanApprovedOrLater(state.status)) {
    const violations = collectPostPlanApprovalFlagViolations(state);

    if (violations.length > 0) {
      throw new Error(
        `Post-plan approval flags are not allowed after PLAN_APPROVED: ${violations.join(", ")}`
      );
    }
  }
}

export function saveProjectState(state: FactoryState): string {
  assertValidFactoryState(state);
  ensureDirectory(STATE_DIRECTORY);

  const statePath = statePathForProject(state.projectSlug);
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");

  return statePath;
}

export function loadProjectState(project: string): FactoryState {
  const statePath = statePathForProject(project);

  if (!fs.existsSync(statePath)) {
    throw new Error(`Project state not found for ${project}. Run init-project first.`);
  }

  const parsed = JSON.parse(fs.readFileSync(statePath, "utf8")) as FactoryState;
  assertValidFactoryState(parsed);

  return parsed;
}

export function initializeProjectState(project: string): InitializeProjectResult {
  if (projectStateExists(project)) {
    const state = loadProjectState(project);

    return {
      created: false,
      state,
      statePath: statePathForProject(project)
    };
  }

  const state = createInitialProjectState(project);
  const statePath = saveProjectState(state);

  return {
    created: true,
    state,
    statePath
  };
}

export function transitionProjectStatus(
  state: FactoryState,
  nextStatus: FactoryStatus,
  now = new Date()
): FactoryState {
  assertValidStatusTransition(state.status, nextStatus);

  const nextState: FactoryState = {
    ...state,
    status: nextStatus,
    updatedAt: now.toISOString()
  };

  assertValidFactoryState(nextState);
  return nextState;
}

export function approveProjectPlan(project: string, now = new Date()): ApprovePlanResult {
  const currentState = loadProjectState(project);
  const previousStatus = currentState.status;

  if (currentState.status === "REQUIREMENT_PENDING") {
    throw new Error("Cannot approve a plan while requirement intake is still pending.");
  }

  if (isPlanApprovedOrLater(currentState.status)) {
    return {
      changed: false,
      previousStatus,
      state: currentState,
      statePath: statePathForProject(project)
    };
  }

  assertValidStatusTransition(currentState.status, "PLAN_APPROVED");

  const timestamp = now.toISOString();
  const approvedState: FactoryState = {
    ...currentState,
    status: "PLAN_APPROVED",
    updatedAt: timestamp,
    plan: {
      ...currentState.plan,
      approvedAt: timestamp,
      approvedBy: "human"
    }
  };

  assertValidFactoryState(approvedState);
  const statePath = saveProjectState(approvedState);

  return {
    changed: true,
    previousStatus,
    state: approvedState,
    statePath
  };
}
