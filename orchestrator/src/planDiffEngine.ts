import fs from "node:fs";
import path from "node:path";

export type PlanDiffResult = {
  changed: boolean;
  addedPhases: string[];
  removedPhases: string[];
  addedApis: string[];
  removedApis: string[];
  addedEntities: string[];
  removedEntities: string[];
  summary: string;
};

function safeArray<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function diffStrings(previous: string[], current: string[]) {
  return {
    added: current.filter((x) => !previous.includes(x)),
    removed: previous.filter((x) => !current.includes(x))
  };
}

export function generatePlanDiff(
  outputDir: string,
  currentPlan: any
): PlanDiffResult {
  const previousPath = path.join(outputDir, "ai-project-plan.previous.json");

  if (!fs.existsSync(previousPath)) {
    const initial: PlanDiffResult = {
      changed: true,
      addedPhases: safeArray(currentPlan.phases).map((p: any) => p.name),
      removedPhases: [],
      addedApis: safeArray(currentPlan.apiContracts).map(
        (a: any) => `${a.method} ${a.path}`
      ),
      removedApis: [],
      addedEntities: safeArray(currentPlan.entities).map(
        (e: any) => e.name
      ),
      removedEntities: [],
      summary: "Initial project plan created."
    };

    fs.writeFileSync(
      path.join(outputDir, "plan-diff.json"),
      JSON.stringify(initial, null, 2)
    );

    fs.writeFileSync(
      path.join(outputDir, "plan-diff.md"),
      [
        "# Plan Diff",
        "",
        "Initial project plan created."
      ].join("\n")
    );

    return initial;
  }

  const previousPlan = JSON.parse(
    fs.readFileSync(previousPath, "utf8")
  );

  const phaseDiff = diffStrings(
    safeArray(previousPlan.phases).map((p: any) => p.name),
    safeArray(currentPlan.phases).map((p: any) => p.name)
  );

  const apiDiff = diffStrings(
    safeArray(previousPlan.apiContracts).map(
      (a: any) => `${a.method} ${a.path}`
    ),
    safeArray(currentPlan.apiContracts).map(
      (a: any) => `${a.method} ${a.path}`
    )
  );

  const entityDiff = diffStrings(
    safeArray(previousPlan.entities).map((e: any) => e.name),
    safeArray(currentPlan.entities).map((e: any) => e.name)
  );

  const changed =
    phaseDiff.added.length > 0 ||
    phaseDiff.removed.length > 0 ||
    apiDiff.added.length > 0 ||
    apiDiff.removed.length > 0 ||
    entityDiff.added.length > 0 ||
    entityDiff.removed.length > 0;

  const summaryLines = [
    "# Plan Diff",
    "",
    `Changed: ${changed}`,
    "",
    "## Added Phases",
    ...phaseDiff.added.map((x) => `- ${x}`),
    "",
    "## Removed Phases",
    ...phaseDiff.removed.map((x) => `- ${x}`),
    "",
    "## Added APIs",
    ...apiDiff.added.map((x) => `- ${x}`),
    "",
    "## Removed APIs",
    ...apiDiff.removed.map((x) => `- ${x}`),
    "",
    "## Added Entities",
    ...entityDiff.added.map((x) => `- ${x}`),
    "",
    "## Removed Entities",
    ...entityDiff.removed.map((x) => `- ${x}`)
  ];

  const result: PlanDiffResult = {
    changed,
    addedPhases: phaseDiff.added,
    removedPhases: phaseDiff.removed,
    addedApis: apiDiff.added,
    removedApis: apiDiff.removed,
    addedEntities: entityDiff.added,
    removedEntities: entityDiff.removed,
    summary: summaryLines.join("\n")
  };

  fs.writeFileSync(
    path.join(outputDir, "plan-diff.json"),
    JSON.stringify(result, null, 2)
  );

  fs.writeFileSync(
    path.join(outputDir, "plan-diff.md"),
    result.summary
  );

  return result;
}
