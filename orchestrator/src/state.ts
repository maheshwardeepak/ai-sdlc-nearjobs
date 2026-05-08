import fs from "fs";
import path from "path";
import { INITIAL_GATES, type GateState, type QualityGate } from "./factoryFlow.js";

export type FactoryRunStatus =
  | "IDLE"
  | "INTAKE"
  | "PLANNING"
  | "WAITING_FOR_HUMAN_APPROVAL"
  | "APPROVED_FOR_EXECUTION"
  | "ENGINEERING"
  | "INFRA_DEPLOY"
  | "VALIDATION"
  | "DEBUG_FIX"
  | "REVIEW_QA"
  | "DELIVERY"
  | "FAILED"
  | "COMPLETE";

export type FactoryState = {
  projectName: string | null;
  status: FactoryRunStatus;
  planVersion: number;
  gates: GateState;
  failedGates: QualityGate[];
  autoFixAttempts: number;
  maxAutoFixAttempts: number;
  lastError: string | null;
  updatedAt: string;
};

const STATE_PATH = path.resolve(process.cwd(), "artifacts/runs/factory-state.json");

export function createInitialState(): FactoryState {
  return {
    projectName: null,
    status: "IDLE",
    planVersion: 0,
    gates: INITIAL_GATES,
    failedGates: [],
    autoFixAttempts: 0,
    maxAutoFixAttempts: 5,
    lastError: null,
    updatedAt: new Date().toISOString()
  };
}

export function saveState(state: FactoryState): void {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(
    STATE_PATH,
    JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2)
  );
}

export function loadState(): FactoryState {
  if (!fs.existsSync(STATE_PATH)) {
    const initial = createInitialState();
    saveState(initial);
    return initial;
  }

  return JSON.parse(fs.readFileSync(STATE_PATH, "utf8")) as FactoryState;
}

export function setGate(gate: QualityGate, value: boolean): FactoryState {
  const state = loadState();
  state.gates[gate] = value;
  state.failedGates = Object.entries(state.gates)
    .filter(([, passed]) => !passed)
    .map(([name]) => name as QualityGate);
  saveState(state);
  return state;
}

export function allRequiredGatesGreen(): boolean {
  const state = loadState();
  return Object.values(state.gates).every(Boolean);
}
