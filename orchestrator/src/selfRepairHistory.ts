import fs from "node:fs";
import path from "node:path";

export type SelfRepairHistoryEntry = {
  project: string;
  phaseId: string;
  success: boolean;
  writtenFiles: string[];
  outputFile: string | null;
  createdAt: string;
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

export function appendSelfRepairHistory(entry: SelfRepairHistoryEntry) {
  const file = path.resolve(
    process.cwd(),
    "artifacts/autonomous-runs",
    slugify(entry.project),
    "self-repair-history.json"
  );

  const existing = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, "utf8"))
    : [];

  existing.push(entry);

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(existing, null, 2));

  return existing;
}
