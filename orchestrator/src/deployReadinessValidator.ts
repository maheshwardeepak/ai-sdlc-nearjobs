import fs from "fs";
import path from "path";

export function validateDeployReadiness(projectName: string) {
  const root = path.resolve(process.cwd(), "projects", projectName);

  const checks = [
    "backend",
    "frontend",
    "infra/docker-compose.yml",
    "backend/Dockerfile",
    "frontend/Dockerfile"
  ].map((requiredPath) => {
    const fullPath = path.join(root, requiredPath);

    return {
      path: requiredPath,
      exists: fs.existsSync(fullPath),
      fullPath
    };
  });

  return {
    projectName,
    ready: checks.every((check) => check.exists),
    checks
  };
}
