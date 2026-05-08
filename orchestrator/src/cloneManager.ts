import fs from "fs";
import path from "path";
import { createWorkerWorkspace } from "./workspaceManager.js";

export type AgentClone = {
  id: string;
  parentAgent: string;
  role: string;
  projectName: string;
  workspacePath: string;
  status: "READY" | "RUNNING" | "DONE" | "FAILED";
  createdAt: string;
};

const CLONES_ROOT = path.resolve(process.cwd(), "runtime/trajectories/clones");

export function createAgentClone(
  projectName: string,
  parentAgent: string,
  role: string
): AgentClone {
  fs.mkdirSync(CLONES_ROOT, { recursive: true });

  const id = `${parentAgent}-${role}-${Date.now()}`;
  const workspacePath = createWorkerWorkspace(projectName, id);

  const clone: AgentClone = {
    id,
    parentAgent,
    role,
    projectName,
    workspacePath,
    status: "READY",
    createdAt: new Date().toISOString()
  };

  fs.writeFileSync(
    path.join(CLONES_ROOT, `${id}.json`),
    JSON.stringify(clone, null, 2)
  );

  return clone;
}

export function createEngineeringClones(projectName: string): AgentClone[] {
  return [
    createAgentClone(projectName, "engineering-agent", "backend"),
    createAgentClone(projectName, "engineering-agent", "frontend"),
    createAgentClone(projectName, "engineering-agent", "database"),
    createAgentClone(projectName, "engineering-agent", "tests")
  ];
}

export function createValidationClones(projectName: string): AgentClone[] {
  return [
    createAgentClone(projectName, "validation-agent", "build"),
    createAgentClone(projectName, "validation-agent", "api"),
    createAgentClone(projectName, "validation-agent", "playwright"),
    createAgentClone(projectName, "validation-agent", "security")
  ];
}
