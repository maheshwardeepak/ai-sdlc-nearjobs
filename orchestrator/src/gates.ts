import { loadState, saveState, type FactoryState } from "./state.js";
import type { QualityGate } from "./factoryFlow.js";

export const VALIDATION_GATES: QualityGate[] = [
  "BACKEND_BUILD_GREEN",
  "FRONTEND_BUILD_GREEN",
  "DOCKER_BUILD_GREEN",
  "LOCAL_DEPLOY_GREEN",
  "DB_MIGRATION_GREEN",
  "HEALTH_CHECK_GREEN",
  "API_SMOKE_GREEN",
  "AUTH_FLOW_GREEN",
  "PLAYWRIGHT_GREEN",
  "SECURITY_GREEN",
  "SECRETS_GREEN",
  "REGRESSION_GREEN"
];

export function recomputeFailedGates(state: FactoryState): FactoryState {
  state.failedGates = Object.entries(state.gates)
    .filter(([, passed]) => !passed)
    .map(([gate]) => gate as QualityGate);

  return state;
}

export function markGate(gate: QualityGate, passed: boolean): FactoryState {
  const state = loadState();
  state.gates[gate] = passed;
  recomputeFailedGates(state);
  saveState(state);
  return state;
}

export function hasValidationFailures(): boolean {
  const state = loadState();
  return VALIDATION_GATES.some((gate) => !state.gates[gate]);
}

export function assertDeliveryAllowed(): void {
  const state = loadState();

  const requiredBeforeDelivery: QualityGate[] = [
    "PLAN_APPROVED",
    ...VALIDATION_GATES
  ];

  const failed = requiredBeforeDelivery.filter((gate) => !state.gates[gate]);

  if (failed.length > 0) {
    throw new Error(`Delivery blocked. Failed gates: ${failed.join(", ")}`);
  }
}
