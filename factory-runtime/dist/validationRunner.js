import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { FACTORY_RUNTIME_ROOT, slugifyProjectName } from "./factoryState.js";
import { appendFactoryEvent } from "./eventLog.js";
export function validationLogsDirectoryForProject(project) {
    return path.join(FACTORY_RUNTIME_ROOT, "runs", slugifyProjectName(project), "logs");
}
export async function runPhaseValidators(project, phase) {
    const startedAt = new Date().toISOString();
    const phaseLogsDirectory = path.join(validationLogsDirectoryForProject(project), sanitizePathSegment(phase.id));
    fs.mkdirSync(phaseLogsDirectory, { recursive: true });
    if (phase.validators.length === 0) {
        appendFactoryEvent({
            project,
            type: "VALIDATION_SKIPPED",
            phase: {
                id: phase.id,
                next: "RUNNING"
            },
            details: {
                phaseName: phase.name,
                reason: "No validators configured for phase."
            }
        });
        return {
            success: true,
            phaseId: phase.id,
            startedAt,
            completedAt: new Date().toISOString(),
            results: [],
            logsDirectory: phaseLogsDirectory
        };
    }
    appendFactoryEvent({
        project,
        type: "VALIDATION_STARTED",
        phase: {
            id: phase.id,
            next: "RUNNING"
        },
        details: {
            phaseName: phase.name,
            validators: phase.validators.map((validator) => ({
                id: validator.id,
                type: validator.type
            }))
        }
    });
    const results = [];
    for (const validator of phase.validators) {
        const result = await runValidator(project, phase, validator, phaseLogsDirectory);
        results.push(result);
        if (result.exitCode !== 0) {
            const completedAt = new Date().toISOString();
            appendFactoryEvent({
                project,
                type: "VALIDATION_FAILED",
                phase: {
                    id: phase.id,
                    next: "FAILED"
                },
                details: {
                    phaseName: phase.name,
                    validatorId: validator.id,
                    validatorType: validator.type,
                    exitCode: result.exitCode,
                    resultLogPath: result.resultLogPath,
                    stdoutLogPath: result.stdoutLogPath,
                    stderrLogPath: result.stderrLogPath
                }
            });
            return {
                success: false,
                phaseId: phase.id,
                startedAt,
                completedAt,
                results,
                logsDirectory: phaseLogsDirectory
            };
        }
    }
    const completedAt = new Date().toISOString();
    appendFactoryEvent({
        project,
        type: "VALIDATION_PASSED",
        phase: {
            id: phase.id,
            next: "PASSED"
        },
        details: {
            phaseName: phase.name,
            validators: results.map((result) => ({
                id: result.validatorId,
                type: result.type,
                exitCode: result.exitCode,
                resultLogPath: result.resultLogPath
            }))
        }
    });
    return {
        success: true,
        phaseId: phase.id,
        startedAt,
        completedAt,
        results,
        logsDirectory: phaseLogsDirectory
    };
}
async function runValidator(project, phase, validator, phaseLogsDirectory) {
    const startedAt = new Date().toISOString();
    const command = resolveValidatorCommand(validator);
    const cwd = resolveValidatorCwd(project, validator.cwd ?? phase.cwd);
    const sequence = createLogSequence(startedAt, validator);
    const resultLogPath = path.join(phaseLogsDirectory, `${sequence}.json`);
    const stdoutLogPath = path.join(phaseLogsDirectory, `${sequence}.stdout.log`);
    const stderrLogPath = path.join(phaseLogsDirectory, `${sequence}.stderr.log`);
    const commandResult = await runShellCommand(command, cwd, validator.env);
    const completedAt = new Date().toISOString();
    const result = {
        validatorId: validator.id,
        validatorName: validator.name,
        type: validator.type,
        command,
        cwd,
        startedAt,
        completedAt,
        exitCode: commandResult.exitCode,
        stdout: commandResult.stdout,
        stderr: commandResult.stderr,
        resultLogPath,
        stdoutLogPath,
        stderrLogPath
    };
    fs.writeFileSync(stdoutLogPath, result.stdout, "utf8");
    fs.writeFileSync(stderrLogPath, result.stderr, "utf8");
    fs.writeFileSync(resultLogPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    return result;
}
function resolveValidatorCommand(validator) {
    if (validator.command && validator.command.trim().length > 0) {
        return validator.command;
    }
    switch (validator.type) {
        case "shell":
            throw new Error(`Shell validator ${validator.id} requires command.`);
        case "backend-build":
            return "mvn -q -DskipTests package";
        case "frontend-build":
            return "npm install && npm run build";
        case "docker-compose-config":
            return "docker compose config";
        case "playwright":
            return "npx playwright test --workers=1";
        case "runtime-health-curl":
            if (!validator.url) {
                throw new Error(`Runtime health validator ${validator.id} requires url or command.`);
            }
            return `curl -fsS ${quoteShellArgument(validator.url)}`;
    }
}
function resolveValidatorCwd(project, cwd) {
    const runDirectory = path.join(FACTORY_RUNTIME_ROOT, "runs", slugifyProjectName(project));
    if (!cwd || cwd.trim().length === 0) {
        return runDirectory;
    }
    return path.resolve(runDirectory, cwd);
}
function runShellCommand(command, cwd, env) {
    if (!fs.existsSync(cwd)) {
        return Promise.resolve({
            exitCode: 1,
            stdout: "",
            stderr: `Validator working directory does not exist: ${cwd}`
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
        child.stdout.on("data", (chunk) => {
            stdoutChunks.push(chunk);
        });
        child.stderr.on("data", (chunk) => {
            stderrChunks.push(chunk);
        });
        child.on("error", (error) => {
            resolve({
                exitCode: 1,
                stdout: Buffer.concat(stdoutChunks).toString("utf8"),
                stderr: error.message
            });
        });
        child.on("close", (exitCode) => {
            resolve({
                exitCode,
                stdout: Buffer.concat(stdoutChunks).toString("utf8"),
                stderr: Buffer.concat(stderrChunks).toString("utf8")
            });
        });
    });
}
function createLogSequence(startedAt, validator) {
    return `${startedAt.replace(/[:.]/g, "-")}-${sanitizePathSegment(validator.id)}`;
}
function sanitizePathSegment(value) {
    const sanitized = value.trim().toLowerCase().replace(/[^a-z0-9.-]+/g, "-");
    return sanitized || "item";
}
function quoteShellArgument(value) {
    return `'${value.replace(/'/g, "'\\''")}'`;
}
//# sourceMappingURL=validationRunner.js.map