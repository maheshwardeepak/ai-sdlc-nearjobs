import fs from "node:fs";
import path from "node:path";
import { loadProjectPhaseMemory } from "./projectPhaseMemory.js";

export type ProjectSyncMemory = {
  project: string;
  projectSlug: string;
  updatedAt: string;
  currentPhaseId: string | null;
  completedPhaseIds: string[];
  failedPhaseIds: string[];
  artifacts: string[];
  decisions: string[];
  gates: Record<string, boolean>;
  nextAction: string;
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

function syncPath(projectName: string): string {
  return path.resolve(
    process.cwd(),
    "artifacts/autonomous-runs",
    slugify(projectName),
    "project-sync-memory.json"
  );
}

export function updateProjectSyncMemory(input: {
  projectName: string;
  currentPhaseId: string | null;
  artifacts?: string[];
  decisions?: string[];
  gates?: Record<string, boolean>;
  nextAction: string;
}): ProjectSyncMemory {
  const projectSlug = slugify(input.projectName);
  const phaseMemory = loadProjectPhaseMemory(input.projectName);

  const completedPhaseIds = phaseMemory
    .filter((entry) => entry.status === "PASSED")
    .map((entry) => entry.phaseId);

  const failedPhaseIds = phaseMemory
    .filter((entry) => entry.status === "FAILED")
    .map((entry) => entry.phaseId);

  const previousPath = syncPath(input.projectName);
  const previous = fs.existsSync(previousPath)
    ? JSON.parse(fs.readFileSync(previousPath, "utf8"))
    : null;

  const memory: ProjectSyncMemory = {
    project: input.projectName,
    projectSlug,
    updatedAt: new Date().toISOString(),
    currentPhaseId: input.currentPhaseId,
    completedPhaseIds,
    failedPhaseIds,
    artifacts: [
      ...new Set([
        ...(previous?.artifacts || []),
        ...(input.artifacts || [])
      ])
    ],
    decisions: [
      ...new Set([
        ...(previous?.decisions || []),
        ...(input.decisions || [])
      ])
    ],
    gates: {
      ...(previous?.gates || {}),
      ...(input.gates || {})
    },
    nextAction: input.nextAction
  };

  fs.mkdirSync(path.dirname(previousPath), { recursive: true });
  fs.writeFileSync(previousPath, JSON.stringify(memory, null, 2));

  return memory;
}

export function loadProjectSyncMemory(projectName: string): ProjectSyncMemory | null {
  const file = syncPath(projectName);

  if (!fs.existsSync(file)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(file, "utf8")) as ProjectSyncMemory;
}
