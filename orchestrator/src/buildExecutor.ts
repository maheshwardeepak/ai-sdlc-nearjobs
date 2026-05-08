import fs from "fs";
import path from "path";
import { runTask } from "./taskRuntime.js";

export async function runBuildPipeline(projectRoot: string) {
  const results = [];

  const frontend = path.join(projectRoot, "frontend");
  const backend = path.join(projectRoot, "backend");
  const infra = path.join(projectRoot, "infra");

  if (fs.existsSync(frontend)) {
    results.push(await runTask({
      id: "frontend-build",
      name: "Frontend Build",
      command: "pnpm",
      args: ["build"],
      cwd: frontend
    }));
  }

  if (fs.existsSync(backend)) {
    results.push(await runTask({
      id: "backend-build",
      name: "Backend Build",
      command: fs.existsSync(path.join(backend, "mvnw")) ? "./mvnw" : "mvn",
      args: ["test"],
      cwd: backend
    }));
  }

  if (fs.existsSync(infra)) {
    results.push(await runTask({
      id: "docker-build",
      name: "Docker Compose Build",
      command: "docker",
      args: ["compose", "up", "--build", "-d"],
      cwd: infra
    }));
  }

  return results;
}
