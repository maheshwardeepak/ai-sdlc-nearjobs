import fs from "node:fs";
import path from "node:path";
import { executeOpenClawTask } from "./openclawAdapter.js";

export type AiProjectPhase = {
  id: string;
  name: string;
  goal: string;
  autonomous: boolean;
  requiresHumanApproval: boolean;
};

export type AiProjectPlan = {
  productSummary: string;
  domainModules: string[];
  entities: Array<{
    name: string;
    fields: string[];
    relationships: string[];
  }>;
  apiContracts: Array<{
    method: string;
    path: string;
    purpose: string;
  }>;
  uiScreens: Array<{
    name: string;
    purpose: string;
  }>;
  phases: AiProjectPhase[];
  acceptanceCriteria: string[];
};

function extractJson(text: string): string {
  const trimmed = text.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const match = trimmed.match(/```json\s*([\s\S]*?)```/);

  if (match?.[1]) {
    return match[1].trim();
  }

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");

  if (first >= 0 && last > first) {
    return trimmed.slice(first, last + 1);
  }

  throw new Error("AI planner did not return valid JSON.");
}

export async function runAiProjectPlanner(input: {
  projectName: string;
  projectSlug: string;
  requirements: string;
  stack: unknown;
  outputDir: string;
}): Promise<AiProjectPlan> {
  fs.mkdirSync(input.outputDir, { recursive: true });

  const workerId = `planning-agent-${input.projectSlug}-${Date.now()}`;

  const result = await executeOpenClawTask({
    workerId,
    workspacePath: input.outputDir,
    prompt: `
You are an expert autonomous SDLC product planner.

Return STRICT JSON only. Do not include markdown outside JSON.

Project:
${input.projectName}

Confirmed stack:
${JSON.stringify(input.stack, null, 2)}

Requirements:
${input.requirements}

Create a complete project execution plan.

Rules:
- Derive phases dynamically from the supplied requirements.
- Do not use static generic phases only.
- Each phase must map to actual requirement areas.
- Human approval is required only once before execution.
- After approval, all phases must run autonomously.
- Include auth/security/RBAC/team/comments/audit/dashboard phases if requirements mention them.
- Include concrete entities, APIs, UI screens, and acceptance criteria.

JSON shape:
{
  "productSummary": "string",
  "domainModules": ["string"],
  "entities": [
    { "name": "string", "fields": ["string"], "relationships": ["string"] }
  ],
  "apiContracts": [
    { "method": "GET|POST|PUT|PATCH|DELETE", "path": "string", "purpose": "string" }
  ],
  "uiScreens": [
    { "name": "string", "purpose": "string" }
  ],
  "phases": [
    {
      "id": "kebab-case-string",
      "name": "string",
      "goal": "string",
      "autonomous": true,
      "requiresHumanApproval": false
    }
  ],
  "acceptanceCriteria": ["string"]
}
`
  });

  if (!result.success) {
    throw new Error(`AI project planning failed: ${result.stderr}`);
  }

  const parsed = JSON.parse(extractJson(result.stdout)) as AiProjectPlan;

  fs.writeFileSync(
    path.join(input.outputDir, "ai-project-plan.json"),
    JSON.stringify(parsed, null, 2)
  );

  return parsed;
}
