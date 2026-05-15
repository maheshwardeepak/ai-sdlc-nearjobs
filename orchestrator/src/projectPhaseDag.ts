import fs from "node:fs";
import path from "node:path";

export type ProjectPhaseDagNode = {
  id: string;
  name: string;
  goal: string;
  status: "PENDING" | "RUNNING" | "PASSED" | "FAILED";
  dependsOn: string[];
  autonomous: boolean;
  requiresHumanApproval: boolean;
};

export type ProjectPhaseDag = {
  project: string;
  projectSlug: string;
  createdAt: string;
  nodes: ProjectPhaseDagNode[];
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

export function createProjectPhaseDag(projectName: string): ProjectPhaseDag {
  const projectSlug = slugify(projectName);
  const runDir = path.resolve(process.cwd(), "artifacts/autonomous-runs", projectSlug);
  const aiPlanPath = path.join(runDir, "ai-project-plan.json");

  if (!fs.existsSync(aiPlanPath)) {
    throw new Error(`AI project plan not found for ${projectName}. Run create-project-plan first.`);
  }

  const aiPlan = JSON.parse(fs.readFileSync(aiPlanPath, "utf8"));

  const nodes: ProjectPhaseDagNode[] = aiPlan.phases.map((phase: any, index: number) => ({
    id: phase.id,
    name: phase.name,
    goal: phase.goal,
    status: "PENDING",
    dependsOn: index === 0 ? [] : [aiPlan.phases[index - 1].id],
    autonomous: Boolean(phase.autonomous),
    requiresHumanApproval: Boolean(phase.requiresHumanApproval)
  }));

  const dag: ProjectPhaseDag = {
    project: projectName,
    projectSlug,
    createdAt: new Date().toISOString(),
    nodes
  };

  fs.writeFileSync(
    path.join(runDir, "project-phase-dag.json"),
    JSON.stringify(dag, null, 2)
  );

  return dag;
}

export function loadProjectPhaseDag(projectName: string): ProjectPhaseDag {
  const projectSlug = slugify(projectName);
  const dagPath = path.resolve(
    process.cwd(),
    "artifacts/autonomous-runs",
    projectSlug,
    "project-phase-dag.json"
  );

  if (!fs.existsSync(dagPath)) {
    return createProjectPhaseDag(projectName);
  }

  return JSON.parse(fs.readFileSync(dagPath, "utf8")) as ProjectPhaseDag;
}
