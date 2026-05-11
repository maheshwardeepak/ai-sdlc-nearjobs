import fs from "fs";
import path from "path";
import { execa } from "execa";

export type GeneratedAppBuildResult = {
  appPath: string;
  appType: "backend" | "frontend";
  installSuccess: boolean;
  buildSuccess: boolean;
  error?: string;
};

function findPackageApps(rootDir: string): GeneratedAppBuildResult[] {
  const results: GeneratedAppBuildResult[] = [];

  function walk(dir: string) {
    if (!fs.existsSync(dir)) {
      return;
    }

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      }

      if (entry.isFile() && entry.name === "package.json") {
        const appPath = path.dirname(fullPath);
        const appType = appPath.includes("/backend")
          ? "backend"
          : appPath.includes("/frontend")
            ? "frontend"
            : null;

        if (appType) {
          results.push({
            appPath,
            appType,
            installSuccess: false,
            buildSuccess: false
          });
        }
      }
    }
  }

  walk(rootDir);
  return results;
}

export async function verifyGeneratedApps(rootDir: string) {
  const apps = findPackageApps(path.resolve(process.cwd(), rootDir));
  const results: GeneratedAppBuildResult[] = [];

  for (const app of apps) {
    try {
      await execa("npm", ["install"], {
        cwd: app.appPath,
        stdio: "pipe",
        env: {
          ...process.env,
          CI: "false"
        }
      });

      app.installSuccess = true;

      await execa("npm", ["run", "build"], {
        cwd: app.appPath,
        stdio: "pipe",
        env: {
          ...process.env,
          CI: "false"
        }
      });

      app.buildSuccess = true;
    } catch (error) {
      app.error = error instanceof Error ? error.message : String(error);
    }

    results.push(app);
  }

  return {
    success: results.every((item) => item.installSuccess && item.buildSuccess),
    appsChecked: results.length,
    results
  };
}

if (process.argv[1]?.includes("generatedAppBuildVerifier")) {
  verifyGeneratedApps(process.argv[2] || "runtime/workspaces")
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
