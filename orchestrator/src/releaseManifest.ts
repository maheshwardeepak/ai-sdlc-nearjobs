import fs from "fs";
import path from "path";
import { runTask } from "./taskRuntime.js";
import { runProjectVerificationGate } from "./projectVerificationGate.js";

async function gitValue(args: string[]) {
  const result = await runTask({
    id: `git-${args.join("-")}`,
    name: `Git ${args.join(" ")}`,
    command: "git",
    args
  });

  return result.success ? result.stdout.trim() : "unknown";
}

export async function generateReleaseManifest(projectName: string) {
  const verification = await runProjectVerificationGate(projectName);

  const releaseDir = path.resolve(process.cwd(), "artifacts/releases");
  fs.mkdirSync(releaseDir, { recursive: true });

  const timestamp = new Date().toISOString();
  const shortSha = await gitValue(["rev-parse", "--short", "HEAD"]);
  const branch = await gitValue(["rev-parse", "--abbrev-ref", "HEAD"]);
  const version = `${projectName}-${timestamp.replace(/[:.]/g, "-")}-${shortSha}`;

  const manifest = {
    projectName,
    version,
    branch,
    commit: shortSha,
    generatedAt: timestamp,
    readyForDelivery: verification.success,
    gates: {
      build: verification.gates.build.success,
      runtime: verification.gates.runtime.every((r) => r.success),
      apiSmoke: verification.gates.apiSmoke.success,
      playwright: verification.gates.playwright.success,
      security: verification.gates.security.success
    }
  };

  const manifestPath = path.join(releaseDir, `${version}.manifest.json`);
  const latestPath = path.join(releaseDir, `${projectName}-latest.manifest.json`);

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  fs.writeFileSync(latestPath, JSON.stringify(manifest, null, 2));

  return {
    success: verification.success,
    version,
    manifestPath,
    latestPath,
    manifest
  };
}
