import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { repairPhaseFailure } from "./phaseFailureRepairAgent.js";
import { repairGeneratedWorkspaceIntegrity } from "./generatedWorkspaceIntegrityRepair.js";

function run(command: string, cwd: string) {
  try {
    return {
      success: true,
      output: execSync(command, {
        cwd,
        shell: "/bin/bash",
        stdio: "pipe",
        encoding: "utf8"
      })
    };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    return {
      success: false,
      output: [err.stdout, err.stderr, err.message].filter(Boolean).join("\n")
    };
  }
}

export async function runBackendCompileConvergence(input: {
  projectName: string;
  phaseId: string;
  phaseName: string;
  workspaceRoot: string;
  maxAttempts?: number;
}) {
  const backendRoot = path.join(input.workspaceRoot, "backend");

  if (!fs.existsSync(path.join(backendRoot, "pom.xml"))) {
    return { success: true, skipped: true, reason: "No Maven backend found." };
  }

  const attempts = [];
  const maxAttempts = input.maxAttempts ?? 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    repairGeneratedWorkspaceIntegrity(input.workspaceRoot);

    const result = run("mvn -q clean package", backendRoot);
    attempts.push({ attempt, success: result.success, output: result.output });

    if (result.success) return { success: true, attempts };

    await repairPhaseFailure({
      projectName: input.projectName,
      phaseId: input.phaseId,
      phaseName: input.phaseName,
      workspaceRoot: input.workspaceRoot,
      failureOutput: [
        "Backend Maven compile/package failed.",
        "Command: mvn -q clean package",
        "",
        result.output,
        "",
        "Fix all missing Java classes, wrong packages/imports, corrupted files, broken entities/repositories/services/controllers, and Maven config.",
        "Return concrete file artifacts only."
      ].join("\n")
    });
  }

  return { success: false, attempts };
}
