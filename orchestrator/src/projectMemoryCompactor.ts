import fs from "node:fs";
import path from "node:path";
import { loadProjectPhaseMemory } from "./projectPhaseMemory.js";
import { loadProjectSyncMemory } from "./projectSyncMemory.js";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

export function compactProjectMemory(projectName: string) {
  const projectSlug = slugify(projectName);
  const runDir = path.resolve(
    process.cwd(),
    "artifacts/autonomous-runs",
    projectSlug
  );

  const phaseMemory = loadProjectPhaseMemory(projectName);
  const syncMemory = loadProjectSyncMemory(projectName);

  const compacted = {
    project: projectName,
    projectSlug,
    updatedAt: new Date().toISOString(),
    completedPhases: phaseMemory
      .filter((entry) => entry.status === "PASSED")
      .map((entry) => ({
        phaseId: entry.phaseId,
        phaseName: entry.phaseName,
        summary: entry.summary,
        gates: entry.gates,
        artifacts: entry.artifacts
      })),
    failedPhases: phaseMemory
      .filter((entry) => entry.status === "FAILED")
      .map((entry) => ({
        phaseId: entry.phaseId,
        phaseName: entry.phaseName,
        summary: entry.summary,
        gates: entry.gates,
        notes: entry.notes
      })),
    currentState: syncMemory,
    nextAction: syncMemory?.nextAction || "No next action recorded."
  };

  const outputPath = path.join(runDir, "project-memory-compact.json");
  fs.writeFileSync(outputPath, JSON.stringify(compacted, null, 2));

  const markdownPath = path.join(runDir, "project-memory-compact.md");
  fs.writeFileSync(
    markdownPath,
    [
      `# Project Memory Compact: ${projectName}`,
      "",
      `Updated: ${compacted.updatedAt}`,
      "",
      "## Completed Phases",
      ...compacted.completedPhases.map(
        (phase) => `- ${phase.phaseName}: ${phase.summary}`
      ),
      "",
      "## Failed Phases",
      ...compacted.failedPhases.map(
        (phase) => `- ${phase.phaseName}: ${phase.summary}`
      ),
      "",
      "## Next Action",
      compacted.nextAction
    ].join("\n")
  );

  return {
    success: true,
    outputPath,
    markdownPath,
    completedPhases: compacted.completedPhases.length,
    failedPhases: compacted.failedPhases.length
  };
}
