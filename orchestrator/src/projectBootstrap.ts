import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

function slugify(input: string) {
  const match =
    input.match(/called\s+([A-Za-z0-9_-]+)/i) ||
    input.match(/project\s+([A-Za-z0-9_-]+)/i) ||
    input.match(/app\s+([A-Za-z0-9_-]+)/i);

  const name = match?.[1] || "GeneratedProject";

  return {
    projectName: name,
    projectSlug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  };
}

export function bootstrapProject(requirement: string, factoryRoot: string) {
  const { projectName, projectSlug } = slugify(requirement);

  const projectPath = path.join(factoryRoot, "projects", projectSlug);
  const memoryPath = path.join(factoryRoot, "memory", "projects", projectSlug);
  const runRoot = path.join(factoryRoot, "artifacts", "runs", projectSlug);
  const agentRulesDir = path.join(factoryRoot, "agents", `${projectSlug}-worker`);
  const workerAgentName = `${projectSlug}-worker`;

  fs.mkdirSync(projectPath, { recursive: true });
  fs.mkdirSync(memoryPath, { recursive: true });
  fs.mkdirSync(runRoot, { recursive: true });
  fs.mkdirSync(agentRulesDir, { recursive: true });

  if (!fs.existsSync(path.join(projectPath, ".git"))) {
    spawnSync("git init", { cwd: projectPath, shell: true, encoding: "utf8" });
  }

  fs.writeFileSync(
    path.join(projectPath, "project.yaml"),
    [
      `name: ${projectName}`,
      `slug: ${projectSlug}`,
      `workspace: ${projectPath}`,
      `worker_agent: ${workerAgentName}`,
      `status: active`
    ].join("\n"),
    "utf8"
  );

  fs.writeFileSync(
    path.join(agentRulesDir, "AGENTS.md"),
    `# ${projectName} Worker Agent

Role:
Build a full production-ready platform from user requirements.

Rules:
- Work only inside ${projectPath}.
- new_project means complete production-ready platform, not MVP and not scaffold.
- Do not create placeholder-only files.
- Do not create class-name-only files.
- Every backend feature must include migration, entity, repository, DTO, service, controller, validation, and tests.
- Every frontend feature must include page, component, API integration, route, validation, and Playwright test.
- Write real business logic.
- Do not delete unrelated files.
- Do not force push.
- Do not push to main.
- If install/build is gated, write source code and list commands.
- Follow WORLD_CLASS_FACTORY_RULES.md from factory root.
- The final output must be a usable production platform, not only a generated plan.
`,
    "utf8"
  );

  const defaults = {
    "PROJECT_STATE.md": `# ${projectName}\n\nStatus: bootstrapped\n`,
    "TASK_STATUS.json": JSON.stringify({ current_task: "bootstrapped", completed: [], next: [] }, null, 2),
    "NEXT_ACTIONS.json": JSON.stringify({ next: [] }, null, 2),
    "QA_REPORT.json": JSON.stringify({ status: "not_run" }, null, 2),
    "RUN_INDEX.json": JSON.stringify({ runs: [] }, null, 2)
  };

  for (const [file, content] of Object.entries(defaults)) {
    const p = path.join(memoryPath, file);
    if (!fs.existsSync(p)) fs.writeFileSync(p, content, "utf8");
  }

  spawnSync(
    `openclaw agents delete ${workerAgentName} >/dev/null 2>&1 || true`,
    { cwd: factoryRoot, shell: true, encoding: "utf8" }
  );

  spawnSync(
    `openclaw agents add ${workerAgentName} --workspace "${projectPath}" --agent-dir "${path.join(factoryRoot, ".openclaw", workerAgentName)}"`,
    { cwd: factoryRoot, shell: true, encoding: "utf8" }
  );

  return {
    projectName,
    projectSlug,
    projectPath,
    memoryPath,
    runRoot,
    workerAgentName
  };
}
