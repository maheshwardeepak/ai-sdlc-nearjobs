export type PipelineMode =
  | "new_project"
  | "new_feature"
  | "bug_fix"
  | "correction_feedback";

export function getPipeline(mode: PipelineMode, workerAgentName: string): string[] {
  return {
    new_project: [
      "prompt-agent",
      "planning-architecture-agent",
      workerAgentName, // scaffold
      workerAgentName, // backend core
      workerAgentName, // auth
      workerAgentName, // profiles
      workerAgentName, // jobs
      workerAgentName, // applications
      workerAgentName, // notifications/admin
      workerAgentName, // frontend full UI
      workerAgentName, // integration + deployment prep
      "qa-agent",
      "fix-agent",
      "qa-agent",
      "memory-manager-agent",
      "delivery-agent"
    ],

    new_feature: [
      "prompt-agent",
      "codebase-analyzer-agent",
      "impact-analysis-agent",
      "planning-architecture-agent",
      workerAgentName,
      "qa-agent",
      "fix-agent",
      "qa-agent",
      "memory-manager-agent"
    ],

    bug_fix: [
      "bug-triage-agent",
      "reproduction-agent",
      "root-cause-agent",
      "fix-agent",
      "qa-agent",
      "memory-manager-agent"
    ],

    correction_feedback: [
      "feedback-agent",
      "impact-analysis-agent",
      "planning-architecture-agent",
      workerAgentName,
      "qa-agent",
      "fix-agent",
      "qa-agent",
      "memory-manager-agent"
    ]
  }[mode];
}

export function getStepInstruction(mode: PipelineMode, _agentName: string, step: number): string {
  if (mode !== "new_project") return "";

  return {
    1: "Convert user requirement into complete production-ready platform specification. Do not reduce scope.",
    2: "Create production-grade architecture, DB design, API contract, frontend map, test plan, deploy plan, and implementation phases.",
    3: "Create project scaffold with backend, frontend, database, docs, tests, CI, Docker, env examples.",
    4: "Implement backend core: entities, enums, repositories, DTOs, ApiResponse, exceptions, migrations.",
    5: "Implement auth: OTP, JWT, role selection, security config, filters, tests.",
    6: "Implement profiles: jobseeker/employer profile CRUD, validation, tests.",
    7: "Implement jobs: create/edit/publish/pause/close, 2-active-jobs rule, distance fields, tests.",
    8: "Implement applications/saved jobs/notifications: duplicate apply block, statuses, tests.",
    9: "Implement admin APIs: users/jobs/reports moderation, route security, tests.",
    10: "Implement complete React UI: login, OTP, role select, dashboards, feed, details, forms, admin, API integration, Playwright tests.",
    11: "Integration and deployment prep: Docker, README, env, CI, run scripts, contract fixes.",
    12: "QA: verify real implementation exists. Fail if only scaffold/placeholders.",
    13: "Fix all QA failures with real code.",
    14: "Re-run QA and confirm production readiness.",
    15: "Update memory with completed work, bugs, next actions.",
    16: "Prepare delivery report with run commands and deploy checklist."
  }[step] || "";
}
