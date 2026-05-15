import fs from "node:fs";
import path from "node:path";

export type ProjectPhaseMemoryEntry = {
  project: string;
  phaseId: string;
  phaseName: string;
  status: "PASSED" | "FAILED";
  startedAt: string;
  completedAt: string;
  summary: string;
  artifacts: string[];
  gates: Record<string, boolean>;
  notes: string[];
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

function memoryPath(projectName: string): string {
  return path.resolve(
    process.cwd(),
    "artifacts/autonomous-runs",
    slugify(projectName),
    "phase-memory.json"
  );
}

export function loadProjectPhaseMemory(projectName: string): ProjectPhaseMemoryEntry[] {
  const file = memoryPath(projectName);

  if (!fs.existsSync(file)) {
    return [];
  }

  return JSON.parse(fs.readFileSync(file, "utf8")) as ProjectPhaseMemoryEntry[];
}

export function appendProjectPhaseMemory(
  projectName: string,
  entry: ProjectPhaseMemoryEntry
): ProjectPhaseMemoryEntry[] {
  const file = memoryPath(projectName);
  const existing = loadProjectPhaseMemory(projectName);
  const next = [...existing.filter((item) => item.phaseId !== entry.phaseId), entry];

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(next, null, 2));

  return next;
}

export function summarizeProjectPhaseMemory(projectName: string): string {
  const memory = loadProjectPhaseMemory(projectName);

  if (memory.length === 0) {
    return "No completed phase memory yet.";
  }

  return memory.map((entry) => [
    `## ${entry.phaseName}`,
    `- Phase ID: ${entry.phaseId}`,
    `- Status: ${entry.status}`,
    `- Summary: ${entry.summary}`,
    `- Gates: ${Object.entries(entry.gates).map(([key, value]) => `${key}=${value}`).join(", ")}`,
    `- Notes: ${entry.notes.join("; ")}`
  ].join("\n")).join("\n\n");
}
