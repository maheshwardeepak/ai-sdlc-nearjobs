export const CORE_AGENTS = [
  "intake-agent",
  "planning-agent",
  "engineering-agent",
  "infra-deploy-agent",
  "validation-agent",
  "debug-fix-agent",
  "review-qa-agent",
  "delivery-memory-agent"
] as const;

export const FACTORY_FLOW = [
  "intake",
  "planning",
  "human_approval",
  "engineering",
  "infra_deploy",
  "validation",
  "review_qa",
  "debug_fix_if_needed",
  "delivery_memory"
] as const;

export type QualityGate =
  | "PLAN_APPROVED"
  | "BACKEND_BUILD_GREEN"
  | "FRONTEND_BUILD_GREEN"
  | "DOCKER_BUILD_GREEN"
  | "LOCAL_DEPLOY_GREEN"
  | "DB_MIGRATION_GREEN"
  | "HEALTH_CHECK_GREEN"
  | "API_SMOKE_GREEN"
  | "AUTH_FLOW_GREEN"
  | "PLAYWRIGHT_GREEN"
  | "SECURITY_GREEN"
  | "SECRETS_GREEN"
  | "REGRESSION_GREEN"
  | "DELIVERY_READY";

export type GateState = Record<QualityGate, boolean>;

export const INITIAL_GATES: GateState = {
  PLAN_APPROVED: false,
  BACKEND_BUILD_GREEN: false,
  FRONTEND_BUILD_GREEN: false,
  DOCKER_BUILD_GREEN: false,
  LOCAL_DEPLOY_GREEN: false,
  DB_MIGRATION_GREEN: false,
  HEALTH_CHECK_GREEN: false,
  API_SMOKE_GREEN: false,
  AUTH_FLOW_GREEN: false,
  PLAYWRIGHT_GREEN: false,
  SECURITY_GREEN: false,
  SECRETS_GREEN: false,
  REGRESSION_GREEN: false,
  DELIVERY_READY: false
};
