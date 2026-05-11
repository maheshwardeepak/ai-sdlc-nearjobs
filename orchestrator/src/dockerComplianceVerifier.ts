import fs from "fs";
import path from "path";

export type DockerComplianceResult = {
  success: boolean;
  appsChecked: number;
  results: {
    appPath: string;
    dockerfilePresent: boolean;
    composePresent: boolean;
    healthcheckPresent: boolean;
    violations: string[];
  }[];
  createdAt: string;
};

function findGeneratedApps(rootDir: string): string[] {
  const apps: string[] = [];

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && entry.name !== "node_modules") {
        walk(fullPath);
      }

      if (entry.isFile() && entry.name === "package.json") {
        apps.push(path.dirname(fullPath));
      }
    }
  }

  walk(rootDir);
  return apps;
}

export function verifyDockerCompliance(rootDir = "runtime/workspaces") {
  const apps = findGeneratedApps(path.resolve(process.cwd(), rootDir));

  const results: DockerComplianceResult["results"] = apps.map((appPath) => {
    const dockerfilePath = path.join(appPath, "Dockerfile");
    const composePath = path.join(appPath, "docker-compose.yml");

    const dockerfilePresent = fs.existsSync(dockerfilePath);
    const composePresent = fs.existsSync(composePath);

    const dockerfileContent = dockerfilePresent
      ? fs.readFileSync(dockerfilePath, "utf8")
      : "";

    const healthcheckPresent =
      dockerfileContent.includes("HEALTHCHECK") ||
      dockerfileContent.includes("/health");

    const violations: string[] = [];

    if (!dockerfilePresent) violations.push("missing-dockerfile");
    if (!composePresent) violations.push("missing-docker-compose");
    if (!healthcheckPresent) violations.push("missing-healthcheck");

    return {
      appPath,
      dockerfilePresent,
      composePresent,
      healthcheckPresent,
      violations
    };
  });

  const report: DockerComplianceResult = {
    success: results.every((item) => item.violations.length === 0),
    appsChecked: results.length,
    results,
    createdAt: new Date().toISOString()
  };

  const reportsDir = path.resolve(process.cwd(), "artifacts/reports");
  fs.mkdirSync(reportsDir, { recursive: true });

  fs.writeFileSync(
    path.join(reportsDir, "docker-compliance-report.json"),
    JSON.stringify(report, null, 2)
  );

  return report;
}

if (process.argv[1]?.includes("dockerComplianceVerifier")) {
  const result = verifyDockerCompliance(process.argv[2]);

  console.log(JSON.stringify(result, null, 2));

  if (!result.success) {
    process.exit(1);
  }
}
