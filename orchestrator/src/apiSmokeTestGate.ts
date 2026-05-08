import axios from "axios";
import { runTask } from "./taskRuntime.js";

export type ApiSmokeResult = {
  name: string;
  success: boolean;
  status?: number;
  data?: unknown;
  error?: string;
};

async function httpCheck(name: string, url: string): Promise<ApiSmokeResult> {
  try {
    const res = await axios.get(url, {
      timeout: 10000,
      validateStatus: () => true
    });

    return {
      name,
      success: res.status >= 200 && res.status < 400,
      status: res.status,
      data: res.data
    };
  } catch (error: any) {
    return {
      name,
      success: false,
      error: error?.message || String(error)
    };
  }
}

export async function runApiSmokeGate() {
  const results: ApiSmokeResult[] = [];

  results.push(await httpCheck(
    "backend-actuator-health",
    "http://localhost:8080/actuator/health"
  ));

  results.push(await httpCheck(
    "backend-status-api",
    "http://localhost:8080/api/v1/status"
  ));

  results.push(await httpCheck(
    "frontend-root",
    "http://localhost:3000"
  ));

  const docker = await runTask({
    id: "api-smoke-docker-ps",
    name: "API Smoke Docker PS",
    command: "docker",
    args: ["ps", "--format", "{{.Names}}"]
  });

  const runningNames = docker.stdout;

  results.push({
    name: "docker-backend-running",
    success: runningNames.includes("nearjobs-backend"),
    data: runningNames
  });

  results.push({
    name: "docker-frontend-running",
    success: runningNames.includes("nearjobs-frontend"),
    data: runningNames
  });

  results.push({
    name: "docker-postgres-running",
    success: runningNames.includes("nearjobs-postgres"),
    data: runningNames
  });

  results.push({
    name: "docker-redis-running",
    success: runningNames.includes("nearjobs-redis"),
    data: runningNames
  });

  return {
    success: results.every((r) => r.success),
    results
  };
}
