import fs from "node:fs";
import path from "node:path";

export function ensurePackagingWorkspace(projectName: string, workspaceRoot: string) {
  const backend = path.join(workspaceRoot, "backend");
  const frontend = path.join(workspaceRoot, "frontend");

  fs.mkdirSync(workspaceRoot, { recursive: true });

  return {
    success: fs.existsSync(backend) && fs.existsSync(frontend),
    backendExists: fs.existsSync(backend),
    frontendExists: fs.existsSync(frontend),
    workspaceRoot,
    message:
      fs.existsSync(backend) && fs.existsSync(frontend)
        ? "Packaging workspace is ready."
        : `Packaging workspace missing generated app folders for ${projectName}. Expected backend and frontend under ${workspaceRoot}.`
  };
}
