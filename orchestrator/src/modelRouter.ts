export type ModelTier = "cheap" | "reasoning" | "coding" | "qa";

export const agentModelMap: Record<string, ModelTier> = {
  "prompt-agent": "cheap",
  "memory-manager-agent": "cheap",
  "delivery-agent": "cheap",

  "planning-architecture-agent": "reasoning",
  "codebase-analyzer-agent": "reasoning",
  "impact-analysis-agent": "reasoning",
  "bug-triage-agent": "reasoning",
  "root-cause-agent": "reasoning",
  "feedback-agent": "reasoning",
  "merge-agent": "reasoning",

  "nearjobs-worker": "coding",
  "fix-agent": "coding",

  "qa-agent": "qa",
  "reproduction-agent": "qa"
};

export const modelConfig: Record<ModelTier, string> = {
  cheap: "cheap_model",
  reasoning: "strong_reasoning_model",
  coding: "coding_model",
  qa: "qa_reasoning_model"
};

export function getModelForAgent(agentName: string): string {
  const tier = agentModelMap[agentName] ?? "reasoning";
  return modelConfig[tier];
}
