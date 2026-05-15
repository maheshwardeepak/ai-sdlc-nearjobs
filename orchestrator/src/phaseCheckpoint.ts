import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

export function createPhaseCheckpoint(input: {
  projectName: string;
  phaseId: string;
  workspaceRoot: string;
}) {
  const checkpointRoot = path.resolve(
    process.cwd(),
    "artifacts/autonomous-runs",
    slugify(input.projectName),
    "checkpoints",
    input.phaseId
  );

  fs.rmSync(checkpointRoot, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(checkpointRoot), { recursive: true });

  if (fs.existsSync(input.workspaceRoot)) {
    execSync(
      `cp -R "${input.workspaceRoot}" "${checkpointRoot}"`,
      { stdio: "pipe", shell: "/bin/bash" }
    );
  }

  return {
    success: true,
    checkpointRoot
  };
}

export function restorePhaseCheckpoint(input: {
  checkpointRoot: string;
  workspaceRoot: string;
}) {
  if (!fs.existsSync(input.checkpointRoot)) {
    return {
      success: false,
      restored: false,
      reason: "checkpoint-not-found"
    };
  }

  fs.rmSync(input.workspaceRoot, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(input.workspaceRoot), { recursive: true });

  execSync(
    `cp -R "${input.checkpointRoot}" "${input.workspaceRoot}"`,
    { stdio: "pipe", shell: "/bin/bash" }
  );

  return {
    success: true,
    restored: true
  };
}
