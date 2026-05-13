import axios from "axios";
import fs from "fs";
import path from "path";
import { loadTechnologyStackContract } from "./technologyStackContract.js";

export type RuntimeCheck = {
  name: string;
  success: boolean;
  url: string;
  status?: number;
  data?: unknown;
  error?: string;
  code?: string;
};

function endpointForStack(): Array<{ name: string; url: string }> {
  const stack = loadTechnologyStackContract();

  const frontendUrl =
    stack.frontend.framework === "Next.js"
      ? "http://localhost:3001"
      : "http://localhost:5173";

  return [
    {
      name: "backend-health",
      url: "http://localhost:3000/health"
    },
    {
      name: "frontend",
      url: frontendUrl
    }
  ];
}

export async function validateRuntime(): Promise<RuntimeCheck[]> {
  const checks: RuntimeCheck[] = [];

  async function check(name: string, url: string) {
    try {
      const res = await axios.get(url, {
        timeout: 10000,
        validateStatus: () => true
      });

      checks.push({
        name,
        url,
        success: res.status >= 200 && res.status < 400,
        status: res.status,
        data: res.data
      });
    } catch (error: any) {
      checks.push({
        name,
        url,
        success: false,
        error: error?.message || String(error),
        code: error?.code
      });
    }
  }

  for (const endpoint of endpointForStack()) {
    await check(endpoint.name, endpoint.url);
  }

  const reportsDir = path.resolve(process.cwd(), "artifacts/reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportsDir, "runtime-validation-report.json"),
    JSON.stringify(
      {
        success: checks.every((check) => check.success),
        checks,
        createdAt: new Date().toISOString()
      },
      null,
      2
    )
  );

  return checks;
}
