import path from "path";
import { runTask } from "./taskRuntime.js";

export async function runBuildVerificationGate(projectName: string) {
  const root = path.resolve(process.cwd(), "projects", projectName);

  const results = [];

  results.push(await runTask({
    id: "frontend-build-gate",
    name: "Frontend Build Gate",
    command: "npm",
    args: ["run", "build"],
    cwd: path.join(root, "frontend")
  }));

  results.push(await runTask({
    id: "backend-test-gate",
    name: "Backend Test Gate",
    command: "mvn",
    args: ["test"],
    cwd: path.join(root, "backend")
  }));

  results.push(await runTask({
    id: "compose-config-gate",
    name: "Docker Compose Config Gate",
    command: "docker",
    args: ["compose", "-f", "infra/docker-compose.yml", "config"],
    cwd: root
  }));

  results.push(await runTask({
    id: "compose-ps-gate",
    name: "Docker Compose PS Gate",
    command: "docker",
    args: ["compose", "-f", "infra/docker-compose.yml", "ps"],
    cwd: root
  }));

  return {
    success: results.every((r) => r.success),
    results
  };
}
