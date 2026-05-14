import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export type FactoryReadinessReport = {
  success: boolean;
  checks: Record<string, boolean>;
  logs: string[];
  createdAt: string;
};

function check(command: string): { success: boolean; output: string } {
  try {
    const output = execSync(command, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });

    return {
      success: true,
      output
    };
  } catch (error) {
    return {
      success: false,
      output: String(error)
    };
  }
}

export function runFactoryReadinessCheck(): FactoryReadinessReport {
  const logs: string[] = [];

  const docker = check("docker --version");
  logs.push(docker.output);

  const dockerCompose = check("docker compose version");
  logs.push(dockerCompose.output);

  const pnpm = check("pnpm --version");
  logs.push(pnpm.output);

  const node = check("node --version");
  logs.push(node.output);

  const java = check("java -version");
  logs.push(java.output);

  const maven = check("mvn -version");
  logs.push(maven.output);

  const git = check("git --version");
  logs.push(git.output);

  const stackCatalogExists = fs.existsSync(
    path.resolve(process.cwd(), "orchestrator/src/stack-catalog.json")
  );

  const checks = {
    docker: docker.success,
    dockerCompose: dockerCompose.success,
    pnpm: pnpm.success,
    node: node.success,
    java: java.success,
    maven: maven.success,
    git: git.success,
    stackCatalog: stackCatalogExists
  };

  return {
    success: Object.values(checks).every(Boolean),
    checks,
    logs,
    createdAt: new Date().toISOString()
  };
}
