import { type FactoryStatus } from "./factoryState.js";
import type { PhaseStatus } from "./taskQueue.js";
export declare const EVENTS_DIRECTORY: string;
export type FactoryEventType = "PROJECT_INITIALIZED" | "PROJECT_INIT_SKIPPED_EXISTING" | "PLAN_APPROVED" | "PLAN_APPROVAL_ALREADY_RECORDED" | "FACTORY_STATUS_CHANGED" | "DAG_LOADED" | "DAG_RUN_STARTED" | "DAG_RUN_PAUSED" | "DAG_RUN_COMPLETED" | "DAG_RUN_FAILED" | "DAG_RUN_BLOCKED" | "DAG_RESUME_STARTED" | "DAG_RESUME_COMPLETED" | "PHASE_STATUS_CHANGED" | "VALIDATION_SKIPPED" | "VALIDATION_STARTED" | "VALIDATION_PASSED" | "VALIDATION_FAILED" | "REPAIR_STARTED" | "REPAIR_ATTEMPT_STARTED" | "REPAIR_SUCCEEDED" | "REPAIR_STOPPED" | "WORKER_STARTED" | "WORKER_ATTEMPT_STARTED" | "WORKER_ATTEMPT_PASSED" | "WORKER_ATTEMPT_FAILED" | "WORKER_COMPLETED" | "WORKER_FAILED";
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
export declare function eventLogPathForProject(project: string): string;
export declare function appendFactoryEvent(input: AppendFactoryEventInput): FactoryEvent;
export declare function readFactoryEvents(project: string): FactoryEvent[];
