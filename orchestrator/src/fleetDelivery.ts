import fs from "fs";
import path from "path";
import { runDelivery } from "./deliveryCommand.js";

const MAX_CONCURRENCY = 2;

async function worker(project: string) {
  console.log(`\n=== Delivering ${project} ===`);

  try {
    const result = await runDelivery(project);

    return {
      project,
      success: result.success,
      result
    };
  } catch (error) {
    return {
      project,
      success: false,
      error: String(error)
    };
  }
}

export async function runFleetDelivery() {
  const projectsRoot = path.resolve(process.cwd(), "projects");

  const projects = fs
    .readdirSync(projectsRoot)
    .filter((p) =>
      fs.statSync(path.join(projectsRoot, p)).isDirectory()
    );

  const results = [];

  for (let i = 0; i < projects.length; i += MAX_CONCURRENCY) {
    const batch = projects.slice(i, i + MAX_CONCURRENCY);

    const batchResults = await Promise.all(
      batch.map(worker)
    );

    results.push(...batchResults);
  }

  return {
    success: results.every((r) => r.success),
    totalProjects: results.length,
    maxConcurrency: MAX_CONCURRENCY,
    results
  };
}
