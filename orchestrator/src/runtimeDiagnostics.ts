import { runTask } from "./taskRuntime.js";

export async function collectRuntimeDiagnostics() {
  const checks = [];

  checks.push(await runTask({
    id: "docker-ps",
    name: "Docker PS",
    command: "docker",
    args: ["ps", "-a"]
  }));

  checks.push(await runTask({
    id: "backend-logs",
    name: "Backend Logs",
    command: "docker",
    args: ["logs", "nearjobs-backend"]
  }));

  checks.push(await runTask({
    id: "frontend-logs",
    name: "Frontend Logs",
    command: "docker",
    args: ["logs", "nearjobs-frontend"]
  }));

  return checks;
}
