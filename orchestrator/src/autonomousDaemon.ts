import fs from "fs";
import path from "path";
import { runFleetDelivery } from "./fleetDelivery.js";

function getProjects() {
  const root = path.resolve(process.cwd(), "projects");

  return fs
    .readdirSync(root)
    .filter((p) => fs.statSync(path.join(root, p)).isDirectory());
}

export async function runDaemonOnce() {
  const projects = getProjects();

  console.log("Autonomous daemon scan completed.");
  console.log(`Projects found: ${projects.join(", ")}`);

  const result = await runFleetDelivery();

  return {
    success: result.success,
    mode: "once",
    projects,
    result
  };
}
