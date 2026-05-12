import fs from "fs";
import path from "path";
import { execSync } from "child_process";

type RuntimeCheck = {
  service: string;
  imageName: string;
  containerName: string;
  port: number;
  started: boolean;
  healthSuccess: boolean;
  error?: string;
};

type ContainerRuntimeReport = {
  success: boolean;
  checks: RuntimeCheck[];
  createdAt: string;
};

function run(command: string) {
  execSync(command, {
    cwd: process.cwd(),
    stdio: "pipe"
  });
}

function sleep(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export function verifyContainerRuntime(): ContainerRuntimeReport {
  const checks: RuntimeCheck[] = [
    {
      service: "backend",
      imageName: "ai-sdlc-generated-backend",
      containerName: "ai-sdlc-runtime-backend-test",
      port: 3000,
      started: false,
      healthSuccess: false
    },
    {
      service: "frontend",
      imageName: "ai-sdlc-generated-frontend",
      containerName: "ai-sdlc-runtime-frontend-test",
      port: 5173,
      started: false,
      healthSuccess: false
    }
  ];

  for (const check of checks) {
    try {
      try {
        run(`docker rm -f ${check.containerName}`);
      } catch {
        // container may not exist
      }

      run(
        `docker run -d --name ${check.containerName} -p ${check.port}:${check.port} ${check.imageName}`
      );

      check.started = true;

      sleep(5000);

      if (check.service === "backend") {
        run(`curl -fsS http://localhost:${check.port}/health`);
      } else {
        run(`curl -s -o /dev/null -w "%{http_code}" http://localhost:${check.port}`);
      }

      check.healthSuccess = true;
    } catch (error) {
      check.error = String(error);
    } finally {
      try {
        run(`docker rm -f ${check.containerName}`);
      } catch {
        // ignore cleanup failure
      }
    }
  }

  const report: ContainerRuntimeReport = {
    success: checks.every((c) => c.started && c.healthSuccess),
    checks,
    createdAt: new Date().toISOString()
  };

  const reportsDir = path.resolve(process.cwd(), "artifacts/reports");
  fs.mkdirSync(reportsDir, { recursive: true });

  fs.writeFileSync(
    path.join(reportsDir, "container-runtime-report.json"),
    JSON.stringify(report, null, 2)
  );

  return report;
}

if (process.argv[1]?.includes("containerRuntimeVerifier")) {
  const result = verifyContainerRuntime();

  console.log(JSON.stringify(result, null, 2));

  if (!result.success) {
    process.exit(1);
  }
}
