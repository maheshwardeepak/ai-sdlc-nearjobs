import { execa } from "execa";
import net from "net";
import os from "os";

export type InfraPreflightResult = {
  success: boolean;
  checks: Record<string, boolean>;
  details: Record<string, unknown>;
};

async function commandExists(command: string): Promise<boolean> {
  try {
    await execa("which", [command]);
    return true;
  } catch {
    return false;
  }
}

function checkPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, "127.0.0.1");
  });
}

async function checkNetwork(): Promise<boolean> {
  try {
    await execa("ping", ["-c", "1", "github.com"]);
    return true;
  } catch {
    return false;
  }
}

async function dockerContainerUsingPort(port: number): Promise<string | null> {
  try {
    const result = await execa("docker", [
      "ps",
      "--format",
      "{{.Names}} {{.Ports}}"
    ]);

    const line = result.stdout
      .split("\n")
      .find((entry) => entry.includes(`:${port}->`) || entry.includes(`0.0.0.0:${port}`));

    return line || null;
  } catch {
    return null;
  }
}

async function checkPortReady(port: number): Promise<{ free: boolean; allowedOccupied: boolean; owner: string | null }> {
  const free = await checkPortFree(port);

  if (free) {
    return { free: true, allowedOccupied: false, owner: null };
  }

  const owner = await dockerContainerUsingPort(port);

  const allowedOccupied =
    owner !== null &&
    (
      owner.includes("nearjobs-") ||
      owner.includes("postgres") ||
      owner.includes("redis") ||
      owner.includes("backend") ||
      owner.includes("frontend")
    );

  return { free: false, allowedOccupied, owner };
}

export async function runInfraPreflight(): Promise<InfraPreflightResult> {
  const freeMemGb = os.freemem() / 1024 / 1024 / 1024;

  const dockerExists = await commandExists("docker");
  const gitExists = await commandExists("git");
  const nodeExists = await commandExists("node");
  const pnpmExists = await commandExists("pnpm");

  const ports = {
    "3000": await checkPortReady(3000),
    "5173": await checkPortReady(5173),
    "8080": await checkPortReady(8080),
    "5432": await checkPortReady(5432),
    "6379": await checkPortReady(6379)
  };

  const networkReady = await checkNetwork();

  const checks = {
    dockerExists,
    gitExists,
    nodeExists,
    pnpmExists,
    memoryOk: freeMemGb >= 2,
    networkReady,
    portsReady: Object.values(ports).every((port) => port.free || port.allowedOccupied)
  };

  return {
    success: Object.values(checks).every(Boolean),
    checks,
    details: {
      freeMemGb: Number(freeMemGb.toFixed(2)),
      ports
    }
  };
}
