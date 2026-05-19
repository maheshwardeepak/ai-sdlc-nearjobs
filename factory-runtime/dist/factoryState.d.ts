export declare const FACTORY_STATUSES: readonly ["REQUIREMENT_PENDING", "WAITING_FOR_PLAN_APPROVAL", "PLAN_APPROVED", "ARCHITECTURE_CREATED", "DAG_CREATED", "PHASE_RUNNING", "PHASE_FAILED_REPAIRING", "DAG_COMPLETE_RUNTIME_PENDING", "RUNTIME_FAILED", "COMPLETE"];
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
export declare const FACTORY_RUNTIME_ROOT: string;
export declare const STATE_DIRECTORY: string;
export declare function slugifyProjectName(project: string): string;
export declare function statePathForProject(project: string): string;
export declare function projectStateExists(project: string): boolean;
export declare function createInitialProjectState(project: string, now?: Date): FactoryState;
export declare function assertValidStatusTransition(previousStatus: FactoryStatus, nextStatus: FactoryStatus): void;
export declare function assertValidFactoryState(state: FactoryState): void;
export declare function saveProjectState(state: FactoryState): string;
export declare function loadProjectState(project: string): FactoryState;
export declare function initializeProjectState(project: string): InitializeProjectResult;
export declare function transitionProjectStatus(state: FactoryState, nextStatus: FactoryStatus, now?: Date): FactoryState;
export declare function approveProjectPlan(project: string, now?: Date): ApprovePlanResult;
