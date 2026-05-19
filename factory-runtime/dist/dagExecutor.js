import fs from "node:fs";
import path from "node:path";
import { FACTORY_RUNTIME_ROOT, loadProjectState, saveProjectState, slugifyProjectName, transitionProjectStatus } from "./factoryState.js";
import { appendFactoryEvent } from "./eventLog.js";
import { getBlockingPhaseStates, getNextRunnablePhase, isDagComplete, mergePhaseStateMap, normalizeDagDefinition } from "./taskQueue.js";
import { runPhaseValidators } from "./validationRunner.js";
import { runRepairForValidationFailure } from "./repairRunner.js";
import { runPhaseWorker } from "./workerRunner.js";
export const RUNS_DIRECTORY = path.join(FACTORY_RUNTIME_ROOT, "runs");
export function projectRunDirectory(project) {
    return path.join(RUNS_DIRECTORY, slugifyProjectName(project));
}
export function dagPathForProject(project) {
    return path.join(projectRunDirectory(project), "dag.json");
}
export function phaseStatusPathForProject(project) {
    return path.join(projectRunDirectory(project), "phase-status.json");
}
export function loadDagDefinitionFromDisk(project) {
    const dagPath = dagPathForProject(project);
    if (!fs.existsSync(dagPath)) {
        throw new Error(`DAG not found for ${project}: ${dagPath}`);
    }
    return normalizeDagDefinition(JSON.parse(fs.readFileSync(dagPath, "utf8")));
}
export function loadDagRuntimeState(project) {
    const phaseStatusPath = phaseStatusPathForProject(project);
    if (!fs.existsSync(phaseStatusPath)) {
        throw new Error(`Phase status not found for ${project}. Run load-dag first.`);
    }
    const runtimeState = JSON.parse(fs.readFileSync(phaseStatusPath, "utf8"));
    if (runtimeState.schemaVersion !== 1) {
        throw new Error(`Unsupported phase status schemaVersion: ${String(runtimeState.schemaVersion)}`);
    }
    return runtimeState;
}
export function getDagExecutionStatus(project) {
    const phaseStatusPath = phaseStatusPathForProject(project);
    if (!fs.existsSync(phaseStatusPath)) {
        return null;
    }
    return summarizeDagRuntimeState(loadDagRuntimeState(project));
}
export function loadDagForProject(project) {
    const factoryState = loadProjectState(project);
    if (factoryState.status === "REQUIREMENT_PENDING" ||
        factoryState.status === "WAITING_FOR_PLAN_APPROVAL") {
        throw new Error("Cannot load a DAG before the project plan is approved.");
    }
    const dag = loadDagDefinitionFromDisk(project);
    const runDirectory = projectRunDirectory(project);
    fs.mkdirSync(runDirectory, { recursive: true });
    const existingPhaseStates = fs.existsSync(phaseStatusPathForProject(project))
        ? loadDagRuntimeState(project).phases
        : undefined;
    const now = new Date().toISOString();
    const runtimeState = {
        schemaVersion: 1,
        project: factoryState.project,
        projectSlug: factoryState.projectSlug,
        loadedAt: existingPhaseStates ? loadDagRuntimeState(project).loadedAt : now,
        updatedAt: now,
        phases: mergePhaseStateMap(dag, existingPhaseStates)
    };
    persistDagRuntimeState(runtimeState);
    for (const phase of dag.phases) {
        if (!existingPhaseStates?.[phase.id]) {
            appendFactoryEvent({
                project,
                type: "PHASE_STATUS_CHANGED",
                phase: {
                    id: phase.id,
                    next: "PENDING"
                },
                details: {
                    phaseName: phase.name
                }
            });
        }
    }
    appendFactoryEvent({
        project,
        type: "DAG_LOADED",
        details: {
            dagPath: dagPathForProject(project),
            phaseStatusPath: phaseStatusPathForProject(project),
            phases: dag.phases.length
        }
    });
    markDagCreatedInFactoryState(project);
    return runtimeState;
}
export async function runDag(project, maxPhases) {
    return executeDag(project, {
        mode: "run",
        maxPhases
    });
}
export async function resumeDag(project, maxPhases) {
    return executeDag(project, {
        mode: "resume",
        maxPhases
    });
}
export function summarizeDagRuntimeState(runtimeState) {
    const phases = Object.values(runtimeState.phases);
    return {
        total: phases.length,
        pending: phases.filter((phase) => phase.status === "PENDING").length,
        running: phases.filter((phase) => phase.status === "RUNNING").length,
        passed: phases.filter((phase) => phase.status === "PASSED").length,
        failed: phases.filter((phase) => phase.status === "FAILED").length,
        repairing: phases.filter((phase) => phase.status === "REPAIRING").length,
        complete: phases.length > 0 && phases.every((phase) => phase.status === "PASSED")
    };
}
async function executeDag(project, options) {
    const dag = loadDagDefinitionFromDisk(project);
    let runtimeState = loadDagRuntimeState(project);
    const executedPhases = [];
    appendFactoryEvent({
        project,
        type: options.mode === "resume" ? "DAG_RESUME_STARTED" : "DAG_RUN_STARTED",
        details: {
            maxPhases: options.maxPhases ?? null
        }
    });
    if (options.mode === "resume") {
        runtimeState = recoverInterruptedPhases(project, runtimeState);
    }
    if (isDagComplete(runtimeState.phases)) {
        const summary = summarizeDagRuntimeState(runtimeState);
        appendFactoryEvent({
            project,
            type: options.mode === "resume" ? "DAG_RESUME_COMPLETED" : "DAG_RUN_COMPLETED",
            details: {
                executedPhases,
                summary,
                alreadyComplete: true
            }
        });
        return {
            success: true,
            project,
            dagPath: dagPathForProject(project),
            phaseStatusPath: phaseStatusPathForProject(project),
            summary,
            executedPhases,
            message: "DAG is already complete. Runtime proof remains pending."
        };
    }
    const blockingPhaseStates = getBlockingPhaseStates(runtimeState.phases);
    if (blockingPhaseStates.length > 0) {
        const summary = summarizeDagRuntimeState(runtimeState);
        appendFactoryEvent({
            project,
            type: "DAG_RUN_BLOCKED",
            details: {
                blockingPhases: blockingPhaseStates.map((phaseState) => ({
                    id: phaseState.id,
                    status: phaseState.status
                }))
            }
        });
        return {
            success: false,
            project,
            dagPath: dagPathForProject(project),
            phaseStatusPath: phaseStatusPathForProject(project),
            summary,
            executedPhases,
            message: options.mode === "run"
                ? "DAG is blocked by running, failed, or repairing phases. Use resume for interrupted RUNNING phases."
                : "DAG is blocked by failed or repairing phases."
        };
    }
    transitionFactoryState(project, "PHASE_RUNNING", "DAG execution started");
    while (true) {
        if (options.maxPhases !== undefined && executedPhases.length >= options.maxPhases) {
            const summary = summarizeDagRuntimeState(runtimeState);
            appendFactoryEvent({
                project,
                type: "DAG_RUN_PAUSED",
                details: {
                    reason: "maxPhases reached",
                    executedPhases
                }
            });
            return {
                success: true,
                project,
                dagPath: dagPathForProject(project),
                phaseStatusPath: phaseStatusPathForProject(project),
                summary,
                executedPhases,
                message: "DAG execution paused before all phases completed."
            };
        }
        const nextPhase = getNextRunnablePhase(dag, runtimeState.phases);
        if (!nextPhase) {
            break;
        }
        const phaseResult = await executePhase(project, nextPhase, runtimeState);
        runtimeState = phaseResult.runtimeState;
        executedPhases.push(nextPhase.id);
        if (!phaseResult.success) {
            const currentFactoryState = loadProjectState(project);
            if (currentFactoryState.status === "PHASE_RUNNING") {
                transitionFactoryState(project, "PHASE_FAILED_REPAIRING", `Phase ${nextPhase.id} failed`);
            }
            const summary = summarizeDagRuntimeState(runtimeState);
            appendFactoryEvent({
                project,
                type: "DAG_RUN_FAILED",
                details: {
                    failedPhase: nextPhase.id,
                    summary
                }
            });
            return {
                success: false,
                project,
                dagPath: dagPathForProject(project),
                phaseStatusPath: phaseStatusPathForProject(project),
                summary,
                executedPhases,
                message: phaseResult.message ?? `Phase failed: ${nextPhase.id}`
            };
        }
    }
    const summary = summarizeDagRuntimeState(runtimeState);
    if (isDagComplete(runtimeState.phases)) {
        transitionFactoryState(project, "DAG_COMPLETE_RUNTIME_PENDING", "All DAG phases passed");
        appendFactoryEvent({
            project,
            type: options.mode === "resume" ? "DAG_RESUME_COMPLETED" : "DAG_RUN_COMPLETED",
            details: {
                executedPhases,
                summary
            }
        });
        return {
            success: true,
            project,
            dagPath: dagPathForProject(project),
            phaseStatusPath: phaseStatusPathForProject(project),
            summary,
            executedPhases,
            message: "All DAG phases passed. Runtime proof remains pending."
        };
    }
    appendFactoryEvent({
        project,
        type: "DAG_RUN_BLOCKED",
        details: {
            summary
        }
    });
    return {
        success: false,
        project,
        dagPath: dagPathForProject(project),
        phaseStatusPath: phaseStatusPathForProject(project),
        summary,
        executedPhases,
        message: "No runnable phase is available."
    };
}
async function executePhase(project, phase, runtimeState) {
    const startedState = transitionPhaseStatus(project, runtimeState, phase.id, "RUNNING", {
        phaseName: phase.name
    });
    const workerResult = await runPhaseWorker(project, phase);
    if (workerResult.success) {
        const validationResult = await runPhaseValidators(project, phase);
        if (!validationResult.success) {
            const repairingState = transitionPhaseStatus(project, startedState, phase.id, "REPAIRING", {
                phaseName: phase.name,
                reason: "Validation failed; repair runner starting.",
                validation: createValidationSnapshot(validationResult)
            });
            transitionFactoryState(project, "PHASE_FAILED_REPAIRING", `Validation failed for phase ${phase.id}; repair runner starting`);
            const repairResult = await runRepairForValidationFailure(project, phase, validationResult);
            if (repairResult.success) {
                transitionFactoryState(project, "PHASE_RUNNING", `Repair succeeded for phase ${phase.id}`);
                const passedState = transitionPhaseStatus(project, repairingState, phase.id, "PASSED", {
                    phaseName: phase.name,
                    exitCode: workerResult.exitCode,
                    stdout: `Worker stdout: ${workerResult.stdoutPath}`,
                    stderr: `Worker stderr: ${workerResult.stderrPath}`,
                    worker: createWorkerSnapshot(workerResult),
                    validation: createValidationSnapshot(repairResult.finalValidation),
                    repair: createRepairSnapshot(repairResult)
                });
                return {
                    success: true,
                    runtimeState: passedState
                };
            }
            const failedValidation = repairResult.finalValidation.results.find((result) => {
                return result.exitCode !== 0;
            });
            const failedState = transitionPhaseStatus(project, repairingState, phase.id, "FAILED", {
                phaseName: phase.name,
                exitCode: failedValidation?.exitCode,
                stdout: failedValidation?.stdout,
                stderr: failedValidation?.stderr ||
                    `Repair stopped for phase ${phase.id}: ${repairResult.stopReason}.`,
                validation: createValidationSnapshot(repairResult.finalValidation),
                repair: createRepairSnapshot(repairResult)
            });
            transitionFactoryState(project, "RUNTIME_FAILED", `Repair stopped for phase ${phase.id}: ${repairResult.stopReason}`);
            return {
                success: false,
                runtimeState: failedState,
                message: `Phase ${phase.id} failed validation and repair stopped: ${repairResult.stopReason}`
            };
        }
        const passedState = transitionPhaseStatus(project, startedState, phase.id, "PASSED", {
            phaseName: phase.name,
            exitCode: workerResult.exitCode,
            stdout: `Worker stdout: ${workerResult.stdoutPath}`,
            stderr: `Worker stderr: ${workerResult.stderrPath}`,
            worker: createWorkerSnapshot(workerResult),
            validation: createValidationSnapshot(validationResult)
        });
        return {
            success: true,
            runtimeState: passedState
        };
    }
    const failedState = transitionPhaseStatus(project, startedState, phase.id, "FAILED", {
        phaseName: phase.name,
        exitCode: workerResult.exitCode,
        stdout: `Worker stdout: ${workerResult.stdoutPath}`,
        stderr: `Worker stderr: ${workerResult.stderrPath}`,
        worker: createWorkerSnapshot(workerResult)
    });
    return {
        success: false,
        runtimeState: failedState,
        message: `Phase ${phase.id} worker failed with signature ${workerResult.errorSignature}`
    };
}
function recoverInterruptedPhases(project, runtimeState) {
    let nextRuntimeState = runtimeState;
    for (const phaseState of Object.values(runtimeState.phases)) {
        if (phaseState.status !== "RUNNING") {
            continue;
        }
        nextRuntimeState = transitionPhaseStatus(project, nextRuntimeState, phaseState.id, "PENDING", {
            reason: "Recovered RUNNING phase during resume."
        });
    }
    return nextRuntimeState;
}
function transitionPhaseStatus(project, runtimeState, phaseId, nextStatus, details) {
    const currentPhaseState = runtimeState.phases[phaseId];
    if (!currentPhaseState) {
        throw new Error(`Cannot transition unknown phase: ${phaseId}`);
    }
    const now = new Date().toISOString();
    const previousStatus = currentPhaseState.status;
    const nextPhaseState = {
        ...currentPhaseState,
        status: nextStatus
    };
    if (nextStatus === "RUNNING") {
        nextPhaseState.startedAt = now;
        nextPhaseState.completedAt = undefined;
        nextPhaseState.failedAt = undefined;
        nextPhaseState.repairingAt = undefined;
        nextPhaseState.attempts = currentPhaseState.attempts + 1;
        nextPhaseState.lastExitCode = undefined;
        nextPhaseState.lastError = undefined;
        nextPhaseState.lastStdout = undefined;
        nextPhaseState.lastStderr = undefined;
    }
    if (nextStatus === "PASSED") {
        nextPhaseState.completedAt = now;
        nextPhaseState.failedAt = undefined;
        nextPhaseState.lastExitCode = readNumberOrNull(details?.exitCode);
        nextPhaseState.lastStdout = readString(details?.stdout);
        nextPhaseState.lastStderr = readString(details?.stderr);
        nextPhaseState.lastWorker = readWorkerSnapshot(details?.worker);
        nextPhaseState.lastValidation = readValidationSnapshot(details?.validation);
    }
    if (nextStatus === "FAILED") {
        nextPhaseState.failedAt = now;
        nextPhaseState.lastExitCode = readNumberOrNull(details?.exitCode);
        nextPhaseState.lastError = readString(details?.stderr) || readString(details?.stdout);
        nextPhaseState.lastStdout = readString(details?.stdout);
        nextPhaseState.lastStderr = readString(details?.stderr);
        nextPhaseState.lastWorker = readWorkerSnapshot(details?.worker);
        nextPhaseState.lastValidation = readValidationSnapshot(details?.validation);
    }
    if (nextStatus === "REPAIRING") {
        nextPhaseState.repairingAt = now;
    }
    if (nextStatus === "PENDING") {
        nextPhaseState.startedAt = undefined;
        nextPhaseState.completedAt = undefined;
        nextPhaseState.failedAt = undefined;
        nextPhaseState.repairingAt = undefined;
        nextPhaseState.lastExitCode = undefined;
        nextPhaseState.lastError = undefined;
        nextPhaseState.lastStdout = undefined;
        nextPhaseState.lastStderr = undefined;
    }
    const nextRuntimeState = {
        ...runtimeState,
        updatedAt: now,
        phases: {
            ...runtimeState.phases,
            [phaseId]: nextPhaseState
        }
    };
    persistDagRuntimeState(nextRuntimeState);
    appendFactoryEvent({
        project,
        type: "PHASE_STATUS_CHANGED",
        phase: {
            id: phaseId,
            previous: previousStatus,
            next: nextStatus
        },
        details
    });
    return nextRuntimeState;
}
function transitionFactoryState(project, nextStatus, reason) {
    const currentState = loadProjectState(project);
    if (currentState.status === nextStatus) {
        return;
    }
    const nextState = transitionProjectStatus(currentState, nextStatus);
    saveProjectState(nextState);
    appendFactoryEvent({
        project,
        type: "FACTORY_STATUS_CHANGED",
        status: {
            previous: currentState.status,
            next: nextStatus
        },
        details: {
            reason
        }
    });
}
function markDagCreatedInFactoryState(project) {
    const currentState = loadProjectState(project);
    if (currentState.status === "PLAN_APPROVED" ||
        currentState.status === "ARCHITECTURE_CREATED") {
        transitionFactoryState(project, "DAG_CREATED", "DAG loaded");
        return;
    }
    if (currentState.status === "DAG_CREATED" ||
        currentState.status === "DAG_COMPLETE_RUNTIME_PENDING" ||
        currentState.status === "RUNTIME_FAILED" ||
        currentState.status === "COMPLETE") {
        return;
    }
    throw new Error(`Cannot load DAG while factory status is ${currentState.status}.`);
}
function persistDagRuntimeState(runtimeState) {
    fs.mkdirSync(projectRunDirectory(runtimeState.projectSlug), { recursive: true });
    fs.writeFileSync(phaseStatusPathForProject(runtimeState.projectSlug), `${JSON.stringify(runtimeState, null, 2)}\n`, "utf8");
}
function readString(value) {
    return typeof value === "string" ? value : undefined;
}
function readNumberOrNull(value) {
    return typeof value === "number" || value === null ? value : undefined;
}
function createValidationSnapshot(validationResult) {
    return {
        success: validationResult.success,
        ranAt: validationResult.completedAt,
        results: validationResult.results.map((result) => ({
            validatorId: result.validatorId,
            type: result.type,
            exitCode: result.exitCode,
            resultLogPath: result.resultLogPath,
            stdoutLogPath: result.stdoutLogPath,
            stderrLogPath: result.stderrLogPath
        }))
    };
}
function readValidationSnapshot(value) {
    if (!value || typeof value !== "object") {
        return undefined;
    }
    return value;
}
function createWorkerSnapshot(workerResult) {
    return {
        success: workerResult.success,
        exitCode: workerResult.exitCode,
        stdoutPath: workerResult.stdoutPath,
        stderrPath: workerResult.stderrPath,
        errorSignature: workerResult.errorSignature,
        attempts: workerResult.attempts,
        timedOut: workerResult.timedOut,
        workerType: workerResult.workerType
    };
}
function readWorkerSnapshot(value) {
    if (!value || typeof value !== "object") {
        return undefined;
    }
    return value;
}
function createRepairSnapshot(repairResult) {
    return {
        success: repairResult.success,
        attemptsUsed: repairResult.attemptsUsed,
        initialSignature: repairResult.initialSignature,
        finalSignature: repairResult.finalSignature,
        repeatedErrorSignature: repairResult.repeatedErrorSignature,
        noProgress: repairResult.noProgress,
        stopReason: repairResult.stopReason,
        repairHistoryPath: repairResult.repairHistoryPath
    };
}
//# sourceMappingURL=dagExecutor.js.map