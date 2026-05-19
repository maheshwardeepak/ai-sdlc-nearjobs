import { type DagDefinition, type PhaseStateMap } from "./taskQueue.js";
export interface DagRuntimeState {
    schemaVersion: 1;
    project: string;
    projectSlug: string;
    loadedAt: string;
    updatedAt: string;
    phases: PhaseStateMap;
}
export interface DagExecutionSummary {
    total: number;
    pending: number;
    running: number;
    passed: number;
    failed: number;
    repairing: number;
    complete: boolean;
}
export interface DagExecutionResult {
    success: boolean;
    project: string;
    dagPath: string;
    phaseStatusPath: string;
    summary: DagExecutionSummary;
    executedPhases: string[];
    message: string;
}
export declare const RUNS_DIRECTORY: string;
export declare function projectRunDirectory(project: string): string;
export declare function dagPathForProject(project: string): string;
export declare function phaseStatusPathForProject(project: string): string;
export declare function loadDagDefinitionFromDisk(project: string): DagDefinition;
export declare function loadDagRuntimeState(project: string): DagRuntimeState;
export declare function getDagExecutionStatus(project: string): DagExecutionSummary | null;
export declare function loadDagForProject(project: string): DagRuntimeState;
export declare function runDag(project: string, maxPhases?: number): Promise<DagExecutionResult>;
export declare function resumeDag(project: string, maxPhases?: number): Promise<DagExecutionResult>;
export declare function summarizeDagRuntimeState(runtimeState: DagRuntimeState): DagExecutionSummary;
