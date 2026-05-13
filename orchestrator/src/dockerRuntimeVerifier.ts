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
  missingRequiredServices: string[];
  buildFailed: boolean;
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
          !normalized.includes("Exited") &&
          !normalized.includes("unhealthy") &&
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
    throw new Error(`Docker compose file not found: ${composeFile}`);
  }

  const logs: string[] = [];

  try {
    logs.push(run("docker compose up -d --build", root));
  } catch (error: any) {
    logs.push(error?.stdout || "");
    logs.push(error?.stderr || "");
    logs.push(error?.message || "");
  }

  let psOutput = "";

  try {
    psOutput = run("docker compose ps", root);
    logs.push(psOutput);
  } catch (error: any) {
    logs.push(error?.stdout || "");
    logs.push(error?.stderr || "");
    logs.push(error?.message || "");
  }

  const services = parseComposePs(psOutput);

  const buildFailed = logs.some((log) =>
    log.includes("failed to solve") ||
    log.includes("ERROR") ||
    log.includes("not found") ||
    log.includes("Cannot connect to the Docker daemon")
  );

  const requiredServices = ["backend", "frontend", "database"];

  const discoveredServices = services.map((service) =>
    service.service.toLowerCase()
  );

  const missingRequiredServices = requiredServices.filter(
    (service) =>
      !discoveredServices.some((existing) =>
        existing.includes(service)
      )
  );

  const success =
    !buildFailed &&
    missingRequiredServices.length === 0 &&
    services.length > 0 &&
    services.every((service) => service.healthy);

  const output: DockerRuntimeVerification = {
    success,
    composeFile,
    services,
    logs,
    missingRequiredServices,
    buildFailed,
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
