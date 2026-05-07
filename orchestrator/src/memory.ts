import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export type RunEntry = {
  runId: string;
  mode: string;
  requirement: string;
  runDir: string;
  status: string;
  createdAt: string;
  projectSlug?: string;
  projectPath?: string;
};

export function getFactoryRoot(): string {
  return path.resolve(__dirname, "../..");
}

function getProjectMemoryDir(factoryRoot: string, projectSlug?: string): string {
  if (projectSlug) {
    return path.join(factoryRoot, "memory", "projects", projectSlug);
  }

  return path.join(factoryRoot, "memory");
}

export function getRunIndex(factoryRoot: string, projectSlug?: string): { runs: RunEntry[] } {
  const memoryDir = getProjectMemoryDir(factoryRoot, projectSlug);
  const indexPath = path.join(memoryDir, "RUN_INDEX.json");

  if (!fs.existsSync(indexPath)) {
    return { runs: [] };
  }

  try {
    return JSON.parse(fs.readFileSync(indexPath, "utf8"));
  } catch {
    return { runs: [] };
  }
}

export function normalizeRequirement(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

export function findDuplicateRun(
  factoryRoot: string,
  requirement: string,
  projectSlug?: string
): RunEntry | null {
  const index = getRunIndex(factoryRoot, projectSlug);
  const normalized = normalizeRequirement(requirement);

  return (
    index.runs.find((run) => {
      return (
        normalizeRequirement(run.requirement) === normalized &&
        ["completed", "completed_after_fix"].includes(run.status)
      );
    }) || null
  );
}

export function readProjectMemory(factoryRoot: string, projectSlug?: string): string {
  const memoryDir = getProjectMemoryDir(factoryRoot, projectSlug);

  const files = [
    "PROJECT_STATE.md",
    "TASK_STATUS.json",
    "NEXT_ACTIONS.json",
    "QA_REPORT.json"
  ];

  return files
    .map((file) => {
      const fullPath = path.join(memoryDir, file);
      if (!fs.existsSync(fullPath)) return "";

      return [
        `===== ${path.relative(factoryRoot, fullPath)} =====`,
        fs.readFileSync(fullPath, "utf8")
      ].join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

export function suggestNextTask(factoryRoot: string, projectSlug?: string): string {
  const memoryDir = getProjectMemoryDir(factoryRoot, projectSlug);
  const nextActionsPath = path.join(memoryDir, "NEXT_ACTIONS.json");

  if (!fs.existsSync(nextActionsPath)) {
    return "Add OTP authentication with JWT sessions";
  }

  try {
    const data = JSON.parse(fs.readFileSync(nextActionsPath, "utf8"));
    const next = data.next_actions || data.next || [];

    if (Array.isArray(next) && next.length > 0) {
      return String(next[0]);
    }
  } catch {}

  return "Add OTP authentication with JWT sessions";
}

export function appendRunIndex(factoryRoot: string, entry: RunEntry, projectSlug?: string) {
  const memoryDir = getProjectMemoryDir(factoryRoot, projectSlug);
  fs.mkdirSync(memoryDir, { recursive: true });

  const indexPath = path.join(memoryDir, "RUN_INDEX.json");

  const data = getRunIndex(factoryRoot, projectSlug);
  data.runs.unshift(entry);

  fs.writeFileSync(indexPath, JSON.stringify(data, null, 2), "utf8");
}