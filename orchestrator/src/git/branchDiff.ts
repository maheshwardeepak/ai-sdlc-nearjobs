import { execa } from "execa";

export type BranchDiffResult = {
  success: boolean;
  currentBranch: string;
  baseBranch: string;
  changedFiles: string[];
  changedProjects: string[];
};

async function currentBranch(): Promise<string> {
  const result = await execa("git", [
    "rev-parse",
    "--abbrev-ref",
    "HEAD"
  ]);

  return result.stdout.trim();
}

async function changedFiles(baseBranch: string): Promise<string[]> {
  const result = await execa("git", [
    "diff",
    "--name-only",
    `${baseBranch}...HEAD`
  ]);

  return result.stdout
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function detectProjects(files: string[]): string[] {
  const projects = new Set<string>();

  for (const file of files) {
    if (file.includes("projects/nearjobs")) {
      projects.add("nearjobs");
    }

    if (file.includes("orchestrator")) {
      projects.add("orchestrator");
    }

    if (file.includes("dashboard")) {
      projects.add("dashboard");
    }
  }

  return [...projects];
}

export async function generateBranchDiff(
  baseBranch = "main"
): Promise<BranchDiffResult> {
  const branch = await currentBranch();

  const files = await changedFiles(baseBranch);

  return {
    success: true,
    currentBranch: branch,
    baseBranch,
    changedFiles: files,
    changedProjects: detectProjects(files)
  };
}

if (process.argv[1]?.includes("branchDiff")) {
  generateBranchDiff()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
