import fs from "node:fs";
import path from "node:path";

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

function backendApiKeys(workspaceRoot: string): string[] {
  const javaFiles = collectFiles(
    workspaceRoot,
    (file) => file.endsWith(".java")
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

    for (const [annotation, method] of Object.entries(methodMap)) {
      const regex = new RegExp(`@${annotation}\\\\(([^)]*)\\\\)`, "g");

      for (const match of text.matchAll(regex)) {
        const raw = match[1] || "";
        const pathMatch = raw.match(/["']([^"']+)["']/);
        if (pathMatch?.[1]) {
          keys.add(`${method} ${pathMatch[1]}`);
        }
      }
    }
  }

  return [...keys].sort();
}

export function detectContractDrift(
  projectName: string,
  workspaceRoot: string
): ContractDriftResult {
  const plannedApis = plannedApiKeys(projectName).sort();
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
