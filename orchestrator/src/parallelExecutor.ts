import fs from "fs";
import path from "path";
import { executeWorker } from "./workerExecutor.js";

const CLONES_ROOT = path.resolve(process.cwd(), "runtime/trajectories/clones");

export async function executeAllClones(projectName: string) {
  const cloneFiles = fs
    .readdirSync(CLONES_ROOT)
    .filter((file) => file.endsWith(".json"));

  const normalizedProjectName = projectName.toLowerCase();

  const clones = cloneFiles
    .map((file) =>
      JSON.parse(
        fs.readFileSync(path.join(CLONES_ROOT, file), "utf8")
      )
    )
    .filter((clone) =>
      String(clone.projectName).toLowerCase() === normalizedProjectName
    );

  const results = await Promise.all(
    clones.map((clone) =>
      executeWorker({
        workerId: clone.id,
        role: clone.role,
        workspacePath: clone.workspacePath,
        objective: `Generate production-grade ${clone.role} implementation for ${projectName}`
      })
    )
  );

  return results;
}
