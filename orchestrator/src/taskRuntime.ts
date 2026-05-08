import path from "path";
import fs from "fs";
import { execa } from "execa";
import { logger } from "./logger.js";

const WORKSPACE_ROOT = path.resolve(process.cwd(), "runtime/workspaces");
const TASK_LOG_ROOT = path.resolve(process.cwd(), "runtime/tasks");

export type RuntimeTask = {
  id: string;
  name: string;
  cwd?: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
};

export type RuntimeTaskResult = {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  logFile: string;
};

export async function runTask(task: RuntimeTask): Promise<RuntimeTaskResult> {
  fs.mkdirSync(TASK_LOG_ROOT, { recursive: true });

  const started = Date.now();

  const cwd = task.cwd || WORKSPACE_ROOT;

  logger.info({
    type: "TASK_START",
    task: task.name,
    command: task.command,
    args: task.args
  });

  try {
    const result = await execa(task.command, task.args || [], {
      cwd,
      env: task.env,
      all: true
    });

    const durationMs = Date.now() - started;

    const logFile = path.join(TASK_LOG_ROOT, `${task.id}.log`);

    fs.writeFileSync(
      logFile,
      [
        "STDOUT:",
        result.stdout || "",
        "",
        "STDERR:",
        result.stderr || ""
      ].join("\n")
    );

    logger.info({
      type: "TASK_SUCCESS",
      task: task.name,
      durationMs
    });

    return {
      success: true,
      exitCode: result.exitCode || 0,
      stdout: result.stdout,
      stderr: result.stderr,
      durationMs,
      logFile
    };
  } catch (error: any) {
    const durationMs = Date.now() - started;

    const logFile = path.join(TASK_LOG_ROOT, `${task.id}.log`);

    fs.writeFileSync(
      logFile,
      [
        "STDOUT:",
        error.stdout || "",
        "",
        "STDERR:",
        error.stderr || "",
        "",
        "ERROR:",
        error.message || ""
      ].join("\n")
    );

    logger.error({
      type: "TASK_FAILURE",
      task: task.name,
      durationMs,
      error: error.message
    });

    return {
      success: false,
      exitCode: error.exitCode || 1,
      stdout: error.stdout || "",
      stderr: error.stderr || error.message || "",
      durationMs,
      logFile
    };
  }
}
