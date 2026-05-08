import fs from "fs";
import path from "path";
import { validateOpenClawArtifacts } from "./artifactValidator.js";

export type MergePlanItem = {
  sourceFile: string;
  targetFile: string;
  action: "copy";
};

export type MergePlan = {
  projectName: string;
  dryRun: boolean;
  valid: boolean;
  items: MergePlanItem[];
  issues: unknown[];
};

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function createMergePlan(projectName: string, dryRun = true): MergePlan {
  const slug = slugify(projectName);
  const projectRoot = path.resolve(process.cwd(), "projects", slug, "_ai_artifacts");

  const validations = validateOpenClawArtifacts();
  const issues = validations.flatMap((result) => result.issues);

  const items: MergePlanItem[] = validations
    .filter((result) => result.valid)
    .map((result) => ({
      sourceFile: result.file,
      targetFile: path.join(projectRoot, path.basename(result.file)),
      action: "copy"
    }));

  return {
    projectName: slug,
    dryRun,
    valid: !issues.some((issue: any) => issue.severity === "error"),
    items,
    issues
  };
}

export function executeMergePlan(plan: MergePlan): MergePlan {
  if (!plan.valid) {
    throw new Error("Merge blocked: artifact validation failed.");
  }

  if (plan.dryRun) {
    return plan;
  }

  for (const item of plan.items) {
    fs.mkdirSync(path.dirname(item.targetFile), { recursive: true });
    fs.copyFileSync(item.sourceFile, item.targetFile);
  }

  return plan;
}
