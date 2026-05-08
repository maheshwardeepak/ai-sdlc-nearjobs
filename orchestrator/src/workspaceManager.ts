import fs from "fs";
import path from "path";

const PROJECTS_ROOT = path.resolve(process.cwd(), "projects");
const WORKSPACES_ROOT = path.resolve(process.cwd(), "runtime/workspaces");

export type ProjectWorkspace = {
  projectName: string;
  projectPath: string;
  workspacePath: string;
  createdAt: string;
};

export function slugifyProjectName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function createProjectWorkspace(projectName: string): ProjectWorkspace {
  const slug = slugifyProjectName(projectName);

  if (!slug) {
    throw new Error("Invalid project name.");
  }

  const projectPath = path.join(PROJECTS_ROOT, slug);
  const workspacePath = path.join(WORKSPACES_ROOT, slug);

  fs.mkdirSync(projectPath, { recursive: true });
  fs.mkdirSync(workspacePath, { recursive: true });

  const workspace: ProjectWorkspace = {
    projectName: slug,
    projectPath,
    workspacePath,
    createdAt: new Date().toISOString()
  };

  fs.writeFileSync(
    path.join(workspacePath, "workspace.json"),
    JSON.stringify(workspace, null, 2)
  );

  return workspace;
}

export function createWorkerWorkspace(projectName: string, workerName: string): string {
  const slug = slugifyProjectName(projectName);
  const workerSlug = slugifyProjectName(workerName);

  const workerPath = path.join(WORKSPACES_ROOT, slug, "workers", workerSlug);
  fs.mkdirSync(workerPath, { recursive: true });

  fs.writeFileSync(
    path.join(workerPath, "worker.json"),
    JSON.stringify(
      {
        projectName: slug,
        workerName: workerSlug,
        createdAt: new Date().toISOString()
      },
      null,
      2
    )
  );

  return workerPath;
}
