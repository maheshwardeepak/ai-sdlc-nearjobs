import fs from "fs";
import path from "path";

export type ArtifactValidationIssue = {
  file: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  reason: string;
};

export type ArtifactValidationReport = {
  success: boolean;
  sourceDir: string;
  filesChecked: number;
  issues: ArtifactValidationIssue[];
};

const FORBIDDEN_PATTERNS = [
  /api[_-]?key\s*=/i,
  /secret\s*=/i,
  /password\s*=/i,
  /private[_-]?key/i,
  /BEGIN RSA PRIVATE KEY/,
  /BEGIN OPENSSH PRIVATE KEY/
];

const PLACEHOLDER_PATTERNS = [
  /TODO/i,
  /FIXME/i,
  /placeholder/i,
  /lorem ipsum/i,
  /coming soon/i
];

function collectFiles(dir: string, base = dir): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files = files.concat(collectFiles(fullPath, base));
      continue;
    }

    files.push(path.relative(base, fullPath));
  }

  return files;
}

export function validateArtifacts(sourceDir: string): ArtifactValidationReport {
  const issues: ArtifactValidationIssue[] = [];

  if (!fs.existsSync(sourceDir)) {
    return {
      success: false,
      sourceDir,
      filesChecked: 0,
      issues: [
        {
          file: sourceDir,
          severity: "HIGH",
          reason: "source-directory-not-found"
        }
      ]
    };
  }

  const files = collectFiles(sourceDir);

  for (const file of files) {
    const fullPath = path.join(sourceDir, file);
    const stat = fs.statSync(fullPath);

    if (stat.size === 0) {
      issues.push({
        file,
        severity: "HIGH",
        reason: "empty-file"
      });
      continue;
    }

    if (stat.size > 2_000_000) {
      issues.push({
        file,
        severity: "MEDIUM",
        reason: "oversized-file"
      });
    }

    if (file.includes("..") || path.isAbsolute(file)) {
      issues.push({
        file,
        severity: "HIGH",
        reason: "invalid-target-path"
      });
    }

    const content = fs.readFileSync(fullPath, "utf8");

    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(content)) {
        issues.push({
          file,
          severity: "HIGH",
          reason: "possible-secret-detected"
        });
        break;
      }
    }

    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (pattern.test(content)) {
        issues.push({
          file,
          severity: "MEDIUM",
          reason: "placeholder-content-detected"
        });
        break;
      }
    }
  }

  const report = {
    success: !issues.some((issue) => issue.severity === "HIGH"),
    sourceDir,
    filesChecked: files.length,
    issues
  };

  const reportsDir = path.resolve(process.cwd(), "artifacts/reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(
    path.join(reportsDir, "artifact-validation-report.json"),
    JSON.stringify(report, null, 2)
  );

  return report;
}

if (process.argv[1]?.includes("artifactValidator")) {
  const sourceDir = process.argv[2];

  if (!sourceDir) {
    console.error("Usage: tsx artifactValidator.ts <sourceDir>");
    process.exit(1);
  }

  const report = validateArtifacts(path.resolve(sourceDir));
  console.log(JSON.stringify(report, null, 2));

  if (!report.success) process.exit(1);
}
