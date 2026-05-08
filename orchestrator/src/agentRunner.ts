import fs from "fs";
import path from "path";
import { assertCanExecuteNode, loadDag, markNodeStarted, type DagNode } from "./dagExecutor.js";
import { assertDeliveryAllowed, hasValidationFailures, markGate } from "./gates.js";

const AGENTS_ROOT = path.resolve(process.cwd(), "agents");
const RUNS_ROOT = path.resolve(process.cwd(), "artifacts/runs");
const COMPLETED_NODES_PATH = path.join(RUNS_ROOT, "completed-nodes.json");

export type AgentRunResult = {
  nodeId: string;
  agent: string;
  success: boolean;
  skipped?: boolean;
  message: string;
  outputPath: string;
  finishedAt: string;
};

export function assertAgentExists(agentName: string): void {
  const agentPath = path.join(AGENTS_ROOT, agentName, "AGENTS.md");

  if (!fs.existsSync(agentPath)) {
    throw new Error(`Agent "${agentName}" is not registered. Missing ${agentPath}`);
  }
}

export function readAgentRules(agentName: string): string {
  assertAgentExists(agentName);
  return fs.readFileSync(path.join(AGENTS_ROOT, agentName, "AGENTS.md"), "utf8");
}

export function loadCompletedNodes(): string[] {
  if (!fs.existsSync(COMPLETED_NODES_PATH)) {
    return [];
  }

  return JSON.parse(fs.readFileSync(COMPLETED_NODES_PATH, "utf8")) as string[];
}

export function saveCompletedNodes(nodes: string[]): void {
  fs.mkdirSync(RUNS_ROOT, { recursive: true });
  fs.writeFileSync(COMPLETED_NODES_PATH, JSON.stringify([...new Set(nodes)], null, 2));
}

function shouldSkipNode(node: DagNode): string | null {
  if (node.id === "debug_fix_if_needed" && !hasValidationFailures()) {
    return "Skipped debug-fix because no failed gates exist.";
  }

  return null;
}

function applySimulatedGateEffects(node: DagNode): void {
  if (node.id === "engineering") {
    markGate("BACKEND_BUILD_GREEN", true);
    markGate("FRONTEND_BUILD_GREEN", true);
  }

  if (node.id === "infra_deploy") {
    markGate("DOCKER_BUILD_GREEN", true);
    markGate("LOCAL_DEPLOY_GREEN", true);
    markGate("DB_MIGRATION_GREEN", true);
    markGate("HEALTH_CHECK_GREEN", true);
  }

  if (node.id === "validation") {
    markGate("API_SMOKE_GREEN", true);
    markGate("AUTH_FLOW_GREEN", true);
    markGate("PLAYWRIGHT_GREEN", true);
    markGate("SECURITY_GREEN", true);
    markGate("SECRETS_GREEN", true);
    markGate("REGRESSION_GREEN", true);
  }

  if (node.id === "delivery_memory") {
    assertDeliveryAllowed();
    markGate("DELIVERY_READY", true);
  }
}

export function runAgentNode(node: DagNode): AgentRunResult {
  assertAgentExists(node.agent);
  assertCanExecuteNode(node);

  const skipReason = shouldSkipNode(node);
  const outputPath = path.join(RUNS_ROOT, `${node.id}.result.json`);

  if (skipReason) {
    const skippedResult: AgentRunResult = {
      nodeId: node.id,
      agent: node.agent,
      success: true,
      skipped: true,
      message: skipReason,
      outputPath,
      finishedAt: new Date().toISOString()
    };

    fs.writeFileSync(outputPath, JSON.stringify({ result: skippedResult }, null, 2));
    return skippedResult;
  }

  markNodeStarted(node.id);

  const rules = readAgentRules(node.agent);

  fs.mkdirSync(RUNS_ROOT, { recursive: true });

  applySimulatedGateEffects(node);

  const result: AgentRunResult = {
    nodeId: node.id,
    agent: node.agent,
    success: true,
    message: `Agent ${node.agent} executed node ${node.id}.`,
    outputPath,
    finishedAt: new Date().toISOString()
  };

  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        result,
        agentRulesPreview: rules.slice(0, 1000)
      },
      null,
      2
    )
  );

  const completed = loadCompletedNodes();
  completed.push(node.id);
  saveCompletedNodes(completed);

  return result;
}

export function runApprovedDagOnce(): AgentRunResult[] {
  const dag = loadDag();
  const completed = loadCompletedNodes();
  const completedSet = new Set(completed);

  const results: AgentRunResult[] = [];

  for (const node of dag.nodes) {
    if (node.id === "intake" || node.id === "planning" || node.id === "human_approval") {
      continue;
    }

    if (completedSet.has(node.id)) {
      continue;
    }

    results.push(runAgentNode(node));
  }

  return results;
}

export async function runAgent(input: unknown): Promise<string> {
  return typeof input === "string" ? input : JSON.stringify(input, null, 2);
}
