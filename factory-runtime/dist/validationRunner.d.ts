import type { DagPhase, ValidatorType } from "./taskQueue.js";
export interface ValidationCommandResult {
    validatorId: string;
    validatorName: string;
    type: ValidatorType;
    command: string;
    cwd: string;
    startedAt: string;
    completedAt: string;
    exitCode: number | null;
    stdout: string;
    stderr: string;
    resultLogPath: string;
    stdoutLogPath: string;
    stderrLogPath: string;
}
export interface PhaseValidationResult {
    success: boolean;
    phaseId: string;
    startedAt: string;
    completedAt: string;
    results: ValidationCommandResult[];
    logsDirectory: string;
}
export declare function validationLogsDirectoryForProject(project: string): string;
export declare function runPhaseValidators(project: string, phase: DagPhase): Promise<PhaseValidationResult>;
