import type { DagPhase, WorkerType } from "./taskQueue.js";
export interface WorkerRunResult {
    success: boolean;
    exitCode: number | null;
    stdoutPath: string;
    stderrPath: string;
    errorSignature: string;
    attempts: number;
    timedOut: boolean;
    workerType: WorkerType;
    resultPath: string;
}
export declare function workerLogsDirectoryForProject(project: string): string;
export declare function runPhaseWorker(project: string, phase: DagPhase): Promise<WorkerRunResult>;
