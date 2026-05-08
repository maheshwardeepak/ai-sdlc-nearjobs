import fs from "fs";
import path from "path";
import crypto from "crypto";
import { runTask } from "./taskRuntime.js";

export type SafePatch = {
  targetFile: string;
  content: string;
  reason: string;
};

function sha(content: string) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

export async function applySafeRepoPatches(projectName: string, patches: SafePatch[]) {
  const projectRoot = path.resolve(process.cwd(), "projects", projectName);
  const backupRoot = path.resolve(process.cwd(), "artifacts/patch-backups", projectName, Date.now().toString());

  const applied = [];

  for (const patch of patches) {
    const target = path.resolve(projectRoot, patch.targetFile);

    if (!target.startsWith(projectRoot)) {
      throw new Error(`Unsafe patch path blocked: ${patch.targetFile}`);
    }

    const beforeExists = fs.existsSync(target);
    const before = beforeExists ? fs.readFileSync(target, "utf8") : "";

    const backupFile = path.join(backupRoot, patch.targetFile);
    fs.mkdirSync(path.dirname(backupFile), { recursive: true });

    if (beforeExists) {
      fs.writeFileSync(backupFile, before);
    }

    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, patch.content);

    applied.push({
      targetFile: patch.targetFile,
      reason: patch.reason,
      beforeHash: sha(before),
      afterHash: sha(patch.content),
      backupFile: beforeExists ? backupFile : null
    });
  }

  const diff = await runTask({
    id: "safe-repo-patch-diff",
    name: "Safe Repo Patch Diff",
    command: "git",
    args: ["diff", "--", `projects/${projectName}`]
  });

  return {
    success: true,
    projectName,
    backupRoot,
    applied,
    diff: diff.stdout
  };
}

export async function rollbackSafeRepoPatches(projectName: string, backupRoot: string) {
  const projectRoot = path.resolve(process.cwd(), "projects", projectName);

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      const stat = fs.statSync(full);

      if (stat.isDirectory()) {
        walk(full);
      } else {
        const relative = path.relative(backupRoot, full);
        const target = path.join(projectRoot, relative);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(full, target);
      }
    }
  }

  walk(backupRoot);

  return {
    success: true,
    projectName,
    restoredFrom: backupRoot
  };
}
