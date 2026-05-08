import fs from "fs";
import path from "path";
import { validateOpenClawArtifacts } from "./artifactValidator.js";
import { executeOpenClawTask } from "./openclawAdapter.js";

function inferWorkerIdFromFile(file: string): string {
  return path.basename(file).replace(/\.md$/, "");
}

function inferWorkspacePath(workerId: string): string {
  const projectRoot = path.resolve(process.cwd(), "runtime/workspaces/nearjobs/workers");

  const matches = fs
    .readdirSync(projectRoot)
    .filter((name) => name === workerId);

  const match = matches[0];

  if (!match) {
    throw new Error(`Could not find workspace for worker ${workerId}`);
  }

  return path.join(projectRoot, match);
}

export async function regenerateInvalidArtifacts(projectName: string) {
  const validations = validateOpenClawArtifacts();
  const invalid = validations.filter((result) => !result.valid);

  const results = [];

  for (const artifact of invalid) {
    const workerId = inferWorkerIdFromFile(artifact.file);
    const workspacePath = inferWorkspacePath(workerId);

    const issueSummary = artifact.issues
      .map((issue) => `- ${issue.code}: ${issue.message}`)
      .join("\n");

    const prompt = `
You are a senior ${artifact.role} engineer.

Your previous artifact failed enterprise validation.

Project:
${projectName}

Failed artifact:
${artifact.file}

Issues:
${issueSummary}

Regenerate the artifact with these hard rules:
- No TODOs
- No placeholders
- No stubs
- No mock implementation language
- No empty implementation
- No "return null" / "return undefined"
- No "not implemented"
- Must be production-grade
- Must be concrete and detailed
- Must include real implementation strategy
- Must include exact files to create
- Must include complete code blocks where relevant
- Must include validation and testing instructions

Return only the corrected artifact.
`;

    const result = await executeOpenClawTask({
      workerId,
      workspacePath,
      prompt
    });

    results.push({
      artifact: artifact.file,
      workerId,
      role: artifact.role,
      success: result.success,
      outputFile: result.outputFile,
      issues: artifact.issues
    });
  }

  return results;
}
