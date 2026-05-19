import type { DagPhase } from "./taskQueue.js";
import { type PhaseValidationResult } from "./validationRunner.js";
export type RepairStopReason = "VALIDATION_PASSED" | "NO_REPAIR_ACTIONS" | "MAX_ATTEMPTS_EXHAUSTED" | "REPAIR_COMMAND_FAILED" | "REPEATED_ERROR_SIGNATURE" | "NO_PROGRESS_REPAIR";
export interface RepairHistoryEntry {
    schemaVersion: 1;
    repairId: string;
    timestamp: string;
    project: string;
    projectSlug: string;
    phaseId: string;
    phaseName: string;
    status: "SKIPPED" | "ATTEMPT_STARTED" | "ATTEMPT_COMPLETED" | "STOPPED";
    attemptNumber: number;
    signature: string;
    signatureAttemptsBefore: number;
    repairAction?: {
        id: string;
        name: string;
        command: string;
        cwd: string;
    };
    commandResult?: {
        exitCode: number | null;
        stdout: string;
        stderr: string;
    };
    validationBefore: ValidationSnapshot;
    validationAfter?: ValidationSnapshot;
    repeatedErrorSignature?: boolean;
    noProgress?: boolean;
    stopReason?: RepairStopReason;
}
export interface RepairRunResult {
    success: boolean;
    phaseId: string;
    attemptsUsed: number;
    initialSignature: string;
    finalSignature: string;
    repeatedErrorSignature: boolean;
    noProgress: boolean;
    stopReason: RepairStopReason;
    finalValidation: PhaseValidationResult;
    repairHistoryPath: string;
}
interface ValidationSnapshot {
    success: boolean;
    signature: string;
    results: Array<{
        validatorId: string;
        type: string;
        exitCode: number | null;
        stdoutDigest: string;
        stderrDigest: string;
        resultLogPath: string;
    }>;
}
export declare function repairHistoryPathForProject(project: string): string;
export declare function runRepairForValidationFailure(project: string, phase: DagPhase, failedValidation: PhaseValidationResult): Promise<RepairRunResult>;
export declare function createValidationFailureSignature(phase: DagPhase, validationResult: PhaseValidationResult): string;
export {};
