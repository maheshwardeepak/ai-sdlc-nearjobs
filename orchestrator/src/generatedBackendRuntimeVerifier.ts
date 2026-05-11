import fs from "fs";
import path from "path";
import { execa } from "execa";

export type BackendRuntimeResult = {
  appPath: string;
  installSuccess: boolean;
  startSuccess: boolean;
  healthSuccess: boolean;
  error?: string;
};

function findBackendApps(rootDir: string): string[] {
  const apps: string[] = [];

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      }

      if (
        entry.isFile() &&
        entry.name === "package.json" &&
        fullPath.endsWith(`${path.sep}backend${path.sep}package.json`)
      ) {
        apps.push(path.dirname(fullPath));
      }
    }
  }

  walk(rootDir);
  return apps;
}

async function waitForHealth(url: string, attempts = 20): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {
      // retry
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}

export async function verifyGeneratedBackendRuntime(rootDir: string) {
  const apps = findBackendApps(path.resolve(process.cwd(), rootDir));
  const results: BackendRuntimeResult[] = [];

  for (const appPath of apps) {
    const result: BackendRuntimeResult = {
      appPath,
      installSuccess: false,
      startSuccess: false,
      healthSuccess: false
    };

    let child:
      | ReturnType<typeof execa>
      | undefined;

    try {
      await execa("npm", ["install"], {
        cwd: appPath,
        stdio: "pipe",
        env: { ...process.env, CI: "false" }
      });

      result.installSuccess = true;

      child = execa("npm", ["run", "dev"], {
        cwd: appPath,
        stdio: "pipe",
        env: {
          ...process.env,
          CI: "false",
          PORT: "3000"
        }
      });

      child.catch((error: any) => {
        const expectedShutdown =
          error?.exitCode === 143 || error?.signal === "SIGTERM";

        if (!expectedShutdown) {
          result.error = error instanceof Error ? error.message : String(error);
        }
      });

      result.startSuccess = true;
      result.healthSuccess = await waitForHealth("http://localhost:3000/health");

      if (!result.healthSuccess) {
        result.error = "health-check-failed";
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
    } finally {
      child?.kill("SIGTERM");
    }

    results.push(result);
  }

  return {
    success: results.every((item) => item.installSuccess && item.startSuccess && item.healthSuccess),
    appsChecked: results.length,
    results
  };
}

if (process.argv[1]?.includes("generatedBackendRuntimeVerifier")) {
  verifyGeneratedBackendRuntime(process.argv[2] || "runtime/workspaces")
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
