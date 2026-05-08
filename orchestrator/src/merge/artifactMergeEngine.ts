import fs from "fs";
import path from "path";
import crypto from "crypto";

export type MergeCandidate = {
  file: string;
  exists: boolean;
  checksum?: string;
};

export type MergeConflict = {
  file: string;
  reason: string;
};

export type MergeReport = {
  success: boolean;
  sourceDir: string;
  targetDir: string;
  candidates: MergeCandidate[];
  conflicts: MergeConflict[];
  merged: string[];
  dryRun: boolean;
};

function sha256(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

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

export function executeArtifactMerge(
  sourceDir: string,
  targetDir: string,
  dryRun = true
): MergeReport {
  const files = collectFiles(sourceDir);

  const candidates: MergeCandidate[] = [];
  const conflicts: MergeConflict[] = [];
  const merged: string[] = [];

  for (const relativeFile of files) {
    const sourceFile = path.join(sourceDir, relativeFile);
    const targetFile = path.join(targetDir, relativeFile);

    const exists = fs.existsSync(targetFile);

    const candidate: MergeCandidate = {
      file: relativeFile,
      exists
    };

    if (exists) {
      candidate.checksum = sha256(targetFile);

      conflicts.push({
        file: relativeFile,
        reason: "target-file-already-exists"
      });

      candidates.push(candidate);
      continue;
    }

    candidates.push(candidate);

    if (!dryRun) {
      fs.mkdirSync(path.dirname(targetFile), {
        recursive: true
      });

      fs.copyFileSync(sourceFile, targetFile);
    }

    merged.push(relativeFile);
  }

  return {
    success: conflicts.length === 0,
    sourceDir,
    targetDir,
    candidates,
    conflicts,
    merged,
    dryRun
  };
}

if (process.argv[1]?.includes("artifactMergeEngine")) {
  const sourceDir = process.argv[2];
  const targetDir = process.argv[3];
  const dryRun = process.argv[4] !== "--apply";

  if (!sourceDir || !targetDir) {
    console.error(
      "Usage: tsx artifactMergeEngine.ts <sourceDir> <targetDir> [--apply]"
    );
    process.exit(1);
  }

  const report = executeArtifactMerge(
    path.resolve(sourceDir),
    path.resolve(targetDir),
    dryRun
  );

  console.log(JSON.stringify(report, null, 2));

  if (!report.success) {
    process.exit(1);
  }
}
