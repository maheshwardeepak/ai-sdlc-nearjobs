import { execSync } from "node:child_process";

export type RuntimeHealthResult = {
  success: boolean;
  checks: {
    backend: boolean;
    frontend: boolean;
    postgres: boolean;
    redis: boolean;
  };
  logs: string[];
};


function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retry(
  label: string,
  fn: () => { success: boolean; output: string },
  attempts = 10,
  delayMs = 3000
): Promise<{ success: boolean; output: string }> {
  let last = { success: false, output: "" };

  for (let i = 0; i < attempts; i++) {
    last = fn();

    if (last.success) {
      return last;
    }

    await sleep(delayMs);
  }

  return last;
}


function safe(command: string): { success: boolean; output: string } {
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

export async function verifyRuntimeHealth(): Promise<RuntimeHealthResult> {
  const logs: string[] = [];

  const backend = await retry(
    "backend",
    () => safe("curl -fsS http://localhost:3000/health")
  );
  logs.push(backend.output);

  const frontend = await retry(
    "frontend",
    () => safe("curl -fsS http://localhost:5173")
  );
  logs.push(frontend.output);

  const postgres = safe(
    "docker exec $(docker ps --filter name=database --format '{{.ID}}' | head -n 1) pg_isready -U app -d app"
  );
  logs.push(postgres.output);

  const redis = safe(
    "docker exec $(docker ps --filter name=redis --format '{{.ID}}' | head -n 1) redis-cli ping"
  );
  logs.push(redis.output);

  const checks = {
    backend: backend.success,
    frontend: frontend.success,
    postgres: postgres.success,
    redis: redis.success
  };

  return {
    success: Object.values(checks).every(Boolean),
    checks,
    logs
  };
}
