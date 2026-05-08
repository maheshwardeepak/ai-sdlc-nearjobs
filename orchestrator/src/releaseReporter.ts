import fs from "fs";
import path from "path";
import { runProjectVerificationGate } from "./projectVerificationGate.js";

export async function generateReleaseReport(projectName: string) {
  const result = await runProjectVerificationGate(projectName);

  const releaseDir = path.resolve(process.cwd(), "artifacts/releases");
  fs.mkdirSync(releaseDir, { recursive: true });

  const jsonPath = path.join(releaseDir, `${projectName}-release-report.json`);
  const mdPath = path.join(releaseDir, `${projectName}-release-summary.md`);

  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));

  const summary = `# ${projectName} Release Summary

## Status

${result.success ? "✅ READY FOR DELIVERY" : "❌ NOT READY"}

## Gates

- Build: ${result.gates.build.success ? "PASS" : "FAIL"}
- Runtime: ${result.gates.runtime.every((r) => r.success) ? "PASS" : "FAIL"}
- API Smoke: ${result.gates.apiSmoke.success ? "PASS" : "FAIL"}
- Playwright: ${result.gates.playwright.success ? "PASS" : "FAIL"}
- Security: ${result.gates.security.success ? "PASS" : "FAIL"}

## Generated At

${new Date().toISOString()}
`;

  fs.writeFileSync(mdPath, summary);

  return {
    success: result.success,
    jsonPath,
    mdPath
  };
}
