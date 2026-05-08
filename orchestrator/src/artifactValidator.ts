import fs from "fs";
import path from "path";

export type ArtifactValidationIssue = {
  severity: "error" | "warning";
  code: string;
  message: string;
  file: string;
};

export type ArtifactValidationResult = {
  valid: boolean;
  file: string;
  role: string;
  issues: ArtifactValidationIssue[];
};

const FORBIDDEN_PATTERNS = [
  {
    code: "TODO_PLACEHOLDER",
    pattern: /\bTODO\b|\bplaceholder\b(?!\s*=|[:\-])|\bstub\b|\bmock implementation\b|\bscaffold(?:ing)?\b/i,
    message: "Artifact contains scaffold/placeholder language."
  },
  {
    code: "FAKE_SECRET",
    pattern: /password\s*=\s*["'][^"']+["']|api[_-]?key\s*=\s*["'][^"']+["']/i,
    message: "Artifact may contain hardcoded secrets."
  },
  {
    code: "EMPTY_IMPLEMENTATION",
    pattern: /throw new Error\(["']not implemented["']\)|return null;|return undefined;|pass\s*$/im,
    message: "Artifact may contain empty implementation."
  }
];

function inferRole(file: string): string {
  const name = path.basename(file).toLowerCase();

  if (name.includes("backend")) return "backend";
  if (name.includes("frontend")) return "frontend";
  if (name.includes("database")) return "database";
  if (name.includes("tests")) return "tests";
  if (name.includes("playwright")) return "playwright";
  if (name.includes("security")) return "security";
  if (name.includes("build")) return "build";
  if (name.includes("api")) return "api";

  return "unknown";
}

function isEngineeringRole(role: string): boolean {
  return ["backend", "frontend", "database", "tests"].includes(role);
}

export function validateArtifact(file: string): ArtifactValidationResult {
  const issues: ArtifactValidationIssue[] = [];
  const role = inferRole(file);

  if (!fs.existsSync(file)) {
    return {
      valid: false,
      file,
      role,
      issues: [
        {
          severity: "error",
          code: "MISSING_FILE",
          message: "Artifact file does not exist.",
          file
        }
      ]
    };
  }

  const content = fs.readFileSync(file, "utf8");

  if (content.trim().length < 500) {
    issues.push({
      severity: "error",
      code: "TOO_SMALL",
      message: "Artifact is too small to be production-grade.",
      file
    });
  }

  for (const rule of FORBIDDEN_PATTERNS) {
    if (rule.pattern.test(content)) {
      issues.push({
        severity: isEngineeringRole(role) ? "error" : "warning",
        code: rule.code,
        message: rule.message,
        file
      });
    }
  }

  return {
    valid: !issues.some((issue) => issue.severity === "error"),
    file,
    role,
    issues
  };
}

export function validateOpenClawArtifacts(): ArtifactValidationResult[] {
  const root = path.resolve(process.cwd(), "runtime/openclaw");

  if (!fs.existsSync(root)) {
    return [];
  }

  return fs
    .readdirSync(root)
    .filter((file) => file.endsWith(".md"))
    .map((file) => validateArtifact(path.join(root, file)));
}
