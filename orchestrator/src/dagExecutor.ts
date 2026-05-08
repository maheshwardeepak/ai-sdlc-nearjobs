import fs from "fs";
import path from "path";
import { assertPlanApproved } from "./approval.js";
import { loadState, saveState, type FactoryRunStatus } from "./state.js";

export type DagNode = {
  id: string;
  agent: string;
  dependencies: string[];
  outputs?: string[];
  blocksExecution?: boolean;
  parallelizable?: boolean;
  conditional?: string;
};

export type ExecutionDag = {
  mode: string;
  requiresHumanApprovalBeforeExecution: boolean;
  nodes: DagNode[];
};

const DAG_TEMPLATE_PATH = path.resolve(process.cwd(), "artifacts/plans/execution-dag.template.json");

export function loadDag(): ExecutionDag {
  return JSON.parse(fs.readFileSync(DAG_TEMPLATE_PATH, "utf8")) as ExecutionDag;
}

export function validateDag(dag: ExecutionDag): void {
  const ids = new Set(dag.nodes.map((node) => node.id));

  for (const node of dag.nodes) {
    for (const dependency of node.dependencies) {
      if (!ids.has(dependency)) {
        throw new Error(`Invalid DAG: node "${node.id}" depends on missing node "${dependency}".`);
      }
    }
  }

  if (dag.requiresHumanApprovalBeforeExecution) {
    const hasApprovalNode = dag.nodes.some((node) => node.id === "human_approval");
    if (!hasApprovalNode) {
      throw new Error("Invalid DAG: human approval is required but human_approval node is missing.");
    }
  }
}

export function getRunnableNodes(dag: ExecutionDag, completedNodeIds: string[]): DagNode[] {
  const completed = new Set(completedNodeIds);

  return dag.nodes.filter((node) => {
    if (completed.has(node.id)) return false;
    return node.dependencies.every((dependency) => completed.has(dependency));
  });
}

export function assertCanExecuteNode(node: DagNode): void {
  const executionNodes = new Set([
    "engineering",
    "infra_deploy",
    "validation",
    "debug_fix_if_needed",
    "review_qa",
    "delivery_memory"
  ]);

  if (executionNodes.has(node.id)) {
    assertPlanApproved();
  }
}

export function mapNodeToStatus(nodeId: string): FactoryRunStatus {
  switch (nodeId) {
    case "intake":
      return "INTAKE";
    case "planning":
      return "PLANNING";
    case "human_approval":
      return "WAITING_FOR_HUMAN_APPROVAL";
    case "engineering":
      return "ENGINEERING";
    case "infra_deploy":
      return "INFRA_DEPLOY";
    case "validation":
      return "VALIDATION";
    case "debug_fix_if_needed":
      return "DEBUG_FIX";
    case "review_qa":
      return "REVIEW_QA";
    case "delivery_memory":
      return "DELIVERY";
    default:
      return "IDLE";
  }
}

export function markNodeStarted(nodeId: string): void {
  const state = loadState();
  state.status = mapNodeToStatus(nodeId);
  saveState(state);
}

export function createRunPlan(): void {
  const dag = loadDag();
  validateDag(dag);

  fs.mkdirSync(path.resolve(process.cwd(), "artifacts/runs"), { recursive: true });

  fs.writeFileSync(
    path.resolve(process.cwd(), "artifacts/runs/current-dag.json"),
    JSON.stringify(dag, null, 2)
  );

  fs.writeFileSync(
    path.resolve(process.cwd(), "artifacts/runs/completed-nodes.json"),
    JSON.stringify([], null, 2)
  );
}
