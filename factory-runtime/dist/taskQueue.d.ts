export declare const PHASE_STATUSES: readonly ["PENDING", "RUNNING", "PASSED", "FAILED", "REPAIRING"];
export type PhaseStatus = (typeof PHASE_STATUSES)[number];
export declare const VALIDATOR_TYPES: readonly ["shell", "backend-build", "frontend-build", "docker-compose-config", "playwright", "runtime-health-curl"];
export type ValidatorType = (typeof VALIDATOR_TYPES)[number];
export interface PhaseValidator {
    id: string;
    name: string;
    type: ValidatorType;
    command?: string;
    cwd?: string;
    url?: string;
    env?: Record<string, string>;
}
export interface PhaseRepairAction {
    id: string;
    name: string;
    command: string;
    cwd?: string;
    env?: Record<string, string>;
}
export declare const WORKER_TYPES: readonly ["shell", "codex-placeholder"];
export type WorkerType = (typeof WORKER_TYPES)[number];
export interface PhaseWorker {
    type: WorkerType;
    command?: string;
    prompt?: string;
    cwd?: string;
    env?: Record<string, string>;
    timeoutMs?: number;
    retries?: number;
}
export interface DagPhase {
    id: string;
    name: string;
    dependsOn: string[];
    command?: string;
    cwd?: string;
    env?: Record<string, string>;
    timeoutMs?: number;
    retries?: number;
    worker?: PhaseWorker;
    validators: PhaseValidator[];
    repairs: PhaseRepairAction[];
}
export interface DagDefinition {
    schemaVersion: 1;
    project?: string;
    phases: DagPhase[];
}
export interface PhaseRuntimeState {
    id: string;
    status: PhaseStatus;
    attempts: number;
    startedAt?: string;
    completedAt?: string;
    failedAt?: string;
    repairingAt?: string;
    lastExitCode?: number | null;
    lastError?: string;
    lastStdout?: string;
    lastStderr?: string;
    lastWorker?: {
        success: boolean;
        exitCode: number | null;
        stdoutPath: string;
        stderrPath: string;
        errorSignature: string;
        attempts: number;
        timedOut: boolean;
        workerType: WorkerType;
    };
    lastValidation?: {
        success: boolean;
        ranAt: string;
        results: Array<{
            validatorId: string;
            type: ValidatorType;
            exitCode: number | null;
            resultLogPath: string;
            stdoutLogPath: string;
            stderrLogPath: string;
        }>;
    };
}
export type PhaseStateMap = Record<string, PhaseRuntimeState>;
export declare function normalizeDagDefinition(value: unknown): DagDefinition;
export declare function createInitialPhaseStateMap(dag: DagDefinition): PhaseStateMap;
export declare function mergePhaseStateMap(dag: DagDefinition, existing: PhaseStateMap | undefined): PhaseStateMap;
export declare function getPhasesInDependencyOrder(dag: DagDefinition): DagPhase[];
export declare function getNextRunnablePhase(dag: DagDefinition, phaseStates: PhaseStateMap): DagPhase | null;
export declare function getBlockingPhaseStates(phaseStates: PhaseStateMap): PhaseRuntimeState[];
export declare function isDagComplete(phaseStates: PhaseStateMap): boolean;
