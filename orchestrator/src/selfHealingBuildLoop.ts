import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { stabilizeGeneratedApp } from "./generatedAppStabilizer.js";

export type BuildFailureClass =
  | "missing-dependency"
  | "typescript"
  | "vite"
  | "docker"
  | "unknown";

export type SelfHealingBuildAttempt = {
  attempt: number;
  command: string;
  cwd: string;
  success: boolean;
  output: string;
  failureClasses: BuildFailureClass[];
};

export type SelfHealingBuildResult = {
  success: boolean;
  attempts: SelfHealingBuildAttempt[];
  createdAt: string;
};

function classifyBuildOutput(output: string): BuildFailureClass[] {
  const classes = new Set<BuildFailureClass>();

  if (
    output.includes("Cannot find module") ||
    output.includes("Cannot find type definition file") ||
    output.includes("command not found")
  ) {
    classes.add("missing-dependency");
  }

  if (
    output.includes("error TS") ||
    output.includes("tsc")
  ) {
    classes.add("typescript");
  }

  if (
    output.includes("vite") ||
    output.includes("Could not resolve entry module")
  ) {
    classes.add("vite");
  }

  if (
    output.includes("docker") ||
    output.includes("Dockerfile")
  ) {
    classes.add("docker");
  }

  if (classes.size === 0) {
    classes.add("unknown");
  }

  return [...classes];
}

function run(command: string, cwd: string): { success: boolean; output: string } {
  try {
    const output = execSync(command, {
      cwd,
      stdio: "pipe",
      encoding: "utf8",
      shell: "/bin/bash"
    });

    return { success: true, output };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    return {
      success: false,
      output: [err.stdout, err.stderr, err.message].filter(Boolean).join("\n")
    };
  }
}

function findGeneratedRoots(workspaceRoot: string): Array<{ role: string; root: string }> {
  const roots: Array<{ role: string; root: string }> = [];

  if (!fs.existsSync(workspaceRoot)) {
    return roots;
  }

  for (const worker of fs.readdirSync(path.join(workspaceRoot, "workers"), { withFileTypes: true })) {
    if (!worker.isDirectory()) continue;

    const workerRoot = path.join(workspaceRoot, "workers", worker.name);

    const backend = path.join(workerRoot, "backend");
    const frontend = path.join(workerRoot, "frontend");

    if (fs.existsSync(path.join(backend, "package.json"))) {
      roots.push({ role: "backend", root: backend });
    }

    if (fs.existsSync(path.join(frontend, "package.json"))) {
      roots.push({ role: "frontend", root: frontend });
    }
  }

  return roots;
}

function commandForRole(role: string): string {
  return role === "backend"
    ? "pnpm install && pnpm run build"
    : "pnpm install && pnpm run build";
}

export function runSelfHealingBuildLoop(
  workspaceRoot: string,
  maxAttempts = 3
): SelfHealingBuildResult {
  const attempts: SelfHealingBuildAttempt[] = [];
  const roots = findGeneratedRoots(workspaceRoot);

  for (const root of roots) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      stabilizeGeneratedApp(path.dirname(root.root), root.role);

      const command = commandForRole(root.role);
      const result = run(command, root.root);
      const failureClasses = result.success
        ? []
        : classifyBuildOutput(result.output);

      attempts.push({
        attempt,
        command,
        cwd: root.root,
        success: result.success,
        output: result.output,
        failureClasses
      });

      if (result.success) {
        break;
      }
    }
  }

  const output: SelfHealingBuildResult = {
    success: attempts.every((attempt) => attempt.success),
    attempts,
    createdAt: new Date().toISOString()
  };

  const reportsDir = path.resolve(process.cwd(), "artifacts/reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportsDir, "self-healing-build-report.json"),
    JSON.stringify(output, null, 2)
  );

  return output;
}
