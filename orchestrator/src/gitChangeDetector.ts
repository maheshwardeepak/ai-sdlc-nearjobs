import fs from "fs";
import path from "path";
import { execSync } from "child_process";

export function detectChangedProjects(): string[] {
  const projects = new Set<string>();

  try {
    const output = execSync("git diff --name-only HEAD~1 HEAD", {
      encoding: "utf8"
    });

    for (const file of output.split("\n").map((f) => f.trim()).filter(Boolean)) {
      const match = file.match(/^projects\/([^/]+)/);
      if (match && match[1]) {
        projects.add(match[1]);
      }
    }
  } catch {
    // ignore history diff errors
  }

  try {
    const status = execSync("git status --porcelain", {
      encoding: "utf8"
    });

    for (const line of status.split("\n").map((l) => l.trim()).filter(Boolean)) {
      const match = line.match(/projects\/([^/\s]+)/);
      if (match && match[1]) {
        projects.add(match[1]);
      }
    }
  } catch {
    // ignore status errors
  }

  const projectsRoot = path.resolve(process.cwd(), "projects");

  if (fs.existsSync(projectsRoot)) {
    for (const project of fs.readdirSync(projectsRoot)) {
      const testFile = path.join(projectsRoot, project, "SMART_DELIVERY_TEST.md");
      if (fs.existsSync(testFile)) {
        projects.add(project);
      }
    }
  }

  return [...projects];
}
