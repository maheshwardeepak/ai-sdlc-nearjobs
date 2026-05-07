import fs from "fs";
import path from "path";

export function getAllRuns(factoryRoot: string) {
  const projectsDir = path.join(factoryRoot, "memory", "projects");

  if (!fs.existsSync(projectsDir)) {
    return [];
  }

  const projects = fs.readdirSync(projectsDir);

  let allRuns: any[] = [];

  for (const project of projects) {
    const indexPath = path.join(projectsDir, project, "RUN_INDEX.json");

    if (!fs.existsSync(indexPath)) continue;

    try {
      const data = JSON.parse(fs.readFileSync(indexPath, "utf8"));
      const runs = data.runs || [];

      allRuns = allRuns.concat(
        runs.map((r: any) => ({
          ...r,
          projectSlug: project
        }))
      );
    } catch {}
  }

  return allRuns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
