import fs from "fs";
import path from "path";
import { execa } from "execa";

export type CrudIntegrationResult = {
  appPath: string;
  dbInitSuccess: boolean;
  startSuccess: boolean;
  createUserSuccess: boolean;
  listUsersSuccess: boolean;
  error?: string;
};

function findBackendApps(rootDir: string): string[] {
  const apps: string[] = [];

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && entry.name !== "node_modules") {
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
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}

async function createVerificationDatabase(baseUrl: string, dbName: string): Promise<string> {
  const adminUrl = baseUrl.replace(/\/[^/]+$/, "/postgres");

  await execa("psql", [
    adminUrl,
    "-c",
    `DROP DATABASE IF EXISTS ${dbName}`
  ], { stdio: "pipe" });

  await execa("psql", [
    adminUrl,
    "-c",
    `CREATE DATABASE ${dbName}`
  ], { stdio: "pipe" });

  return baseUrl.replace(/\/[^/]+$/, `/${dbName}`);
}


export async function verifyGeneratedCrudIntegration(rootDir: string) {
  const apps = findBackendApps(path.resolve(process.cwd(), rootDir));
  const results: CrudIntegrationResult[] = [];

  for (const appPath of apps) {
    const result: CrudIntegrationResult = {
      appPath,
      dbInitSuccess: false,
      startSuccess: false,
      createUserSuccess: false,
      listUsersSuccess: false
    };

    let child: ReturnType<typeof execa> | undefined;

    try {
      const databaseUrl =
        process.env.DATABASE_URL ||
        "postgres://postgres:postgres@localhost:55432/postgres";

      const dbName = `factory_verify_${Date.now()}`;
      const verificationDatabaseUrl = await createVerificationDatabase(databaseUrl, dbName);

      const initSql = path.join(appPath, "sql/init.sql");

      await execa("npm", ["install"], {
        cwd: appPath,
        stdio: "pipe",
        env: { ...process.env, CI: "false" }
      });

      await execa("psql", [verificationDatabaseUrl, "-f", initSql], {
        cwd: appPath,
        stdio: "pipe"
      });

      result.dbInitSuccess = true;

      child = execa("npm", ["run", "dev"], {
        cwd: appPath,
        stdio: "pipe",
        env: {
          ...process.env,
          CI: "false",
          PORT: "3001",
          DATABASE_URL: verificationDatabaseUrl
        }
      });

      child.catch((error: any) => {
        const expectedShutdown =
          error?.exitCode === 143 || error?.signal === "SIGTERM";

        if (!expectedShutdown) {
          result.error = error instanceof Error ? error.message : String(error);
        }
      });

      result.startSuccess = await waitForHealth("http://localhost:3001/health");

      const createResponse = await fetch("http://localhost:3001/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Factory User",
          email: `factory-${Date.now()}@example.com`
        })
      });

      result.createUserSuccess = createResponse.ok;

      const listResponse = await fetch("http://localhost:3001/users");
      const listJson = await listResponse.json() as { users?: unknown[] };

      result.listUsersSuccess =
        listResponse.ok &&
        Array.isArray(listJson.users) &&
        listJson.users.length > 0;
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
    } finally {
      child?.kill("SIGTERM");
    }

    results.push(result);
  }

  const report = {
    success: results.every(
      (item) =>
        item.dbInitSuccess &&
        item.startSuccess &&
        item.createUserSuccess &&
        item.listUsersSuccess
    ),
    appsChecked: results.length,
    results
  };

  const reportsDir = path.resolve(process.cwd(), "artifacts/reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportsDir, "generated-crud-verification-report.json"),
    JSON.stringify(report, null, 2)
  );

  return report;
}

if (process.argv[1]?.includes("generatedCrudIntegrationVerifier")) {
  verifyGeneratedCrudIntegration(process.argv[2] || "runtime/workspaces")
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
