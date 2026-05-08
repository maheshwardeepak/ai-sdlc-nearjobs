import axios from "axios";

export async function validateRuntime() {
  const checks: {
    name: string;
    success: boolean;
    url: string;
    status?: number;
    data?: unknown;
    error?: string;
    code?: string;
  }[] = [];

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

  await check("backend-health", "http://localhost:8080/actuator/health");
  await check("frontend", "http://localhost:3000");

  return checks;
}
