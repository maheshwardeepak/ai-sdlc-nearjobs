import fs from "fs";
import path from "path";
import { execSync } from "child_process";

export type DockerServiceStatus = {
  service: string;
  status: string;
  healthy: boolean;
};

export type DockerRuntimeVerification = {
  success: boolean;
  composeFile: string;
  services: DockerServiceStatus[];
  logs: string[];
  createdAt: string;
};

function run(command: string, cwd: string): string {
  return execSync(command, {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
    shell: "/bin/bash"
  });
}

function parseComposePs(output: string): DockerServiceStatus[] {
  const services: DockerServiceStatus[] = [];

  for (const line of output.split("\n")) {
    if (
      line.includes("Up") ||
      line.includes("Exited") ||
      line.includes("healthy") ||
      line.includes("unhealthy")
    ) {
      const normalized = line.trim().replace(/\s+/g, " ");
      const parts = normalized.split(" ");

      const service = parts[0] || "unknown";

      services.push({
        service,
        status: normalized,
        healthy:
          normalized.includes("healthy") ||
          normalized.includes("Up")
      });
    }
  }

  return services;
}

export function verifyDockerRuntime(
  infraRoot = "artifacts/infra"
): DockerRuntimeVerification {
  const root = path.resolve(process.cwd(), infraRoot);

  const composeFile = path.join(root, "docker-compose.yml");

  if (!fs.existsSync(composeFile)) {
    throw new Error(
      `Docker compose file not found: ${composeFile}`
    );
  }

  const logs: string[] = [];

  try {
    logs.push(
      run("docker compose up -d --build", root)
    );
  } catch (error: any) {
    logs.push(error?.stdout || "");
    logs.push(error?.stderr || "");
  }

  let psOutput = "";

  try {
    psOutput = run("docker compose ps", root);
    logs.push(psOutput);
  } catch (error: any) {
    logs.push(error?.stdout || "");
    logs.push(error?.stderr || "");
  }

  const services = parseComposePs(psOutput);

  const output: DockerRuntimeVerification = {
    success:
      services.length > 0 &&
      services.every((service) => service.healthy),

    composeFile,
    services,
    logs,
    createdAt: new Date().toISOString()
  };

  const reportsDir = path.resolve(process.cwd(), "artifacts/reports");

  fs.mkdirSync(reportsDir, { recursive: true });

  fs.writeFileSync(
    path.join(reportsDir, "docker-runtime-verification.json"),
    JSON.stringify(output, null, 2)
  );

  return output;
}
