import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

export type PhaseTestConvergenceResult = {
  success: boolean;
  attempted: Array<{
    name: string;
    command: string;
    cwd: string;
    success: boolean;
    output: string;
  }>;
};

function run(command: string, cwd: string) {
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

export function runPhaseTestConvergence(workspaceRoot: string): PhaseTestConvergenceResult {
  const attempted: PhaseTestConvergenceResult["attempted"] = [];

  if (!fs.existsSync(workspaceRoot)) {
    return { success: false, attempted };
  }

  const workersDir = path.join(workspaceRoot, "workers");

  if (!fs.existsSync(workersDir)) {
    return { success: true, attempted };
  }

  for (const worker of fs.readdirSync(workersDir, { withFileTypes: true })) {
    if (!worker.isDirectory()) continue;

    const workerRoot = path.join(workersDir, worker.name);
    const backend = path.join(workerRoot, "backend");
    const frontend = path.join(workerRoot, "frontend");

    if (fs.existsSync(path.join(backend, "pom.xml"))) {
      const result = run("mvn -q test", backend);
      attempted.push({
        name: "maven-backend-tests",
        command: "mvn -q test",
        cwd: backend,
        success: result.success,
        output: result.output
      });
    }

    if (fs.existsSync(path.join(frontend, "package.json"))) {
      const pkg = JSON.parse(fs.readFileSync(path.join(frontend, "package.json"), "utf8"));
      const hasTest = Boolean(pkg.scripts?.test);

      if (hasTest) {
        const result = run("pnpm install --frozen-lockfile=false && pnpm test", frontend);
        attempted.push({
          name: "frontend-tests",
          command: "pnpm install --frozen-lockfile=false && pnpm test",
          cwd: frontend,
          success: result.success,
          output: result.output
        });
      }
    }
  }

  return {
    success: attempted.every((item) => item.success),
    attempted
  };
}
