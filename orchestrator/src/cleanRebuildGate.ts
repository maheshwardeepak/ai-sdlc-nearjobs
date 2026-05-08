import path from "path";
import { runTask } from "./taskRuntime.js";

export async function runCleanRebuildGate(projectName: string) {
  const root = path.resolve(process.cwd(), "projects", projectName);

  const down = await runTask({
    id: "clean-rebuild-down",
    name: "Clean Rebuild Down",
    command: "docker",
    args: ["compose", "-f", "infra/docker-compose.yml", "down", "-v", "--remove-orphans"],
    cwd: root
  });

  const build = await runTask({
    id: "clean-rebuild-build",
    name: "Clean Rebuild Build No Cache",
    command: "docker",
    args: ["compose", "-f", "infra/docker-compose.yml", "build", "--no-cache"],
    cwd: root
  });

  if (!build.success) {
    return {
      success: false,
      failedAt: "build",
      down,
      build
    };
  }

  const up = await runTask({
    id: "clean-rebuild-up",
    name: "Clean Rebuild Up",
    command: "docker",
    args: ["compose", "-f", "infra/docker-compose.yml", "up", "-d"],
    cwd: root
  });

  return {
    success: down.success && build.success && up.success,
    down,
    build,
    up
  };
}
