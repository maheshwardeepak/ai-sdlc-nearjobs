import fs from "fs";
import path from "path";

export type DependencyNode = {
  project: string;
  dependsOn: string[];
};

export type ImpactAnalysis = {
  success: boolean;
  changedProjects: string[];
  impactedProjects: string[];
  graph: DependencyNode[];
};

const GRAPH: DependencyNode[] = [
  {
    project: "orchestrator",
    dependsOn: []
  },
  {
    project: "dashboard",
    dependsOn: ["orchestrator"]
  },
  {
    project: "nearjobs-backend",
    dependsOn: ["orchestrator"]
  },
  {
    project: "nearjobs-frontend",
    dependsOn: ["nearjobs-backend"]
  },
  {
    project: "nearjobs-playwright",
    dependsOn: [
      "nearjobs-frontend",
      "nearjobs-backend"
    ]
  }
];

function collectImpacts(
  changed: string[],
  graph: DependencyNode[]
): string[] {
  const impacted = new Set<string>(changed);

  let updated = true;

  while (updated) {
    updated = false;

    for (const node of graph) {
      if (
        node.dependsOn.some((dep) => impacted.has(dep)) &&
        !impacted.has(node.project)
      ) {
        impacted.add(node.project);
        updated = true;
      }
    }
  }

  return [...impacted];
}

export function analyzeDependencyImpact(
  changedProjects: string[]
): ImpactAnalysis {
  return {
    success: true,
    changedProjects,
    impactedProjects: collectImpacts(
      changedProjects,
      GRAPH
    ),
    graph: GRAPH
  };
}

if (process.argv[1]?.includes("dependencyImpactGraph")) {
  const changedProjects = process.argv.slice(2);

  const result = analyzeDependencyImpact(
    changedProjects
  );

  console.log(JSON.stringify(result, null, 2));
}
