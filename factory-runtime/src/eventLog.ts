import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  FACTORY_RUNTIME_ROOT,
  type FactoryStatus,
  slugifyProjectName
} from "./factoryState.js";
import type { PhaseStatus } from "./taskQueue.js";

export const EVENTS_DIRECTORY = path.join(FACTORY_RUNTIME_ROOT, "events");

export type FactoryEventType =
  | "PROJECT_INITIALIZED"
  | "PROJECT_INIT_SKIPPED_EXISTING"
  | "PLAN_APPROVED"
  | "PLAN_APPROVAL_ALREADY_RECORDED"
  | "FACTORY_STATUS_CHANGED"
  | "DAG_LOADED"
  | "DAG_RUN_STARTED"
  | "DAG_RUN_PAUSED"
  | "DAG_RUN_COMPLETED"
  | "DAG_RUN_FAILED"
  | "DAG_RUN_BLOCKED"
  | "DAG_RESUME_STARTED"
  | "DAG_RESUME_COMPLETED"
  | "PHASE_STATUS_CHANGED"
  | "VALIDATION_SKIPPED"
  | "VALIDATION_STARTED"
  | "VALIDATION_PASSED"
  | "VALIDATION_FAILED"
  | "REPAIR_STARTED"
  | "REPAIR_ATTEMPT_STARTED"
  | "REPAIR_SUCCEEDED"
  | "REPAIR_STOPPED"
  | "WORKER_STARTED"
  | "WORKER_ATTEMPT_STARTED"
  | "WORKER_ATTEMPT_PASSED"
  | "WORKER_ATTEMPT_FAILED"
  | "WORKER_COMPLETED"
  | "WORKER_FAILED";

export interface FactoryEvent {
  schemaVersion: 1;
  eventId: string;
  timestamp: string;
  project: string;
  projectSlug: string;
  type: FactoryEventType;
  status?: {
    previous?: FactoryStatus;
    next?: FactoryStatus;
  };
  phase?: {
    id: string;
    previous?: PhaseStatus;
    next: PhaseStatus;
  };
  details?: Record<string, unknown>;
}

export interface AppendFactoryEventInput {
  project: string;
  type: FactoryEventType;
  status?: {
    previous?: FactoryStatus;
    next?: FactoryStatus;
  };
  phase?: {
    id: string;
    previous?: PhaseStatus;
    next: PhaseStatus;
  };
  details?: Record<string, unknown>;
  now?: Date;
}

function ensureDirectory(directoryPath: string): void {
  fs.mkdirSync(directoryPath, { recursive: true });
}

export function eventLogPathForProject(project: string): string {
  return path.join(EVENTS_DIRECTORY, `${slugifyProjectName(project)}.jsonl`);
}

export function appendFactoryEvent(input: AppendFactoryEventInput): FactoryEvent {
  ensureDirectory(EVENTS_DIRECTORY);

  const now = input.now ?? new Date();
  const event: FactoryEvent = {
    schemaVersion: 1,
    eventId: crypto.randomUUID(),
    timestamp: now.toISOString(),
    project: input.project,
    projectSlug: slugifyProjectName(input.project),
    type: input.type,
    status: input.status,
    phase: input.phase,
    details: input.details
  };

  fs.appendFileSync(eventLogPathForProject(input.project), `${JSON.stringify(event)}\n`, "utf8");

  return event;
}

export function readFactoryEvents(project: string): FactoryEvent[] {
  const eventLogPath = eventLogPathForProject(project);

  if (!fs.existsSync(eventLogPath)) {
    return [];
  }

  return fs
    .readFileSync(eventLogPath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as FactoryEvent);
}
