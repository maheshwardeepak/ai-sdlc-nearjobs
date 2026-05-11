import fs from "fs";
import path from "path";
import { logger } from "./logger.js";
import { executeOpenClawTask } from "./openclawAdapter.js";
import { recordAgentRun } from "./db/runtimeDb.js";

export type WorkerExecution = {
  workerId: string;
  role: string;
  workspacePath: string;
  objective: string;
};

export type WorkerExecutionResult = {
  success: boolean;
  generatedFiles: string[];
  logs: string[];
  aiOutputFile?: string;
};

function writeGeneratedSourceFile(execution: WorkerExecution): string {
  const roleLayouts: Record<string, string[]> = {
    backend: ["backend/src/routes", "backend/src/services", "backend/tests"],
    frontend: ["frontend/src/components", "frontend/src/pages", "frontend/src/api"],
    database: ["database/migrations", "database/seeds"],
    tests: ["tests/unit", "tests/integration"],
    build: ["build/scripts"],
    api: ["api/contracts", "api/smoke"],
    playwright: ["playwright/tests"],
    security: ["security/checks"]
  };

  const dirs = roleLayouts[execution.role] || [`${execution.role}/src`];

  const generatedFiles: string[] = [];

  for (const dir of dirs) {
    const fullDir = path.join(execution.workspacePath, dir);
    fs.mkdirSync(fullDir, { recursive: true });

    const filePath = path.join(fullDir, `${execution.role}.generated.ts`);
    const content = [
      `export const role = ${JSON.stringify(execution.role)};`,
      `export const workerId = ${JSON.stringify(execution.workerId)};`,
      `export const objective = ${JSON.stringify(execution.objective)};`,
      "",
      "export function describeGeneratedWork(): string {",
      "  return `Generated structured implementation for ${role} by ${workerId}`;",
      "}",
      ""
    ].join("\n");

    fs.writeFileSync(filePath, content);
    generatedFiles.push(filePath);
  }

  return generatedFiles.join(",");
}

export async function executeWorker(
  execution: WorkerExecution
): Promise<WorkerExecutionResult> {
  logger.info({
    type: "WORKER_EXECUTION_START",
    workerId: execution.workerId,
    role: execution.role
  });

  const generatedFiles: string[] = [];

  const metadataFile = path.join(
    execution.workspacePath,
    `${execution.role}.metadata.txt`
  );

  fs.writeFileSync(
    metadataFile,
    [
      `WORKER: ${execution.workerId}`,
      `ROLE: ${execution.role}`,
      `OBJECTIVE: ${execution.objective}`,
      `GENERATED_AT: ${new Date().toISOString()}`
    ].join("\n")
  );

  generatedFiles.push(metadataFile);

  const generatedSourceFiles = writeGeneratedSourceFile(execution)
    .split(",")
    .filter(Boolean);
  generatedFiles.push(...generatedSourceFiles);

  const aiResult = await executeOpenClawTask({
    workerId: execution.workerId,
    workspacePath: execution.workspacePath,
    prompt: `
You are a senior ${execution.role} engineer.

Objective:
${execution.objective}

Requirements:
- production-grade quality
- real implementation
- no scaffolds
- deployment-ready
- enterprise quality
- secure coding
- include validation
- include tests
`
  });

  logger.info({
    type: "WORKER_EXECUTION_COMPLETE",
    workerId: execution.workerId,
    success: aiResult.success
  });

  try {
    await recordAgentRun({
      agent: execution.workerId.split("-").slice(0, 2).join("-"),
      role: execution.role,
      workerId: execution.workerId,
      status: aiResult.success ? "SUCCESS" : "FAILED",
      outputFile: aiResult.outputFile
    });
  } catch (error) {
    logger.error({
      type: "WORKER_DB_RECORD_FAILED",
      workerId: execution.workerId,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return {
    success: aiResult.success,
    generatedFiles,
    logs: [],
    aiOutputFile: aiResult.outputFile
  };
}
