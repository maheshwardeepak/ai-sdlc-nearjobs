import fs from "node:fs";
import path from "node:path";

export type PhaseSecurityComplianceResult = {
  success: boolean;
  findings: Array<{
    file: string;
    rule: string;
    severity: "LOW" | "MEDIUM" | "HIGH";
    evidence: string;
  }>;
};

function collectFiles(root: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(root)) return files;

  function walk(current: string): void {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (["node_modules", "dist", "target", ".git"].includes(entry.name)) continue;
        walk(full);
        continue;
      }

      if (
        full.endsWith(".ts") ||
        full.endsWith(".tsx") ||
        full.endsWith(".js") ||
        full.endsWith(".java") ||
        full.endsWith(".yml") ||
        full.endsWith(".yaml") ||
        full.endsWith(".properties") ||
        full.endsWith(".env")
      ) {
        files.push(full);
      }
    }
  }

  walk(root);
  return files;
}

export function runPhaseSecurityComplianceGate(
  workspaceRoot: string
): PhaseSecurityComplianceResult {
  const findings: PhaseSecurityComplianceResult["findings"] = [];

  const rules = [
    {
      rule: "hardcoded-secret",
      severity: "HIGH" as const,
      regex: /(password|secret|token|api[_-]?key)\s*[:=]\s*["'][^"']{8,}["']/i
    },
    {
      rule: "unsafe-eval",
      severity: "HIGH" as const,
      regex: /\beval\s*\(/
    },
    {
      rule: "dangerous-child-process",
      severity: "HIGH" as const,
      regex: /child_process|execSync|spawnSync/
    },
    {
      rule: "wildcard-cors",
      severity: "MEDIUM" as const,
      regex: /allowedOrigins?\(["']\*["']\)|Access-Control-Allow-Origin.*\*/
    },
    {
      rule: "weak-jwt-secret",
      severity: "HIGH" as const,
      regex: /JWT_SECRET.*(secret|changeme|development|test)/i
    }
  ];

  for (const file of collectFiles(workspaceRoot)) {
    const content = fs.readFileSync(file, "utf8");

    for (const rule of rules) {
      const match = content.match(rule.regex);

      if (match) {
        findings.push({
          file,
          rule: rule.rule,
          severity: rule.severity,
          evidence: match[0].slice(0, 160)
        });
      }
    }
  }

  return {
    success: findings.filter((finding) => finding.severity === "HIGH").length === 0,
    findings
  };
}
