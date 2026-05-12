import fs from "fs";
import path from "path";

type Finding = {
  file: string;
  pattern: string;
  severity: "low" | "medium" | "high";
};

type SastReport = {
  success: boolean;
  filesScanned: number;
  findings: Finding[];
  createdAt: string;
};

const RULES = [
  {
    pattern: "eval(",
    severity: "high" as const
  },
  {
    pattern: "child_process.exec(",
    severity: "high" as const
  },
  {
    pattern: "innerHTML",
    severity: "medium" as const
  },
  {
    pattern: "SELECT * FROM " ,
    severity: "medium" as const
  },
  {
    pattern: "http://localhost",
    severity: "low" as const
  }
];

function collectFiles(rootDir: string): string[] {
  const files: string[] = [];

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);

      if (
        entry.isDirectory() &&
        entry.name !== "node_modules"
      ) {
        walk(fullPath);
      }

      if (
        entry.isFile() &&
        (
          fullPath.endsWith(".ts") ||
          fullPath.endsWith(".tsx") ||
          fullPath.endsWith(".js") ||
          fullPath.endsWith(".jsx")
        )
      ) {
        files.push(fullPath);
      }
    }
  }

  walk(rootDir);

  return files;
}

export function verifySast(
  rootDir = "runtime/workspaces"
): SastReport {
  const files = collectFiles(
    path.resolve(process.cwd(), rootDir)
  );

  const findings: Finding[] = [];

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");

    for (const rule of RULES) {
      if (content.includes(rule.pattern)) {
        findings.push({
          file,
          pattern: rule.pattern,
          severity: rule.severity
        });
      }
    }
  }

  const report: SastReport = {
    success: findings.filter(f => f.severity !== "low").length === 0,
    filesScanned: files.length,
    findings,
    createdAt: new Date().toISOString()
  };

  const reportsDir = path.resolve(
    process.cwd(),
    "artifacts/reports"
  );

  fs.mkdirSync(reportsDir, { recursive: true });

  fs.writeFileSync(
    path.join(reportsDir, "sast-report.json"),
    JSON.stringify(report, null, 2)
  );

  return report;
}

if (process.argv[1]?.includes("sastVerifier")) {
  const result = verifySast(process.argv[2]);

  console.log(JSON.stringify(result, null, 2));

  if (!result.success) {
    process.exit(1);
  }
}
