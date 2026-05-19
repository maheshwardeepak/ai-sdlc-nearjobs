import crypto from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { FACTORY_RUNTIME_ROOT, slugifyProjectName } from "./factoryState.js";
import { appendFactoryEvent } from "./eventLog.js";
const DEFAULT_WORKER_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_WORKER_RETRIES = 10;
export function workerLogsDirectoryForProject(project) {
    return path.join(FACTORY_RUNTIME_ROOT, "runs", slugifyProjectName(project), "worker-logs");
}
export async function runPhaseWorker(project, phase) {
    const workerType = phase.worker?.type ?? "shell";
    const retries = Math.min(phase.worker?.retries ?? phase.retries ?? 0, MAX_WORKER_RETRIES);
    const maxAttempts = retries + 1;
    const timeoutMs = phase.worker?.timeoutMs ?? phase.timeoutMs ?? DEFAULT_WORKER_TIMEOUT_MS;
    let lastAttempt = null;
    appendFactoryEvent({
        project,
        type: "WORKER_STARTED",
        phase: {
            id: phase.id,
            next: "RUNNING"
        },
        details: {
            phaseName: phase.name,
            workerType,
            maxAttempts,
            timeoutMs
        }
    });
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        appendFactoryEvent({
            project,
            type: "WORKER_ATTEMPT_STARTED",
            phase: {
                id: phase.id,
                next: "RUNNING"
            },
            details: {
                attempt,
                maxAttempts,
                workerType
            }
        });
        const attemptResult = await runWorkerAttempt(project, phase, attempt, workerType, timeoutMs);
        lastAttempt = attemptResult;
        appendFactoryEvent({
            project,
            type: attemptResult.exitCode === 0 ? "WORKER_ATTEMPT_PASSED" : "WORKER_ATTEMPT_FAILED",
            phase: {
                id: phase.id,
                next: "RUNNING"
            },
            details: {
                attempt,
                maxAttempts,
                workerType,
                exitCode: attemptResult.exitCode,
                timedOut: attemptResult.timedOut,
                stdoutPath: attemptResult.stdoutPath,
                stderrPath: attemptResult.stderrPath,
                resultPath: attemptResult.resultPath,
                errorSignature: attemptResult.errorSignature
            }
        });
        if (attemptResult.exitCode === 0) {
            const result = createWorkerRunResult(attemptResult, attempt);
            appendFactoryEvent({
                project,
                type: "WORKER_COMPLETED",
                phase: {
                    id: phase.id,
                    next: "RUNNING"
                },
                details: {
                    attempts: result.attempts,
                    workerType: result.workerType,
                    exitCode: result.exitCode,
                    stdoutPath: result.stdoutPath,
                    stderrPath: result.stderrPath,
                    resultPath: result.resultPath
                }
            });
            return result;
        }
    }
    if (!lastAttempt) {
        throw new Error(`Worker did not run any attempt for phase ${phase.id}.`);
    }
    const result = createWorkerRunResult(lastAttempt, maxAttempts);
    appendFactoryEvent({
        project,
        type: "WORKER_FAILED",
        phase: {
            id: phase.id,
            next: "FAILED"
        },
        details: {
            attempts: result.attempts,
            workerType: result.workerType,
            exitCode: result.exitCode,
            timedOut: result.timedOut,
            stdoutPath: result.stdoutPath,
            stderrPath: result.stderrPath,
            resultPath: result.resultPath,
            errorSignature: result.errorSignature
        }
    });
    return result;
}
async function runWorkerAttempt(project, phase, attempt, workerType, timeoutMs) {
    const startedAt = new Date().toISOString();
    const logsDirectory = path.join(workerLogsDirectoryForProject(project), sanitizePathSegment(phase.id));
    const sequence = `${startedAt.replace(/[:.]/g, "-")}-attempt-${attempt}`;
    const stdoutPath = path.join(logsDirectory, `${sequence}.stdout.log`);
    const stderrPath = path.join(logsDirectory, `${sequence}.stderr.log`);
    const resultPath = path.join(logsDirectory, `${sequence}.json`);
    const command = resolveWorkerCommand(phase, workerType);
    const cwd = resolveWorkerCwd(project, phase);
    fs.mkdirSync(logsDirectory, { recursive: true });
    const commandResult = await runShellCommand(command, cwd, {
        ...phase.env,
        ...phase.worker?.env,
        CODEX_WORKER_PROMPT: phase.worker?.prompt
    }, timeoutMs);
    const completedAt = new Date().toISOString();
    const errorSignature = createErrorSignature({
        phaseId: phase.id,
        workerType,
        command,
        exitCode: commandResult.exitCode,
        timedOut: commandResult.timedOut,
        stdout: commandResult.stdout,
        stderr: commandResult.stderr
    });
    const result = {
        attempt,
        workerType,
        command,
        cwd,
        timeoutMs,
        startedAt,
        completedAt,
        exitCode: commandResult.exitCode,
        timedOut: commandResult.timedOut,
        stdout: commandResult.stdout,
        stderr: commandResult.stderr,
        stdoutPath,
        stderrPath,
        resultPath,
        errorSignature
    };
    fs.writeFileSync(stdoutPath, result.stdout, "utf8");
    fs.writeFileSync(stderrPath, result.stderr, "utf8");
    fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    return result;
}
function resolveWorkerCommand(phase, workerType) {
    const configuredCommand = phase.worker?.command ?? phase.command;
    if (configuredCommand && configuredCommand.trim().length > 0) {
        return configuredCommand;
    }
    if (workerType === "codex-placeholder") {
        return [
            "node",
            "-e",
            quoteShellArgument("const prompt = process.env.CODEX_WORKER_PROMPT || ''; " +
                "console.log(`Codex worker placeholder executed: ${prompt}`);")
        ].join(" ");
    }
    return [
        "node",
        "-e",
        quoteShellArgument("console.log('No phase worker command configured. Treating phase work as a no-op.');")
    ].join(" ");
}
function resolveWorkerCwd(project, phase) {
    const runDirectory = path.join(FACTORY_RUNTIME_ROOT, "runs", slugifyProjectName(project));
    const configuredCwd = phase.worker?.cwd ?? phase.cwd;
    if (!configuredCwd || configuredCwd.trim().length === 0) {
        return runDirectory;
    }
    return path.resolve(runDirectory, configuredCwd);
}
function runShellCommand(command, cwd, env, timeoutMs) {
    if (!fs.existsSync(cwd)) {
        return Promise.resolve({
            exitCode: 1,
            timedOut: false,
            stdout: "",
            stderr: `Worker working directory does not exist: ${cwd}`
        });
    }
    return new Promise((resolve) => {
        const child = spawn(command, {
            cwd,
            env: {
                ...process.env,
                ...env
            },
            shell: true,
            stdio: ["ignore", "pipe", "pipe"]
        });
        const stdoutChunks = [];
        const stderrChunks = [];
        let settled = false;
        let timedOut = false;
        let forceKillTimer;
        const timeout = timeoutMs > 0
            ? setTimeout(() => {
                timedOut = true;
                child.kill("SIGTERM");
                forceKillTimer = setTimeout(() => {
                    child.kill("SIGKILL");
                }, 2000);
            }, timeoutMs)
            : undefined;
        child.stdout.on("data", (chunk) => {
            stdoutChunks.push(chunk);
        });
        child.stderr.on("data", (chunk) => {
            stderrChunks.push(chunk);
        });
        child.on("error", (error) => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimer(timeout);
            clearTimer(forceKillTimer);
            resolve({
                exitCode: 1,
                timedOut,
                stdout: Buffer.concat(stdoutChunks).toString("utf8"),
                stderr: error.message
            });
        });
        child.on("close", (exitCode) => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimer(timeout);
            clearTimer(forceKillTimer);
            resolve({
                exitCode: timedOut ? 124 : exitCode,
                timedOut,
                stdout: Buffer.concat(stdoutChunks).toString("utf8"),
                stderr: Buffer.concat(stderrChunks).toString("utf8")
            });
        });
    });
}
function createWorkerRunResult(attemptResult, attempts) {
    return {
        success: attemptResult.exitCode === 0,
        exitCode: attemptResult.exitCode,
        stdoutPath: attemptResult.stdoutPath,
        stderrPath: attemptResult.stderrPath,
        errorSignature: attemptResult.errorSignature,
        attempts,
        timedOut: attemptResult.timedOut,
        workerType: attemptResult.workerType,
        resultPath: attemptResult.resultPath
    };
}
function createErrorSignature(input) {
    const signatureMaterial = {
        phaseId: input.phaseId,
        workerType: input.workerType,
        command: input.command,
        exitCode: input.exitCode,
        timedOut: input.timedOut,
        output: normalizeOutput(input.stderr || input.stdout)
    };
    return crypto
        .createHash("sha256")
        .update(JSON.stringify(signatureMaterial))
        .digest("hex");
}
function normalizeOutput(value) {
    return value.replace(/\s+/g, " ").trim().slice(0, 2000);
}
function sanitizePathSegment(value) {
    const sanitized = value.trim().toLowerCase().replace(/[^a-z0-9.-]+/g, "-");
    return sanitized || "item";
}
function quoteShellArgument(value) {
    return `'${value.replace(/'/g, "'\\''")}'`;
}
function clearTimer(timer) {
    if (timer) {
        clearTimeout(timer);
    }
}
//# sourceMappingURL=workerRunner.js.map