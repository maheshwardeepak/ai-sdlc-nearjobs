import fs from "fs";
import path from "path";

export type SecretScanResult = {
  success: boolean;
  filesScanned: number;
  violations: {
    file: string;
    pattern: string;
  }[];
  createdAt: string;
};

const SECRET_PATTERNS = [
  {
    name: "openai-api-key",
    regex: /sk-[A-Za-z0-9]{20,}/g
  },
  {
    name: "aws-access-key",
    regex: /AKIA[0-9A-Z]{16}/g
  },
  {
    name: "generic-secret",
    regex: /(SECRET|PASSWORD|TOKEN)\s*=\s*["'][^"']+["']/gi
  }
];

function scanDir(
  dir: string,
  violations: SecretScanResult["violations"]
): number {
  let filesScanned = 0;

  if (!fs.existsSync(dir)) {
    return filesScanned;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (
      entry.isDirectory() &&
      entry.name !== "node_modules" &&
      entry.name !== ".git"
    ) {
      filesScanned += scanDir(fullPath, violations);
      continue;
    }

    if (!entry.isFile()) continue;

    filesScanned += 1;

    try {
      const content = fs.readFileSync(fullPath, "utf8");

      for (const pattern of SECRET_PATTERNS) {
        if (pattern.regex.test(content)) {
          violations.push({
            file: fullPath,
            pattern: pattern.name
          });
        }
      }
    } catch {
      // ignore binary/unreadable files
    }
  }

  return filesScanned;
}

export function verifySecretScanning(
  rootDir = "runtime/workspaces"
): SecretScanResult {
  const violations: SecretScanResult["violations"] = [];

  const filesScanned = scanDir(
    path.resolve(process.cwd(), rootDir),
    violations
  );

  const report: SecretScanResult = {
    success: violations.length === 0,
    filesScanned,
    violations,
    createdAt: new Date().toISOString()
  };

  const reportsDir = path.resolve(process.cwd(), "artifacts/reports");

  fs.mkdirSync(reportsDir, { recursive: true });

  fs.writeFileSync(
    path.join(reportsDir, "secret-scan-report.json"),
    JSON.stringify(report, null, 2)
  );

  return report;
}

if (process.argv[1]?.includes("secretScanningVerifier")) {
  const result = verifySecretScanning(process.argv[2]);

  console.log(JSON.stringify(result, null, 2));

  if (!result.success) {
    process.exit(1);
  }
}
