import fs from "fs";
import path from "path";
import { runTask } from "./taskRuntime.js";

function scanSecrets(root: string) {
  const findings: { file: string; match: string }[] = [];

  const patterns = [
    /api[_-]?key\s*[:=]\s*["'][^"']+["']/i,
    /password\s*[:=]\s*["'][^"']+["']/i,
    /secret\s*[:=]\s*["'][^"']+["']/i,
    /token\s*[:=]\s*["'][^"']+["']/i,
    /-----BEGIN (RSA|OPENSSH|EC|DSA)? ?PRIVATE KEY-----/i
  ];

  const ignored = new Set([
    "node_modules",
    "target",
    "dist",
    ".git",
    "_ai_artifacts",
    "_synthesized",
    "generated"
  ]);

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir)) {
      if (ignored.has(entry)) continue;

      const full = path.join(dir, entry);
      const stat = fs.statSync(full);

      if (stat.isDirectory()) {
        walk(full);
        continue;
      }

      if (!/\.(ts|tsx|js|jsx|java|json|yml|yaml|env|properties|xml|md|Dockerfile)$/i.test(full)) {
        continue;
      }

      const content = fs.readFileSync(full, "utf8");

      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
          findings.push({
            file: path.relative(root, full),
            match: match[0]
          });
        }
      }
    }
  }

  walk(root);

  return {
    success: findings.length === 0,
    findings
  };
}

export async function runSecurityGate(projectName: string) {
  const root = path.resolve(process.cwd(), "projects", projectName);

  const frontendAudit = await runTask({
    id: "security-npm-audit",
    name: "Security NPM Audit",
    command: "npm",
    args: ["audit", "--audit-level=high"],
    cwd: path.join(root, "frontend")
  });

  const composeConfig = await runTask({
    id: "security-compose-config",
    name: "Security Docker Compose Config",
    command: "docker",
    args: ["compose", "-f", "infra/docker-compose.yml", "config"],
    cwd: root
  });

  const secrets = scanSecrets(root);

  return {
    success: frontendAudit.success && composeConfig.success && secrets.success,
    checks: {
      frontendAudit,
      composeConfig,
      secrets
    }
  };
}
