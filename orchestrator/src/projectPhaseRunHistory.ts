import fs from "node:fs";
import path from "node:path";

export type ProjectPhaseRunHistoryEntry = {
  project: string;
  phaseId: string;
  success: boolean;
  attempts: number;
  createdAt: string;
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

export function appendProjectPhaseRunHistory(entry: ProjectPhaseRunHistoryEntry) {
  const historyPath = path.resolve(
    process.cwd(),
    "artifacts/autonomous-runs",
    slugify(entry.project),
    "phase-run-history.json"
  );

  const existing = fs.existsSync(historyPath)
    ? JSON.parse(fs.readFileSync(historyPath, "utf8"))
    : [];

  existing.push(entry);

  fs.mkdirSync(path.dirname(historyPath), { recursive: true });
  fs.writeFileSync(historyPath, JSON.stringify(existing, null, 2));

  return existing;
}
