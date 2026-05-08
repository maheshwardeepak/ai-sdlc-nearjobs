import fs from "fs";
import path from "path";
import { execa } from "execa";
import { logger } from "./logger.js";

const OPENCLAW_OUTPUT_ROOT = path.resolve(
  process.cwd(),
  "runtime/openclaw"
);

export type OpenClawExecution = {
  workerId: string;
  workspacePath: string;
  prompt: string;
};

export type OpenClawExecutionResult = {
  success: boolean;
  outputFile: string;
  stdout: string;
  stderr: string;
};

export async function executeOpenClawTask(
  execution: OpenClawExecution
): Promise<OpenClawExecutionResult> {
  fs.mkdirSync(OPENCLAW_OUTPUT_ROOT, { recursive: true });

  const outputFile = path.join(
    OPENCLAW_OUTPUT_ROOT,
    `${execution.workerId}.md`
  );

  logger.info({
    type: "OPENCLAW_EXECUTION_START",
    workerId: execution.workerId
  });

  try {
    const result = await execa(
      "openclaw",
      [
        "infer",
        "model",
        "run",
        "--prompt",
        execution.prompt
      ],
      {
        cwd: execution.workspacePath
      }
    );

    fs.writeFileSync(
      outputFile,
      [
        "# OpenClaw Output",
        "",
        result.stdout || ""
      ].join("\n")
    );

    logger.info({
      type: "OPENCLAW_EXECUTION_SUCCESS",
      workerId: execution.workerId
    });

    return {
      success: true,
      outputFile,
      stdout: result.stdout,
      stderr: result.stderr
    };
  } catch (error: any) {
    logger.error({
      type: "OPENCLAW_EXECUTION_FAILURE",
      workerId: execution.workerId,
      error: error.message
    });

    return {
      success: false,
      outputFile,
      stdout: error.stdout || "",
      stderr: error.stderr || error.message || ""
    };
  }
}
