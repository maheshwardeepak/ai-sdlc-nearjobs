import fs from "node:fs";
import path from "node:path";
import { filterApisForPhase } from "./phaseContractScope.js";

export type ContractDriftResult = {
  success: boolean;
  backendApis: string[];
  plannedApis: string[];
  missingBackendApis: string[];
  extraBackendApis: string[];
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

function collectFiles(root: string, matcher: (file: string) => boolean): string[] {
  const files: string[] = [];

  if (!fs.existsSync(root)) {
    return files;
  }

  function walk(current: string): void {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);

      if (entry.isDirectory()) {
        walk(full);
        continue;
      }

      if (matcher(full)) {
        files.push(full);
      }
    }
  }

  walk(root);
  return files;
}

function plannedApiKeys(projectName: string): string[] {
  const aiPlanPath = path.resolve(
    process.cwd(),
    "artifacts/autonomous-runs",
    slugify(projectName),
    "ai-project-plan.json"
  );

  if (!fs.existsSync(aiPlanPath)) {
    return [];
  }

  const plan = JSON.parse(fs.readFileSync(aiPlanPath, "utf8"));

  return Array.isArray(plan.apiContracts)
    ? plan.apiContracts.map((api: any) => `${api.method} ${api.path}`)
    : [];
}

function extractPath(raw: string): string {
  const match = raw.match(/["']([^"']+)["']/);
  return match?.[1] || "";
}

function joinApiPath(prefix: string, route: string): string {
  const combined = `/${[prefix, route]
    .filter(Boolean)
    .map((part) => part.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/")}`;

  return combined === "/" ? "" : combined;
}

function annotationPath(line: string): string {
  const match = line.match(/["']([^"']*)["']/);
  return match?.[1] || "";
}

function backendApiKeys(workspaceRoot: string): string[] {
  const javaFiles = collectFiles(
    workspaceRoot,
    (file) =>
      file.endsWith(".java") &&
      !file.includes("/target/") &&
      !file.includes("/node_modules/")
  );

  const keys = new Set<string>();

  const methodMap: Record<string, string> = {
    GetMapping: "GET",
    PostMapping: "POST",
    PutMapping: "PUT",
    PatchMapping: "PATCH",
    DeleteMapping: "DELETE"
  };

  for (const file of javaFiles) {
    const text = fs.readFileSync(file, "utf8");

    const requestLine = text
      .split(/\r?\n/)
      .find((line) => line.includes("@RequestMapping"));

    const classPrefix = requestLine ? annotationPath(requestLine) : "";

    for (const line of text.split(/\r?\n/)) {
      for (const [annotation, method] of Object.entries(methodMap)) {
        if (!line.includes(`@${annotation}`)) continue;

        const route = annotationPath(line);
        const fullPath = joinApiPath(classPrefix, route);

        if (fullPath) {
          keys.add(`${method} ${fullPath}`);
        }
      }
    }
  }

  return [...keys].sort();
}

export function detectContractDrift(
  projectName: string,
  workspaceRoot: string,
  phaseId?: string
): ContractDriftResult {
  const allPlannedApis = plannedApiKeys(projectName).sort();
  const plannedApis = phaseId
    ? filterApisForPhase(phaseId, allPlannedApis).sort()
    : allPlannedApis;
  const backendApis = backendApiKeys(workspaceRoot).sort();

  const missingBackendApis = plannedApis.filter(
    (api) => !backendApis.includes(api)
  );

  const extraBackendApis = backendApis.filter(
    (api) => !plannedApis.includes(api)
  );

  return {
    success: missingBackendApis.length === 0,
    backendApis,
    plannedApis,
    missingBackendApis,
    extraBackendApis
  };
}
