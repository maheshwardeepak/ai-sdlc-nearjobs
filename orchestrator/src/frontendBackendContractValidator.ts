import fs from "node:fs";
import path from "node:path";
import { detectContractDrift } from "./contractDriftDetector.js";

export type FrontendBackendContractValidation = {
  success: boolean;
  frontendApiCalls: string[];
  backendApis: string[];
  missingBackendForFrontend: string[];
};

function collectFiles(root: string, matcher: (file: string) => boolean): string[] {
  const files: string[] = [];

  if (!fs.existsSync(root)) return files;

  function walk(current: string): void {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (["node_modules", "dist", ".git"].includes(entry.name)) continue;
        walk(full);
        continue;
      }

      if (matcher(full)) files.push(full);
    }
  }

  walk(root);
  return files;
}

function extractFrontendApiCalls(workspaceRoot: string): string[] {
  const files = collectFiles(
    workspaceRoot,
    (file) => file.endsWith(".ts") || file.endsWith(".tsx") || file.endsWith(".js")
  );

  const calls = new Set<string>();

  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");

    const methodRegex = /\.(get|post|put|patch|delete)\(["'`]([^"'`]+)["'`]/gi;
    for (const match of text.matchAll(methodRegex)) {
      const method = match[1]?.toUpperCase();
      const url = match[2];
      if (method && url?.startsWith("/api")) {
        calls.add(`${method} ${url}`);
      }
    }

    const fetchRegex = /fetch\(["'`]([^"'`]+)["'`][\s\S]*?method:\s*["'`](GET|POST|PUT|PATCH|DELETE)["'`]/gi;
    for (const match of text.matchAll(fetchRegex)) {
      const url = match[1];
      const method = match[2]?.toUpperCase();
      if (method && url?.startsWith("/api")) {
        calls.add(`${method} ${url}`);
      }
    }
  }

  return [...calls].sort();
}

export function validateFrontendBackendContracts(
  projectName: string,
  workspaceRoot: string
): FrontendBackendContractValidation {
  const drift = detectContractDrift(projectName, workspaceRoot);
  const frontendApiCalls = extractFrontendApiCalls(workspaceRoot);

  const backendApis = drift.backendApis;

  const missingBackendForFrontend = frontendApiCalls.filter(
    (api) => !backendApis.includes(api)
  );

  return {
    success: missingBackendForFrontend.length === 0,
    frontendApiCalls,
    backendApis,
    missingBackendForFrontend
  };
}
