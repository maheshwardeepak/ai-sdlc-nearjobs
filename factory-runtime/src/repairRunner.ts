import crypto from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { FACTORY_RUNTIME_ROOT, slugifyProjectName } from "./factoryState.js";
import { appendFactoryEvent } from "./eventLog.js";
import type { DagPhase, PhaseRepairAction } from "./taskQueue.js";
import {
  type PhaseValidationResult,
  runPhaseValidators
} from "./validationRunner.js";

const MAX_REPAIR_ATTEMPTS_PER_SIGNATURE = 3;

export type RepairStopReason =
  | "VALIDATION_PASSED"
  | "NO_REPAIR_ACTIONS"
  | "MAX_ATTEMPTS_EXHAUSTED"
  | "REPAIR_COMMAND_FAILED"
  | "REPEATED_ERROR_SIGNATURE"
  | "NO_PROGRESS_REPAIR";

export interface RepairHistoryEntry {
  schemaVersion: 1;
  repairId: string;
  timestamp: string;
  project: string;
  projectSlug: string;
  phaseId: string;
  phaseName: string;
  status:
    | "SKIPPED"
    | "ATTEMPT_STARTED"
    | "ATTEMPT_COMPLETED"
    | "STOPPED";
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

interface CommandResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

export function repairHistoryPathForProject(project: string): string {
  return path.join(
    FACTORY_RUNTIME_ROOT,
    "runs",
    slugifyProjectName(project),
    "repair-history.jsonl"
  );
}

export async function runRepairForValidationFailure(
  project: string,
  phase: DagPhase,
  failedValidation: PhaseValidationResult
): Promise<RepairRunResult> {
  const repairHistoryPath = repairHistoryPathForProject(project);
  const initialSignature = createValidationFailureSignature(phase, failedValidation);
  let currentValidation = failedValidation;
  let currentSignature = initialSignature;
  let attemptsUsed = 0;

  if (phase.repairs.length === 0) {
    appendRepairHistory(project, {
      phase,
      status: "SKIPPED",
      attemptNumber: 0,
      signature: currentSignature,
      signatureAttemptsBefore: countAttemptsForSignature(project, currentSignature),
      validationBefore: snapshotValidation(phase, currentValidation),
      stopReason: "NO_REPAIR_ACTIONS"
    });

    appendFactoryEvent({
      project,
      type: "REPAIR_STOPPED",
      phase: {
        id: phase.id,
        next: "FAILED"
      },
      details: {
        reason: "NO_REPAIR_ACTIONS",
        signature: currentSignature,
        repairHistoryPath
      }
    });

    return {
      success: false,
      phaseId: phase.id,
      attemptsUsed,
      initialSignature,
      finalSignature: currentSignature,
      repeatedErrorSignature: false,
      noProgress: false,
      stopReason: "NO_REPAIR_ACTIONS",
      finalValidation: currentValidation,
      repairHistoryPath
    };
  }

  appendFactoryEvent({
    project,
    type: "REPAIR_STARTED",
    phase: {
      id: phase.id,
      next: "REPAIRING"
    },
    details: {
      signature: currentSignature,
      maxAttemptsPerSignature: MAX_REPAIR_ATTEMPTS_PER_SIGNATURE,
      repairActions: phase.repairs.map((repair) => repair.id),
      repairHistoryPath
    }
  });

  while (true) {
    const signatureAttemptsBefore = countAttemptsForSignature(project, currentSignature);

    if (signatureAttemptsBefore >= MAX_REPAIR_ATTEMPTS_PER_SIGNATURE) {
      const stopReason: RepairStopReason = "MAX_ATTEMPTS_EXHAUSTED";
      appendRepairHistory(project, {
        phase,
        status: "STOPPED",
        attemptNumber: attemptsUsed,
        signature: currentSignature,
        signatureAttemptsBefore,
        validationBefore: snapshotValidation(phase, currentValidation),
        stopReason
      });

      appendFactoryEvent({
        project,
        type: "REPAIR_STOPPED",
        phase: {
          id: phase.id,
          next: "FAILED"
        },
        details: {
          reason: stopReason,
          signature: currentSignature,
          attemptsUsed,
          repairHistoryPath
        }
      });

      return createFailureResult({
        phase,
        attemptsUsed,
        initialSignature,
        finalSignature: currentSignature,
        repeatedErrorSignature: false,
        noProgress: false,
        stopReason,
        finalValidation: currentValidation,
        repairHistoryPath
      });
    }

    const repairAction = phase.repairs[attemptsUsed % phase.repairs.length];
    const repairCwd = resolveRepairCwd(project, repairAction.cwd ?? phase.cwd);
    const attemptNumber = attemptsUsed + 1;

    appendRepairHistory(project, {
      phase,
      status: "ATTEMPT_STARTED",
      attemptNumber,
      signature: currentSignature,
      signatureAttemptsBefore,
      repairAction: {
        id: repairAction.id,
        name: repairAction.name,
        command: repairAction.command,
        cwd: repairCwd
      },
      validationBefore: snapshotValidation(phase, currentValidation)
    });

    appendFactoryEvent({
      project,
      type: "REPAIR_ATTEMPT_STARTED",
      phase: {
        id: phase.id,
        next: "REPAIRING"
      },
      details: {
        attemptNumber,
        signature: currentSignature,
        repairActionId: repairAction.id
      }
    });

    const commandResult = await runRepairCommand(repairAction, repairCwd);
    attemptsUsed += 1;

    if (commandResult.exitCode !== 0) {
      const stopReason: RepairStopReason = "REPAIR_COMMAND_FAILED";
      appendRepairHistory(project, {
        phase,
        status: "ATTEMPT_COMPLETED",
        attemptNumber,
        signature: currentSignature,
        signatureAttemptsBefore,
        repairAction: {
          id: repairAction.id,
          name: repairAction.name,
          command: repairAction.command,
          cwd: repairCwd
        },
        commandResult,
        validationBefore: snapshotValidation(phase, currentValidation),
        stopReason
      });

      appendFactoryEvent({
        project,
        type: "REPAIR_STOPPED",
        phase: {
          id: phase.id,
          next: "FAILED"
        },
        details: {
          reason: stopReason,
          attemptNumber,
          repairActionId: repairAction.id,
          exitCode: commandResult.exitCode,
          signature: currentSignature,
          repairHistoryPath
        }
      });

      return createFailureResult({
        phase,
        attemptsUsed,
        initialSignature,
        finalSignature: currentSignature,
        repeatedErrorSignature: false,
        noProgress: false,
        stopReason,
        finalValidation: currentValidation,
        repairHistoryPath
      });
    }

    const validationAfterRepair = await runPhaseValidators(project, phase);
    const nextSignature = createValidationFailureSignature(phase, validationAfterRepair);
    const repeatedErrorSignature = !validationAfterRepair.success && nextSignature === currentSignature;
    const noProgress = repeatedErrorSignature && validationSnapshotsEqual(
      snapshotValidation(phase, currentValidation),
      snapshotValidation(phase, validationAfterRepair)
    );

    if (validationAfterRepair.success) {
      appendRepairHistory(project, {
        phase,
        status: "ATTEMPT_COMPLETED",
        attemptNumber,
        signature: currentSignature,
        signatureAttemptsBefore,
        repairAction: {
          id: repairAction.id,
          name: repairAction.name,
          command: repairAction.command,
          cwd: repairCwd
        },
        commandResult,
        validationBefore: snapshotValidation(phase, currentValidation),
        validationAfter: snapshotValidation(phase, validationAfterRepair),
        stopReason: "VALIDATION_PASSED"
      });

      appendFactoryEvent({
        project,
        type: "REPAIR_SUCCEEDED",
        phase: {
          id: phase.id,
          next: "PASSED"
        },
        details: {
          attemptNumber,
          repairActionId: repairAction.id,
          initialSignature,
          repairHistoryPath
        }
      });

      return {
        success: true,
        phaseId: phase.id,
        attemptsUsed,
        initialSignature,
        finalSignature: nextSignature,
        repeatedErrorSignature: false,
        noProgress: false,
        stopReason: "VALIDATION_PASSED",
        finalValidation: validationAfterRepair,
        repairHistoryPath
      };
    }

    appendRepairHistory(project, {
      phase,
      status: "ATTEMPT_COMPLETED",
      attemptNumber,
      signature: currentSignature,
      signatureAttemptsBefore,
      repairAction: {
        id: repairAction.id,
        name: repairAction.name,
        command: repairAction.command,
        cwd: repairCwd
      },
      commandResult,
      validationBefore: snapshotValidation(phase, currentValidation),
      validationAfter: snapshotValidation(phase, validationAfterRepair),
      repeatedErrorSignature,
      noProgress,
      stopReason: noProgress
        ? "NO_PROGRESS_REPAIR"
        : repeatedErrorSignature
          ? "REPEATED_ERROR_SIGNATURE"
          : undefined
    });

    if (noProgress || repeatedErrorSignature) {
      const stopReason: RepairStopReason = noProgress
        ? "NO_PROGRESS_REPAIR"
        : "REPEATED_ERROR_SIGNATURE";

      appendFactoryEvent({
        project,
        type: "REPAIR_STOPPED",
        phase: {
          id: phase.id,
          next: "FAILED"
        },
        details: {
          reason: stopReason,
          attemptNumber,
          repairActionId: repairAction.id,
          initialSignature,
          finalSignature: nextSignature,
          repairHistoryPath
        }
      });

      return createFailureResult({
        phase,
        attemptsUsed,
        initialSignature,
        finalSignature: nextSignature,
        repeatedErrorSignature,
        noProgress,
        stopReason,
        finalValidation: validationAfterRepair,
        repairHistoryPath
      });
    }

    currentValidation = validationAfterRepair;
    currentSignature = nextSignature;
  }
}

export function createValidationFailureSignature(
  phase: DagPhase,
  validationResult: PhaseValidationResult
): string {
  const failedResults = validationResult.results.filter((result) => result.exitCode !== 0);
  const relevantResults = failedResults.length > 0 ? failedResults : validationResult.results;
  const signatureMaterial = {
    phaseId: phase.id,
    validators: relevantResults.map((result) => ({
      validatorId: result.validatorId,
      type: result.type,
      exitCode: result.exitCode,
      stdout: normalizeOutput(result.stdout),
      stderr: normalizeOutput(result.stderr)
    }))
  };

  return crypto
    .createHash("sha256")
    .update(JSON.stringify(signatureMaterial))
    .digest("hex");
}

function appendRepairHistory(
  project: string,
  input: {
    phase: DagPhase;
    status: RepairHistoryEntry["status"];
    attemptNumber: number;
    signature: string;
    signatureAttemptsBefore: number;
    repairAction?: RepairHistoryEntry["repairAction"];
    commandResult?: RepairHistoryEntry["commandResult"];
    validationBefore: ValidationSnapshot;
    validationAfter?: ValidationSnapshot;
    repeatedErrorSignature?: boolean;
    noProgress?: boolean;
    stopReason?: RepairStopReason;
  }
): void {
  const repairHistoryPath = repairHistoryPathForProject(project);
  fs.mkdirSync(path.dirname(repairHistoryPath), { recursive: true });

  const entry: RepairHistoryEntry = {
    schemaVersion: 1,
    repairId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    project,
    projectSlug: slugifyProjectName(project),
    phaseId: input.phase.id,
    phaseName: input.phase.name,
    status: input.status,
    attemptNumber: input.attemptNumber,
    signature: input.signature,
    signatureAttemptsBefore: input.signatureAttemptsBefore,
    repairAction: input.repairAction,
    commandResult: input.commandResult,
    validationBefore: input.validationBefore,
    validationAfter: input.validationAfter,
    repeatedErrorSignature: input.repeatedErrorSignature,
    noProgress: input.noProgress,
    stopReason: input.stopReason
  };

  fs.appendFileSync(repairHistoryPath, `${JSON.stringify(entry)}\n`, "utf8");
}

function readRepairHistory(project: string): RepairHistoryEntry[] {
  const repairHistoryPath = repairHistoryPathForProject(project);

  if (!fs.existsSync(repairHistoryPath)) {
    return [];
  }

  return fs
    .readFileSync(repairHistoryPath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as RepairHistoryEntry);
}

function countAttemptsForSignature(project: string, signature: string): number {
  return readRepairHistory(project).filter((entry) => {
    return entry.signature === signature && entry.status === "ATTEMPT_COMPLETED";
  }).length;
}

function snapshotValidation(phase: DagPhase, validationResult: PhaseValidationResult): ValidationSnapshot {
  return {
    success: validationResult.success,
    signature: createValidationFailureSignature(phase, validationResult),
    results: validationResult.results.map((result) => ({
      validatorId: result.validatorId,
      type: result.type,
      exitCode: result.exitCode,
      stdoutDigest: hashOutput(result.stdout),
      stderrDigest: hashOutput(result.stderr),
      resultLogPath: result.resultLogPath
    }))
  };
}

function validationSnapshotsEqual(left: ValidationSnapshot, right: ValidationSnapshot): boolean {
  const normalize = (snapshot: ValidationSnapshot) => {
    return snapshot.results.map((result) => ({
      validatorId: result.validatorId,
      type: result.type,
      exitCode: result.exitCode,
      stdoutDigest: result.stdoutDigest,
      stderrDigest: result.stderrDigest
    }));
  };

  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}

function createFailureResult(input: {
  phase: DagPhase;
  attemptsUsed: number;
  initialSignature: string;
  finalSignature: string;
  repeatedErrorSignature: boolean;
  noProgress: boolean;
  stopReason: RepairStopReason;
  finalValidation: PhaseValidationResult;
  repairHistoryPath: string;
}): RepairRunResult {
  return {
    success: false,
    phaseId: input.phase.id,
    attemptsUsed: input.attemptsUsed,
    initialSignature: input.initialSignature,
    finalSignature: input.finalSignature,
    repeatedErrorSignature: input.repeatedErrorSignature,
    noProgress: input.noProgress,
    stopReason: input.stopReason,
    finalValidation: input.finalValidation,
    repairHistoryPath: input.repairHistoryPath
  };
}

function resolveRepairCwd(project: string, cwd: string | undefined): string {
  const runDirectory = path.join(FACTORY_RUNTIME_ROOT, "runs", slugifyProjectName(project));

  if (!cwd || cwd.trim().length === 0) {
    return runDirectory;
  }

  return path.resolve(runDirectory, cwd);
}

function runRepairCommand(
  repairAction: PhaseRepairAction,
  cwd: string
): Promise<CommandResult> {
  if (!fs.existsSync(cwd)) {
    return Promise.resolve({
      exitCode: 1,
      stdout: "",
      stderr: `Repair working directory does not exist: ${cwd}`
    });
  }

  return new Promise((resolve) => {
    const child = spawn(repairAction.command, {
      cwd,
      env: {
        ...process.env,
        ...repairAction.env
      },
      shell: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutChunks.push(chunk);
    });

    child.stderr.on("data", (chunk: Buffer) => {
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

function normalizeOutput(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 2000);
}

function hashOutput(value: string): string {
  return crypto.createHash("sha256").update(normalizeOutput(value)).digest("hex");
}
