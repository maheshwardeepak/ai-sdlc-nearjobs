import fs from "fs";
import path from "path";

export type RepoNode = {
  path: string;
  type: "main" | "submodule" | "nested" | "ignored";
  hasGit: boolean;
};

const IGNORED_PATTERNS = [
  "backups",
  "node_modules",
  ".pnpm-store",
  "dist",
  "build"
];

function isIgnored(dir: string): boolean {
  return IGNORED_PATTERNS.some((pattern) =>
    dir.includes(pattern)
  );
}

function detectRepoType(repoPath: string): RepoNode["type"] {
  if (repoPath === process.cwd()) {
    return "main";
  }

  if (repoPath.includes("backups")) {
    return "ignored";
  }

  return "nested";
}

export function detectGitRepos(
  rootDir: string,
  results: RepoNode[] = []
): RepoNode[] {
  if (results.length === 0) {
    results.push({
      path: rootDir,
      type: "main",
      hasGit: fs.existsSync(path.join(rootDir, ".git"))
    });
  }

  const entries = fs.readdirSync(rootDir, {
    withFileTypes: true
  });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const fullPath = path.join(rootDir, entry.name);

    if (isIgnored(fullPath)) {
      results.push({
        path: fullPath,
        type: "ignored",
        hasGit: false
      });

      continue;
    }

    const gitPath = path.join(fullPath, ".git");

    if (fs.existsSync(gitPath)) {
      results.push({
        path: fullPath,
        type: detectRepoType(fullPath),
        hasGit: true
      });

      continue;
    }

    detectGitRepos(fullPath, results);
  }

  return results;
}

if (process.argv[1]?.includes("submoduleDetector")) {
  const repos = detectGitRepos(process.cwd());

  console.log(
    JSON.stringify(
      {
        success: true,
        total: repos.length,
        repos
      },
      null,
      2
    )
  );
}
