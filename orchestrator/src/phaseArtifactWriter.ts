import fs from "node:fs";
import path from "node:path";
import type { PhaseArtifact } from "./phaseArtifactExtractor.js";
import { semanticMergeFile, loadExistingFile } from "./semanticMergeEngine.js";

export type PhaseArtifactWriteResult = {
  success: boolean;
  writtenFiles: string[];
};

function assertSafeRelativePath(filePath: string): void {
  if (path.isAbsolute(filePath)) {
    throw new Error(`Unsafe absolute artifact path: ${filePath}`);
  }

  if (filePath.includes("..")) {
    throw new Error(`Unsafe parent traversal artifact path: ${filePath}`);
  }
}

export function writePhaseArtifacts(
  workspaceRoot: string,
  artifacts: PhaseArtifact[]
): PhaseArtifactWriteResult {
  const writtenFiles: string[] = [];

  for (const artifact of artifacts) {
    assertSafeRelativePath(artifact.path);

    const target = path.resolve(workspaceRoot, artifact.path);

    if (!target.startsWith(path.resolve(workspaceRoot))) {
      throw new Error(`Artifact escaped workspace: ${artifact.path}`);
    }

    fs.mkdirSync(path.dirname(target), { recursive: true });

    const replaceOnlyExtensions = [
      ".java",
      ".xml",
      ".yml",
      ".yaml",
      ".json",
      ".env",
      ".properties",
      ".sql",
      ".ts",
      ".tsx",
      ".js",
      ".jsx"
    ];

    const baseName = path.basename(target);

    const shouldReplace =
      replaceOnlyExtensions.some((ext) => target.endsWith(ext)) ||
      baseName === "Dockerfile" ||
      baseName.startsWith(".env");

    if (shouldReplace) {
      fs.writeFileSync(target, artifact.content);
    } else {
      const existing = loadExistingFile(target);

      const merge = semanticMergeFile(
        existing,
        artifact.content
      );

      fs.writeFileSync(target, merge.content);
    }

    writtenFiles.push(target);
  }

  return {
    success: true,
    writtenFiles
  };
}
