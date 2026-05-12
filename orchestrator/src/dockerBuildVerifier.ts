import fs from "fs";
import path from "path";
import { execSync } from "child_process";

type DockerBuildResult = {
  appPath: string;
  imageName: string;
  buildSuccess: boolean;
  error?: string;
};

type DockerBuildReport = {
  success: boolean;
  appsChecked: number;
  results: DockerBuildResult[];
  createdAt: string;
};

function findDockerApps(rootDir: string): string[] {
  const apps: string[] = [];

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && entry.name !== "node_modules") {
        walk(fullPath);
      }

      if (entry.isFile() && entry.name === "Dockerfile") {
        apps.push(path.dirname(fullPath));
      }
    }
  }

  walk(rootDir);
  return apps;
}

function imageNameFor(appPath: string) {
  return appPath.includes("/frontend")
    ? "ai-sdlc-generated-frontend"
    : "ai-sdlc-generated-backend";
}

export function verifyDockerBuild(
  rootDir = "runtime/workspaces"
): DockerBuildReport {
  const apps = findDockerApps(path.resolve(process.cwd(), rootDir));

  const results: DockerBuildResult[] = [];

  for (const appPath of apps) {
    const imageName = imageNameFor(appPath);

    try {
      execSync(`docker build -t ${imageName} "${appPath}"`, {
        cwd: process.cwd(),
        stdio: "inherit"
      });

      results.push({
        appPath,
        imageName,
        buildSuccess: true
      });
    } catch (error) {
      results.push({
        appPath,
        imageName,
        buildSuccess: false,
        error: String(error)
      });
    }
  }

  const report: DockerBuildReport = {
    success: results.every((r) => r.buildSuccess),
    appsChecked: results.length,
    results,
    createdAt: new Date().toISOString()
  };

  const reportsDir = path.resolve(process.cwd(), "artifacts/reports");
  fs.mkdirSync(reportsDir, { recursive: true });

  fs.writeFileSync(
    path.join(reportsDir, "docker-build-report.json"),
    JSON.stringify(report, null, 2)
  );

  return report;
}

if (process.argv[1]?.includes("dockerBuildVerifier")) {
  const result = verifyDockerBuild(process.argv[2]);

  console.log(JSON.stringify(result, null, 2));

  if (!result.success) {
    process.exit(1);
  }
}
