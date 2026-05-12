import fs from "fs";
import path from "path";

export type ExtractedArtifact = {
  relativePath: string;
  content: string;
};

const SAFE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".css",
  ".html",
  ".md",
  ".yml",
  ".yaml",
  ".sql",
  ".env.example"
];

function isSafeRelativePath(filePath: string): boolean {
  if (!filePath || filePath.includes("..") || path.isAbsolute(filePath)) {
    return false;
  }

  return SAFE_EXTENSIONS.some((ext) => filePath.endsWith(ext));
}

export function extractArtifactsFromMarkdown(markdown: string): ExtractedArtifact[] {
  const artifacts: ExtractedArtifact[] = [];

  const fileBlockRegex =
    /```(?:file:|filepath:|path:)([^\n]+)\n([\s\S]*?)```/g;

  for (const match of markdown.matchAll(fileBlockRegex)) {
    const relativePath = match[1]?.trim();
    const content = match[2] ?? "";

    if (!relativePath || !isSafeRelativePath(relativePath)) {
      continue;
    }

    artifacts.push({
      relativePath,
      content: content.trimEnd() + "\n"
    });
  }

  return artifacts;
}

export function writeExtractedArtifacts(
  workspacePath: string,
  role: string,
  artifacts: ExtractedArtifact[]
): string[] {
  const writtenFiles: string[] = [];

  for (const artifact of artifacts) {
    const roleRoots: Record<string, string> = {
      backend: "backend",
      frontend: "frontend",
      database: "database",
      tests: "tests",
      api: "api",
      build: "build",
      playwright: "playwright",
      security: "security"
    };

    const appRoot = roleRoots[role] || role;

    const targetPath = path.resolve(
      workspacePath,
      appRoot,
      artifact.relativePath
    );

    const roleRoot = path.resolve(workspacePath, appRoot);

    if (!targetPath.startsWith(roleRoot)) {
      continue;
    }

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, artifact.content);
    writtenFiles.push(targetPath);
  }

  return writtenFiles;
}
